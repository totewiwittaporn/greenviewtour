export async function api(path, body, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options,
    ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    signal: options.signal || AbortSignal.timeout(15000),
  })
  const data = await response.json()
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth/') && path !== '/api/me') window.location.assign('/login')
    const error = new Error(data.code || 'SERVICE_UNAVAILABLE'); error.status = response.status; throw error
  }
  return data
}
export const authMessage = error => ({
  INVALID_CREDENTIALS: 'Unable to sign in. Check your email and password, and confirm your email if you have just registered.',
  INVITATION_INVALID: 'This invitation link is invalid, expired or revoked. Ask your Manager for a new link.',
  INVITATION_UNAVAILABLE: 'This invitation is no longer authorized. Ask your Manager for a new link.',
  INVITATION_IN_PROGRESS: 'This invitation is being processed. Wait for the current request to finish.',
  INVITATION_ALREADY_SUBMITTED: 'This invitation has already been accepted. Confirm your email and sign in.',
  INVITE_LINK_REQUIRED: 'Open the invitation link provided by your Manager.',
  INVITATION_REQUIRED: 'This account does not have an active staff invitation. Contact your Manager.',
  EMAIL_CONFIRMATION_REQUIRED: 'Confirm your email, then sign in again.',
  ACCOUNT_UNAVAILABLE: 'This account cannot access the workspace. Contact your Manager.',
  RATE_LIMITED: 'Too many attempts. Wait a minute before trying again.',
  SESSION_EXPIRED: 'Your session has expired. Sign in again.',
  SESSION_REQUIRED: 'Open a new password reset link from your email.',
  RECOVERY_REQUIRED: 'Open a new password reset link from your email.',
  RECOVERY_INVALID: 'This reset link is invalid or expired. Request a new one.',
  REGISTRATION_FAILED: 'Unable to register. If you already have an account, try signing in or resetting your password.',
  PASSWORD_UPDATE_FAILED: 'Unable to update your password. Try a different password or request a new reset link.',
}[error.message] || 'Unable to connect right now. Check your connection and try again.')
