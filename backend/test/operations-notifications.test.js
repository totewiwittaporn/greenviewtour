import test from 'node:test'
import assert from 'node:assert/strict'
import { bangkokSchedule, notificationReadiness, normalizeRuns, summaryMessages, deliverPrepared, prepareDailySummary, runNightlyTick } from '../src/modules/operations/notifications.js'
const id='11111111-1111-4111-8111-111111111111'
const run={id,kind:'BOAT',name:'Surin 1',adults:12,children:3,guestName:'SECRET GUEST',hotel:'SECRET HOTEL'}
test('Bangkok cutoff and next service date cross UTC/month/year boundaries',()=>{
 assert.deepEqual(bangkokSchedule(new Date('2026-12-31T14:59:00Z')),{serviceDate:'2027-01-01',closeDue:false,summaryDue:false,timezone:'Asia/Bangkok'})
 assert.equal(bangkokSchedule(new Date('2026-12-31T15:00:00Z')).closeDue,true)
 assert.equal(bangkokSchedule(new Date('2026-12-31T15:29:59Z')).summaryDue,false)
 assert.equal(bangkokSchedule(new Date('2026-12-31T15:30:00Z')).summaryDue,true)
 assert.equal(bangkokSchedule(new Date('2026-12-31T17:00:00Z')).serviceDate,'2027-01-02')
})
test('readiness rejects local and credential-bearing URLs and never returns secrets',()=>{
 for(const url of ['http://localhost:5174','https://127.0.0.1','https://localhost','https://dev.local','https://user:pass@example.com','https://example.com/?secret=x']) assert.equal(notificationReadiness({OPERATIONS_PUBLIC_BASE_URL:url}).baseUrl,null)
 const ready=notificationReadiness({OPERATIONS_PUBLIC_BASE_URL:'https://ops.example.com',LINE_CHANNEL_ACCESS_TOKEN:'SECRET',LINE_GROUP_ID:'C'+'a'.repeat(32)})
 assert.equal(ready.status,'PREPARATION_READY'); assert.equal(ready.deliveryEnabled,false); assert.ok(!JSON.stringify(ready).includes('SECRET'))
})
test('summary content allowlist excludes customer detail and unsafe URL parameters',()=>{
 const normalized=normalizeRuns([run]); assert.equal(normalized[0].passengers,15)
 const messages=summaryMessages('2026-09-10',[run],'https://ops.example.com')
 assert.ok(messages[0].text.includes('15 passengers')); assert.ok(!JSON.stringify(messages).includes('SECRET'))
 assert.throws(()=>normalizeRuns([{...run,name:'Boat\nSECRET'}]))
 assert.throws(()=>summaryMessages('2026-02-30',[run],'https://ops.example.com'))
})
test('LINE delivery cannot run without explicit opt-in',async()=>{
 await assert.rejects(()=>deliverPrepared({},id,id),{message:'LINE_DELIVERY_DISABLED'})
})
function fakeDb(item) {
 const tx = {
  $executeRaw:async()=>{},
  userProfile:{findUnique:async()=>({status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}]})},
  operationNotificationOutbox:{findUnique:async()=>item,update:async({data})=>{for(const [k,v] of Object.entries(data)) item[k]=v?.increment ? item[k]+v.increment:v;return {...item}},updateMany:async({where,data})=>{if(where.attempts!==item.attempts)return {count:0};Object.assign(item,data);return {count:1}}}
 }
 return {$transaction:async fn=>fn(tx)}
}
const env={OPERATIONS_PUBLIC_BASE_URL:'https://ops.example.com',LINE_CHANNEL_ACCESS_TOKEN:'SECRET',LINE_GROUP_ID:'C'+'a'.repeat(32),OPERATIONS_LINE_DELIVERY_ENABLED:'true'}
function outbox(){return {id,status:'PREPARED',attempts:0,retryKey:id,payload:{to:env.LINE_GROUP_ID,messages:[{type:'text',text:'Safe summary'}]},firstAttemptAt:null,lastAttemptAt:null}}
test('retry uses persisted identical payload/key and accepted 409 dedup only',async()=>{
 const item=outbox(), db=fakeDb(item), calls=[]
 const transport=async(url,opts)=>{calls.push(opts);return {ok:false,status:409,headers:new Headers(calls.length===2?{'x-line-accepted-request-id':'accepted'}:{})}}
 assert.equal((await deliverPrepared(db,id,id,{enabled:true,env,transport})).status,'FAILED')
 assert.equal((await deliverPrepared(db,id,id,{enabled:true,env,transport})).status,'SENT')
 assert.equal(calls[0].body,calls[1].body);assert.equal(calls[0].headers['X-Line-Retry-Key'],calls[1].headers['X-Line-Retry-Key'])
 await deliverPrepared(db,id,id,{enabled:true,env,transport});assert.equal(calls.length,2)
})
test('expired retries and exhausted attempts do not contact LINE',async()=>{
 const item=outbox();item.firstAttemptAt=new Date('2026-09-09T00:00:00Z')
 let calls=0;const transport=async()=>{calls++;throw new Error('should not call')}
 assert.equal((await deliverPrepared(fakeDb(item),id,id,{enabled:true,env,now:new Date('2026-09-10T00:00:00Z'),transport})).status,'EXPIRED')
 const exhausted=outbox();exhausted.attempts=5
 await assert.rejects(()=>deliverPrepared(fakeDb(exhausted),id,id,{enabled:true,env,transport}),{message:'LINE_ATTEMPTS_EXHAUSTED'})
 assert.equal(calls,0)
})
test('manual captures preserve revisions while automatic ticks capture only once',async()=>{
 const snapshots=[]
 const base=fakeDb(outbox())
 const db={$transaction:fn=>base.$transaction(async tx=>{
  tx.operationDailySnapshot={findFirst:async({where})=>snapshots.filter(s=>s.kind===where.kind && +s.serviceDate===+where.serviceDate).at(-1),create:async({data})=>{snapshots.push(data);return data}}
  tx.dispatchRun={findMany:async()=>[{...run,status:'OPEN',assignments:[{adults:12,children:3}]}]}
  return fn(tx)
 })}
 const input={serviceDate:'2026-09-10',kind:'CLOSE'}
 const first=await prepareDailySummary(db,id,input,async()=>[run],{})
 const second=await prepareDailySummary(db,id,input,async()=>[run],{})
 assert.equal(first.snapshot.id,second.snapshot.id)
 const changed=await prepareDailySummary(db,id,input,async()=>[{...run,adults:13}],{})
 assert.equal(changed.snapshot.revision,2)
 await runNightlyTick(db,id,{now:new Date('2026-09-09T15:01:00Z'),env:{}})
 assert.equal(snapshots.length,2)
 await runNightlyTick(db,id,{now:new Date('2026-09-09T15:30:00Z'),env:{}})
 await runNightlyTick(db,id,{now:new Date('2026-09-09T15:31:00Z'),env:{}})
 assert.equal(snapshots.length,3);assert.equal(snapshots.at(-1).kind,'SUMMARY')
})
