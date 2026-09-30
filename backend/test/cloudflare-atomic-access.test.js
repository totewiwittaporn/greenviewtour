import {withNativeTriggerCounts} from './helpers/d1-native-batch.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {saveUserAccess} from '../src/modules/identity-access/user-access.js'
import {registerD1Client} from '../src/platform/database/d1-runtime.js'
import {d1Date} from '../src/platform/database/d1-atomic.js'

const manager=(status='ACTIVE',version=5)=>({id:'manager',status,accessVersion:version,roles:[{roleCode:'MANAGER',scope:'COMPANY'}],permissionOverrides:[]})
const staff=(version=1)=>({id:'staff',status:'ACTIVE',accessVersion:version,roles:[{roleCode:'BOOKING',scope:'SELF'},{roleCode:'SALES',scope:'SELF'}],permissionOverrides:[]})
const input={version:1,roles:['BOOKING','SALES'],overrides:[{permissionCode:'operations.booking',effect:'DENY',startsAt:'2026-10-01T00:00:00Z',expiresAt:'2026-11-01T00:00:00Z'}],reason:'Limit booking edits'}

function fixture({batchChanges,initialTargetVersion=1,afterActorStatus='ACTIVE',afterActorVersion=5,afterTargetVersion=1}={}){
 const statements=[]
 let reads=0,transactions=0
 const client={
  userProfile:{findUnique:async ({where})=>{
   reads++
   const after=reads>2
   if(where.id==='manager')return manager(after?afterActorStatus:'ACTIVE',after?afterActorVersion:5)
   if(where.id==='staff')return staff(after?afterTargetVersion:initialTargetVersion)
   return null
  }},
  $transaction:async()=>{transactions++;throw new Error('D1 access path must not call Prisma transaction')},
 }
 const database={
  prepare(sql){
   const statement={sql,params:[],bind(...params){this.params=params;return this}}
   statements.push(statement)
   return statement
  },
  batch:async prepared=>{
   assert.deepEqual(prepared,statements)
   const values=batchChanges||prepared.map(()=>1)
   return values.map(changes=>({success:true,meta:{changes}}))
  },
 }
 registerD1Client(client,withNativeTriggerCounts(database))
 return {client,statements,reads:()=>reads,transactions:()=>transactions}
}

test('D1 access change atomically rewrites roles, overrides, version and audit',async()=>{
 const fx=fixture()
 const result=await saveUserAccess(fx.client,'manager','staff',input)
 assert.deepEqual(result,{ok:true,version:2})
 assert.equal(fx.transactions(),0)
 assert.equal(fx.statements.length,7)
 assert.match(fx.statements[0].sql,/DELETE FROM "UserRole"/)
 assert.match(fx.statements[1].sql,/INSERT INTO "UserRole"/)
 assert.match(fx.statements[2].sql,/INSERT INTO "UserRole"/)
 assert.match(fx.statements[3].sql,/DELETE FROM "UserPermissionOverride"/)
 assert.match(fx.statements[4].sql,/INSERT INTO "UserPermissionOverride"/)
 assert.match(fx.statements[5].sql,/UPDATE "UserProfile" SET "accessVersion"="accessVersion"\+1,"updatedAt"=\?/)
 assert.match(fx.statements[6].sql,/INSERT INTO "AuditEvent"/)
 for(const index of [0,1,2,3,4])assert.match(fx.statements[index].sql,/accessVersion/)
 assert.equal(fx.statements[4].params[5],d1Date(input.overrides[0].startsAt))
 assert.equal(fx.statements[4].params[6],d1Date(input.overrides[0].expiresAt))
 assert.equal(fx.statements[5].params[2],1)
 assert.equal(fx.statements[5].params[3],'manager')
 assert.equal(fx.statements[5].params[4],5)
 const details=JSON.parse(fx.statements[6].params[5])
 assert.equal(details.reason,'Limit booking edits')
 assert.equal(details.version,2)
 assert.deepEqual(details.after.roles,[{roleCode:'BOOKING',scope:'SELF'},{roleCode:'SALES',scope:'SELF'}])
 assert.equal(details.after.overrides[0].effect,'DENY')
})

test('D1 access change rejects a stale target before preparing writes',async()=>{
 const fx=fixture({initialTargetVersion:2})
 await assert.rejects(()=>saveUserAccess(fx.client,'manager','staff',input),error=>error.code==='ACCESS_CONFLICT'&&error.status===409)
 assert.equal(fx.statements.length,0)
 assert.equal(fx.transactions(),0)
})

test('D1 access batch fails closed when manager is revoked before guarded write',async()=>{
 const fx=fixture({batchChanges:Array(7).fill(0),afterActorStatus:'SUSPENDED',afterActorVersion:6})
 await assert.rejects(()=>saveUserAccess(fx.client,'manager','staff',input),error=>error.code==='PERMISSION_DENIED')
 assert.equal(fx.transactions(),0)
 assert.equal(fx.reads(),4)
})

test('D1 access batch reports conflict when target access version changes concurrently',async()=>{
 const fx=fixture({batchChanges:Array(7).fill(0),afterTargetVersion:2})
 await assert.rejects(()=>saveUserAccess(fx.client,'manager','staff',input),error=>error.code==='ACCESS_CONFLICT'&&error.status===409)
 assert.equal(fx.transactions(),0)
 assert.equal(fx.reads(),4)
})
