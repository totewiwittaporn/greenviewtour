import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { createHandler } from '../src/app/http.js'
import { can, grantsFor } from '../src/modules/identity-access/policy.js'
import { checkInvitation, hashToken } from '../src/modules/identity-access/membership.js'
import { SessionStore } from '../src/platform/auth/sessions.js'
const token = 'a'.repeat(64)
const active = { id: 'user', displayName: 'Test', status: 'ACTIVE', roles: [{ roleCode: 'MANAGER', scope: 'COMPANY', role: { name: 'Manager', permissions: [{ permissionCode: 'users.read' }] } }] }
async function request({ headers = {}, method = 'GET', url = '/api/users', input = {}, profile = active, session = true, users = async () => ({ users: [], total: 0 }), provider = {} } = {}) {
  let status, data, responseHeaders
  const req = Readable.from([JSON.stringify(input)])
  Object.assign(req, { method, url, headers: { host: '127.0.0.1:5000', 'x-greenview-local-token': token, ...(method === 'POST' ? { origin: 'http://localhost:5174', 'content-type': 'application/json' } : {}), ...headers } })
  const sessions = new SessionStore()
  sessions.authenticated = async () => { if (!session) sessions.get(req); return { user: { id: 'user', email: 'qa@example.invalid' }, entry: { purpose: 'workspace' } } }
  await createHandler({ pool: {}, prisma: { userProfile: { findUnique: async () => profile } }, token, users, sessions, provider })(req, {
    writeHead(code, headers) { status = code; responseHeaders = headers }, end(body) { data = JSON.parse(body) },
  })
  return { status, data, headers: responseHeaders }
}
test('local token alone no longer grants directory access', async () => {
  assert.equal((await request({ session: false })).status, 401)
  assert.equal((await request({ headers: { 'x-greenview-local-token': 'wrong' } })).status, 401)
  assert.equal((await request({ headers: { host: 'attacker.invalid' } })).status, 403)
  assert.equal((await request({ headers: { origin: 'https://attacker.invalid' } })).status, 403)
})
test('current membership, permission and scope are checked on every directory request', async () => {
  assert.equal((await request()).data.database, 'UP')
  assert.equal((await request({ profile: { ...active, status: 'SUSPENDED' } })).status, 403)
  assert.equal((await request({ profile: { ...active, roles: [] } })).status, 403)
  assert.equal((await request({ profile: { ...active, roles: [{ ...active.roles[0], scope: 'SELF' }] } })).status, 403)
  assert.equal((await request({ url: '/api/users?pageSize=100000' })).status, 400)
  assert.equal((await request({ users: async () => { throw new Error('secret') } })).data.code, 'SERVICE_UNAVAILABLE')
})
test('mutations require same origin and JSON; invalid requests are rejected', async () => {
  assert.equal((await request({ method: 'POST', url: '/api/auth/login', headers: { origin: undefined } })).status, 403)
  assert.equal((await request({ method: 'POST', url: '/api/auth/login', headers: { 'content-type': 'text/plain' } })).status, 415)
  assert.equal((await request({ method: 'POST', url: '/api/auth/login', input: { email: 'not email', password: 'secret' } })).status, 400)
  assert.equal((await request({ method: 'DELETE' })).status, 405)
})
test('invitation requires matching email, live expiry and unconsumed token', async () => {
  const code = 'b'.repeat(64), invitation = { email: 'qa@example.invalid', expiresAt: new Date(Date.now()+10000), consumedAt: null }
  const prisma = { invitation: { findUnique: async ({ where }) => where.tokenHash === hashToken(code) ? invitation : null } }
  await checkInvitation(prisma, invitation.email, code)
  await assert.rejects(() => checkInvitation(prisma, 'other@example.invalid', code))
  invitation.consumedAt = new Date()
  await assert.rejects(() => checkInvitation(prisma, invitation.email, code))
  invitation.consumedAt = null; invitation.expiresAt = new Date(0)
  await assert.rejects(() => checkInvitation(prisma, invitation.email, code))
})
test('manager role cannot grant administrator capabilities', () => {
  assert.equal(grantsFor('MANAGER').includes('administrators.manage'), false)
  assert.equal(grantsFor('MANAGER').includes('managers.manage'), false)
  assert.deepEqual(grantsFor('GUIDE'), ['profile.read'])
  assert.equal(can({ ...active, status: 'DEACTIVATED' }, 'users.read'), false)
})
test('session cookies are opaque and HttpOnly; revocation denies reuse', () => {
  const sessions = new SessionStore(), id = sessions.create({ user: { id: 'one' } })
  const req = { headers: { cookie: `gv_session=${id}` } }
  assert.equal(sessions.get(req).id, id)
  assert.match(sessions.cookie(id), /HttpOnly; SameSite=Strict/)
  assert.equal(id.length, 64)
  sessions.deleteUser('one')
  assert.throws(() => sessions.get(req))
})

test('local throttling identifies its source and supplies a bounded Retry-After header', async () => {
  const handler = createHandler({ token, provider: { recover: async () => {} } })
  let status, headers, data
  for (let index = 0; index < 31; index++) {
    const req = Readable.from([JSON.stringify({ email: 'fixture@example.invalid' })])
    Object.assign(req, { method: 'POST', url: '/api/auth/recover', headers: { host: '127.0.0.1:5000', origin: 'http://localhost:5174', 'x-greenview-local-token': token, 'content-type': 'application/json' } })
    await handler(req, { writeHead: (s,h) => { status=s;headers=h }, end: body => { data=JSON.parse(body) } })
  }
  assert.equal(status, 429); assert.equal(data.code, 'LOCAL_RATE_LIMITED')
  assert.ok(data.retryAfterSeconds > 0 && data.retryAfterSeconds <= 60)
  assert.equal(headers['Retry-After'], String(data.retryAfterSeconds))
})
