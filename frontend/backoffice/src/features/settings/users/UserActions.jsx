import { useRef, useState } from 'react'
import { Dialog } from '../../../core/ui/Dialog.jsx'
import { Button } from '../../../core/ui/Button.jsx'
import { AddressFields } from '../../../core/ui/AddressFields.jsx'
import { addressKeys, validateAddress, formatAddress, mapLinks } from '../../../../../../packages/contracts/address.js'
import { useUnsavedChanges } from '../../../core/navigation/Navigation.jsx'
import { FormField } from '../../../core/ui/FormField.jsx'
import { SelectField } from '../../../core/ui/SelectField.jsx'
import { api } from '../../../core/auth/api.js'
const departments = ['MANAGEMENT','BOOKING','ACCOUNT','GUIDE','CAPTAIN','DRIVER']
export function UserActions({ user, canChangeDepartment, onClose, onSaved, initialMode = 'view', self = false }) {
  const [mode,setMode] = useState(initialMode), [displayName,setDisplayName] = useState(user.displayName || ''), [department,setDepartment] = useState(user.department || '')
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [fieldError,setFieldError] = useState(''), [discard,setDiscard] = useState(false)
  const [contacts, setContacts] = useState(() => Object.fromEntries(['primaryPhone', 'emergencyPhone', 'lineId', 'address', ...addressKeys].map(key => [key, user[key] || ''])))
  const [addressErrors,setAddressErrors]=useState({})
  const form = useRef(null), lock = useRef(false)
  const dirty = displayName !== (user.displayName || '') || department !== (user.department || '') || Object.entries(contacts).some(([key, value]) => value !== (user[key] || ''))
  useUnsavedChanges(mode !== 'view' && (dirty || busy))
  function close() { if (busy) return; if (dirty) setDiscard(true); else onClose() }
  async function save(event) {
    event?.preventDefault()
    if (lock.current) return
    if (!displayName.trim() || displayName.trim().length > 100) { setFieldError('Enter a name from 1 to 100 characters.'); requestAnimationFrame(() => form.current?.querySelector('input')?.focus()); return }
    const invalid = validateAddress(contacts); setAddressErrors(invalid)
    if (Object.keys(invalid).length) { requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    if (canChangeDepartment && department !== (user.department || '') && mode !== 'review') { setMode('review'); return }
    lock.current = true; setBusy(true); setError('')
    try {
      await api(self ? '/api/me/profile' : `/api/users/${user.id}/profile`, { displayName, ...contacts, updatedAt: user.updatedAt, ...(canChangeDepartment ? { department: department || null } : {}) })
      onSaved()
    } catch (error) { setError(error.message === 'INVALID_PHONE' ? 'Phone numbers must contain 7–15 digits, with optional +, spaces, brackets or hyphens.' : error.status === 409 ? 'This profile changed while you were editing. Close this window, refresh the list and try again.' : error.status === 403 ? 'Your permission to edit this user has changed. Close this window and refresh the list.' : 'Unable to save changes. Check your connection and try again.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <Dialog title={discard ? 'Discard changes?' : mode === 'edit' ? self ? 'Edit profile' : 'Edit user' : mode === 'review' ? 'Review department change' : mode === 'view' ? 'User details' : 'User actions'} onClose={close} busy={busy}>
    {discard ? <><p>Your changes to {user.email} have not been saved.</p><div className="dialog-actions"><Button autoFocus onClick={() => setDiscard(false)}>Keep editing</Button><Button onClick={onClose}>Discard changes</Button></div></> : <>
      <p className="action-subject">{user.email}</p>
      {mode === 'view' ? <dl className="profile-details"><dt>Name</dt><dd>{user.displayName}</dd><dt>Department</dt><dd>{user.department || 'Not assigned'}</dd>{Object.entries({ primaryPhone: 'Primary phone', emergencyPhone: 'Emergency phone', lineId: 'Line ID', address: 'Address' }).map(([key, label]) => <div className="profile-detail-pair" key={key}><dt>{label}</dt><dd>{(key==='address'?formatAddress(user):user[key]) || 'Not provided'}</dd></div>)}{mapLinks(user).pin&&<div><dt>Map location</dt><dd><a href={mapLinks(user).pin} target="_blank" rel="noopener noreferrer">Open saved pin</a></dd></div>}<dt>Status</dt><dd>{user.status}</dd><dt>Roles</dt><dd>{user.roles?.map(role => role.roleCode).join(' · ')}</dd></dl> : <form ref={form} noValidate onSubmit={save} aria-busy={busy}>
        {mode === 'review' ? <><p>Move this user from <strong>{user.department || 'Not assigned'}</strong> to <strong>{department || 'Not assigned'}</strong>?</p><p>Department assignment controls which Head can manage this profile. For Head accounts, it also controls access to their department directory.</p></> : <>
          <FormField label="Display name" value={displayName} onChange={event => { setDisplayName(event.target.value); setFieldError('') }} error={fieldError} maxLength={100} disabled={busy} autoComplete="off" />
          {canChangeDepartment ? <SelectField label="Department" value={department} onChange={event => setDepartment(event.target.value)} disabled={busy} hint="Heads can manage profiles only in their assigned department."><option value="">Not assigned</option>{departments.map(item => <option key={item} value={item}>{item}</option>)}</SelectField> : <p>Department: {user.department}</p>}
          {Object.entries({ primaryPhone: 'Primary phone', emergencyPhone: 'Emergency phone', lineId: 'Line ID' }).map(([key, label]) => <FormField key={key} label={label} type={key.endsWith('Phone') ? 'tel' : 'text'} value={contacts[key]} onChange={e => setContacts(old => ({ ...old, [key]: e.target.value }))} maxLength={key === 'lineId' ? 100 : 32} disabled={busy} autoComplete="off" />)}
          <AddressFields values={contacts} legacyAddress={user.address} errors={addressErrors} disabled={busy} onChange={(key,value)=>{setContacts(old=>({...old,[key]:value}));setAddressErrors(old=>({...old,[key]:undefined}))}} />
          <p className="field-help">Email, password, account status and roles are unchanged by this form.</p>
        </>}
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="dialog-actions">{mode === 'review' && <Button disabled={busy} onClick={() => setMode('edit')}>Back to edit</Button>}<Button type="submit" className="button-primary" disabled={busy || !dirty} busy={busy}>{mode === 'review' ? 'Confirm department change' : 'Save changes'}</Button></div>
      </form>}
    </>}
  </Dialog>
}
