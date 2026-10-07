import test from 'node:test'
import assert from 'node:assert/strict'
import {DAILY_WORK_ASSIGNMENT_CRON,staffDigestTickPlan,prepareStaffDigestTick,automaticStaffDigestGate,runAutomaticStaffDigests} from '../src/modules/notifications/staff-digest-schedule.js'

test('Bangkok tomorrow and explicit due time hold at minute, midnight, month and year boundaries',()=>{
 for(const [stamp,expected,due] of [
  ['2026-10-03T15:59:59Z','2026-10-04',false],['2026-10-03T16:00:00Z','2026-10-04',true],
  ['2026-10-03T16:59:59Z','2026-10-04',true],['2026-10-03T17:00:00Z','2026-10-05',false],
  ['2026-12-31T16:00:00Z','2027-01-01',true],['2028-02-28T16:00:00Z','2028-02-29',true],
 ]){const plan=staffDigestTickPlan({now:new Date(stamp),localTime:'23:00'});assert.equal(plan.serviceDate,expected);assert.equal(plan.due,due);assert.equal(plan.schedulerEnabled,false);assert.equal(plan.deliveryEnabled,false)}
 for(const localTime of [undefined,'','24:00','23:60','9:00','23:00Z'])assert.throws(()=>staffDigestTickPlan({localTime}),/TIME_REQUIRED/)
 assert.throws(()=>staffDigestTickPlan({now:new Date('bad'),localTime:'22:30'}),/INVALID_DATE/)
})
test('Local tick cannot send or mutate the previous date and delegates repeated ticks to durable preparation',async()=>{
 let calls=0;const db={},config={};const prepare=async(actual,input)=>{calls++;assert.equal(actual,db);assert.equal(input.config,config);assert.equal(input.mode,'simulation');assert.equal(input.serviceDate,'2026-10-04');assert.equal(input.actorId,'manager');return {rows:[{id:'stable-outbox'}]}}
 const before=await prepareStaffDigestTick(db,{actorId:'manager',config,localTime:'23:00',now:new Date('2026-10-03T15:59:00Z')},prepare);assert.equal(before.status,'NOT_DUE');assert.equal(calls,0)
 const first=await prepareStaffDigestTick(db,{actorId:'manager',config,localTime:'23:00',now:new Date('2026-10-03T16:00:00Z')},prepare)
 const second=await prepareStaffDigestTick(db,{actorId:'manager',config,localTime:'23:00',now:new Date('2026-10-03T16:01:00Z')},prepare)
 assert.deepEqual(first.result,second.result);assert.equal(calls,2)
})


test('production automatic gate is fail closed and uses 23:00 Bangkok next-day boundaries',()=>{
 assert.equal(DAILY_WORK_ASSIGNMENT_CRON,'0 16 * * *')
 for(const [stamp,expected,due] of [
  ['2026-10-03T15:59:59Z','2026-10-04',false],
  ['2026-10-03T16:00:00Z','2026-10-04',true],
  ['2026-12-31T16:00:00Z','2027-01-01',true],
  ['2028-02-28T16:00:00Z','2028-02-29',true],
 ]){const plan=staffDigestTickPlan({now:new Date(stamp),localTime:'23:00'});assert.equal(plan.serviceDate,expected);assert.equal(plan.due,due)}
 const actorId='11111111-1111-4111-8111-111111111111'
 const live={enabled:true,mode:'live',accessToken:'token'}
 assert.equal(automaticStaffDigestGate({APP_ENV:'local',PRODUCTION_ENABLED:'true',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'true',DAILY_WORK_ASSIGNMENT_ACTOR_ID:actorId},live).reason,'PRODUCTION_ONLY')
 assert.equal(automaticStaffDigestGate({APP_ENV:'production',PRODUCTION_ENABLED:'false',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'true',DAILY_WORK_ASSIGNMENT_ACTOR_ID:actorId},live).reason,'PRODUCTION_DISABLED')
 assert.equal(automaticStaffDigestGate({APP_ENV:'production',PRODUCTION_ENABLED:'true',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'false',DAILY_WORK_ASSIGNMENT_ACTOR_ID:actorId},live).reason,'AUTO_SEND_DISABLED')
 assert.equal(automaticStaffDigestGate({APP_ENV:'production',PRODUCTION_ENABLED:'true',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'true',DAILY_WORK_ASSIGNMENT_ACTOR_ID:actorId},live,'30 16 * * *').reason,'UNEXPECTED_CRON')
 assert.equal(automaticStaffDigestGate({APP_ENV:'production',PRODUCTION_ENABLED:'true',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'true'},live).reason,'ACTOR_REQUIRED')
 assert.equal(automaticStaffDigestGate({APP_ENV:'production',PRODUCTION_ENABLED:'true',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'true',DAILY_WORK_ASSIGNMENT_ACTOR_ID:actorId},{enabled:false,mode:'disabled'}).reason,'LINE_NOT_LIVE')
 assert.equal(automaticStaffDigestGate({APP_ENV:'production',PRODUCTION_ENABLED:'true',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'true',DAILY_WORK_ASSIGNMENT_ACTOR_ID:actorId},live).enabled,true)
})

test('automatic scheduler prepares and delivers every eligible prepared row using scheduled scope',async()=>{
 const actorId='11111111-1111-4111-8111-111111111111',db={},preparedCalls=[],deliveryCalls=[]
 const env={APP_ENV:'production',PRODUCTION_ENABLED:'true',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'true',DAILY_WORK_ASSIGNMENT_ACTOR_ID:actorId,BACKOFFICE_ORIGIN:'https://backoffice.greenviewtour.com'}
 const lineConfig={enabled:true,mode:'live',accessToken:'fixture-token',origin:'https://backoffice.greenviewtour.com',channelKey:'live:test'}
 const prepare=async(actual,input)=>{assert.equal(actual,db);preparedCalls.push(input);return {rows:[{id:'digest-a'},{id:'digest-b'}],skipped:[{userId:'not-linked',reason:'NOT_LINKED'}]}}
 const deliver=async(actual,input)=>{assert.equal(actual,db);deliveryCalls.push(input);return {id:input.id,status:'ACCEPTED'}}
 const result=await runAutomaticStaffDigests(db,{env,cron:DAILY_WORK_ASSIGNMENT_CRON,now:new Date('2026-10-03T16:00:00Z'),lineConfig,prepare,deliver,transport:async()=>{throw new Error('MOCK_DELIVER_OWNS_TRANSPORT')}})
 assert.equal(result.status,'COMPLETE')
 assert.equal(result.serviceDate,'2026-10-04')
 assert.equal(result.prepared,2)
 assert.equal(result.delivered,2)
 assert.equal(preparedCalls.length,1)
 assert.equal(preparedCalls[0].actorId,actorId)
 assert.equal(preparedCalls[0].serviceDate,'2026-10-04')
 assert.equal(preparedCalls[0].mode,'live')
 assert.equal(preparedCalls[0].config.automaticEnabled,true)
 assert.deepEqual(deliveryCalls.map(call=>call.id),['digest-a','digest-b'])
 for(const call of deliveryCalls){assert.equal(call.scope,'scheduled');assert.equal(call.enabled,true);assert.equal(call.mode,'live');assert.equal(call.actorId,actorId)}
})

test('automatic scheduler never prepares or delivers when production gate is closed',async()=>{
 let calls=0
 const result=await runAutomaticStaffDigests({},{
  env:{APP_ENV:'local',PRODUCTION_ENABLED:'true',DAILY_WORK_ASSIGNMENT_AUTO_SEND:'true',DAILY_WORK_ASSIGNMENT_ACTOR_ID:'11111111-1111-4111-8111-111111111111'},
  lineConfig:{enabled:true,mode:'live',accessToken:'fixture-token',channelKey:'live:test'},
  now:new Date('2026-10-03T16:00:00Z'),
  prepare:async()=>{calls++;throw new Error('MUST_NOT_PREPARE')},
  deliver:async()=>{calls++;throw new Error('MUST_NOT_DELIVER')},
 })
 assert.equal(result.status,'DISABLED')
 assert.equal(result.reason,'PRODUCTION_ONLY')
 assert.equal(calls,0)
})
