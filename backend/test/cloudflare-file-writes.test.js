import {withNativeTriggerCounts} from './helpers/d1-native-batch.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {registerD1Client} from '../src/platform/database/d1-runtime.js'
import {saveEvidence} from '../src/modules/evidence/service.js'
import {uploadCustomerProof} from '../src/modules/commerce/service.js'

const actorId='11111111-1111-4111-8111-111111111111'
const targetId='22222222-2222-4222-8222-222222222222'
const evidenceId='33333333-3333-4333-8333-333333333333'
const png=Buffer.from([137,80,78,71,13,10,26,10,1,2,3])
const upload={id:evidenceId,targetId,filename:'proof.png',mimeType:'image/png',base64:png.toString('base64'),note:'safe',documentNumber:'DOC-1'}

class Bucket{
 objects=new Map()
 async put(key,body,options={}){
  if(options.onlyIf?.etagDoesNotMatch==='*'&&this.objects.has(key))return null
  const data=new Uint8Array(body),row={data,httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}}
  this.objects.set(key,row);return {size:data.byteLength,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata}
 }
 async get(key){const row=this.objects.get(key);if(!row)return null;return {size:row.data.byteLength,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata,arrayBuffer:async()=>row.data.buffer.slice(row.data.byteOffset,row.data.byteOffset+row.data.byteLength)}}
 async head(key){const row=this.objects.get(key);return row?{size:row.data.byteLength,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata}:null}
 async delete(key){this.objects.delete(key)}
}

function d1Harness({customer=false}={}){
 const batches=[],bucket=new Bucket()
 let stored=null
 const database={
  prepare(sql){return {bind(...params){return {sql,params}}}},
  async batch(statements){
   batches.push(statements)
   stored={id:evidenceId,createdAt:new Date(),targetKind:customer?'CUSTOMER_REQUEST':'AGENT_BILL',targetId,uploadedBy:actorId,filename:'proof.png',mimeType:'image/png',size:png.length,sha256:statements[0].params[8],note:'safe',documentNumber:'DOC-1',category:customer?'PAYMENT':'OTHER',requestHash:statements[0].params.at(-5)}
   return statements.map(()=>({meta:{changes:1}}))
  },
 }
 const actor={id:actorId,status:'ACTIVE',accessVersion:4,roles:[{roleCode:'ACCOUNT',scope:'COMPANY'}],permissionOverrides:[]}
 const db={
  $transaction:async()=>{throw new Error('D1 write must not use Prisma transaction')},
  userProfile:{findUnique:async()=>actor},
  agentBill:{findUnique:async()=>({id:targetId})},
  customerProfile:{findUnique:async()=>({id:'customer-1',authUserId:actorId,status:'ACTIVE'})},
  customerRequest:{findUnique:async()=>({id:targetId,customerId:'customer-1',status:'AWAITING_PAYMENT',bookingId:'44444444-4444-4444-8444-444444444444'})},
  tourBooking:{findUnique:async()=>({status:'CONFIRMED'})},
  evidenceAttachment:{
   findUnique:async()=>stored,
   count:async()=>0,
  },
 }
 registerD1Client(db,withNativeTriggerCounts(database),{files:bucket})
 return {db,batches,bucket}
}

test('D1 evidence upload stores bytes in R2 and guards metadata plus audit in one database batch',async()=>{
 const {db,batches,bucket}=d1Harness()
 const result=await saveEvidence(db,actorId,{...upload,targetKind:'AGENT_BILL',category:'OTHER'})
 assert.equal(result.row.id,evidenceId)
 assert.ok(bucket.objects.has('evidence/'+evidenceId))
 assert.equal(batches.length,1);assert.equal(batches[0].length,2)
 assert.match(batches[0][0].sql,/EvidenceAttachment/)
 assert.match(batches[0][0].sql,/AgentBill/)
 assert.match(batches[0][0].sql,/accessVersion/)
 assert.match(batches[0][1].sql,/AuditEvent/)
})

test('D1 customer payment proof batches evidence, request transition and audit after R2 conditional write',async()=>{
 const {db,batches,bucket}=d1Harness({customer:true})
 const user={id:actorId,email:'guest@example.test',email_confirmed_at:'yes'}
 const result=await uploadCustomerProof(db,user,upload)
 assert.deepEqual(result,{ok:true,status:'PAYMENT_REVIEW'})
 assert.ok(bucket.objects.has('evidence/'+evidenceId))
 assert.equal(batches.length,1);assert.equal(batches[0].length,3)
 assert.match(batches[0][0].sql,/CustomerProfile/)
 assert.match(batches[0][1].sql,/UPDATE "CustomerRequest"/)
 assert.equal(batches[0][2].params.includes('customer-proof.uploaded'),true)
})
