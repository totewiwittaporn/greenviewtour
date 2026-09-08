import { AccessError } from './membership.js'
import { profileInclude } from './policy.js'
export const departments = ['MANAGEMENT', 'BOOKING', 'ACCOUNT', 'GUIDE', 'CAPTAIN', 'DRIVER']
const heads = { HEAD_BOOKING: 'BOOKING', HEAD_GUIDE: 'GUIDE', HEAD_CAPTAIN: 'CAPTAIN', HEAD_DRIVER: 'DRIVER' }
export function managementScope(actor) {
  if (actor?.status !== 'ACTIVE') return null
  if (actor.roles.some(grant => ['ADMIN_MANAGER','MANAGER'].includes(grant.roleCode) && grant.scope === 'COMPANY' && grant.role.permissions.some(item => item.permissionCode === 'users.read'))) return { company: true, department: null }
  if (actor.department && actor.roles.some(grant => heads[grant.roleCode] === actor.department && grant.role.permissions.some(item => item.permissionCode === 'users.read'))) return { company: false, department: actor.department }
  return null
}
export function canEditProfile(actor, target) {
  const scope = managementScope(actor)
  if (!scope || !target) return false
  const editable = actor.roles.some(grant => grant.role.permissions.some(item => item.permissionCode === 'users.profile.edit') && (scope.company
    ? ['ADMIN_MANAGER','MANAGER'].includes(grant.roleCode) && grant.scope === 'COMPANY'
    : heads[grant.roleCode] === scope.department))
  if (!editable) return false
  if (scope.company) return true
  return target.department === scope.department && !target.roles.some(role => ['ADMIN_MANAGER','MANAGER'].includes(role.roleCode))
}
export function validateProfilePatch(input, scope) {
  if (!input || Object.keys(input).some(key => !['displayName','department','updatedAt'].includes(key))) throw new AccessError('INVALID_PROFILE_FIELDS', 400)
  if (typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.trim().length > 100) throw new AccessError('INVALID_DISPLAY_NAME',400)
  if (typeof input.updatedAt !== 'string' || !Number.isFinite(Date.parse(input.updatedAt))) throw new AccessError('PROFILE_VERSION_REQUIRED',400)
  const data = { displayName: input.displayName.trim() }
  if ('department' in input) {
    if (!scope.company) throw new AccessError('DEPARTMENT_CHANGE_DENIED')
    if (input.department !== null && !departments.includes(input.department)) throw new AccessError('INVALID_DEPARTMENT',400)
    data.department = input.department
  }
  return data
}
export async function editProfile(prisma, actorId, targetId, input) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
    const actor = await tx.userProfile.findUnique({ where: { id: actorId }, include: profileInclude })
    const target = await tx.userProfile.findUnique({ where: { id: targetId }, include: profileInclude })
    if (!canEditProfile(actor,target)) throw new AccessError('PERMISSION_DENIED')
    const data = validateProfilePatch(input,managementScope(actor))
    const result = await tx.userProfile.updateMany({ where: { id: targetId, updatedAt: new Date(input.updatedAt) }, data })
    if (result.count !== 1) throw new AccessError('PROFILE_CONFLICT',409)
    await tx.auditEvent.create({ data: { actorId, targetId, action: 'profile.updated', details: { before: { displayName: target.displayName, department: target.department }, after: { displayName: data.displayName, department: data.department === undefined ? target.department : data.department } } } })
    return { ok: true }
  })
}
