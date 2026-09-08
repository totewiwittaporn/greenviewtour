import { randomBytes } from 'node:crypto'
import { AccessError, hashToken, normalizeEmail } from './membership.js'
import { profileInclude, roles } from './policy.js'
import { departments } from './user-management.js'
const ttl = 72 * 3600000
const has = (actor, codes, permission) => actor?.status === 'ACTIVE' && actor.roles.some(grant => codes.includes(grant.roleCode) && grant.scope === 'COMPANY' && grant.role.permissions.some(item => item.permissionCode === permission))
export const canInvite = actor => has(actor, ['ADMIN_MANAGER', 'MANAGER'], 'users.invite')
export function invitationRoles(actor) {
  if (!canInvite(actor)) return []
  return Object.entries(roles).filter(([code]) => code !== 'ADMIN_MANAGER' && (code !== 'MANAGER' || has(actor, ['ADMIN_MANAGER'], 'managers.manage'))).map(([code, name]) => ({ code, name }))
}
export async function assertInvitationAuthority(tx, invitation) {
  const actor = await tx.userProfile.findUnique({ where: { id: invitation.createdById }, include: profileInclude })
  const allowed = invitationRoles(actor).map(role => role.code)
  if (!invitation.roles.length || invitation.roles.some(role => !allowed.includes(role.roleCode))) throw new AccessError('INVITATION_UNAVAILABLE', 400)
}
export function validateInvitation(input, actor) {
  if (!input || Object.keys(input).some(key => !['email', 'displayName', 'department', 'roleCode'].includes(key))) throw new AccessError('INVALID_INVITATION_FIELDS', 400)
  if (!canInvite(actor)) throw new AccessError('PERMISSION_DENIED')
  if (!invitationRoles(actor).some(role => role.code === input.roleCode)) throw new AccessError('ROLE_ASSIGNMENT_DENIED')
  const email = normalizeEmail(input.email)
  if (typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.trim().length > 100) throw new AccessError('INVALID_DISPLAY_NAME', 400)
  if (!departments.includes(input.department)) throw new AccessError('INVALID_DEPARTMENT', 400)
  const roleDepartment = { MANAGER: 'MANAGEMENT', HEAD_BOOKING: 'BOOKING', HEAD_GUIDE: 'GUIDE', HEAD_CAPTAIN: 'CAPTAIN', HEAD_DRIVER: 'DRIVER' }[input.roleCode]
  if (roleDepartment && roleDepartment !== input.department) throw new AccessError('ROLE_DEPARTMENT_MISMATCH', 400)
  return { email, displayName: input.displayName.trim(), department: input.department, roleCode: input.roleCode }
}
const publicInvite = item => ({ id: item.id, email: item.email, displayName: item.displayName, department: item.department, expiresAt: item.expiresAt, createdAt: item.createdAt,
  status: item.consumedAt ? 'Joined' : item.revokedAt ? 'Revoked' : item.expiresAt <= new Date() ? 'Expired' : item.acceptedAt ? 'Awaiting activation' : 'Pending', roles: item.roles.map(role => role.roleCode) })
export async function listInvitations(prisma, actorId) {
  return prisma.$transaction(async tx => {
    const actor = await tx.userProfile.findUnique({ where: { id: actorId }, include: profileInclude })
    if (!canInvite(actor)) throw new AccessError('PERMISSION_DENIED')
    const allowed = invitationRoles(actor).map(role => role.code)
    const rows = await tx.invitation.findMany({ where: { createdById: { not: null }, roles: { every: { roleCode: { in: allowed } } } }, include: { roles: true }, orderBy: { createdAt: 'desc' }, take: 100 })
    return { invitations: rows.map(publicInvite), roles: invitationRoles(actor), departments }
  })
}
export async function createInvitation(prisma, actorId, input) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
    const actor = await tx.userProfile.findUnique({ where: { id: actorId }, include: profileInclude })
    const data = validateInvitation(input, actor)
    const existing = await tx.$queryRaw`SELECT u.id FROM auth.users u JOIN app_private."UserProfile" p ON p.id=u.id WHERE lower(u.email)=${data.email} LIMIT 1`
    if (existing.length) throw new AccessError('ACCOUNT_ALREADY_EXISTS', 409)
    if (await tx.invitation.findUnique({ where: { email: data.email } })) throw new AccessError('INVITATION_ALREADY_EXISTS', 409)
    const code = randomBytes(32).toString('hex')
    const invitation = await tx.invitation.create({ data: { email: data.email, displayName: data.displayName, department: data.department, createdById: actorId, tokenHash: hashToken(code), expiresAt: new Date(Date.now() + ttl), roles: { create: { roleCode: data.roleCode, scope: data.roleCode === 'MANAGER' ? 'COMPANY' : 'SELF' } } }, include: { roles: true } })
    await tx.auditEvent.create({ data: { actorId, targetId: invitation.id, action: 'invitation.created', details: { email: data.email, roleCode: data.roleCode, department: data.department } } })
    return { invitation: publicInvite(invitation), invitationCode: code }
  })
}
export async function changeInvitation(prisma, actorId, id, action) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
    const actor = await tx.userProfile.findUnique({ where: { id: actorId }, include: profileInclude })
    const invitation = await tx.invitation.findUnique({ where: { id }, include: { roles: true } })
    const allowed = invitationRoles(actor).map(role => role.code)
    if (!canInvite(actor) || !invitation?.createdById || invitation.roles.some(role => !allowed.includes(role.roleCode))) throw new AccessError('PERMISSION_DENIED')
    if (invitation.consumedAt) throw new AccessError('INVITATION_ALREADY_USED', 409)
    const code = action === 'renew' ? randomBytes(32).toString('hex') : null
    const data = code ? { tokenHash: hashToken(code), expiresAt: new Date(Date.now() + ttl), revokedAt: null, acceptedAt: null, createdById: actorId } : { revokedAt: new Date() }
    const updated = await tx.invitation.update({ where: { id }, data, include: { roles: true } })
    await tx.auditEvent.create({ data: { actorId, targetId: id, action: `invitation.${code ? 'renewed' : 'revoked'}`, details: {} } })
    return { invitation: publicInvite(updated), ...(code ? { invitationCode: code } : {}) }
  })
}
export async function lookupInvitation(prisma, code) {
  if (typeof code !== 'string' || !/^[a-f0-9]{64}$/.test(code)) throw new AccessError('INVITATION_INVALID', 400)
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(code) }, include: { roles: true } })
  if (!invitation || invitation.consumedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new AccessError('INVITATION_INVALID', 400)
  if (invitation.createdById) await assertInvitationAuthority(prisma, invitation)
  return invitation
}
async function registerInvitedUser(prisma, provider, code, password) {
  const invitation = await lookupInvitation(prisma, code)
  if (invitation.acceptedAt) throw new AccessError('INVITATION_ALREADY_SUBMITTED', 409)
  const result = await provider.register(invitation.email, password)
  if (result.session) await provider.logout(result.session).catch(() => {})
  // The provider is outside the transaction: recheck revocation/token rotation afterward.
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
    const current = await lookupInvitation(tx, code)
    await tx.invitation.update({ where: { id: current.id }, data: { acceptedAt: new Date() } })
    await tx.auditEvent.create({ data: { targetId: current.id, action: 'invitation.password.submitted', details: {} } })
  })
  return { message: result.session ? 'READY_TO_SIGN_IN' : 'CONFIRM_EMAIL_THEN_LOGIN' }
}
export function canResetPassword(actor, target) {
  if (!canInvite(actor) || actor.id === target?.id || target?.status !== 'ACTIVE') return false
  const top = target.roles.some(role => role.roleCode === 'ADMIN_MANAGER')
  const manager = target.roles.some(role => role.roleCode === 'MANAGER')
  return !top && (!manager || has(actor, ['ADMIN_MANAGER'], 'managers.manage'))
}
export async function requestUserReset(prisma, provider, actorId, targetId) {
  const email = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
    const actor = await tx.userProfile.findUnique({ where: { id: actorId }, include: profileInclude })
    const target = await tx.userProfile.findUnique({ where: { id: targetId }, include: profileInclude })
    if (!canResetPassword(actor, target)) throw new AccessError('PERMISSION_DENIED')
    const [identity] = await tx.$queryRaw`SELECT email FROM auth.users WHERE id=${targetId}::uuid`
    if (!identity?.email) throw new AccessError('ACCOUNT_UNAVAILABLE')
    await tx.auditEvent.create({ data: { actorId, targetId, action: 'password.reset.requested', details: {} } })
    return identity.email
  })
  await provider.recover(email)
  return { ok: true }
}

// Prevent concurrent submissions of the same one-use link in the single local BFF.
const accepting = new Set()
export async function acceptInvitation(prisma, provider, code, password) {
  if (typeof code !== 'string' || !/^[a-f0-9]{64}$/.test(code)) throw new AccessError('INVITATION_INVALID', 400)
  if (accepting.has(code)) throw new AccessError('INVITATION_IN_PROGRESS', 409)
  if (accepting.size >= 10) throw new AccessError('RATE_LIMITED', 429)
  accepting.add(code)
  try { return await registerInvitedUser(prisma, provider, code, password) }
  finally { accepting.delete(code) }
}
