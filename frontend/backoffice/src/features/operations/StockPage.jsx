import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../core/auth/api.js'
import { useUnsavedChanges } from '../../core/navigation/Navigation.jsx'
import { Button } from '../../core/ui/Button.jsx'
import { DataTable } from '../../core/ui/DataTable.jsx'
import { Dialog } from '../../core/ui/Dialog.jsx'
import { Dropdown } from '../../core/ui/Dropdown.jsx'
import { FormField } from '../../core/ui/FormField.jsx'
import { Pagination } from '../../core/ui/Pagination.jsx'
import { ReferenceField } from '../../core/ui/ReferenceField.jsx'
import { SearchField } from '../../core/ui/SearchField.jsx'
import { SelectField } from '../../core/ui/SelectField.jsx'
import { SummaryCards } from '../../core/ui/SummaryCards.jsx'

const readable = value => String(value || '').replaceAll('_', ' ').toLowerCase()
const quantity = value => Number(value || 0).toLocaleString('en-GB', { maximumFractionDigits: 3 })
const errorMessage = error => `Unable to save or load records: ${error.detail || readable(error.message)}. Your entries are preserved. For a changed balance, close this form and refresh before trying again.`
function Reference({ entity, label, value, onChange, onRows, disabled }) {
 const load = useCallback(async ({ q, page, signal }) => {
  const data = await api(`/api/operations/${entity}?${new URLSearchParams({ q, page, ...(entity === 'resources' ? {kind:'MATERIAL'} : {}), status: entity === 'bookings' ? 'CONFIRMED' : 'ACTIVE' })}`, undefined, { signal })
  onRows?.(data.rows)
  return { ...data, rows: data.rows.filter(row => entity !== 'resources' || row.kind !== 'SERVICE').map(row => ({ ...row, name: row.name || row.label })) }
 }, [entity, onRows])
 return <ReferenceField label={label} value={value} onChange={event => onChange(event.target.value)} load={load} disabled={disabled}/>
}
function StockCommand({ action, row, onClose, onSaved }) {
 const [values, setValues] = useState({ quantity: '', unit: 'BASE', note: '', condition: 'READY', disposition: 'RETURN_READY', receivedOn: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10), resourceId: '', locationId: '', destinationId: '', custodian: '', lotLabel: '', unitCost: '', bookingLineId: '', expiresOn: '', countedQuantity: '' })
 const [bookings, setBookings] = useState({}), [bookingId, setBookingId] = useState('')
 const [resources, setResources] = useState({}), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [fieldErrors, setFieldErrors] = useState({}), [discard, setDiscard] = useState(false)
 const locked = useRef(false), commandId = useRef(crypto.randomUUID())
 const collectBookings = useCallback(rows => setBookings(old => ({ ...old, ...Object.fromEntries(rows.map(item => [item.id, item])) })), [])
 const collect = useCallback(rows => setResources(old => ({ ...old, ...Object.fromEntries(rows.map(item => [item.id, item])) })), [])
 const resource = row?.lot?.resource || resources[values.resourceId]
 const change = (key, value) => { setValues(old => ({ ...old, [key]: value, ...(key === 'resourceId' ? { unit: 'BASE' } : {}) })); setDirty(true) }
 useUnsavedChanges(dirty || busy)
 const close = () => { if (!busy) { if (dirty) setDiscard(true); else onClose() } }
 async function submit(event) {
  event.preventDefault(); if (locked.current) return
  setFieldErrors({})
  const invalid = (key, message) => { setFieldErrors({ [key]: message }); setError(message); event.currentTarget.elements.namedItem(key)?.focus() }
  const amount = action === 'COUNT' ? values.countedQuantity : values.quantity
  if (!/^\d+$/.test(amount) || !Number.isSafeInteger(Number(amount)) || Number(amount) < (action === 'COUNT' ? 0 : 1)) { invalid(action === 'COUNT' ? 'countedQuantity' : 'quantity', 'Enter a whole quantity' + (action === 'COUNT' ? ' of zero or more.' : ' greater than zero.')); return }
  if (['COUNT','CONDITION'].includes(action) && !values.note.trim()) { invalid('note', 'Enter the reason for this stock adjustment.'); return }
  if (action === 'ISSUE' && !values.custodian.trim()) { invalid('custodian', 'Enter the responsible person.'); return }
  if (action === 'RECEIVE') {
   const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value
   if (!values.lotLabel.trim() || !validDate(values.receivedOn) || (values.expiresOn && (!validDate(values.expiresOn) || values.expiresOn < values.receivedOn))) { invalid(!values.lotLabel.trim() ? 'lotLabel' : !validDate(values.receivedOn) ? 'receivedOn' : 'expiresOn', 'Enter a lot reference and valid YYYY-MM-DD dates. Expiry cannot precede receipt.'); return }
   if (values.unitCost && (!/^\d+(\.\d{1,2})?$/.test(values.unitCost) || !Number.isFinite(Number(values.unitCost)))) { invalid('unitCost', 'Enter a non-negative cost with at most two decimals.'); return }
  }
  locked.current = true; setBusy(true); setError('')
  const payload = { id: commandId.current, action, note: values.note }
  if (action === 'RECEIVE') Object.assign(payload, { resourceId: values.resourceId, locationId: values.locationId, quantity: Number(values.quantity), unit: values.unit, lotLabel: values.lotLabel, receivedOn: values.receivedOn, ...(values.expiresOn ? { expiresOn: values.expiresOn } : {}), ...(values.unitCost !== '' ? { unitCost: Number(values.unitCost) } : {}) })
  else if (action === 'SETTLE') Object.assign(payload, { issueId: row.id, quantity: Number(values.quantity), unit: values.unit, disposition: values.disposition, ...(values.disposition.startsWith('RETURN') ? { locationId: values.locationId } : {}) })
  else {
   Object.assign(payload, { balanceId: row.id, version: row.version })
   if (action === 'COUNT') payload.countedQuantity = Number(values.countedQuantity)
   else Object.assign(payload, { quantity: Number(values.quantity), unit: values.unit })
   if (['TRANSFER', 'ISSUE'].includes(action)) payload.destinationId = values.destinationId
   if (action === 'ISSUE') { payload.custodian = values.custodian; if (values.bookingLineId) payload.bookingLineId = values.bookingLineId }
   if (action === 'CONDITION') payload.condition = values.condition
  }
  try { await api('/api/operations/stock-command', payload); setDirty(false); onSaved() }
  catch (err) { setError(errorMessage(err)) }
  finally { locked.current = false; setBusy(false) }
 }
 const field = (key, label, props = {}) => <FormField label={label} name={key} error={fieldErrors[key]} value={values[key]} onChange={event => change(key, event.target.value)} disabled={busy} {...props}/>
 return <><Dialog title={`${readable(action)} stock`} busy={busy} onClose={close}><form noValidate onSubmit={submit}>
 {row && <p>{resource?.name || row.lot?.label} · {action === 'SETTLE' ? `${quantity(Number(row.quantity) - Number(row.settledQty))} outstanding` : `${quantity(row.quantity)} ${resource?.baseUnit || 'base units'} at ${row.location?.name || row.location?.label || 'selected location'}`}</p>}
 {action === 'RECEIVE' && <><Reference entity="resources" label="Resource" value={values.resourceId} onChange={value => change('resourceId', value)} onRows={collect} disabled={busy}/><Reference entity="stores" label="Receiving location" value={values.locationId} onChange={value => change('locationId', value)} disabled={busy}/>{field('lotLabel', 'Lot / delivery reference', { required: true })}{field('receivedOn', 'Received on', { placeholder: 'YYYY-MM-DD', required: true, hint: 'Bangkok date · YYYY-MM-DD' })}{field('expiresOn', 'Expires on', { placeholder: 'YYYY-MM-DD', hint: 'Optional · YYYY-MM-DD' })}{field('unitCost', 'Unit cost (THB)', { inputMode: 'decimal', hint: 'Optional · cost per selected purchase unit' })}</>}
 {['TRANSFER', 'ISSUE'].includes(action) && <Reference entity="stores" label="Destination" value={values.destinationId} onChange={value => change('destinationId', value)} disabled={busy}/>}
 {action === 'ISSUE' && <>{field('custodian', 'Responsible person', { required: true })}<Reference entity="bookings" label="Booking (optional)" value={bookingId} onChange={value => { setBookingId(value); change('bookingLineId', '') }} onRows={collectBookings} disabled={busy}/>{bookingId && <SelectField label="Booking resource line" value={values.bookingLineId} onChange={event => change('bookingLineId', event.target.value)} disabled={busy}><option value="">Select a matching line</option>{(bookings[bookingId]?.lines || []).filter(line => bookings[bookingId]?.status === 'CONFIRMED' && line.selected && line.resourceId === resource?.id && line.sourceId === row?.locationId && Number(line.quantity) > Number(line.issuedQty)).map(line => <option key={line.id} value={line.id}>{line.resource?.name} · {quantity(Number(line.quantity) - Number(line.issuedQty))} remaining</option>)}</SelectField>}</>}
 {action === 'CONDITION' && <SelectField label="New condition" value={values.condition} onChange={event => change('condition', event.target.value)} disabled={busy}><option value="READY">Ready</option>{resource?.kind === 'EQUIPMENT' && <option value="CLEANING">Cleaning / inspection</option>}<option value="DAMAGED">Damaged</option></SelectField>}
 {action === 'SETTLE' && <><SelectField label="Disposition" value={values.disposition} onChange={event => change('disposition', event.target.value)} disabled={busy}><option value="RETURN_READY">Return ready (intact items only)</option>{resource?.kind === 'EQUIPMENT' && <option value="RETURN_CLEANING">Return for cleaning / inspection</option>}<option value="RETURN_DAMAGED">Return damaged</option>{resource?.kind !== 'EQUIPMENT' && <option value="CONSUMED">Consumed</option>}<option value="WASTED">Lost / wasted</option></SelectField>{values.disposition.startsWith('RETURN') && <Reference entity="stores" label="Return location" value={values.locationId} onChange={value => change('locationId', value)} disabled={busy}/>}</>}
 {action === 'COUNT' ? field('countedQuantity', `Counted quantity (${resource?.baseUnit || 'base units'})`, { type: 'number', min: 0, step: 1, required: true }) : <>{field('quantity', 'Quantity', { type: 'number', min: 1, step: 1, required: true })}<SelectField label="Unit" value={values.unit} onChange={event => change('unit', event.target.value)} disabled={busy}><option value="BASE">{resource?.baseUnit || 'Base unit'}</option>{resource?.baseUnit === 'BOTTLE' && Number(resource?.packSize) > 0 && <option value="PACK">Pack · {resource.packSize} base units</option>}{resource?.baseUnit === 'BOTTLE' && Number(resource?.caseSize) > 0 && <option value="CASE">Case · {resource.caseSize} base units</option>}</SelectField></>}
 {field('note', action === 'COUNT' ? 'Count adjustment reason' : action === 'CONDITION' ? 'Condition change reason' : 'Note', { required: ['COUNT','CONDITION'].includes(action) })}
 {error && <p role="alert" className="form-error">{error}</p>}<div className="dialog-actions"><Button type="submit" busy={busy} disabled={busy || (action === 'ISSUE' && bookingId && !values.bookingLineId) || (action === 'RECEIVE' && (!values.resourceId || !values.locationId)) || (['TRANSFER','ISSUE'].includes(action) && !values.destinationId) || (action === 'SETTLE' && values.disposition.startsWith('RETURN') && !values.locationId)}>Save stock transaction</Button></div>
 </form></Dialog>{discard && <Dialog title="Discard unsaved changes?" onClose={() => setDiscard(false)}><p>Your stock transaction has not been saved.</p><div className="dialog-actions"><Button onClick={() => setDiscard(false)}>Keep editing</Button><Button onClick={onClose}>Discard changes</Button></div></Dialog>}</>
}
export default function StockPage({ entity = 'stock' }) {
 const params = new URLSearchParams(window.location.search)
 const [query, setQuery] = useState(params.get('q') || ''), [composing, setComposing] = useState(false), [page, setPage] = useState(Math.max(1, Number(params.get('page')) || 1)), [refresh, setRefresh] = useState(0), [state, setState] = useState({ rows: [], loading: true }), [selection, setSelection] = useState(null), [notice, setNotice] = useState('')
 useEffect(() => {
  if (composing) return
  const controller = new AbortController()
  const timer = setTimeout(() => {
   window.history.replaceState(window.history.state, '', `${window.location.pathname}?${new URLSearchParams({ q: query, page: String(page) })}`)
   setState(old => ({ ...old, loading: true, error: '' }))
   api(`/api/operations/${entity}?${new URLSearchParams({ q: query, page, pageSize: 25 })}`, undefined, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }).then(data => { if (!controller.signal.aborted) { setState({ ...data, loading: false }); if (data.page !== page) setPage(data.page) } }).catch(error => { if (!controller.signal.aborted) setState({ rows: [], loading: false, error: errorMessage(error) }) })
  }, query ? 300 : 0)
  return () => { clearTimeout(timer); controller.abort() }
 }, [entity, query, page, refresh, composing])
 const title = { stock: 'Stock balances', issues: 'Issues & returns', movements: 'Stock movements' }[entity]
 const columns = entity === 'stock' ? ['Resource / lot', 'Location', 'Condition', 'Quantity', 'Expiry', 'Actions'] : entity === 'issues' ? ['Resource / lot', 'Destination', 'Responsible person', 'Issued', 'Outstanding', 'Actions'] : ['Date (Bangkok)', 'Resource / lot', 'Action', 'Quantity', 'Location / note']
 return <><header className="page-heading"><div><h1 tabIndex={-1}>{title}</h1><p>{entity === 'movements' ? 'Permanent transaction history for stock reconciliation.' : 'Track equipment and consumables by location and lot.'}</p></div>{entity === 'stock' && <Button onClick={() => setSelection({ action: 'RECEIVE' })}>Receive stock</Button>}</header>
 <SummaryCards label="Stock summary · before filters" items={[{ label: entity === 'stock' ? 'Stock balances' : 'Total records', value: state.summary?.total, detail: 'All records · before filters' }, { label: entity === 'stock' ? 'Ready balances' : entity === 'issues' ? 'Outstanding issues' : 'Recorded movements', value: state.summary?.active }, { label: entity === 'stock' ? 'Cleaning balances' : 'History records', value: state.summary?.featured }, { label: entity === 'stock' ? 'Not ready' : entity === 'issues' ? 'Fully settled' : 'Removed records', value: state.summary?.inactive }]}/>
 {notice && <p role="status">{notice}</p>}<section className="panel table-panel"><div className="filterbar"><SearchField label={`Search ${title.toLowerCase()}`} value={query} onChange={value => { setQuery(value); setPage(1) }} onCompositionChange={setComposing}/><Button onClick={() => setRefresh(value => value + 1)} disabled={state.loading}>Refresh</Button></div>
 <DataTable columns={columns} label={title} busy={state.loading} error={state.error} onRetry={() => setRefresh(value => value + 1)} isEmpty={!state.rows.length}>{state.rows.map(row => <tr key={row.id}><td>{entity === 'movements' ? new Date(row.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' }) : <>{row.lot?.resource?.name}<div>{row.lot?.label}</div></>}</td>
 {entity === 'stock' ? <><td>{row.location?.name || row.location?.label}</td><td>{readable(row.condition)}</td><td>{quantity(row.quantity)} {row.lot?.resource?.baseUnit}</td><td>{row.lot?.expiresOn ? String(row.lot.expiresOn).slice(0,10) : '—'}</td><td><Dropdown label={`Actions for ${row.lot?.resource?.name}`} items={[{ label: 'Transfer', icon: 'arrow', onSelect: () => setSelection({ action: 'TRANSFER', row }) }, { label: 'Issue', icon: 'briefcase', disabled: row.condition !== 'READY', onSelect: () => setSelection({ action: 'ISSUE', row }) }, { label: 'Count stock', icon: 'check', onSelect: () => setSelection({ action: 'COUNT', row }) }, { label: 'Change condition', icon: 'edit', onSelect: () => setSelection({ action: 'CONDITION', row }) }]}><span aria-hidden="true">⋯</span></Dropdown></td></> : entity === 'issues' ? <><td>{row.destination?.name || row.destination?.label}</td><td>{row.custodian}</td><td>{quantity(row.quantity)} {row.lot?.resource?.baseUnit}</td><td>{quantity(Number(row.quantity) - Number(row.settledQty))}</td><td><Dropdown label={`Actions for ${row.lot?.resource?.name}`} items={[{ label: 'Return / settle', icon: 'check', disabled: Number(row.quantity) <= Number(row.settledQty), onSelect: () => setSelection({ action: 'SETTLE', row }) }]}><span aria-hidden="true">⋯</span></Dropdown></td></> : <><td>{row.details?.resourceName || '—'}<div>{row.details?.lotLabel}</div></td><td>{readable(row.kind)}<div>{readable(row.details?.disposition)}</div></td><td>{quantity(row.quantity)} {row.details?.baseUnit}<div>{quantity(row.enteredQuantity)} {readable(row.enteredUnit)} · factor {quantity(row.factor)}</div></td><td>{row.details?.sourceName || '—'} → {row.details?.destinationName || '—'}<div>{row.details?.note}</div></td></>}
 </tr>)}</DataTable><Pagination page={state.page || page} pageSize={state.pageSize || 25} total={state.total} busy={state.loading} onPageChange={setPage}/></section>
 {selection && <StockCommand {...selection} onClose={() => setSelection(null)} onSaved={() => { setSelection(null); setNotice('Stock transaction saved.'); setRefresh(value => value + 1) }}/>}</>
}
