import { createClient } from '@supabase/supabase-js'
import { AccessError } from '../../modules/identity-access/membership.js'
import { PREVIEW_PROJECT_REF } from '../database/config.js'
export function checkAuthResult(result, code = 'AUTH_FAILED') {
  if (result.error) {
    const status = result.error.status
    const known = {
      over_email_send_rate_limit: 'AUTH_EMAIL_RATE_LIMITED',
      over_request_rate_limit: 'AUTH_RATE_LIMITED',
      email_address_invalid: 'AUTH_EMAIL_INVALID',
      email_address_not_authorized: 'AUTH_EMAIL_NOT_AUTHORIZED',
      weak_password: 'PASSWORD_POLICY_REJECTED',
      user_already_exists: 'ACCOUNT_ALREADY_EXISTS',
      signup_disabled: 'SIGNUP_DISABLED',
      email_provider_disabled: 'SIGNUP_DISABLED',
    }
    const mapped = known[result.error.code]
    // Keep provider diagnostics useful without logging addresses, tokens or passwords.
    console.warn(JSON.stringify({ event: 'AUTH_PROVIDER_REJECTED', operation: code, status: Number.isInteger(status) ? status : null, providerCode: mapped ? result.error.code : 'unclassified' }))
    if (status === 429) throw new AccessError(mapped || 'AUTH_RATE_LIMITED', 429)
    if (!status || status >= 500 || result.error.name === 'AuthRetryableFetchError') throw new AccessError('AUTH_UNAVAILABLE', 503)
    throw new AccessError(mapped || code, code === 'SESSION_EXPIRED' ? 401 : 400)
  }
  return result.data
}
export function createAuthProvider(env = process.env, factory = createClient) {
  const url = `https://${PREVIEW_PROJECT_REF}.supabase.co`
  const key = env.SUPABASE_PUBLISHABLE_KEY
  if (env.SUPABASE_URL !== url || !key?.startsWith('sb_publishable_')) throw new Error('AUTH_CONFIG_REQUIRED')
  const client = () => factory(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(10000) }) } })
  const checked = checkAuthResult
  return {
    async login(email, password) { return checked(await client().auth.signInWithPassword({ email, password }), 'INVALID_CREDENTIALS') },
    async register(email, password) { return checked(await client().auth.signUp({ email, password, options: { emailRedirectTo: 'http://localhost:5174/login' } }), 'REGISTRATION_FAILED') },
    async recover(email) { checked(await client().auth.resetPasswordForEmail(email, { redirectTo: 'http://localhost:5174/reset-password' }), 'RECOVERY_FAILED') },
    async verifyRecovery(email, token) { return checked(await client().auth.verifyOtp({ email, token, type: 'recovery' }), 'RECOVERY_INVALID') },
    async refresh(refresh_token) { return checked(await client().auth.refreshSession({ refresh_token }), 'SESSION_EXPIRED').session },
    async user(accessToken) { return checked(await client().auth.getUser(accessToken), 'SESSION_EXPIRED').user },
    async password(session, password) {
      const auth = client().auth
      checked(await auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }), 'SESSION_EXPIRED')
      checked(await auth.updateUser({ password }), 'PASSWORD_UPDATE_FAILED')
      // Revoke provider refresh sessions after the password update.
      try {
        const result = await auth.signOut({ scope: 'global' })
        return { providerRevoked: !result.error }
      } catch { return { providerRevoked: false } }
    },
    async logout(session) {
      const auth = client().auth
      const { error } = await auth.setSession(session)
      if (!error) await auth.signOut({ scope: 'local' })
    },
  }
}
