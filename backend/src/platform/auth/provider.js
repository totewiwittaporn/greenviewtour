import { createClient } from '@supabase/supabase-js'
import { AccessError } from '../../modules/identity-access/membership.js'
import { PREVIEW_PROJECT_REF } from '../database/config.js'
export function checkAuthResult(result, code = 'AUTH_FAILED') {
  if (result.error) {
    const status = result.error.status
    if (status === 429) throw new AccessError('RATE_LIMITED', 429)
    if (!status || status >= 500 || result.error.name === 'AuthRetryableFetchError') throw new AccessError('AUTH_UNAVAILABLE', 503)
    throw new AccessError(code, code === 'SESSION_EXPIRED' ? 401 : 400)
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
