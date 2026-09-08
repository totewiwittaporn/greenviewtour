import { useEffect, useRef, useState } from 'react'
import { api } from '../../../core/auth/api.js'
import { Icon } from '../../../core/ui/Icon.jsx'
import { Button } from '../../../core/ui/Button.jsx'
import { Dialog } from '../../../core/ui/Dialog.jsx'
import { Dropdown } from '../../../core/ui/Dropdown.jsx'
import { FormField } from '../../../core/ui/FormField.jsx'
import { SelectField } from '../../../core/ui/SelectField.jsx'
import { Pagination } from '../../../core/ui/Pagination.jsx'
import { SummaryCards } from '../../../core/ui/SummaryCards.jsx'
import { SearchField } from '../../../core/ui/SearchField.jsx'
import { DataTable } from '../../../core/ui/DataTable.jsx'
const date = value => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value))
const message = error => ({
  INVITATION_EMAIL_UNDELIVERABLE: 'Use an email address that can receive confirmation messages. Local-only addresses such as @system.local cannot activate through this invitation flow.',
  INVITATION_ALREADY_EXISTS: 'An invitation already exists for this email. Close this form and use its Actions menu to create a new link.',
  ACCOUNT_ALREADY_EXISTS: 'This employee already has an account. Use the user directory to manage it.',
  ROLE_ASSIGNMENT_DENIED: 'Your permission to assign this role has changed. Refresh the page.',
  ROLE_DEPARTMENT_MISMATCH: 'The selected Head or Manager role must match its department.',
  PERMISSION_DENIED: 'Your permission to manage invitations has changed. Refresh the page.',
  INVITATION_ALREADY_USED: 'This employee has already joined. Refresh the user directory.',
}[error.message] || 'Unable to complete the request. Refresh invitations to check its status before trying again.')
function InvitationLink({ result }) {
  const [copied, setCopied] = useState(''), field = useRef(null)
  const link = `${window.location.origin}/accept-invitation#invitation=${result.invitationCode}`
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied('Invitation link copied.') }
    catch { field.current?.focus(); field.current?.select(); setCopied('Copy is unavailable. The link is selected; copy it manually.') }
  }
  return <><p>Invitation ready for <strong>{result.invitation.email}</strong>.</p><p>The employee opens this link, chooses their own password and confirms their email.</p><label htmlFor="invitation-link">Invitation link</label><textarea id="invitation-link" ref={field} className="invite-link resize-none" readOnly value={link} /><p className="field-help">Expires {date(result.invitation.expiresAt)} · Bangkok time. Keep this link private. It is shown only now.</p><p className="field-help">This Local link opens on this computer. A hosted workspace is needed for access from another device.</p><div className="dialog-actions"><Button className="button-primary" onClick={copy}>Copy invitation link</Button></div>{copied && <p role="status">{copied}</p>}</>
}
function InviteForm({ catalog, onClose, onCreated }) {
  const [values, setValues] = useState({ displayName: '', email: '', roleCode: '', department: '' }), [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [result, setResult] = useState(null), [discard, setDiscard] = useState(false)
  const form = useRef(null), lock = useRef(false)
  const dirty = Object.values(values).some(Boolean)
  function close() { if (!busy) { if (dirty && !result) setDiscard(true); else onClose() } }
  const change = key => event => { setValues(old => ({ ...old, [key]: event.target.value })); setErrors(old => ({ ...old, [key]: '' })) }
  async function submit(event) {
    event.preventDefault()
    if (event.nativeEvent.isComposing || lock.current) return
    const next = {}
    if (!values.displayName.trim()) next.displayName = 'Enter the employee’s name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid employee email.'
    if (!values.roleCode) next.roleCode = 'Choose a role.'
    if (!values.department) next.department = 'Choose a department.'
    const expected = { MANAGER: 'MANAGEMENT', HEAD_BOOKING: 'BOOKING', HEAD_GUIDE: 'GUIDE', HEAD_CAPTAIN: 'CAPTAIN', HEAD_DRIVER: 'DRIVER' }[values.roleCode]
    if (expected && values.department !== expected) next.department = `This role belongs to ${expected}.`
    setErrors(next)
    if (Object.keys(next).length) { requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    lock.current = true; setBusy(true); setFailure('')
    try { const data = await api('/api/invitations', values); setResult(data); onCreated() }
    catch (error) { setFailure(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <Dialog title={discard ? 'Discard invitation?' : result ? 'Invitation ready' : 'Add employee'} onClose={close} busy={busy}>
    {discard ? <><p>This invitation has not been created.</p><div className="dialog-actions"><Button autoFocus onClick={() => setDiscard(false)}>Keep editing</Button><Button onClick={onClose}>Discard changes</Button></div></> : result ? <InvitationLink result={result} /> : <form ref={form} noValidate onSubmit={submit} aria-busy={busy}>
      <p>Create a private invitation. The employee sets their own password after opening the link.</p>
      <FormField label="Full name" value={values.displayName} onChange={change('displayName')} error={errors.displayName} maxLength={100} autoComplete="off" disabled={busy} />
      <FormField label="Email address" hint="Use an address that can receive the confirmation email." type="email" value={values.email} onChange={change('email')} error={errors.email} maxLength={254} autoComplete="off" disabled={busy} />
      <SelectField label="Role" value={values.roleCode} onChange={change('roleCode')} error={errors.roleCode} disabled={busy}><option value="">Choose a role</option>{catalog.roles.map(role => <option key={role.code} value={role.code}>{role.name}</option>)}</SelectField>
      <SelectField label="Department" value={values.department} onChange={change('department')} error={errors.department} disabled={busy}><option value="">Choose a department</option>{catalog.departments.map(department => <option key={department}>{department}</option>)}</SelectField>
      <p className="field-help">The invitation expires in 72 hours. No email is sent when you create this link.</p>
      {failure && <p className="inline-error" role="alert">{failure}</p>}
      <div className="dialog-actions"><Button type="submit" className="button-primary" busy={busy} disabled={busy}>Create invitation link</Button></div>
    </form>}
  </Dialog>
}
function InvitationAction({ selection, onClose, onChanged }) {
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [result, setResult] = useState(null), lock = useRef(false)
  const renew = selection.action === 'renew'
  async function apply() {
    if (lock.current) return
    lock.current = true; setBusy(true); setFailure('')
    try { const data = await api(`/api/invitations/${selection.item.id}/${selection.action}`, {}); onChanged(); if (renew) setResult(data); else onClose() }
    catch (error) { setFailure(message(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <Dialog title={result ? 'New invitation link' : renew ? 'Create new invitation link' : 'Revoke invitation'} onClose={onClose} busy={busy}>{result ? <InvitationLink result={result} /> : <><p>{renew ? 'Create a new link' : 'Revoke the invitation'} for <strong>{selection.item.email}</strong>?</p><p>{renew ? 'The previous link will stop working. The new link expires in 72 hours.' : 'This employee will no longer be able to join using this invitation.'}</p>{failure && <p className="inline-error" role="alert">{failure}</p>}<div className="dialog-actions"><Button autoFocus onClick={onClose} disabled={busy}>Back</Button><Button onClick={apply} className="button-primary" disabled={busy} busy={busy}>{renew ? 'Create new link' : 'Revoke invitation'}</Button></div></>}</Dialog>
}
export function StaffInvitations({ open, onClose }) {
  const [state, setState] = useState({ loading: true }), [revision, setRevision] = useState(0), [selection, setSelection] = useState(null)
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [query, setQuery] = useState(''), [composing, setComposing] = useState(false)
  useEffect(() => {
    if (composing) return
    if (!search) { setQuery(''); setPage(1); return }
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search, composing])
  const refresh = () => setRevision(n => n + 1)
  useEffect(() => {
    const controller = new AbortController()
    setState(old => ({ ...old, loading: true, error: '' }))
    api(`/api/invitations?${new URLSearchParams({ page: String(page), pageSize: '25', search: query })}`, undefined, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }).then(data => { if (!controller.signal.aborted) setState({ data, loading: false }) }).catch(error => { if (!controller.signal.aborted) setState({ error: message(error), loading: false }) })
    return () => controller.abort()
  }, [revision, page, query])
  const items = state.data?.invitations || []
  return <>
    <SummaryCards label="Invitation summary" items={[
      { label: 'Total invitations', value: state.data?.summary?.total, detail: 'All invitations you can manage', icon: 'users' },
      { label: 'Awaiting staff', value: state.data?.summary?.awaiting, detail: 'Active invitations yet to join', icon: 'calendar' },
      { label: 'Joined', value: state.data?.summary?.joined, detail: 'Employees who have activated', icon: 'check' },
      { label: 'Expired or revoked', value: state.data?.summary?.inactive, detail: 'Inactive invitation links', icon: 'globe' },
    ]} />
    <section className="panel table-panel invite-panel"><div className="panel-heading"><div><h2>Employee invitations</h2><p>Manage employee access · Times shown in Bangkok time</p></div></div><div className="filterbar"><SearchField value={search} onChange={setSearch} onCompositionChange={setComposing} label="Search invitations by name or email" placeholder="Search by name or email…" /><Button busy={state.loading} disabled={state.loading} onClick={refresh}><Icon name="refresh" />Refresh invitations</Button></div>
    <DataTable label="Employee invitations" columns={['Employee', 'Role / Department', 'Status', 'Expires', 'Actions']} busy={state.loading} error={state.error} onRetry={refresh} loadingLabel="Loading invitations…" isEmpty={!items.length} empty={<><h3>{query ? 'No matching invitations' : 'No invitations yet'}</h3><p>{query ? 'Try another name or email, or clear the search.' : 'Choose Add employee to invite your first team member.'}</p>{query && <Button onClick={() => setSearch('')}>Clear search</Button>}</>}>
      {items.map(item => <tr key={item.id}><td><strong>{item.displayName}</strong><small className="role-label">{item.email}</small></td><td>{item.roles.join(' · ')}<small className="role-label">{item.department}</small></td><td><span className={`badge ${item.status === 'Joined' ? 'verified' : ''}`}>{item.status}</span></td><td>{date(item.expiresAt)}</td><td>{item.status === 'Joined' ? <span className="muted">Joined</span> : <Dropdown label={`Invitation actions for ${item.email}`} items={[
        { label: 'Create new link', onSelect: () => setSelection({ item, action: 'renew' }) },
        ...(!['Revoked','Expired'].includes(item.status) ? [{ label: 'Revoke invitation', danger: true, onSelect: () => setSelection({ item, action: 'revoke' }) }] : []),
      ]}><span aria-hidden="true">⋯</span></Dropdown>}</td></tr>)}
    </DataTable>
    <Pagination page={state.data?.page ?? page} pageSize={25} total={state.loading || state.error ? undefined : state.data?.total} busy={state.loading} onPageChange={setPage} label="Invitations pagination" />
  </section>
    {open && (state.data ? <InviteForm catalog={state.data} onClose={onClose} onCreated={refresh} /> : <Dialog title="Add employee" onClose={onClose}>{state.loading ? <p role="status">Loading available roles…</p> : <><p role="alert">{state.error}</p><Button onClick={refresh}>Retry</Button></>}</Dialog>)}
    {selection && <InvitationAction selection={selection} onClose={() => setSelection(null)} onChanged={refresh} />}
  </>
}
