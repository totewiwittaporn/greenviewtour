import { createHash } from 'node:crypto'
import { profileInclude } from './policy.js'
export const hashToken = token => createHash('sha256').update(token).digest('hex')
export class AccessError extends Error {
  constructor(code, status = 403) { super(code); this.code = code; this.status = status }
}
export function normalizeEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new AccessError('INVALID_EMAIL', 400)
  return value.trim().toLowerCase()
}
export async function checkInvitation(prisma, email, code) {
  if (typeof code !== 'string' || !/^[a-f0-9]{64}$/.test(code)) throw new AccessError('INVITATION_INVALID', 400)
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(code) } })
  if (!invitation || invitation.email !== email || invitation.consumedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new AccessError('INVITATION_INVALID', 400)
  return invitation
}
export async function resolveMembership(prisma, user) {
  if (!user.email_confirmed_at || !user.email) throw new AccessError('EMAIL_CONFIRMATION_REQUIRED')
  return prisma.$transaction(async tx => {
    // Serialize consumption with invitation revocation and delegated profile changes.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`
    let profile = await tx.userProfile.findUnique({ where: { id: user.id }, include: profileInclude })
    if (!profile) {
      const invitation = await tx.invitation.findUnique({ where: { email: normalizeEmail(user.email) }, include: { roles: true } })
      if (!invitation || invitation.consumedAt || invitation.revokedAt || invitation.expiresAt <= new Date() || (invitation.createdById && !invitation.acceptedAt)) throw new AccessError('INVITATION_REQUIRED')
      if (invitation.createdById) {
        const { assertInvitationAuthority } = await import('./invitations.js')
        await assertInvitationAuthority(tx, invitation)
      }
      const used = await tx.invitation.updateMany({ where: { id: invitation.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } })
      if (used.count !== 1) throw new AccessError('INVITATION_REQUIRED')
      profile = await tx.userProfile.create({ data: { id: user.id, displayName: invitation.displayName, department: invitation.department,
        roles: { create: invitation.roles.map(role => ({ roleCode: role.roleCode, scope: role.scope })) },
      }, include: profileInclude })
      await tx.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'account.activated', details: { invitationId: invitation.id } } })
    }
    if (profile.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
    return profile
  })
}
