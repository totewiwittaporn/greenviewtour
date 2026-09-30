import {acquireWriteLock} from '../../platform/database/write-lock.js'
import thaiAreas from '../../../../packages/contracts/data/thai-areas.js'
import { postalCodeFor } from '../../../../packages/contracts/thai-address.js'
import { addressFields, addressKeys, validateAddress } from '../../../../packages/contracts/address.js'
import { AccessError } from './membership.js'
import { profileInclude } from './policy.js'
import {randomUUID} from 'node:crypto'
import {d1AtomicBatch,d1Date} from '../../platform/database/d1-atomic.js'
import {isD1Client} from '../../platform/database/d1-runtime.js'
export const departments = ['MANAGEMENT', 'BOOKING', 'ACCOUNT', 'GUIDE', 'CAPTAIN', 'DRIVER', 'SALES', 'HOUSEKEEPING']
const heads = { HEAD_BOOKING: 'BOOKING', HEAD_GUIDE: 'GUIDE', HEAD_CAPTAIN: 'CAPTAIN', HEAD_DRIVER: 'DRIVER', HEAD_HOUSEKEEPING: 'HOUSEKEEPING' }
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
  if (!input || Object.keys(input).some(key => !['displayName','nickname','department','updatedAt','address','primaryPhone','emergencyPhone','lineId',...addressKeys].includes(key))) throw new AccessError('INVALID_PROFILE_FIELDS', 400)
  if (typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.trim().length > 100) throw new AccessError('INVALID_DISPLAY_NAME',400)
  if (typeof input.updatedAt !== 'string' || !Number.isFinite(Date.parse(input.updatedAt))) throw new AccessError('PROFILE_VERSION_REQUIRED',400)
  const data = { displayName: input.displayName.trim() }
  if (Object.hasOwn(input, 'nickname')) {
    if (input.nickname !== null && (typeof input.nickname !== 'string' || input.nickname.trim().length > 50 || [...input.nickname].some(char => char.charCodeAt(0) < 32 || (char.charCodeAt(0) >= 127 && char.charCodeAt(0) <= 159)))) throw new AccessError('INVALID_NICKNAME', 400)
    data.nickname = input.nickname?.trim() || null
  }
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
async function editProfileD1(prisma,actorId,targetId,input){
  const actor=await prisma.userProfile.findUnique({where:{id:actorId},include:profileInclude})
  const target=await prisma.userProfile.findUnique({where:{id:targetId},include:profileInclude})
  if(!canEditProfile(actor,target))throw new AccessError('PERMISSION_DENIED')
  const data=validateProfilePatch(input,managementScope(actor))
  data.postalCode=postalCodeFor({...target,...data},thaiAreas)||null
  const fields=Object.keys(data)
  const now=d1Date(new Date()),previous=d1Date(input.updatedAt)
  const setSql=[...fields.map(field=>`"${field}"=?`),'"updatedAt"=?'].join(',')
  const actorVersion=actor.accessVersion,targetVersion=target.accessVersion
  const targetGuard='"id"=? AND "updatedAt"=? AND "accessVersion"=?'
  const actorGuard='EXISTS (SELECT 1 FROM "UserProfile" WHERE "id"=? AND "accessVersion"=? AND "status"=\'ACTIVE\')'
  const details=JSON.stringify({fields})
  const results=await d1AtomicBatch(prisma,[
    {
      sql:`INSERT INTO "AuditEvent" ("id","actorId","action","targetId","createdAt","details") SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM "UserProfile" WHERE ${targetGuard}) AND ${actorGuard}`,
      params:[randomUUID(),actorId,'profile.updated',targetId,now,details,targetId,previous,targetVersion,actorId,actorVersion],
    },
    {
      sql:`UPDATE "UserProfile" SET ${setSql} WHERE ${targetGuard} AND ${actorGuard}`,
      params:[...fields.map(field=>data[field]),now,targetId,previous,targetVersion,actorId,actorVersion],
    },
  ])
  if((results[1]?.meta?.changes||0)!==1){
    const currentActor=await prisma.userProfile.findUnique({where:{id:actorId},include:profileInclude})
    const currentTarget=await prisma.userProfile.findUnique({where:{id:targetId},include:profileInclude})
    if(!canEditProfile(currentActor,currentTarget))throw new AccessError('PERMISSION_DENIED')
    throw new AccessError('PROFILE_CONFLICT',409)
  }
  if((results[0]?.meta?.changes||0)!==1)throw new AccessError('PROFILE_AUDIT_FAILED',500)
  return {ok:true}
}

export async function editProfile(prisma, actorId, targetId, input) {
  if(isD1Client(prisma))return editProfileD1(prisma,actorId,targetId,input)
  return prisma.$transaction(async tx => {
    await acquireWriteLock(tx)
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

async function editOwnProfileD1(prisma,actorId,input){
  const actor=await prisma.userProfile.findUnique({where:{id:actorId}})
  if(actor?.status!=='ACTIVE')throw new AccessError('ACCOUNT_UNAVAILABLE')
  const data=validateProfilePatch(input,{company:false})
  data.postalCode=postalCodeFor({...actor,...data},thaiAreas)||null
  const fields=Object.keys(data)
  const now=d1Date(new Date()),previous=d1Date(input.updatedAt)
  const setSql=[...fields.map(field=>`"${field}"=?`),'"updatedAt"=?'].join(',')
  const auditId=randomUUID()
  const details=JSON.stringify({fields,source:'self'})
  const results=await d1AtomicBatch(prisma,[
    {
      sql:'INSERT INTO "AuditEvent" ("id","actorId","action","targetId","createdAt","details") SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM "UserProfile" WHERE "id"=? AND "updatedAt"=? AND "status"=\'ACTIVE\')',
      params:[auditId,actorId,'profile.updated',actorId,now,details,actorId,previous],
    },
    {
      sql:`UPDATE "UserProfile" SET ${setSql} WHERE "id"=? AND "updatedAt"=? AND "status"='ACTIVE'`,
      params:[...fields.map(field=>data[field]),now,actorId,previous],
    },
  ])
  if((results[1]?.meta?.changes||0)!==1){
    const current=await prisma.userProfile.findUnique({where:{id:actorId},select:{status:true}})
    if(current?.status!=='ACTIVE')throw new AccessError('ACCOUNT_UNAVAILABLE')
    throw new AccessError('PROFILE_CONFLICT',409)
  }
  if((results[0]?.meta?.changes||0)!==1)throw new AccessError('PROFILE_AUDIT_FAILED',500)
  return {ok:true}
}

export async function editOwnProfile(prisma, actorId, input) {
  if(isD1Client(prisma))return editOwnProfileD1(prisma,actorId,input)
  return prisma.$transaction(async tx => {
    await acquireWriteLock(tx)
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
