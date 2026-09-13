import test from 'node:test'
import assert from 'node:assert/strict'
import { effectiveAccess } from '../../packages/contracts/access.js'
import { operationAccess } from '../../packages/contracts/operation-access.js'
import { canConfigureAccess, validateAccessInput, saveUserAccess } from '../src/modules/identity-access/user-access.js'
import { authorizePaidChange } from '../src/modules/operations/bookings.js'
const profile=(id,roles)=>({id,status:'ACTIVE',accessVersion:1,roles:roles.map(roleCode=>({roleCode,scope:['ADMIN_MANAGER','MANAGER'].includes(roleCode)?'COMPANY':'SELF'})),permissionOverrides:[]})
const manager=profile('manager',['MANAGER']),staff=profile('staff',['BOOKING','SALES']),admin=profile('admin',['ADMIN_MANAGER'])
test('multiple duties combine, explicit denial defeats all role grants including Manager',()=>{
 for(const roles of [['BOOKING','GUIDE'],['MANAGER']]){
  const user=profile('u',roles);user.permissionOverrides=[{permissionCode:'operations.booking',effect:'DENY'}]
  assert.equal(operationAccess(user).booking,false)
  assert.equal(operationAccess(user).guide,true)
 }
})
test('scoped and expiring access cannot leak outside its resource or time window',()=>{
 const user=profile('u',['DRIVER']);user.permissionOverrides=[{permissionCode:'operations.stock',effect:'ALLOW',scopeId:'warehouse',startsAt:'2026-09-13T00:00:00Z',expiresAt:'2026-09-14T00:00:00Z'}]
 const now=new Date('2026-09-13T12:00:00Z')
 assert.equal(effectiveAccess(user,'operations.stock',{now}).allowed,false)
 assert.equal(effectiveAccess(user,'operations.stock',{now,scopeId:'warehouse'}).allowed,true)
 assert.equal(effectiveAccess(user,'operations.stock',{now:new Date('2026-09-14T00:00:00Z'),scopeId:'warehouse'}).allowed,false)
 user.status='SUSPENDED';assert.equal(effectiveAccess(user,'operations.stock',{now,scopeId:'warehouse'}).allowed,false)
})
test('only managers configure ordinary accounts; no self, peer or administrator escalation',()=>{
 assert.equal(canConfigureAccess(manager,staff),true)
 assert.equal(canConfigureAccess(manager,manager),false)
 assert.equal(canConfigureAccess(manager,profile('peer',['MANAGER'])),false)
 assert.equal(canConfigureAccess(admin,manager),true)
 assert.equal(canConfigureAccess(admin,profile('other',['ADMIN_MANAGER'])),false)
 assert.equal(canConfigureAccess(staff,profile('u',['DRIVER'])),false)
 for(const code of ['MANAGER','ADMIN_MANAGER'])assert.throws(()=>validateAccessInput(manager,{version:1,roles:[code],overrides:[],reason:'test'}),/ROLE_ASSIGNMENT_DENIED/)
 assert.throws(()=>validateAccessInput(manager,{version:1,roles:['BOOKING'],overrides:[{permissionCode:'administrators.manage',effect:'ALLOW'}],reason:'test'}),/INVALID_ACCESS_INPUT/)
})
test('time windows, duplicates and malformed payloads fail closed',()=>{
 const input={version:1,roles:['BOOKING','SALES'],overrides:[],reason:'Extra sales duties'}
 assert.equal(validateAccessInput(manager,input).roles.length,2)
 for(const overrides of [
  [{permissionCode:'operations.stock',effect:'ALLOW',scopeId:'unknown'}],
  [{permissionCode:'operations.stock',effect:'ALLOW',startsAt:'tomorrow'}],
  [{permissionCode:'operations.stock',effect:'ALLOW',startsAt:'2026-02-30T00:00:00Z'}],
  [{permissionCode:'operations.stock',effect:'ALLOW',startsAt:'2026-09-13T24:00:00Z'}],
  [{permissionCode:'operations.stock',effect:'ALLOW',startsAt:'2026-09-14T00:00:00Z',expiresAt:'2026-09-13T00:00:00Z'}],
  [1,2].map(()=>({permissionCode:'operations.stock',effect:'DENY'})),
 ])assert.throws(()=>validateAccessInput(manager,{...input,overrides}),/INVALID_ACCESS_INPUT/)
})
test('stale edits and freshly revoked managers cannot change grants',async()=>{
 let writes=0,actor=manager
 const tx={$executeRaw:async()=>{},userProfile:{findUnique:async({where})=>where.id==='manager'?actor:staff},userRole:{deleteMany:async()=>{writes++}}}
 const prisma={$transaction:fn=>fn(tx)}
 await assert.rejects(saveUserAccess(prisma,'manager','staff',{version:2,roles:['BOOKING'],overrides:[],reason:'test'}),/ACCESS_CONFLICT/)
 actor={...manager,status:'SUSPENDED'}
 await assert.rejects(saveUserAccess(prisma,'manager','staff',{version:1,roles:['BOOKING'],overrides:[],reason:'test'}),/PERMISSION_DENIED/)
 assert.equal(writes,0)
})
test('successful changes persist multiple roles and a before/after audit in the transaction',async()=>{
 const saved={}
 const tx={$executeRaw:async()=>{},userProfile:{findUnique:async({where})=>where.id==='manager'?manager:staff,update:async v=>{saved.profile=v}},userRole:{deleteMany:async()=>{},createMany:async v=>{saved.roles=v.data}},userPermissionOverride:{deleteMany:async()=>{},createMany:async v=>{saved.overrides=v.data}},auditEvent:{create:async v=>{saved.audit=v.data}}}
 const response=await saveUserAccess({$transaction:fn=>fn(tx)},'manager','staff',{version:1,roles:['BOOKING','SALES'],overrides:[{permissionCode:'operations.booking',effect:'DENY'}],reason:'Limit booking edits'})
 assert.equal(response.version,2);assert.equal(saved.roles.length,2);assert.equal(saved.overrides[0].effect,'DENY');assert.equal(saved.audit.details.before.roles.length,2);assert.equal(saved.audit.details.reason,'Limit booking edits')
})
test('payment denial blocks setting and removing paid status, while preserving other booking edits',async()=>{
 let user={...staff,permissionOverrides:[{permissionCode:'finance.receive',effect:'DENY'}]}
 const tx={userProfile:{findUnique:async()=>user}}
 await assert.rejects(authorizePaidChange(tx,'staff','COUNTER','PAID'),/PAYMENT_PERMISSION_REQUIRED/)
 await assert.rejects(authorizePaidChange(tx,'staff','PAID','COUNTER'),/PAYMENT_PERMISSION_REQUIRED/)
 await authorizePaidChange(tx,'staff','PAID','PAID')
 await authorizePaidChange(tx,'staff','COUNTER','PREPAID')
 user={...staff,permissionOverrides:[]}
 await authorizePaidChange(tx,'staff','COUNTER','PAID')
})
