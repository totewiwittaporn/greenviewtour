import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createD1Prisma} from '../../platform/database/d1-client.ts'
import {Prisma} from '../../generated/d1/client.ts'
export async function coreTransactions(env){
 const db=createD1Prisma(env.DB,{files:env.FILES}),checks=[]
 let stage='begin'
 try{
  const id=randomUUID(),role='QA-'+id.slice(0,12),resource=randomUUID(),event=randomUUID()
  stage='simple-create'
  await db.role.create({data:{code:role,name:"Atomic O'Brien test"}})
  assert.equal((await db.role.findUnique({where:{code:role}})).name,"Atomic O'Brien test")
  checks.push('root create commits a guarded batch')
  stage='empty-first-chunk'
  const absent=Array.from({length:220},(_,index)=>'ZZ-MISSING-'+index)
  const chunked=await db.$transaction(tx=>tx.role.findMany({where:{code:{in:[...absent,role]}}}))
  assert.equal(chunked.length,1);assert.equal(chunked[0].code,role)
  checks.push('large IN query retains columns when its first chunk is empty')
  stage='nested-create'
  const user=await db.userProfile.create({data:{id:id.toUpperCase(),displayName:'Atomic fixture',department:'BOOKING',roles:{create:{roleCode:role,scope:'SELF'}}},include:{roles:true}})
  assert.equal(user.id,id);assert.equal(user.roles.length,1)
  checks.push('nested relation create and UUID normalization')
  stage='read-own-write'
  await db.$transaction(async tx=>{
   await tx.userProfile.update({where:{id},data:{nickname:'First',accessVersion:{increment:1}}})
   assert.equal((await tx.userProfile.findUnique({where:{id}})).nickname,'First')
   await tx.userProfile.update({where:{id},data:{nickname:'Second'}})
   await tx.auditEvent.create({data:{id:event,actorId:id,targetId:id,action:'qa.atomic',details:{mode:'insensitive',path:['preserved'],nested:null}}})
  })
  assert.equal((await db.userProfile.findUnique({where:{id}})).nickname,'Second')
  assert.deepEqual((await db.auditEvent.findUnique({where:{id:event}})).details,{mode:'insensitive',path:['preserved'],nested:null})
  checks.push('read own updates and unmodified JSON payload')
  stage='callback-rollback'
  await assert.rejects(()=>db.$transaction(async tx=>{
   await tx.userProfile.update({where:{id},data:{nickname:'Must not commit'}})
   await tx.role.create({data:{code:role+'-rollback',name:'must not exist'}})
   throw new Error('QA_ABORT')
  }),/QA_ABORT/)
  assert.equal((await db.userProfile.findUnique({where:{id}})).nickname,'Second')
  assert.equal(await db.role.count({where:{code:role+'-rollback'}}),0)
  checks.push('callback failure rolls back every model and audit')
  stage='constraint-rollback'
  await assert.rejects(()=>db.$transaction(async tx=>{
   await tx.userProfile.update({where:{id},data:{nickname:'Must roll back'}})
   await tx.role.create({data:{code:role+'-duplicate',name:'one'}})
   await tx.role.create({data:{code:role+'-duplicate',name:'two'}})
  }))
  assert.equal(await db.role.count({where:{code:role+'-duplicate'}}),0)
  assert.equal((await db.userProfile.findUnique({where:{id}})).nickname,'Second')
  checks.push('native constraint failure rolls back guarded D1 batch')
  stage='upsert'
  await db.bookingSequence.upsert({where:{year:4099},create:{year:4099,value:1},update:{value:{increment:1}}})
  await db.bookingSequence.upsert({where:{year:4099},create:{year:4099,value:1},update:{value:{increment:1}}})
  assert.equal((await db.bookingSequence.findUnique({where:{year:4099}})).value,2)
  checks.push('upsert and increment return the committed value')
  stage='money'
  await db.operationResource.create({data:{id:resource,code:role,name:'Atomic money',kind:'CONSUMABLE',category:'DRINK',baseUnit:'PIECE',status:'ACTIVE',salePrice:'0.10'}})
  await db.operationResource.update({where:{id:resource},data:{salePrice:{increment:'0.20'}}})
  assert.equal((await db.operationResource.findUnique({where:{id:resource}})).salePrice.toFixed(2),'0.30')
  checks.push('decimal increment has exact two-place result')
  stage='json-null'
  await db.auditEvent.update({where:{id:event},data:{details:Prisma.JsonNull}})
  assert.equal((await db.auditEvent.findUnique({where:{id:event}})).details,null)
  checks.push('JSON literal null remains valid without SQL NULL coercion')
  stage='concurrent'
  const before=(await db.bookingSequence.findUnique({where:{year:4099}})).value
  await Promise.all([db.bookingSequence.update({where:{year:4099},data:{value:{increment:1}}}),db.bookingSequence.update({where:{year:4099},data:{value:{increment:1}}})])
  assert.equal((await db.bookingSequence.findUnique({where:{year:4099}})).value,before+2)
  checks.push('simultaneous commands retry stale snapshots without lost updates')
  stage='native-writer-snapshot'
  let reads=0
  const valueBefore=(await db.bookingSequence.findUnique({where:{year:4099}})).value
  const fresh=await db.$transaction(async tx=>{
   const row=await tx.bookingSequence.findUnique({where:{year:4099}})
   if(++reads===1)await env.DB.prepare('UPDATE BookingSequence SET value=value+1 WHERE year=?').bind(4099).run()
   return row.value
  },{readOnly:true})
  assert.equal(fresh,valueBefore+1);assert.equal(reads,2)
  checks.push('read snapshot retries when a native D1 writer changes data mid-read')
  stage='phantom-insert'
  let attempts=0
  const phantomRole=role+'-phantom',phantomEvent=randomUUID()
  const found=await db.$transaction(async tx=>{
   const count=await tx.role.count({where:{code:phantomRole}})
   if(++attempts===1)await env.DB.prepare('INSERT INTO Role(code,name) VALUES(?,?)').bind(phantomRole,'Concurrent native insert').run()
   await tx.auditEvent.create({data:{id:phantomEvent,actorId:id,targetId:id,action:'qa.phantom',details:{count}}})
   return count
  })
  assert.equal(found,1);assert.equal(attempts,2)
  assert.equal((await db.auditEvent.findUnique({where:{id:phantomEvent}})).details.count,1)
  checks.push('phantom insertion invalidates the whole command and commits only the retried audit')
  stage='native-permission-revocation'
  let permissionAttempts=0
  const priceBefore=(await db.operationResource.findUnique({where:{id:resource}})).salePrice.toString()
  await assert.rejects(()=>db.$transaction(async tx=>{
   const actor=await tx.userProfile.findUnique({where:{id}})
   if(actor.status!=='ACTIVE')throw new Error('QA_PERMISSION_REVOKED')
   if(++permissionAttempts===1)await env.DB.prepare('UPDATE UserProfile SET status=?,accessVersion=accessVersion+1 WHERE id=?').bind('SUSPENDED',id).run()
   await tx.operationResource.update({where:{id:resource},data:{salePrice:'99.00'}})
  }),/QA_PERMISSION_REVOKED/)
  assert.equal((await db.operationResource.findUnique({where:{id:resource}})).salePrice.toString(),priceBefore)
  assert.equal((await db.userProfile.findUnique({where:{id}})).status,'SUSPENDED')
  checks.push('concurrent permission revocation prevents the stale actor from committing business writes')
  stage='cascade'
  await db.userProfile.delete({where:{id}})
  assert.equal(await db.userRole.count({where:{userId:id}}),0)
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM D1TxnGuard').first()).n,0)
  checks.push('foreign-key cascade and transaction guard cleanup')
  return {checks}
 }catch(error){console.error('ATOMIC_CORE_FAILED',stage,error);throw Object.assign(new Error(error.code||error.message),{stage})}
 finally{await db.$disconnect()}
}
