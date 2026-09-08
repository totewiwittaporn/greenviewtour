import { listSettings, saveSettings } from '../modules/service-catalog/settings.js'
import { assertDeliverableInvitationEmail, canInvite, canResetPassword, listInvitations, createInvitation, changeInvitation, lookupInvitation, acceptInvitation, requestUserReset } from '../modules/identity-access/invitations.js'
import { managementScope, canEditProfile, editProfile, editOwnProfile } from '../modules/identity-access/user-management.js'
import { createHash, timingSafeEqual } from 'node:crypto'
import { listUsers } from '../modules/identity-access/list-users.js'
import { parseUsersQuery } from '../backoffice/settings/users/query.js'
import { AccessError, normalizeEmail, resolveMembership } from '../modules/identity-access/membership.js'
import { profileInclude, publicProfile } from '../modules/identity-access/policy.js'
import { SessionStore } from '../platform/auth/sessions.js'
const digest = value => createHash('sha256').update(value).digest()
const origins = ['http://localhost:5174', 'http://127.0.0.1:5174']
async function body(req, maxBytes = 8192) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new AccessError('JSON_REQUIRED', 415)
  let text = ''
  for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > maxBytes) throw new AccessError('REQUEST_TOO_LARGE', 413) }
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
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(data.retryAfterSeconds ? { 'Retry-After': String(data.retryAfterSeconds) } : {}), ...(cookie !== undefined ? { 'Set-Cookie': sessions.cookie(cookie) } : {}) })
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
      if (req.method === 'POST') {
        if (Date.now() > windowEnd) { attempts = 0; windowEnd = Date.now() + 60000 }
        if (++attempts > 30) return send(429, { code: 'LOCAL_RATE_LIMITED', retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000)) })
      }
      const path = url.pathname
      if (req.method === 'POST' && path.startsWith('/api/auth/')) {
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
        if (path === '/api/auth/register') throw new AccessError('INVITE_LINK_REQUIRED', 410)
        if (path === '/api/auth/invitation') {
          const invitation = await lookupInvitation(prisma, input.invitationCode)
          assertDeliverableInvitationEmail(invitation.email)
          return send(200, { email: invitation.email, displayName: invitation.displayName, department: invitation.department, expiresAt: invitation.expiresAt, accepted: Boolean(invitation.acceptedAt) })
        }
        if (path === '/api/auth/accept-invitation') {
          return send(200, await acceptInvitation(prisma, provider, input.invitationCode, password(input.password, true)))
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
          const nextPassword = password(input.password, true)
          const audit = await prisma.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'password.change.requested', details: {} } })
          const outcome = await provider.password(entry.session, nextPassword)
          sessions.deleteUser(user.id)
          let auditRecorded = true
          try { await prisma.auditEvent.update({ where: { id: audit.id }, data: { action: 'password.changed', details: { providerRevoked: outcome.providerRevoked } } }) }
          catch { auditRecorded = false; console.error('PASSWORD_CHANGE_AUDIT_FINALIZATION_PENDING') }
          return send(200, { ok: true, warning: !outcome.providerRevoked || !auditRecorded ? 'PASSWORD_CHANGED_FOLLOW_UP_REQUIRED' : null }, '')
        }
        return send(404, { code: 'NOT_FOUND' })
      }
      if (req.method === 'POST' && path === '/api/me/password') {
        const { user, entry } = await sessions.authenticated(req, provider, pool)
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
        const input = await body(req)
        if (Object.keys(input).some(key => !['currentPassword', 'password'].includes(key))) throw new AccessError('INVALID_REQUEST', 400)
        const currentPassword = password(input.currentPassword), nextPassword = password(input.password, true)
        if (currentPassword === nextPassword) throw new AccessError('PASSWORD_UNCHANGED', 400)
        const profile = await prisma.userProfile.findUnique({ where: { id: user.id } })
        if (profile?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
        const verified = await provider.login(user.email, currentPassword)
        try {
          if (verified.user.id !== user.id) throw new AccessError('INVALID_CREDENTIALS', 400)
          const active = await prisma.userProfile.findUnique({ where: { id: user.id } })
          if (active?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
          const audit = await prisma.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'password.change.requested', details: { source: 'profile' } } })
          const outcome = await provider.password(verified.session, nextPassword)
          sessions.deleteUser(user.id)
          let finalized = true
          try { await prisma.auditEvent.update({ where: { id: audit.id }, data: { action: 'password.changed', details: { source: 'profile', providerRevoked: outcome.providerRevoked } } }) }
          catch { finalized = false; console.error('PASSWORD_CHANGE_AUDIT_FINALIZATION_PENDING') }
          return send(200, { ok: true, warning: !outcome.providerRevoked || !finalized ? 'PASSWORD_CHANGED_FOLLOW_UP_REQUIRED' : null }, '')
        } finally { await provider.logout(verified.session).catch(() => {}) }
      }
      const settingsMatch = path.match(/^\/api\/settings\/(company|partners|tours|rates|locations|vehicles|channels)$/)
      if (settingsMatch) {
        const { user, entry } = await sessions.authenticated(req, provider, pool)
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
        return send(200, req.method === 'GET'
          ? await listSettings(prisma, user.id, settingsMatch[1], url.searchParams)
          : await saveSettings(prisma, user.id, settingsMatch[1], await body(req, 32768)))
      }
      const invitationMatch = path.match(/^\/api\/invitations\/([0-9a-f-]{36})\/(renew|revoke)$/)
      const resetMatch = path.match(/^\/api\/users\/([0-9a-f-]{36})\/reset-password$/)
      if (path === '/api/invitations' || invitationMatch || resetMatch || (path === '/api/me/profile' && req.method === 'POST')) {
        const { user, entry } = await sessions.authenticated(req, provider, pool)
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
        if (req.method === 'GET' && path === '/api/invitations') return send(200, await listInvitations(prisma, user.id, url.searchParams))
        if (req.method !== 'POST') return send(405, { code: 'METHOD_NOT_ALLOWED' })
        const input = await body(req, path === '/api/me/profile' ? 32768 : 8192)
        if (path === '/api/me/profile') return send(200, await editOwnProfile(prisma, user.id, input))
        if (resetMatch) return send(200, await requestUserReset(prisma, provider, user.id, resetMatch[1]))
        if (invitationMatch) return send(200, await changeInvitation(prisma, user.id, invitationMatch[1], invitationMatch[2]))
        return send(201, await createInvitation(prisma, user.id, input))
      }
      const editMatch = path.match(/^\/api\/users\/([0-9a-f-]{36})\/profile$/)
      if (req.method === 'POST' && editMatch) {
        const { user, entry } = await sessions.authenticated(req, provider, pool)
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED',401)
        return send(200, await editProfile(prisma,user.id,editMatch[1],await body(req, 32768)))
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
      const scope = managementScope(profile)
      if (!scope) throw new AccessError('PERMISSION_DENIED')
      let filters
      try { filters = parseUsersQuery(url.searchParams) } catch { throw new AccessError('INVALID_FILTER', 400) }
      const directory = await users(pool, { ...filters, department: scope.department })
      directory.users = directory.users.map(target => ({ ...target, canEdit: canEditProfile(profile,target), canResetPassword: canResetPassword(profile,target) }))
      return send(200, { ...directory, canChangeDepartment: scope.company, canInvite: canInvite(profile), database: 'UP', environment: 'preview' })
    } catch (error) {
      if (error instanceof AccessError) return send(error.status, { code: error.code }, error.status === 401 ? '' : undefined)
      return send(503, { code: 'SERVICE_UNAVAILABLE' })
    }
  }
}
