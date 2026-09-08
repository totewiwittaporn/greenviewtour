import { createHash, timingSafeEqual } from 'node:crypto'
import { listUsers } from '../modules/identity-access/list-users.js'
import { parseUsersQuery } from '../backoffice/settings/users/query.js'
import { AccessError, normalizeEmail, checkInvitation, resolveMembership } from '../modules/identity-access/membership.js'
import { can, profileInclude, publicProfile } from '../modules/identity-access/policy.js'
import { SessionStore } from '../platform/auth/sessions.js'
const digest = value => createHash('sha256').update(value).digest()
const origins = ['http://localhost:5174', 'http://127.0.0.1:5174']
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new AccessError('JSON_REQUIRED', 415)
  let text = ''
  for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 8192) throw new AccessError('REQUEST_TOO_LARGE', 413) }
  try { const value = JSON.parse(text); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value }
  catch { throw new AccessError('INVALID_REQUEST', 400) }
}
function password(value, strong = false) {
  if (typeof value !== 'string' || value.length < (strong ? 12 : 1) || value.length > 128) throw new AccessError('INVALID_PASSWORD', 400)
  return value
}
export function createHandler({ pool, prisma, provider, token, users = listUsers, sessions = new SessionStore() }) {
  if (!token || token.length < 32) throw new Error('LOCAL_API_TOKEN_REQUIRED')
  let attempts = 0, windowEnd = 0
  return async (req, res) => {
    const send = (status, data, cookie) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(cookie !== undefined ? { 'Set-Cookie': sessions.cookie(cookie) } : {}) })
      res.end(JSON.stringify(data))
    }
    try {
      if (!['127.0.0.1:5000', 'localhost:5000'].includes(req.headers.host)) return send(403, { code: 'LOCAL_HOST_REQUIRED' })
      const url = new URL(req.url, 'http://127.0.0.1:5000')
      if (url.pathname === '/health/live' && req.method === 'GET') return send(200, { status: 'UP', service: 'greenviewtour-local-api' })
      if (req.headers.origin && !origins.includes(req.headers.origin)) return send(403, { code: 'ORIGIN_DENIED' })
      const supplied = req.headers['x-greenview-local-token']
      if (typeof supplied !== 'string' || !timingSafeEqual(digest(supplied), digest(token))) return send(401, { code: 'LOCAL_ACCESS_REQUIRED' })
      if (!['GET', 'POST'].includes(req.method)) return send(405, { code: 'METHOD_NOT_ALLOWED' })
      if (req.method === 'POST' && !origins.includes(req.headers.origin)) return send(403, { code: 'ORIGIN_REQUIRED' })
      const path = url.pathname
      if (req.method === 'POST' && path.startsWith('/api/auth/')) {
        if (Date.now() > windowEnd) { attempts = 0; windowEnd = Date.now() + 60000 }
        if (++attempts > 30) return send(429, { code: 'RATE_LIMITED' })
        const input = await body(req)
        if (path === '/api/auth/logout') {
          const id = sessions.id(req), entry = sessions.entries.get(id)
          sessions.entries.delete(id)
          if (entry) await provider.logout(entry.session).catch(() => {})
          return send(200, { ok: true }, '')
        }
        if (path === '/api/auth/login') {
          const { session, user } = await provider.login(normalizeEmail(input.email), password(input.password))
          let profile
          try { profile = await resolveMembership(prisma, user) }
          catch (error) { await provider.logout(session).catch(() => {}); throw error }
          const previous = sessions.id(req); sessions.entries.delete(previous)
          return send(200, { user: publicProfile(profile, user.email) }, sessions.create(session))
        }
        if (path === '/api/auth/register') {
          const email = normalizeEmail(input.email)
          await checkInvitation(prisma, email, input.invitationCode)
          const result = await provider.register(email, password(input.password, true))
          // Registration never bypasses the normal verified-email login and grant checks.
          if (result.session) await provider.logout(result.session).catch(() => {})
          return send(200, { message: 'CONFIRM_EMAIL_THEN_LOGIN' })
        }
        if (path === '/api/auth/recover') {
          await provider.recover(normalizeEmail(input.email))
          return send(200, { message: 'RECOVERY_REQUESTED' })
        }
        if (path === '/api/auth/recovery-session') {
          if (typeof input.access_token !== 'string' || typeof input.refresh_token !== 'string') throw new AccessError('RECOVERY_INVALID', 400)
          const user = await provider.user(input.access_token)
          const claims = JSON.parse(Buffer.from(input.access_token.split('.')[1], 'base64url').toString())
          const profile = await prisma.userProfile.findUnique({ where: { id: user.id } })
          if (!user.email_confirmed_at || profile?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
          sessions.entries.delete(sessions.id(req))
          return send(200, { ok: true }, sessions.create({ access_token: input.access_token, refresh_token: input.refresh_token, expires_at: claims.exp, user }, 'recovery'))
        }
        if (path === '/api/auth/reset-password') {
          const { user, entry } = await sessions.authenticated(req, provider, pool)
          if (entry.purpose !== 'recovery') throw new AccessError('RECOVERY_REQUIRED')
          const profile = await prisma.userProfile.findUnique({ where: { id: user.id } })
          if (profile?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
          await provider.password(entry.session, password(input.password, true))
          sessions.deleteUser(user.id)
          await prisma.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'password.changed', details: {} } })
          return send(200, { ok: true }, '')
        }
        return send(404, { code: 'NOT_FOUND' })
      }
      if (req.method !== 'GET') return send(405, { code: 'METHOD_NOT_ALLOWED' })
      if (path === '/api/auth/recovery-status') {
        const { entry } = await sessions.authenticated(req, provider, pool)
        if (entry.purpose !== 'recovery') throw new AccessError('RECOVERY_REQUIRED')
        return send(200, { ok: true })
      }
      if (!['/api/me', '/api/users'].includes(path)) return send(404, { code: 'NOT_FOUND' })
      const { user, entry } = await sessions.authenticated(req, provider, pool)
      if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
      const profile = await prisma.userProfile.findUnique({ where: { id: user.id }, include: profileInclude })
      if (profile?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
      if (path === '/api/me') return send(200, { user: publicProfile(profile, user.email) })
      if (!can(profile, 'users.read')) throw new AccessError('PERMISSION_DENIED')
      let filters
      try { filters = parseUsersQuery(url.searchParams) } catch { throw new AccessError('INVALID_FILTER', 400) }
      return send(200, { ...await users(pool, filters), database: 'UP', environment: 'preview' })
    } catch (error) {
      if (error instanceof AccessError) return send(error.status, { code: error.code }, error.status === 401 ? '' : undefined)
      return send(503, { code: 'SERVICE_UNAVAILABLE' })
    }
  }
}
