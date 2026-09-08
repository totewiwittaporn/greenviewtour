import { useRef, useState } from 'react'
import { Dialog } from '../../../core/ui/Dialog.jsx'
import { Button } from '../../../core/ui/Button.jsx'
import { api } from '../../../core/auth/api.js'
export function ResetPassword({ user, onClose }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(''), lock = useRef(false)
  async function send() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await api(`/api/users/${user.id}/reset-password`, {}); setMessage('Reset email requested. Ask the employee to check their inbox and spam folder.') }
    catch (error) { setError(error.status === 403 ? 'You no longer have permission to reset this account.' : error.status === 429 ? 'Too many requests. Wait a minute and try again.' : 'The reset email could not be requested. Check the connection and try again.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <Dialog title="Send password reset" onClose={onClose} busy={busy}><p>Send a password reset link to <strong>{user.email}</strong>?</p><p>The employee chooses a new password. Passwords are never shown to administrators.</p>{error && <p role="alert" className="inline-error">{error}</p>}{message ? <p role="status">{message}</p> : <div className="dialog-actions"><Button autoFocus disabled={busy} onClick={onClose}>Back</Button><Button className="button-primary" busy={busy} disabled={busy} onClick={send}>Send reset email</Button></div>}</Dialog>
}
