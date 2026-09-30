import {withNativeTriggerCounts} from './helpers/d1-native-batch.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {editOwnProfile} from '../src/modules/identity-access/user-management.js'
import {registerD1Client} from '../src/platform/database/d1-runtime.js'
import {d1Date} from '../src/platform/database/d1-atomic.js'

const previous=new Date('2026-09-21T00:00:00Z')
function fixture({changes=[1,1],afterStatus='ACTIVE',initialStatus='ACTIVE'}={}){
  const statements=[]
  let reads=0,transactions=0
  const client={
    userProfile:{
      findUnique:async args=>{
        reads++
        if(args.select)return {status:afterStatus}
        return {id:'self',status:initialStatus,displayName:'Old Name',province:null,district:null,subdistrict:null,houseNumber:null,moo:null,villageName:null}
      },
    },
    $transaction:async()=>{transactions++;throw new Error('D1 path must not call Prisma transaction')},
  }
  const database={
    prepare(sql){
      const statement={sql,params:[],bind(...params){this.params=params;return this}}
      statements.push(statement)
      return statement
    },
    batch:async prepared=>{
      assert.deepEqual(prepared,statements)
      return changes.map(value=>({success:true,meta:{changes:value}}))
    },
  }
  registerD1Client(client,withNativeTriggerCounts(database))
  return {client,statements,reads:()=>reads,transactions:()=>transactions}
}

test('D1 own-profile update uses one atomic audit + compare-and-set batch',async()=>{
  const fx=fixture()
  const result=await editOwnProfile(fx.client,'self',{displayName:'Full Name',nickname:' Nick ',updatedAt:previous.toISOString()})
  assert.deepEqual(result,{ok:true})
  assert.equal(fx.transactions(),0)
  assert.equal(fx.statements.length,2)
  const [audit,update]=fx.statements
  assert.match(audit.sql,/INSERT INTO "AuditEvent"/)
  assert.match(audit.sql,/WHERE EXISTS \(SELECT 1 FROM "UserProfile"/)
  assert.match(update.sql,/UPDATE "UserProfile" SET/)
  assert.match(update.sql,/"displayName"=\?/)
  assert.match(update.sql,/"nickname"=\?/)
  assert.match(update.sql,/"postalCode"=\?/)
  assert.match(update.sql,/"updatedAt"=\?/)
  assert.equal(update.params.at(-1),d1Date(previous))
  assert.equal(update.params.at(-2),'self')
  const details=JSON.parse(audit.params[5])
  assert.equal(details.source,'self')
  assert.deepEqual(details.fields,['displayName','nickname','postalCode'])
  assert.equal(audit.params.at(-1),d1Date(previous))
})

test('D1 own-profile stale update writes neither profile nor audit and reports conflict',async()=>{
  const fx=fixture({changes:[0,0]})
  await assert.rejects(
    ()=>editOwnProfile(fx.client,'self',{displayName:'Full Name',updatedAt:previous.toISOString()}),
    error=>error.code==='PROFILE_CONFLICT'&&error.status===409,
  )
  assert.equal(fx.statements.length,2)
  assert.equal(fx.reads(),2)
  assert.equal(fx.transactions(),0)
})

test('D1 own-profile concurrent suspension fails closed after compare-and-set misses',async()=>{
  const fx=fixture({changes:[0,0],afterStatus:'SUSPENDED'})
  await assert.rejects(
    ()=>editOwnProfile(fx.client,'self',{displayName:'Full Name',updatedAt:previous.toISOString()}),
    error=>error.code==='ACCOUNT_UNAVAILABLE',
  )
  assert.equal(fx.reads(),2)
})

test('D1 own-profile rejects an already inactive account before preparing a batch',async()=>{
  const fx=fixture({initialStatus:'SUSPENDED'})
  await assert.rejects(
    ()=>editOwnProfile(fx.client,'self',{displayName:'Full Name',updatedAt:previous.toISOString()}),
    error=>error.code==='ACCOUNT_UNAVAILABLE',
  )
  assert.equal(fx.statements.length,0)
})

function managerProfileFixture({changes=[1,1],afterActorRole='MANAGER',afterTargetRole='GUIDE',afterActorVersion=7,afterTargetVersion=3}={}){
  const statements=[]
  let transactions=0,reads=0
  const actor=role=>({
    id:'manager',status:'ACTIVE',accessVersion:reads>2?afterActorVersion:7,department:null,
    roles:[{roleCode:role,scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'},{permissionCode:'users.profile.edit'}]}}],
    permissionOverrides:[],
  })
  const target=role=>({
    id:'guide',status:'ACTIVE',accessVersion:reads>2?afterTargetVersion:3,department:'GUIDE',displayName:'Guide Old',
    updatedAt:previous,province:null,district:null,subdistrict:null,houseNumber:null,moo:null,villageName:null,
    roles:[{roleCode:role,scope:'SELF',role:{permissions:[]}}],
    permissionOverrides:[],
  })
  const client={
    userProfile:{
      findUnique:async args=>{
        reads++
        if(args.where.id==='manager')return actor(reads>2?afterActorRole:'MANAGER')
        if(args.where.id==='guide')return target(reads>2?afterTargetRole:'GUIDE')
        return null
      },
    },
    $transaction:async()=>{transactions++;throw new Error('D1 path must not call Prisma transaction')},
  }
  const database={
    prepare(sql){
      const statement={sql,params:[],bind(...params){this.params=params;return this}}
      statements.push(statement)
      return statement
    },
    batch:async prepared=>{
      assert.deepEqual(prepared,statements)
      return changes.map(value=>({success:true,meta:{changes:value}}))
    },
  }
  registerD1Client(client,withNativeTriggerCounts(database))
  return {client,statements,reads:()=>reads,transactions:()=>transactions}
}

test('D1 manager profile edit guards actor and target access versions in one atomic batch',async()=>{
  const {editProfile}=await import('../src/modules/identity-access/user-management.js')
  const fx=managerProfileFixture()
  const result=await editProfile(fx.client,'manager','guide',{displayName:'Guide New',department:'GUIDE',updatedAt:previous.toISOString()})
  assert.deepEqual(result,{ok:true})
  assert.equal(fx.transactions(),0)
  assert.equal(fx.statements.length,2)
  const [audit,update]=fx.statements
  assert.match(audit.sql,/accessVersion/)
  assert.match(audit.sql,/status"='ACTIVE'/)
  assert.match(update.sql,/UPDATE "UserProfile"/)
  assert.match(update.sql,/accessVersion/)
  assert.equal(update.params.at(-1),7)
  assert.equal(update.params.at(-2),'manager')
  assert.equal(update.params.at(-3),3)
  assert.equal(update.params.at(-4),d1Date(previous))
  assert.equal(update.params.at(-5),'guide')
  assert.deepEqual(JSON.parse(audit.params[5]).fields,['displayName','department','postalCode'])
})

test('D1 manager edit fails closed when authorization changes before atomic write',async()=>{
  const {editProfile}=await import('../src/modules/identity-access/user-management.js')
  const fx=managerProfileFixture({changes:[0,0],afterActorRole:'GUIDE'})
  await assert.rejects(
    ()=>editProfile(fx.client,'manager','guide',{displayName:'Guide New',updatedAt:previous.toISOString()}),
    error=>error.code==='PERMISSION_DENIED',
  )
  assert.equal(fx.transactions(),0)
})

test('D1 manager edit treats concurrent target access changes as a conflict',async()=>{
  const {editProfile}=await import('../src/modules/identity-access/user-management.js')
  const fx=managerProfileFixture({changes:[0,0],afterTargetRole:'ADMIN_MANAGER',afterTargetVersion:4})
  await assert.rejects(
    ()=>editProfile(fx.client,'manager','guide',{displayName:'Guide New',updatedAt:previous.toISOString()}),
    error=>error.code==='PROFILE_CONFLICT'&&error.status===409,
  )
  assert.equal(fx.transactions(),0)
})
