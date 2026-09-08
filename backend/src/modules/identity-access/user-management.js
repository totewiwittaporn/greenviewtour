import thaiAreas from '../../../../packages/contracts/data/thai-areas.js'
import { postalCodeFor } from '../../../../packages/contracts/thai-address.js'
import { addressFields, addressKeys, validateAddress } from '../../../../packages/contracts/address.js'
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
  if (!input || Object.keys(input).some(key => !['displayName','department','updatedAt','address','primaryPhone','emergencyPhone','lineId',...addressKeys].includes(key))) throw new AccessError('INVALID_PROFILE_FIELDS', 400)
  if (typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.trim().length > 100) throw new AccessError('INVALID_DISPLAY_NAME',400)
  if (typeof input.updatedAt !== 'string' || !Number.isFinite(Date.parse(input.updatedAt))) throw new AccessError('PROFILE_VERSION_REQUIRED',400)
  const data = { displayName: input.displayName.trim() }
  for (const [key, limit] of Object.entries({ address: 1000, primaryPhone: 32, emergencyPhone: 32, lineId: 100, ...Object.fromEntries(addressFields.map(f=>[f.key,f.max])) })) {
    if (!(key in input)) continue
    if (input[key] !== null && typeof input[key] !== 'string') throw new AccessError('INVALID_CONTACT_DETAILS', 400)
    const value = input[key]?.trim() || null
    if (value && (value.length > limit || [...value].some(char => char.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(char) || char.charCodeAt(0) === 127))) throw new AccessError('INVALID_CONTACT_DETAILS', 400)
    if (value && key.endsWith('Phone') && (!/^\+?[0-9 ()-]+$/.test(value) || value.replace(/\D/g, '').length < 7 || value.replace(/\D/g, '').length > 15)) throw new AccessError('INVALID_PHONE', 400)
    data[key] = value
  }
  if (Object.keys(validateAddress(input)).length) throw new AccessError('INVALID_ADDRESS',400)
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
    data.postalCode=postalCodeFor({...target,...data},thaiAreas)||null
    const result = await tx.userProfile.updateMany({ where: { id: targetId, updatedAt: new Date(input.updatedAt) }, data })
    if (result.count !== 1) throw new AccessError('PROFILE_CONFLICT',409)
    await tx.auditEvent.create({ data: { actorId, targetId, action: 'profile.updated', details: { fields: Object.keys(data) } } })
    return { ok: true }
  })
}

export async function editOwnProfile(prisma, actorId, input) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
    const actor = await tx.userProfile.findUnique({ where: { id: actorId } })
    if (actor?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
    const data = validateProfilePatch(input, { company: false })
    data.postalCode=postalCodeFor({...actor,...data},thaiAreas)||null
    const updated = await tx.userProfile.updateMany({ where: { id: actorId, updatedAt: new Date(input.updatedAt) }, data })
    if (updated.count !== 1) throw new AccessError('PROFILE_CONFLICT', 409)
    await tx.auditEvent.create({ data: { actorId, targetId: actorId, action: 'profile.updated', details: { fields: Object.keys(data), source: 'self' } } })
    return { ok: true }
  })
}
