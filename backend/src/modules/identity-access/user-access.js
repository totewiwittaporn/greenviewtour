import { randomUUID } from 'node:crypto'
import { accessDefinitions, effectiveAccess, isAdmin, isManager, roleNames } from '../../../../packages/contracts/access.js'
import { profileInclude } from './policy.js'
import { AccessError } from './membership.js'
const fail=(code,status=403)=>{throw new AccessError(code,status)}
const privileged=profile=>(profile?.roles||[]).some(g=>['ADMIN_MANAGER','MANAGER'].includes(g.roleCode))
export function canConfigureAccess(actor,target) {
 return Boolean(target && actor?.id!==target.id && isManager(actor) && !target.roles.some(g=>g.roleCode==='ADMIN_MANAGER') && (isAdmin(actor)||!privileged(target)))
}
function rolesFor(actor){return Object.entries(roleNames).filter(([code])=>code!=='ADMIN_MANAGER'&&(code!=='MANAGER'||isAdmin(actor))).map(([code,name])=>({code,name}))}
function result(actor,target,history=[]) {
 return {version:target.accessVersion,roles:target.roles.map(g=>({roleCode:g.roleCode,scope:g.scope})),overrides:target.permissionOverrides||[],
  availableRoles:rolesFor(actor),permissions:Object.entries(accessDefinitions).map(([code,definition])=>({code,label:definition.label,...effectiveAccess(target,code)})),history}
}
async function pair(tx,actorId,targetId){
 const actor=await tx.userProfile.findUnique({where:{id:actorId},include:profileInclude})
 const target=await tx.userProfile.findUnique({where:{id:targetId},include:profileInclude})
 if(!canConfigureAccess(actor,target))fail('PERMISSION_DENIED')
 return {actor,target}
}
export async function readUserAccess(prisma,actorId,targetId) {
 return prisma.$transaction(async tx=>{
  const {actor,target}=await pair(tx,actorId,targetId)
  const history=await tx.auditEvent.findMany({where:{targetId,action:'users.access.changed'},orderBy:{createdAt:'desc'},take:20,select:{id:true,actorId:true,createdAt:true,details:true}})
  return result(actor,target,history)
 },{isolationLevel:'RepeatableRead'})
}
export function validateAccessInput(actor,input) {
 if(!input||Object.keys(input).some(k=>!['version','roles','overrides','reason'].includes(k))||!Number.isSafeInteger(input.version)||input.version<1||!Array.isArray(input.roles)||!input.roles.length||input.roles.length>20||!Array.isArray(input.overrides)||input.overrides.length>100||typeof input.reason!=='string'||!input.reason.trim()||input.reason.trim().length>1000)fail('INVALID_ACCESS_INPUT',400)
 const available=new Set(rolesFor(actor).map(r=>r.code))
 if(input.roles.some(code=>!available.has(code))||new Set(input.roles).size!==input.roles.length)fail('ROLE_ASSIGNMENT_DENIED')
 const overrides=input.overrides.map(row=>{
  if(!row||Object.keys(row).some(k=>!['permissionCode','effect','startsAt','expiresAt'].includes(k))||!Object.hasOwn(accessDefinitions,row.permissionCode)||!['ALLOW','DENY'].includes(row.effect))fail('INVALID_ACCESS_INPUT',400)
  const date=value=>{if(value===null||value===undefined||value==='')return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(+new Date(value)))fail('INVALID_ACCESS_INPUT',400);return new Date(value)}
  const startsAt=date(row.startsAt),expiresAt=date(row.expiresAt)
  if(expiresAt&&startsAt&&expiresAt<=startsAt)fail('INVALID_ACCESS_INPUT',400)
  return {permissionCode:row.permissionCode,effect:row.effect,startsAt,expiresAt}
 })
 if(new Set(overrides.map(r=>r.permissionCode)).size!==overrides.length)fail('INVALID_ACCESS_INPUT',400)
 return {roles:input.roles.map(roleCode=>({roleCode,scope:roleCode==='MANAGER'?'COMPANY':'SELF'})),overrides,reason:input.reason.trim()}
}
export async function saveUserAccess(prisma,actorId,targetId,input) {
 return prisma.$transaction(async tx=>{
  // Same lock as invitations, profile changes and operational writes: revocation cannot race an authorized write.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const {actor,target}=await pair(tx,actorId,targetId)
  const next=validateAccessInput(actor,input)
  if(target.accessVersion!==input.version)fail('ACCESS_CONFLICT',409)
  const before={roles:target.roles.map(({roleCode,scope})=>({roleCode,scope})),overrides:(target.permissionOverrides||[]).map(({permissionCode,effect,startsAt,expiresAt})=>({permissionCode,effect,startsAt,expiresAt}))}
  await tx.userRole.deleteMany({where:{userId:targetId}})
  await tx.userRole.createMany({data:next.roles.map(role=>({...role,userId:targetId}))})
  await tx.userPermissionOverride.deleteMany({where:{userId:targetId}})
  if(next.overrides.length)await tx.userPermissionOverride.createMany({data:next.overrides.map(row=>({...row,id:randomUUID(),userId:targetId}))})
  await tx.userProfile.update({where:{id:targetId},data:{accessVersion:{increment:1}}})
  await tx.auditEvent.create({data:{actorId,targetId,action:'users.access.changed',details:JSON.parse(JSON.stringify({reason:next.reason,before,after:{roles:next.roles,overrides:next.overrides},version:input.version+1}))}})
  return {ok:true,version:input.version+1}
 },{maxWait:15000,timeout:30000})
}
