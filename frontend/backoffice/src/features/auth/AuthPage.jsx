import { useEffect, useRef, useState } from 'react'
import { AuthLayout } from '../../core/ui/AuthLayout.jsx'
import { FormField } from '../../core/ui/FormField.jsx'
import { Button } from '../../core/ui/Button.jsx'
import { api, authMessage } from '../../core/auth/api.js'
const content = {
  login: ['Welcome back', 'Sign in to your Greenview Tour workspace.', 'Sign in'],
  register: ['Join the team', 'Open your private invitation and choose your own password.', 'Set password'],
  forgot: ['Forgot your password?', 'Enter your email to request a password reset link.', 'Send reset link'],
  reset: ['Set a new password', 'Choose a password that only you know.', 'Save password'],
}
// Read and remove credentials before loading any third-party assets. Nothing is persisted.
const fragment = new URLSearchParams(window.location.hash.slice(1))
const invitation = window.location.pathname === '/accept-invitation' && fragment.get('invitation') ? { code: fragment.get('invitation') } : null
const recovery = window.location.pathname === '/reset-password' && fragment.get('type') === 'recovery'
  ? { access_token: fragment.get('access_token'), refresh_token: fragment.get('refresh_token') } : null
const callbackError = fragment.has('error')
if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
export default function AuthPage({ mode = 'login' }) {
  const [values, setValues] = useState({ email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({}), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [failure, setFailure] = useState(callbackError ? 'This link is invalid or expired. Request a new link.' : '')
  const [ready, setReady] = useState(!['reset','register'].includes(mode)), form = useRef(null), lock = useRef(false)
  const [title, description, action] = content[mode]
  useEffect(() => {
    document.title = `${title} · Greenview Tour`
    if (mode === 'register') {
      if (!invitation) return
      invitation.promise ||= api('/api/auth/invitation', { invitationCode: invitation.code })
      let active = true
      invitation.promise.then(data => {
        if (!active) return
        setValues(old => ({ ...old, email: data.email }))
        if (data.accepted) setMessage('Your password has already been submitted. Confirm your email, then sign in. If you forgot your password, use Forgot password on the sign-in page.')
        else setReady(true)
      }).catch(error => { if (active) setFailure(authMessage(error)) })
      return () => { active = false }
    }
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
    setErrors(next)
    if (Object.keys(next).length) { requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    lock.current = true; setBusy(true); setFailure('')
    try {
      if (mode === 'login') { await api('/api/auth/login', { email: values.email, password: values.password }); window.location.assign('/'); return }
      if (mode === 'register') { const result = await api('/api/auth/accept-invitation', { password: values.password, invitationCode: invitation?.code }); setMessage(result.message === 'READY_TO_SIGN_IN' ? 'Your password is set. Return to sign in.' : 'Check your inbox to confirm your email, then sign in. If you already have an account, sign in with your existing password or use Forgot password.') }
      if (mode === 'forgot') { await api('/api/auth/recover', { email: values.email }); setMessage('If your email can receive a reset message, a link will arrive shortly. Check your inbox and spam folder.') }
      if (mode === 'reset') { const result = await api('/api/auth/reset-password', { password: values.password }); setMessage(result.warning ? 'Your password has been updated and you have been signed out of this workspace. Contact your administrator to check remaining session cleanup.' : 'Your password has been updated. Sign in with your new password.') }
      setValues(old => ({ ...old, password: '', confirm: '' }))
    } catch (error) { setFailure(authMessage(error)) }
    finally { lock.current = false; setBusy(false) }
  }
  return <AuthLayout title={title} description={description}>
    {message ? <div className="auth-result" role="status"><strong>{mode === 'reset' ? 'Password updated' : 'Check your email'}</strong><p>{message}</p><a href="/login">Return to sign in →</a></div> : <form ref={form} noValidate onSubmit={submit} aria-busy={busy}>
      <div className="form-feedback" role={failure ? 'alert' : undefined}>{failure}</div>
      {mode === 'register' && !ready ? <div className="auth-result"><p>{invitation && !failure ? 'Checking your invitation…' : 'Accounts are created by invitation only. Ask your Manager for a new invitation link.'}</p><a href="/login">Return to sign in</a></div> : mode === 'reset' && !ready ? <div className="auth-result"><p>{recovery && !failure ? 'Checking your reset link…' : 'Open the password reset link from your email to continue.'}</p><a href="/forgot-password">Request a new reset link</a></div> : <>
        {mode !== 'reset' && <FormField label="Email address" name="email" type="email" autoComplete="email" maxLength={254} value={values.email} onChange={change('email')} error={errors.email} disabled={busy} readOnly={mode === 'register'} />}
        {mode !== 'forgot' && <FormField label={mode === 'login' ? 'Password' : 'New password'} name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} maxLength={128} value={values.password} onChange={change('password')} error={errors.password} hint={mode === 'login' ? '' : 'Use 12–128 characters. Password managers and paste are welcome.'} disabled={busy} />}
        {['register','reset'].includes(mode) && <FormField label="Confirm password" name="confirm" type="password" autoComplete="new-password" maxLength={128} value={values.confirm} onChange={change('confirm')} error={errors.confirm} disabled={busy} />}
        {mode === 'login' && <a className="forgot-link" href="/forgot-password">Forgot password?</a>}
        <Button type="submit" className="button-primary auth-submit" busy={busy} disabled={busy || !ready}>{action}<span aria-hidden="true">{busy ? '…' : '→'}</span></Button>
      </>}
    </form>}
    <div className="auth-switch">{mode === 'login' ? <>Need access? Ask your Manager for an invitation.</> : <a href="/login">Back to sign in</a>}</div>
  </AuthLayout>
}
