import {userVisibilityWhere} from '../identity-access/user-visibility.js'
import { canEditBooking, canManageBookingTeam, effectiveAccess } from '../../../../packages/contracts/access.js'
import { profileInclude } from '../identity-access/policy.js'
import { authorize, audit, fail, hash, int, keys, string, uuid, write } from './common.js'

export async function requireBookingEdit(tx, actorId, booking) {
 const { actor } = await authorize(tx, actorId, 'active')
 if (!canEditBooking({ ...actor, id: actorId }, booking)) fail('PERMISSION_DENIED', 403)
}
async function requireTeam(tx, actorId) {
 const { actor } = await authorize(tx, actorId, 'booking')
 if (!canManageBookingTeam(actor)) fail('PERMISSION_DENIED', 403)
 return actor
}
const candidateWhere = { status: 'ACTIVE', roles: { some: { roleCode: { in: ['BOOKING', 'HEAD_BOOKING'] }, scope: { in: ['SELF', 'COMPANY'] } } } }
export async function bookingAssignees(prisma, actorId, params) {
 const actor=await requireTeam(prisma, actorId)
 const page = int(params.get('page') || 1)
 const q = string(params.get('q') || '', 100, false)
 const where = { ...candidateWhere, AND:[userVisibilityWhere(actor)], ...(q ? { displayName: { contains: q, mode: 'insensitive' } } : {}) }
 const total = await prisma.userProfile.count({ where })
 const rows = await prisma.userProfile.findMany({ where, select: { id: true, displayName: true }, orderBy: [{ displayName: 'asc' }, { id: 'asc' }], take: 25, skip: (page - 1) * 25 })
 return { rows, total, page, pages: Math.max(1, Math.ceil(total / 25)) }
}
export async function assignBooking(prisma, actorId, input) {
 keys(input, ['id', 'bookingId', 'version', 'assigneeId'])
 uuid(input.id); uuid(input.bookingId); uuid(input.assigneeId); int(input.version)
 return write(prisma, actorId, async tx => {
  await requireTeam(tx, actorId)
  const booking = await tx.tourBooking.findUnique({ where: { id: input.bookingId } })
  if (!booking) fail('NOT_FOUND', 404)
  const requestHash = hash({ ...input, actorId }), prior = await tx.operationCommand.findUnique({ where: { id: input.id } })
  if (prior) { if (prior.requestHash !== requestHash) fail('COMMAND_CONFLICT'); return prior.result }
  if (booking.version !== input.version) fail('SETTINGS_CONFLICT')
  const candidate = await tx.userProfile.findUnique({ where: { id: input.assigneeId }, include: profileInclude })
  if (candidate?.status !== 'ACTIVE' || !candidate.roles.some(role => ['SELF', 'COMPANY'].includes(role.scope) && ['BOOKING', 'HEAD_BOOKING'].includes(role.roleCode)) || !effectiveAccess(candidate, 'operations.booking').allowed || !effectiveAccess(candidate, 'operations.islandBooking').allowed) fail('BOOKING_ASSIGNEE_UNAVAILABLE', 400)
  await tx.tourBooking.update({ where: { id: booking.id }, data: { assigneeId: input.assigneeId, version: { increment: 1 } } })
  await audit(tx, actorId, booking.id, 'booking.assigned', { from: booking.assigneeId ?? booking.createdById ?? null, to: input.assigneeId, version: booking.version + 1 })
  const result = { ok: true, assigneeId: input.assigneeId, version: booking.version + 1 }
  await tx.operationCommand.create({ data: { id: input.id, requestHash, result } })
  return result
 }, 'booking')
}
