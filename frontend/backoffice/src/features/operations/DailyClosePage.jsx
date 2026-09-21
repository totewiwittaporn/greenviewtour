import { formatDate as displayDate } from '../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../core/i18n/locale.jsx'
import {RefreshButton} from '../../core/ui/RefreshButton.jsx'
import { DateField } from '../../core/ui/DateField.jsx'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../core/auth/api.js'
import { useUnsavedChanges } from '../../core/navigation/Navigation.jsx'
import { Button } from '../../core/ui/Button.jsx'
import { DataTable } from '../../core/ui/DataTable.jsx'
import { Dialog } from '../../core/ui/Dialog.jsx'
import { Dropdown } from '../../core/ui/Dropdown.jsx'
import { Pagination } from '../../core/ui/Pagination.jsx'
import { SummaryCards } from '../../core/ui/SummaryCards.jsx'

const tomorrow = () => new Date(Date.now() + 31 * 3600000).toISOString().slice(0, 10)
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(+new Date(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const message = error => error.detail || 'Unable to load or prepare this summary. Please retry.'
const stamp = value => displayDate(new Date(value), {dateStyle:'short', timeStyle:'medium', ...{ timeZone: 'Asia/Bangkok' }})
const kindLabel = kind => kind === 'CLOSE' ? 'Closing snapshot' : 'LINE summary'
function SnapshotView({ snapshot, onClose }) {
 useLocale();
 const [page, setPage] = useState(1), rows = snapshot.runs || []
 return <Dialog title={t("{value0} · revision {value1}", {value0: kindLabel(snapshot.kind), value1: snapshot.revision})} variant="table" onClose={onClose}>
  <p>{t("Service date:")}{' '}{String(snapshot.serviceDate).slice(0, 10)}{' '}{t("· Captured:")}{' '}{stamp(snapshot.createdAt)}{' '}{t("(Thailand)")}</p>
  <p>{t("This saved snapshot preserves the totals at capture time. Open the live job orders for subsequent changes.")}</p>
  <DataTable label={t("Snapshot runs")} columns={['Run', 'Type / direction', 'Adults', 'Children', 'Passengers']} isEmpty={!rows.length} empty={<p>{t("No assigned runs in this snapshot.")}</p>}>
   {rows.slice((page - 1) * 25, page * 25).map(run => <tr key={run.id}><td>{run.name}</td><td>{run.kind === 'BOAT' ? t('Boat') : t('Vehicle')} · {run.direction || t("Not recorded")}</td><td>{run.adults}</td><td>{run.children}</td><td>{run.passengers}</td></tr>)}
  </DataTable><Pagination page={page} pageSize={25} total={rows.length} onPageChange={setPage} />
 </Dialog>
}
export default function DailyClosePage() {
 useLocale();
 const [date, setDate] = useState(tomorrow), [serviceDate, setServiceDate] = useState(tomorrow), [page, setPage] = useState(1)
 const [data, setData] = useState(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [dateError, setDateError] = useState(''), [notice, setNotice] = useState(''), [refresh, setRefresh] = useState(0), [view, setView] = useState(null)
 const lock = useRef(false)
 useUnsavedChanges(busy)
 useEffect(() => {
  const controller = new AbortController()
  setLoading(true); setError('')
  api(`/api/operations/daily-summary?${new URLSearchParams({ date: serviceDate, page })}`, undefined, { signal: controller.signal })
   .then(result => { if (!controller.signal.aborted) { setData(result); setLoading(false) } })
   .catch(e => { if (!controller.signal.aborted) { setError(message(e)); setLoading(false) } })
  return () => controller.abort()
 }, [serviceDate, page, refresh])
 function loadDate(event) {
  event.preventDefault()
  if (!validDate(date)) { setDateError('Enter a valid date: YYYY-MM-DD.'); return }
  setDateError(''); setPage(1); setServiceDate(date); setNotice(''); setRefresh(n => n + 1)
 }
 async function prepare(kind) {
  if (lock.current) return
  lock.current = true; setBusy(true); setError(''); setNotice('')
  try {
   const result = await api('/api/operations/daily-summary', { serviceDate, kind })
   setNotice(`${kindLabel(kind)} saved as revision ${result.snapshot.revision}. ${result.outbox ? 'Delivery is not enabled.' : 'No LINE message was sent.'}`)
   setPage(1); setRefresh(n => n + 1)
  } catch (e) { setError(message(e)) } finally { lock.current = false; setBusy(false) }
 }
 const snapshots = data?.snapshots || [], readiness = data?.readiness
 return <>
  <div className="page-heading"><div><h1 tabIndex="-1">{t("Daily summaries")}</h1><p>{t("Capture the closing totals and review the next day's boat and transfer summaries.")}</p></div></div>
  <SummaryCards items={[{ label: 'Service date', value: serviceDate }, { label: 'Closing reference', value: '22:00' }, { label: 'Summary time', value: '22:30' }, { label: 'LINE delivery', value: readiness?.deliveryEnabled ? 'Enabled' : 'Not enabled' }]} />
  <section className="panel table-panel">
   <form noValidate className="filterbar" onSubmit={loadDate}><DateField label={t("Service date (Thailand)")} value={date} placeholder="YYYY-MM-DD" error={t(dateError)} onChange={e => setDate(e.target.value)} disabled={busy} /><Button type="submit" disabled={busy}>{t("Load date")}</Button></form>
   <div className="address-section"><p>{t("Times use Thailand time on the evening before the service date. Capturing a snapshot preserves a reference; it does not stop Booking from recording later changes.")}</p><p>{t("Allocated runs only. Check unassigned bookings before using or sending the summary.")}</p>
    <p role="status">{readiness?.schedulerEnabled ? t('Automatic preparation enabled.') : t('Automatic preparation is not enabled.')} {readiness?.missing?.length ? t('LINE connection details and a reachable job-order address must be configured before delivery.') : readiness?.note}</p>
    <div className="dialog-actions"><Button disabled={busy || loading || !data || Boolean(error)} busy={busy} onClick={() => prepare('CLOSE')}>{t("Capture closing snapshot")}</Button><Button disabled={busy || loading || !data || Boolean(error)} onClick={() => prepare('SUMMARY')}>{t("Prepare LINE summary")}</Button><RefreshButton disabled={busy} onClick={() => setRefresh(n => n + 1)}/></div>
   </div>
   {notice && <p role="status">{t(notice)}</p>}
   <DataTable label={t("Daily summary history")} columns={['Snapshot', 'Revision', 'Captured (Thailand)', 'Runs', 'Actions']} busy={loading} error={t(error)} onRetry={() => setRefresh(n => n + 1)} isEmpty={!snapshots.length} empty={<p>{t("No snapshots for this service date. Capture the totals when the team is ready.")}</p>}>
    {snapshots.map(snapshot => <tr key={snapshot.id}><td>{kindLabel(snapshot.kind)}</td><td>{snapshot.revision}</td><td>{stamp(snapshot.createdAt)}</td><td>{snapshot.runs?.length || 0}</td><td><Dropdown rowActions label={t("Actions for {value0} revision {value1}", {value0: snapshot.kind, value1: snapshot.revision})} items={[{label:'View',icon:'view',onSelect:() => setView(snapshot)}]}/></td></tr>)}
   </DataTable><Pagination page={data?.page || page} pageSize={data?.pageSize || 25} total={error ? undefined : data?.total ?? snapshots.length} busy={loading} onPageChange={setPage} />
  </section>{view && <SnapshotView snapshot={view} onClose={() => setView(null)} />}
 </>
}
