import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { createHandler } from '../src/app/http.js'
import { grantsFor } from '../src/modules/identity-access/policy.js'
import { canInvite, invitationRoles, validateInvitation, canResetPassword, createInvitation, changeInvitation, lookupInvitation, acceptInvitation } from '../src/modules/identity-access/invitations.js'
import { hashToken, resolveMembership } from '../src/modules/identity-access/membership.js'
import { editOwnProfile } from '../src/modules/identity-access/user-management.js'
const profile = (role = 'MANAGER', id = 'actor') => ({ id, status: 'ACTIVE', displayName: 'Name', roles: [{ roleCode: role, scope: role === 'ADMIN_MANAGER' || role === 'MANAGER' ? 'COMPANY' : 'SELF', role: { permissions: grantsFor(role).map(permissionCode => ({ permissionCode })) } }] })
const input = { displayName: 'New Guide', email: 'staff@example.invalid', department: 'GUIDE', roleCode: 'GUIDE' }
function database(actor = profile()) {
  const events = [], records = new Map()
  const tx = { $executeRaw: async () => 1, $queryRaw: async () => [],
    userProfile: { findUnique: async ({ where }) => where.id === actor.id ? actor : null },
    invitation: {
      findUnique: async ({ where }) => [...records.values()].find(row => Object.entries(where).every(([k,v]) => row[k] === v)) || null,
      create: async ({ data }) => { const row = { id: 'invite', consumedAt: null, revokedAt: null, acceptedAt: null, createdAt: new Date(), ...data, roles: [data.roles.create] }; records.set(row.id, row); return row },
      update: async ({ where, data }) => { const row = records.get(where.id); Object.assign(row, data); return row },
    }, auditEvent: { create: async ({ data }) => { events.push(data); return { id: 'audit' } } },
  }
  const prisma = { ...tx, $transaction: async fn => fn(tx) }
  return { prisma, records, events, actor }
}
test('only company Managers and Admin Managers can invite; Manager cannot assign peers or administrators', () => {
  assert.equal(canInvite(profile('GUIDE')), false)
  assert.equal(canInvite(profile('HEAD_GUIDE')), false)
  assert.equal(canInvite({ ...profile(), status: 'SUSPENDED' }), false)
  assert.equal(canInvite({ ...profile(), roles: [{ ...profile().roles[0], scope: 'SELF' }] }), false)
  assert.equal(invitationRoles(profile()).some(r => r.code === 'MANAGER'), false)
  assert.equal(invitationRoles(profile('ADMIN_MANAGER')).some(r => r.code === 'MANAGER'), true)
  assert.equal(invitationRoles(profile('ADMIN_MANAGER')).some(r => r.code === 'ADMIN_MANAGER'), false)
  assert.throws(() => validateInvitation({ ...input, roleCode: 'MANAGER' }, profile()), /ROLE_ASSIGNMENT_DENIED/)
  assert.throws(() => validateInvitation({ ...input, roleCode: 'HEAD_DRIVER' }, profile()), /ROLE_DEPARTMENT_MISMATCH/)
  assert.throws(() => validateInvitation({ ...input, password: 'not allowed' }, profile()), /INVALID_INVITATION_FIELDS/)
})
test('invitation tokens are hashed, omitted from list data and audit, rotated and revoked', async () => {
  const { prisma, records, events } = database()
  const result = await createInvitation(prisma, 'actor', input)
  assert.equal(result.invitationCode.length, 64)
  assert.equal(records.get('invite').tokenHash, hashToken(result.invitationCode))
  assert.equal(JSON.stringify(result.invitation).includes('tokenHash'), false)
  assert.equal(JSON.stringify(events).includes(result.invitationCode), false)
  await assert.rejects(() => createInvitation(prisma, 'actor', input), /INVITATION_ALREADY_EXISTS/)
  const renewed = await changeInvitation(prisma, 'actor', 'invite', 'renew')
  await assert.rejects(() => lookupInvitation(prisma, result.invitationCode), /INVITATION_INVALID/)
  await lookupInvitation(prisma, renewed.invitationCode)
  await changeInvitation(prisma, 'actor', 'invite', 'revoke')
  await assert.rejects(() => lookupInvitation(prisma, renewed.invitationCode), /INVITATION_INVALID/)
})
test('expired, consumed and no-longer-authorized invitations fail before password registration', async () => {
  const { prisma, records, actor } = database()
  const { invitationCode } = await createInvitation(prisma, 'actor', input)
  let calls = 0
  const provider = { register: async () => { calls++; return {} } }
  records.get('invite').expiresAt = new Date(0)
  await assert.rejects(() => acceptInvitation(prisma, provider, invitationCode, 'private-password'))
  records.get('invite').expiresAt = new Date(Date.now() + 10000); records.get('invite').consumedAt = new Date()
  await assert.rejects(() => acceptInvitation(prisma, provider, invitationCode, 'private-password'))
  records.get('invite').consumedAt = null; actor.status = 'SUSPENDED'
  await assert.rejects(() => acceptInvitation(prisma, provider, invitationCode, 'private-password'), /INVITATION_UNAVAILABLE/)
  assert.equal(calls, 0)
})
test('password registration uses invited email and never logs credentials or grants membership before verification', async () => {
  const { prisma, events, records } = database()
  const { invitationCode } = await createInvitation(prisma, 'actor', input)
  let received
  const provider = { register: async (email, password) => { received = { email, password }; return {} } }
  const result = await acceptInvitation(prisma, provider, invitationCode, 'private-password')
  assert.equal(received.email, input.email)
  assert.equal(result.message, 'CONFIRM_EMAIL_THEN_LOGIN')
  assert.ok(records.get('invite').acceptedAt)
  assert.equal(JSON.stringify(events).includes('private-password'), false)
  await assert.rejects(() => acceptInvitation(prisma, provider, invitationCode, 'another-password'), /INVITATION_ALREADY_SUBMITTED/)
  await assert.rejects(() => resolveMembership(prisma, { id: 'new', email: input.email }), /EMAIL_CONFIRMATION_REQUIRED/)
})
test('revocation during provider registration prevents invitation acceptance', async () => {
  const { prisma, records } = database()
  const { invitationCode } = await createInvitation(prisma, 'actor', input)
  const provider = { register: async () => { records.get('invite').revokedAt = new Date(); return {} } }
  await assert.rejects(() => acceptInvitation(prisma, provider, invitationCode, 'private-password'), /INVITATION_INVALID/)
  assert.equal(records.get('invite').acceptedAt, null)
})
test('password reset assistance is limited to lower roles and never exposes the password', () => {
  assert.equal(canResetPassword(profile(), profile('GUIDE', 'staff')), true)
  assert.equal(canResetPassword(profile(), profile('MANAGER', 'peer')), false)
  assert.equal(canResetPassword(profile(), profile('ADMIN_MANAGER', 'owner')), false)
  assert.equal(canResetPassword(profile('ADMIN_MANAGER'), profile('MANAGER', 'manager')), true)
  assert.equal(canResetPassword(profile('ADMIN_MANAGER'), profile('ADMIN_MANAGER', 'owner')), false)
  assert.equal(canResetPassword(profile('HEAD_GUIDE'), profile('GUIDE', 'staff')), false)
  assert.equal(canResetPassword(profile(), profile()), false)
})
test('self-profile editing accepts a name but rejects department and role escalation', async () => {
  const actor = profile('GUIDE'), { prisma } = database(actor)
  const input = { displayName: 'Changed', updatedAt: new Date().toISOString() }
  prisma.userProfile.updateMany = async () => ({ count: 1 })
  assert.equal((await editOwnProfile(prisma, actor.id, input)).ok, true)
  await assert.rejects(() => editOwnProfile(prisma, actor.id, { ...input, department: 'MANAGEMENT' }), /DEPARTMENT_CHANGE_DENIED/)
  await assert.rejects(() => editOwnProfile(prisma, actor.id, { ...input, roles: ['ADMIN_MANAGER'] }), /INVALID_PROFILE_FIELDS/)
})
test('uninvited registration endpoint is disabled without calling the auth provider', async () => {
  let status, called = false
  const req = Readable.from(['{}'])
  Object.assign(req, { method: 'POST', url: '/api/auth/register', headers: { host: 'localhost:5000', origin: 'http://localhost:5174', 'content-type': 'application/json', 'x-greenview-local-token': 'a'.repeat(64) } })
  await createHandler({ token: 'a'.repeat(64), provider: { register: async () => { called = true } } })(req, { writeHead(code) { status = code }, end() {} })
  assert.equal(status, 410); assert.equal(called, false)
})

test('local-only invitations fail before provider registration without consuming the link', async () => {
  assert.throws(() => validateInvitation({ ...input, email: 'manager@system.local' }, profile()), { code: 'INVITATION_EMAIL_UNDELIVERABLE' })
  const { prisma, records } = database()
  const result = await createInvitation(prisma, 'actor', input)
  records.get('invite').email = 'manager@system.local'
  let calls = 0
  await assert.rejects(() => acceptInvitation(prisma, { register: async () => { calls++ } }, result.invitationCode, 'fixture-password-123'), { code: 'INVITATION_EMAIL_UNDELIVERABLE' })
  assert.equal(calls, 0); assert.equal(records.get('invite').acceptedAt, null)
})
