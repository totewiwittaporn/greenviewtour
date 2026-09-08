import { useEffect, useRef, useState } from 'react'
import { AuthLayout } from '../../core/ui/AuthLayout.jsx'
import { FormField } from '../../core/ui/FormField.jsx'
import { Button } from '../../core/ui/Button.jsx'
import { api, authMessage } from '../../core/auth/api.js'
const content = {
  login: ['Welcome back', 'Sign in to your Greenview Tour workspace.', 'Sign in'],
  register: ['Join the team', 'Use the email and invitation code provided by your Manager.', 'Create account'],
  forgot: ['Forgot your password?', 'Enter your email to request a password reset link.', 'Send reset link'],
  reset: ['Set a new password', 'Choose a password that only you know.', 'Save password'],
}
// Read and remove credentials before loading any third-party assets. Nothing is persisted.
const fragment = new URLSearchParams(window.location.hash.slice(1))
const recovery = window.location.pathname === '/reset-password' && fragment.get('type') === 'recovery'
  ? { access_token: fragment.get('access_token'), refresh_token: fragment.get('refresh_token') } : null
const callbackError = fragment.has('error')
if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
export default function AuthPage({ mode = 'login' }) {
  const [values, setValues] = useState({ email: '', password: '', confirm: '', invitationCode: '' })
  const [errors, setErrors] = useState({}), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [failure, setFailure] = useState(callbackError ? 'This link is invalid or expired. Request a new link.' : '')
  const [ready, setReady] = useState(mode !== 'reset'), form = useRef(null), lock = useRef(false)
  const [title, description, action] = content[mode]
  useEffect(() => {
    document.title = `${title} · Greenview Tour`
    if (mode !== 'reset') return
    if (!recovery?.access_token || !recovery?.refresh_token) {
      let active = true
      api('/api/auth/recovery-status').then(() => { if (active) setReady(true) }).catch(() => {})
      return () => { active = false }
    }
    // A module-level promise prevents duplicate exchange under React StrictMode.
    recovery.promise ||= api('/api/auth/recovery-session', { access_token: recovery.access_token, refresh_token: recovery.refresh_token }).finally(() => { delete recovery.access_token; delete recovery.refresh_token })
    let active = true
    recovery.promise.then(() => { if (active) setReady(true) }).catch(error => { if (active) setFailure(authMessage(error)) })
    return () => { active = false }
  }, [mode, title])
  const change = name => event => { setValues(old => ({ ...old, [name]: event.target.value })); setErrors(old => ({ ...old, [name]: '' })) }
  async function submit(event) {
    event.preventDefault()
    if (event.nativeEvent.isComposing || lock.current || message) return
    const next = {}
    if (mode !== 'reset' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid email address.'
    if (mode !== 'forgot' && (!values.password || values.password.length > 128)) next.password = 'Enter your password (up to 128 characters).'
    if (['register','reset'].includes(mode)) {
      if (values.password.length < 12) next.password = 'Use at least 12 characters.'
      if (values.confirm !== values.password) next.confirm = 'Passwords must match.'
    }
    if (mode === 'register' && !/^[a-f0-9]{64}$/.test(values.invitationCode.trim())) next.invitationCode = 'Paste the complete invitation code from your Manager.'
    setErrors(next)
    if (Object.keys(next).length) { requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    lock.current = true; setBusy(true); setFailure('')
    try {
      if (mode === 'login') { await api('/api/auth/login', { email: values.email, password: values.password }); window.location.assign('/'); return }
      if (mode === 'register') { await api('/api/auth/register', { email: values.email, password: values.password, invitationCode: values.invitationCode.trim() }); setMessage('Check your inbox to confirm your email, then return here to sign in. If you already have an account, sign in with your existing password.') }
      if (mode === 'forgot') { await api('/api/auth/recover', { email: values.email }); setMessage('If your email can receive a reset message, a link will arrive shortly. Check your inbox and spam folder.') }
      if (mode === 'reset') { await api('/api/auth/reset-password', { password: values.password }); setMessage('Your password has been updated. Sign in with your new password.') }
      setValues(old => ({ ...old, password: '', confirm: '', invitationCode: '' }))
    } catch (error) { setFailure(authMessage(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <AuthLayout title={title} description={description}>
    {message ? <div className="auth-result" role="status"><strong>{mode === 'reset' ? 'Password updated' : 'Check your email'}</strong><p>{message}</p><a href="/login">Return to sign in →</a></div> : <form ref={form} noValidate onSubmit={submit} aria-busy={busy}>
      <div className="form-feedback" role={failure ? 'alert' : undefined}>{failure}</div>
      {mode === 'reset' && !ready ? <div className="auth-result"><p>{recovery && !failure ? 'Checking your reset link…' : 'Open the password reset link from your email to continue.'}</p><a href="/forgot-password">Request a new reset link</a></div> : <>
        {mode !== 'reset' && <FormField label="Email address" name="email" type="email" autoComplete="email" maxLength={254} value={values.email} onChange={change('email')} error={errors.email} disabled={busy} />}
        {mode === 'register' && <FormField label="Invitation code" name="invitationCode" type="password" autoComplete="off" value={values.invitationCode} onChange={change('invitationCode')} error={errors.invitationCode} disabled={busy} />}
        {mode !== 'forgot' && <FormField label={mode === 'login' ? 'Password' : 'New password'} name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={128} value={values.password} onChange={change('password')} error={errors.password} hint={mode === 'login' ? '' : 'Use 12–128 characters. Password managers and paste are welcome.'} disabled={busy} />}
        {['register','reset'].includes(mode) && <FormField label="Confirm password" name="confirm" type="password" autoComplete="new-password" maxLength={128} value={values.confirm} onChange={change('confirm')} error={errors.confirm} disabled={busy} />}
        {mode === 'login' && <a className="forgot-link" href="/forgot-password">Forgot password?</a>}
        <Button type="submit" className="button-primary auth-submit" busy={busy} disabled={busy}>{action}<span aria-hidden="true">{busy ? '…' : '→'}</span></Button>
      </>}
    </form>}
    <div className="auth-switch">{mode === 'login' ? <>Have an invitation? <a href="/register">Create your account</a></> : <a href="/login">Back to sign in</a>}</div>
  </AuthLayout>
}
