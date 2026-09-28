import {translateLabel as bilingualLabel} from '../../core/i18n/runtime.js'
import { formatDate as displayDate } from '../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../core/i18n/locale.jsx'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../core/ui/Button.jsx'
import { AddressFields } from '../../core/ui/AddressFields.jsx'
import { Dialog } from '../../core/ui/Dialog.jsx'
import { addressKeys, validateAddress } from '../../../../../packages/contracts/address.js'
import { useUnsavedChanges } from '../../core/navigation/Navigation.jsx'
import { FormField } from '../../core/ui/FormField.jsx'
import { api, authMessage } from '../../core/auth/api.js'
const values = user => Object.fromEntries(['displayName', 'nickname', 'primaryPhone', 'emergencyPhone', 'lineId', 'address', ...addressKeys].map(key => [key, user[key] || '']))
const phoneValid = value => !value.trim() || (/^\+?[0-9 ()-]+$/.test(value.trim()) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15)
export default function ProfilePage({ user, onSaved }) {
 useLocale();
  const [reloadConfirm,setReloadConfirm]=useState(false)
  const [saved, setSaved] = useState(user), [fields, setFields] = useState(() => values(user))
  const [errors, setErrors] = useState({}), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [secrets, setSecrets] = useState({ currentPassword: '', password: '', confirm: '' }), [passwordErrors, setPasswordErrors] = useState({}), [passwordError, setPasswordError] = useState(''), [done, setDone] = useState(null)
  const lock = useRef(false), form = useRef(null), passwordForm = useRef(null)
  const dirty = JSON.stringify(fields) !== JSON.stringify(values(saved))
  const hasSecrets = Object.values(secrets).some(Boolean)
  useUnsavedChanges(!done && (dirty || hasSecrets || busy))
  function update(key, value) { setFields(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: '' })); setMessage('') }
  useEffect(() => { if (!busy && Object.values(errors).some(Boolean)) form.current?.querySelector('[aria-invalid="true"]')?.focus() }, [errors, busy])
  useEffect(() => { if (!busy && Object.values(passwordErrors).some(Boolean)) passwordForm.current?.querySelector('[aria-invalid="true"]')?.focus() }, [passwordErrors, busy])
  async function save(event) {
    event.preventDefault(); if (lock.current) return
    const invalid = validateAddress(fields)
    if (!fields.displayName.trim()) invalid.displayName = 'Enter your name.'
    if (fields.nickname.trim().length > 50 || [...fields.nickname].some(char => char.charCodeAt(0) < 32 || (char.charCodeAt(0) >= 127 && char.charCodeAt(0) <= 159))) invalid.nickname = 'Use up to 50 characters without control characters.'
    for (const key of ['primaryPhone', 'emergencyPhone']) if (!phoneValid(fields[key])) invalid[key] = 'Use 7–15 digits, with optional +, spaces, brackets or hyphens.'
    setErrors(invalid); setMessage(''); setError('')
    if (Object.keys(invalid).length) { return }
    lock.current = true; setBusy(true)
    try {
      await api('/api/me/profile', { ...fields, updatedAt: saved.updatedAt })
      // Refresh the version before allowing a second save.
      const result = await api('/api/me')
      setSaved(result.user); setFields(values(result.user)); onSaved(result.user); setMessage('Profile updated.')
    } catch (error) { setError(error.status === 409 ? 'Your profile has changed elsewhere. Reload the latest profile before saving again.' : 'Unable to finish saving. Your entries are still here. Reload the latest profile to check whether the save completed.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function reload(confirmed = false) {
    if (lock.current) return
    if (dirty && !confirmed) { setReloadConfirm(true); return }
    setReloadConfirm(false)
    lock.current = true; setBusy(true)
    try { const result = await api('/api/me'); setSaved(result.user); setFields(values(result.user)); onSaved(result.user); setError(''); setErrors({}) }
    catch (error) { setError(authMessage(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  async function changePassword(event) {
    event.preventDefault(); if (lock.current) return
    const invalid = {}
    if (!secrets.currentPassword) invalid.currentPassword = 'Enter your current password.'
    if (secrets.password.length < 12) invalid.password = 'Use at least 12 characters.'
    else if (secrets.password === secrets.currentPassword) invalid.password = 'Choose a different password.'
    if (secrets.confirm !== secrets.password) invalid.confirm = 'Passwords do not match.'
    setPasswordErrors(invalid); setPasswordError('')
    if (Object.keys(invalid).length) { return }
    if (dirty) { setPasswordError('Save or discard your profile changes first. Changing your password signs you out.'); return }
    lock.current = true; setBusy(true)
    try {
      const result = await api('/api/me/password', { currentPassword: secrets.currentPassword, password: secrets.password })
      setSecrets({ currentPassword: '', password: '', confirm: '' }); setDone(result)
    } catch (error) {
      if (error.message === 'INVALID_CREDENTIALS') { setPasswordErrors({ currentPassword: 'The current password is incorrect.' }) }
      else setPasswordError(authMessage(error))
    } finally { lock.current = false; setBusy(false) }
  }
  if (done) return <section className="panel auth-result" role="status"><h1>{bilingualLabel("Password changed")}</h1><p>{t("Sign in again with your new password.")}</p>{done.warning && <p>{t("Your password was changed, but some session cleanup could not finish. Contact your Manager if other devices remain signed in.")}</p>}<a className="button button-primary" href="/login">{t("Return to sign in")}</a></section>
  return <>
    {reloadConfirm&&<Dialog title={bilingualLabel("Reload profile?")} onClose={()=>setReloadConfirm(false)}><p>{t("Discard your unsaved profile changes and reload?")}</p><div className="dialog-actions"><Button autoFocus onClick={()=>setReloadConfirm(false)}>{t("Keep editing")}</Button><Button onClick={()=>reload(true)}>{t("Discard and reload")}</Button></div></Dialog>}
    <section className="page-heading"><div><p className="eyebrow">{bilingualLabel("YOUR ACCOUNT")}</p><h1>{bilingualLabel("Edit profile")}</h1><p className="muted">{t("Keep your details up to date so your team can reach you.")}</p></div><a className="button" href="/">{t("Back to workspace")}</a></section>
    <div className="profile-layout"><aside className="panel profile-summary"><div className="profile-identity"><span className="profile-avatar">{saved.displayName?.[0]?.toUpperCase()}</span><div><h2>{saved.displayName}</h2><p>{saved.email}</p></div></div><dl className="profile-details"><dt>{bilingualLabel("Department")}</dt><dd>{t(saved.department || 'Not assigned')}</dd><dt>{bilingualLabel("Roles")}</dt><dd>{saved.roles.map(role => t(role.name)).join(' · ')}</dd><dt>{bilingualLabel("Status")}</dt><dd>{t(saved.status)}</dd><dt>{bilingualLabel("Joined")}</dt><dd>{saved.createdAt ? displayDate(new Date(saved.createdAt), { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }) : t('Not available')}</dd></dl><p className="muted">{t("Contact your Manager to update your account access.")}</p></aside>
      <div className="profile-sections"><section className="panel"><div className="panel-heading"><div><h2>{bilingualLabel("Personal & contact details")}</h2><p>{t("Contact details are optional and visible to authorized team managers.")}</p></div></div><form className="profile-form" ref={form} noValidate onSubmit={save} aria-busy={busy}>
        <FormField label={bilingualLabel("Display name")} value={fields.displayName} onChange={e => update('displayName', e.target.value)} maxLength={100} autoComplete="name" error={errors.displayName} disabled={busy} />
        <FormField label={bilingualLabel("Nickname")} value={fields.nickname} onChange={e => update('nickname', e.target.value)} maxLength={50} autoComplete="nickname" error={errors.nickname} disabled={busy} />
        <div className="profile-field-grid">{[['primaryPhone', 'Primary phone', 'tel'], ['emergencyPhone', 'Emergency phone', 'off']].map(([key, label, complete]) => <FormField key={key} label={label} type="tel" value={fields[key]} onChange={e => update(key, e.target.value)} maxLength={32} autoComplete={complete} error={errors[key]} disabled={busy} hint={key === 'emergencyPhone' ? t('An alternative number if your primary phone is unavailable.') : t('Include the country code when needed.')} />)}</div>
        <FormField label={bilingualLabel("Line ID")} value={fields.lineId} onChange={e => update('lineId', e.target.value)} maxLength={100} autoComplete="off" disabled={busy} />
        <AddressFields values={fields} onChange={update} errors={errors} disabled={busy} legacyAddress={saved.address} />
        {error && <div role="alert"><p className="field-error">{t(error)}</p><Button disabled={busy} onClick={() => reload()}>{t("Reload latest profile")}</Button></div>}{message && <p role="status" className="save-notice">{t(message)}</p>}
        <div className="profile-form-actions"><span className="muted">{dirty ? t('Unsaved changes') : t('All changes saved')}</span><Button disabled={busy || !dirty} onClick={() => { setFields(values(saved)); setErrors({}); setError(''); setMessage('') }}>{t("Discard changes")}</Button><Button type="submit" className="button-primary" disabled={busy || !dirty} busy={busy}>{t("Save changes")}</Button></div>
      </form></section>
      <section className="panel"><div className="panel-heading"><div><h2>{bilingualLabel("Change password")}</h2><p>{t("Confirm your current password. You will sign in again after the change.")}</p></div></div><form className="profile-form" ref={passwordForm} noValidate onSubmit={changePassword} aria-busy={busy}>
        {Object.entries({ currentPassword: 'Current password', password: 'New password', confirm: 'Confirm new password' }).map(([key, label]) => <FormField key={key} label={label} type="password" value={secrets[key]} onChange={e => { setSecrets(old => ({ ...old, [key]: e.target.value })); setPasswordErrors(old => ({ ...old, [key]: '' })) }} autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} maxLength={128} error={passwordErrors[key]} hint={key === 'password' ? t('At least 12 characters.') : undefined} disabled={busy} />)}
        {passwordError && <p className="field-error" role="alert">{t(passwordError)}</p>}<div className="profile-form-actions"><Button type="submit" disabled={busy} busy={busy}>{t("Change password")}</Button></div>
      </form></section></div>
    </div>
  </>
}
