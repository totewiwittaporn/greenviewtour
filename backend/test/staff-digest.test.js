import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {previewStaffDailyDigests,prepareStaffDailyDigests,deliverStaffDailyDigest,resendStaffDailyDigest} from '../src/modules/notifications/staff-digest.js'
const role=roleCode=>({roleCode,scope:'SELF'})
const config={channelKey:'test:staff',baseUrl:null},serviceDate='2026-10-04',now=new Date('2026-10-03T15:30:00Z')
function fixture(){
 const manager={id:'manager',status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}]},staff={id:'staff',displayName:'Test staff',status:'ACTIVE',roles:[role('CAPTAIN'),role('GUIDE'),role('DRIVER'),role('HOUSEKEEPING')]}
 const rows=[],binding={userId:'staff',channelKey:config.channelKey,status:'LINKED',lineUserId:'U'+'a'.repeat(32),version:1},queries={}
 const runs=[{id:randomUUID(),version:1,kind:'BOAT',slot:{startsAt:new Date('2026-10-04T01:00:00Z')},staff:[{userId:'staff',role:'CAPTAIN'}],assignments:[{adults:3,children:2}]}],guides=[{id:randomUUID(),version:1,guideId:'staff'}],work=[{id:randomUUID(),version:1,kind:'JOB',payload:{jobKind:'CLEANING',private:'secret'},assigneeId:'staff'}],bookings=[]
 const db={  tourBooking:{findMany:async q=>{queries.bookings=q;return bookings}},userProfile:{findUnique:async({where})=>where.id==='manager'?manager:staff,findMany:async()=>[staff]},authUser:{findMany:async()=>[{id:'staff',emailVerified:true,disabled:false}],findUnique:async()=>({id:'staff',email:'fixture@example.test',emailVerified:true,disabled:false})},$executeRaw:async()=>{},dispatchRun:{findMany:async q=>{queries.runs=q;return runs}},guideAssignment:{findMany:async q=>{queries.guides=q;return guides}},companyWorkRecord:{findMany:async q=>{queries.work=q;return work}},staffLineBinding:{findMany:async()=>binding.status?[binding]:[]},staffDailyDigest:{findFirst:async({where})=>rows.filter(row=>Object.entries(where).every(([k,v])=>String(row[k])===String(v))).at(-1),findUnique:async({where})=>rows.find(row=>row.id===where.id),create:async({data})=>{const row={...data};rows.push(row);return row},update:async({where,data})=>{const row=rows.find(row=>row.id===where.id);Object.assign(row,data,{attempts:data.attempts?.increment?row.attempts+data.attempts.increment:row.attempts});return {...row}},updateMany:async({where,data})=>{const row=rows.find(row=>row.id===where.id&&row.status===where.status&&row.attempts===where.attempts);if(row)Object.assign(row,data);return {count:row?1:0}}}}
 db.$transaction=async fn=>fn(db)
 return {db,staff,manager,binding,rows,runs,guides,work,bookings,queries,options:{actorId:'manager',serviceDate,config,now}}
}
test('preview projects assigned roles only, uses Bangkok bounds and strips private fields/binding',async()=>{
 const f=fixture(),result=await previewStaffDailyDigests(f.db,f.options),row=result.rows[0]
 assert.deepEqual(row.jobs.map(job=>job.role).sort(),['Captain','Guide','Housekeeping'])
 assert.equal(row.jobs.find(job=>job.kind==='Boat job').passengers,5)
 assert.equal(f.queries.runs.where.slot.startsAt.gte.toISOString(),'2026-10-03T17:00:00.000Z')
 assert.equal(f.queries.guides.where.endsAt.gt.toISOString(),'2026-10-03T17:00:00.000Z')
 assert.deepEqual(f.queries.runs.select.assignments.where.status,{not:'CANCELLED'})
 const serialized=JSON.stringify(result);assert.ok(!serialized.includes(f.binding.lineUserId));assert.ok(!serialized.includes('secret'));assert.ok(row.messages[0].text.includes('#'))
 f.staff.permissionOverrides=[{permissionCode:'operations.guide',effect:'DENY'}]
 assert.deepEqual((await previewStaffDailyDigests(f.db,f.options)).rows[0].jobs.map(job=>job.role),['Housekeeping'])
})
test('simulation works with no binding, is idempotent, persists exact messages, never calls transport',async()=>{
 const f=fixture();f.binding.status=null
 assert.equal((await previewStaffDailyDigests(f.db,f.options)).rows[0].reason,'NOT_LINKED')
 const prepared=await prepareStaffDailyDigests(f.db,f.options),id=prepared.rows[0].id
 assert.equal((await prepareStaffDailyDigests(f.db,f.options)).rows[0].id,id)
 assert.equal(f.rows[0].payload.to,undefined)
 const result=await deliverStaffDailyDigest(f.db,{...f.options,id,transport:()=>{throw new Error('NO NETWORK')}})
 assert.equal(result.status,'SIMULATED');assert.equal(result.accepted,false);assert.equal(f.rows[0].attempts,1)
 await deliverStaffDailyDigest(f.db,{...f.options,id});assert.equal(f.rows[0].attempts,1)
})
test('manager authorization, removed role, changed binding or assignment prevent delivery',async()=>{
 const denied=fixture();denied.manager.roles=[];await assert.rejects(previewStaffDailyDigests(denied.db,denied.options),{code:'PERMISSION_DENIED'})
 for(const change of [f=>{f.staff.roles=[]},f=>{f.binding.version++},f=>{f.runs[0].version++}]){
  const f=fixture(),id=(await prepareStaffDailyDigests(f.db,f.options)).rows[0].id;change(f)
  assert.equal((await deliverStaffDailyDigest(f.db,{...f.options,id})).status,'BLOCKED')
 }
})
test('live gates stay closed by default; retries retain UUID and payload and stop on bounds',async()=>{
 const f=fixture(),live={...config,enabled:true,mode:'live',liveEnabled:true,ownerUserId:'staff',accessToken:'fixture-token'},options={...f.options,config:live,mode:'live'}
 const id=(await prepareStaffDailyDigests(f.db,options)).rows[0].id,calls=[]
 await assert.rejects(deliverStaffDailyDigest(f.db,{...options,id}),{code:'LINE_DELIVERY_DISABLED'})
 const transport=async(_url,input)=>{calls.push(input);return new Response('',{status:500})}
 const request={...options,id,enabled:true,transport}
 assert.equal((await deliverStaffDailyDigest(f.db,request)).status,'FAILED')
 assert.equal((await deliverStaffDailyDigest(f.db,{...request,now:new Date(+now+180000)})).status,'FAILED')
 assert.equal(calls[0].headers['X-Line-Retry-Key'],calls[1].headers['X-Line-Retry-Key']);assert.equal(calls[0].body,calls[1].body)
 f.runs[0].version++
 assert.equal((await prepareStaffDailyDigests(f.db,options)).skipped[0].reason,'UNCERTAIN_DELIVERY_REQUIRES_RETRY');assert.equal(f.rows.length,1)
 f.rows[0].attempts=5;await assert.rejects(deliverStaffDailyDigest(f.db,request),{code:'LINE_ATTEMPTS_EXHAUSTED'})
 f.rows[0].attempts=2
 assert.equal((await deliverStaffDailyDigest(f.db,{...request,now:new Date(+now+23*3600000)})).status,'EXPIRED');assert.equal(calls.length,2)
})
test('in-flight claims serialize and LINE accepted duplicate is recorded as acceptance only',async()=>{
 const f=fixture(),options={...f.options,config:{...config,enabled:true,mode:'live',liveEnabled:true,ownerUserId:'staff',accessToken:'fixture-token'},mode:'live'}
 const id=(await prepareStaffDailyDigests(f.db,options)).rows[0].id
 f.rows[0].status='SENDING';f.rows[0].attempts=1;f.rows[0].lastAttemptAt=now;f.rows[0].firstAttemptAt=now
 await assert.rejects(deliverStaffDailyDigest(f.db,{...options,id,enabled:true}),{code:'LINE_DELIVERY_BUSY'})
 const result=await deliverStaffDailyDigest(f.db,{...options,id,enabled:true,now:new Date(+now+120001),transport:async()=>new Response('',{status:409,headers:{'x-line-accepted-request-id':'accepted'}})})
 assert.equal(result.status,'ACCEPTED');assert.equal(result.accepted,true)
})

test('deliberate resend is settled-only, command-idempotent and rechecks current roles',async()=>{
 const f=fixture(),id=(await prepareStaffDailyDigests(f.db,f.options)).rows[0].id
 const commandId=randomUUID(),input={...f.options,id,commandId}
 await assert.rejects(resendStaffDailyDigest(f.db,input),{code:'LINE_RESEND_REQUIRES_SETTLED'})
 await deliverStaffDailyDigest(f.db,{...f.options,id})
 const resend=await resendStaffDailyDigest(f.db,input)
 assert.equal(resend.id,commandId);assert.equal(resend.status,'PREPARED');assert.equal(f.rows[1].sourceId,id)
 assert.equal((await resendStaffDailyDigest(f.db,input)).id,commandId);assert.equal(f.rows.length,2)
 await assert.rejects(resendStaffDailyDigest(f.db,{...input,id:commandId}),{code:'COMMAND_CONFLICT'})
 await deliverStaffDailyDigest(f.db,{...f.options,id:commandId})
 const third=await resendStaffDailyDigest(f.db,{...input,commandId:randomUUID()});assert.equal(third.revision,3)
 f.staff.roles=[]
 await assert.rejects(resendStaffDailyDigest(f.db,{...input,commandId:randomUUID()}),{code:'DIGEST_RECIPIENT_UNAVAILABLE'})
})
test('driver, assistant captain, count and maintenance jobs retain their actual work roles',async()=>{
 const f=fixture();f.staff.roles.push(role('ASSISTANT_CAPTAIN'))
 f.runs.push({...f.runs[0],id:randomUUID(),kind:'VEHICLE',staff:[{userId:'staff',role:'DRIVER'}]},{...f.runs[0],id:randomUUID(),staff:[{userId:'staff',role:'ASSISTANT_CAPTAIN'}]})
 f.work.push({id:randomUUID(),version:1,kind:'JOB',payload:{jobKind:'COUNT'},assigneeId:'staff'},{id:randomUUID(),version:1,kind:'MAINTENANCE',payload:{reason:'private'},assigneeId:'staff'})
 const row=(await previewStaffDailyDigests(f.db,f.options)).rows[0]
 assert.deepEqual(row.jobs.map(job=>job.role).sort(),['Assistant Captain','Captain','Driver','Guide','Housekeeping','Maintenance','Stock count'])
 assert.ok(row.jobs.find(job=>job.role==='Driver').href.startsWith('/operations/driver?'))
 f.staff.status='SUSPENDED'
 const excluded=(await previewStaffDailyDigests(f.db,f.options)).rows[0]
 assert.equal(excluded.reason,'STAFF_UNAVAILABLE');assert.deepEqual(excluded.jobs,[])
})
test('oversized assignment sets fail visibly instead of silently dropping jobs',async()=>{
 const f=fixture();f.runs.push(...Array.from({length:1000},()=>({...f.runs[0],id:randomUUID()})))
 await assert.rejects(previewStaffDailyDigests(f.db,f.options),{code:'DIGEST_LIMIT_EXCEEDED'})
})
test('disabled Auth identity blocks live claim without contacting provider',async()=>{
 const f=fixture(),config={...f.options.config,enabled:true,mode:'live',liveEnabled:true,ownerUserId:'staff',accessToken:'fixture-token'},options={...f.options,config,mode:'live'}
 const id=(await prepareStaffDailyDigests(f.db,options)).rows[0].id
 f.db.authUser.findUnique=async()=>({id:'staff',emailVerified:true,disabled:true})
 assert.equal((await deliverStaffDailyDigest(f.db,{...options,id,enabled:true,transport:()=>{throw new Error('NO NETWORK')}})).status,'BLOCKED')
})

test('projection requires verified active Auth and stable ordering deduplicates repeated job/role',async()=>{
 const f=fixture();f.runs[0].staff.push({...f.runs[0].staff[0]})
 const first=(await previewStaffDailyDigests(f.db,f.options)).rows[0]
 assert.equal(first.jobs.filter(job=>job.role==='Captain').length,1)
 f.runs[0].staff.reverse()
 assert.equal((await previewStaffDailyDigests(f.db,f.options)).rows[0].contentHash,first.contentHash)
 for(const auth of [{id:'staff',disabled:true,emailVerified:true},{id:'staff',emailVerified:false},{id:'staff',emailVerified:true,bannedUntil:new Date(+now+60000)}]){
  f.db.authUser.findMany=async()=>[auth]
  const row=(await previewStaffDailyDigests(f.db,f.options)).rows[0]
  assert.equal(row.reason,'STAFF_UNAVAILABLE');assert.deepEqual(row.jobs,[])
 }
})

test('prepared and resend responses show persisted message snapshots without recipient leakage',async()=>{
 const f=fixture(),prepared=(await prepareStaffDailyDigests(f.db,f.options)).rows[0]
 assert.deepEqual(prepared.messages,f.rows[0].payload.messages);assert.equal(prepared.contentHash,f.rows[0].contentHash)
 assert.ok(!JSON.stringify(prepared).includes(f.binding.lineUserId));assert.equal('payload' in prepared,false)
 await deliverStaffDailyDigest(f.db,{...f.options,id:prepared.id})
 f.runs[0].assignments[0].adults=9
 const resent=await resendStaffDailyDigest(f.db,{...f.options,id:prepared.id,commandId:randomUUID()})
 assert.deepEqual(resent.messages,f.rows[1].payload.messages);assert.notDeepEqual(resent.messages,prepared.messages)
 assert.ok(!JSON.stringify(resent).includes(f.binding.lineUserId))
})
test('restored authorization may reprepare a never-attempted blocked digest, preserving uncertain keys',async()=>{
 const f=fixture(),prepared=(await prepareStaffDailyDigests(f.db,f.options)).rows[0],roles=f.staff.roles
 f.staff.roles=[]
 assert.equal((await deliverStaffDailyDigest(f.db,{...f.options,id:prepared.id})).status,'BLOCKED')
 assert.equal(f.rows[0].attempts,0)
 f.staff.roles=roles
 const restored=(await prepareStaffDailyDigests(f.db,f.options)).rows[0]
 assert.notEqual(restored.id,prepared.id);assert.equal(restored.revision,2);assert.equal(restored.status,'PREPARED')
 f.rows[1].status='BLOCKED';f.rows[1].attempts=1
 const same=(await prepareStaffDailyDigests(f.db,f.options)).rows[0]
 assert.equal(same.id,restored.id);assert.equal(same.status,'BLOCKED');assert.equal(f.rows.length,2)
 f.runs[0].version++
 assert.equal((await prepareStaffDailyDigests(f.db,f.options)).skipped[0].reason,'UNCERTAIN_DELIVERY_REQUIRES_RETRY');assert.equal(f.rows.length,2)
})


test('a role-less staff account cannot receive work through retained permission overrides',async()=>{
 const f=fixture();f.staff.roles=[];f.staff.permissionOverrides=[{permissionCode:'housekeeping.view',effect:'ALLOW'},{permissionCode:'inventory.request',effect:'ALLOW'}]
 const result=await previewStaffDailyDigests(f.db,f.options)
 assert.deepEqual(result.rows,[])
 assert.equal((await prepareStaffDailyDigests(f.db,f.options)).rows.length,0)
})

test('program summary aggregates unique bookings and reaches an unassigned summary role',async()=>{
 const f=fixture();f.staff.roles=[role('MANAGER')];f.runs[0].staff=[];f.guides.length=0;f.work.length=0
 f.bookings.push(
  {id:'b1',name:'Group one',adults:2,children:1,programSnapshot:{tourId:'tour-1',name:'Surin'},trip:{tourId:'tour-1',name:'Surin',tour:{name:'Surin',printCode:'SRN'}}},
  {id:'b2',name:'Group two',adults:3,children:2,programSnapshot:{tourId:'tour-1',name:'Surin'},trip:{tourId:'tour-1',name:'Surin',tour:{name:'Surin',printCode:'SRN'}}},
  {id:'b1',name:'Duplicate group',adults:99,children:99,programSnapshot:{tourId:'tour-1',name:'Surin'},trip:{tourId:'tour-1',name:'Surin',tour:{name:'Surin',printCode:'SRN'}}}
 )
 const result=await previewStaffDailyDigests(f.db,f.options)
 assert.equal(result.rows.length,1)
 const jobs=result.rows[0].jobs.filter(job=>job.kind==='Passenger summary')
 assert.equal(jobs.length,1)
 assert.match(jobs[0].text,/ผู้ใหญ่ 5/)
 assert.match(jobs[0].text,/เด็ก 3/)
 assert.match(jobs[0].text,/รวม 8/)
 assert.ok(result.rows[0].messages.some(message=>message.text.includes(jobs[0].text)))
})
test('admin sales account and unspecified roles are excluded from Daily Work Assignment recipients',async()=>{
 for(const code of ['ADMIN_MANAGER','SALES','ACCOUNT','UNSPECIFIED_ROLE']){
  const f=fixture();f.staff.roles=[role(code)]
  f.bookings.push({id:'b1',name:'Group',adults:2,children:0,programSnapshot:{tourId:'tour-1',name:'Surin'},trip:{tourId:'tour-1',name:'Surin',tour:{name:'Surin',printCode:'SRN'}}})
  assert.deepEqual((await previewStaffDailyDigests(f.db,f.options)).rows,[],code)
  assert.equal((await prepareStaffDailyDigests(f.db,f.options)).rows.length,0,code)
 }
})

test('head guide receives detailed island preparation instead of duplicate generic summary',async()=>{
 const f=fixture();f.staff.roles=[role('HEAD_GUIDE')];f.runs[0].staff=[];f.guides.length=0;f.work.length=0
 f.bookings.push(
  {id:'hg1',code:'HG1',name:'Group one',adults:2,children:1,programSnapshot:{tourId:'tour-hg',name:'Surin'},trip:{tourId:'tour-hg',name:'Surin',tour:{name:'Surin',printCode:'SRN'}},specialRequirements:['VEGETARIAN','OWN_TENT','NO_PARK_FEE'],allergyStatus:'REPORTED',allergies:'shellfish',lines:[{selected:true,quantity:3,snapshot:{category:'MEAL',mealPeriod:'LUNCH'}},{selected:true,quantity:1,snapshot:{category:'ACCOMMODATION',accommodationType:'STANDARD_TENT',ownership:'GREENVIEW'}}]},
  {id:'hg2',code:'HG2',name:'Group two',adults:1,children:1,programSnapshot:{tourId:'tour-hg',name:'Surin'},trip:{tourId:'tour-hg',name:'Surin',tour:{name:'Surin',printCode:'SRN'}},specialRequirements:['VEGAN','OWN_BUNGALOW'],allergyStatus:'NONE',allergies:null,lines:[{selected:true,quantity:2,snapshot:{category:'MEAL',mealPeriod:'LUNCH'}},{selected:true,quantity:2,snapshot:{category:'MEAL',mealPeriod:'DINNER'}},{selected:true,quantity:2,snapshot:{category:'PARK_FEE'}},{selected:true,quantity:1,snapshot:{category:'ACCOMMODATION',accommodationType:'BUNGALOW',ownership:'PARK'}}]}
 )
 const result=await previewStaffDailyDigests(f.db,f.options)
 assert.equal(result.rows.length,1)
 const detailed=result.rows[0].jobs.filter(job=>job.kind==='Island preparation')
 assert.equal(detailed.length,1)
 assert.equal(result.rows[0].jobs.some(job=>job.kind==='Passenger summary'),false)
 const text=detailed[0].text
 for(const value of ['Total 5','LUNCH 5','DINNER 2','Park fee: 2','Excluded pax: 3','GREENVIEW:STANDARD_TENT 1','PARK:BUNGALOW 1','Vegetarian pax 3','Vegan pax 2','Own tent pax: 3','Own bungalow pax: 2','shellfish'])assert.ok(text.includes(value),value)
 assert.equal('adultPrice' in f.queries.bookings.select,false)
 assert.equal('agentId' in f.queries.bookings.select,false)
 assert.equal('paymentTerms' in f.queries.bookings.select,false)
})


test('driver receives only own manifest while head driver receives safe run summaries',async()=>{
 const ownBooking={id:'booking-own',code:'OWN-1',name:'Own guest group',hotel:'Seaside Hotel',pickupPoint:'Lobby A',dropoffPoint:'Greenview Pier'}
 const otherBooking={id:'booking-other',code:'OTHER-1',name:'Other driver customer',hotel:'Other Hotel',pickupPoint:'Lobby B',dropoffPoint:'Other Pier'}
 const makeRun=({id,userId,booking,adults,children,registration})=>({id,version:1,name:'Van '+registration,kind:'VEHICLE',direction:'OUTBOUND',slot:{startsAt:new Date('2026-10-04T00:30:00Z'),vehicle:{code:'V-'+registration,name:'Van '+registration,registration}},staff:[{userId,role:'DRIVER'}],assignments:[{adults,children,pickupAt:new Date('2026-10-04T00:00:00Z'),dropoffPoint:booking.dropoffPoint,bookingLine:{booking}}]})
 const ownRun=makeRun({id:randomUUID(),userId:'staff',booking:ownBooking,adults:2,children:1,registration:'1111'})
 const otherRun=makeRun({id:randomUUID(),userId:'other-driver',booking:otherBooking,adults:4,children:0,registration:'2222'})
 {
  const f=fixture();f.staff.roles=[role('DRIVER')];f.runs.splice(0,f.runs.length,ownRun,otherRun);f.guides.length=0;f.work.length=0
  const options={...f.options,config:{...f.options.config,baseUrl:'https://backoffice.greenviewtour.com'}}
  const row=(await previewStaffDailyDigests(f.db,options)).rows[0]
  assert.equal(row.jobs.length,1)
  assert.equal(row.jobs[0].kind,'Driver manifest')
  assert.match(row.jobs[0].text,/Own guest group/)
  assert.match(row.jobs[0].text,/3 pax/)
  assert.match(row.jobs[0].text,/Lobby A/)
  assert.match(row.jobs[0].text,/Greenview Pier/)
  assert.ok(row.messages.some(message=>message.text.includes('/operations/driver?runId='+ownRun.id)))
  assert.ok(!JSON.stringify(row).includes('Other driver customer'))
  const selected=f.queries.runs.select.assignments.select.bookingLine.select.booking.select
  for(const field of ['adultPrice','childPrice','agentId','agentName','agentPhone','contactPhone','paymentTerms','requestNotes','allergies'])assert.equal(field in selected,false,field)
 }
 {
  const f=fixture();f.staff.roles=[role('HEAD_DRIVER')];f.runs.splice(0,f.runs.length,ownRun,otherRun);f.guides.length=0;f.work.length=0
  const row=(await previewStaffDailyDigests(f.db,{...f.options,config:{...f.options.config,baseUrl:'https://backoffice.greenviewtour.com'}})).rows[0]
  const summaries=row.jobs.filter(job=>job.kind==='Vehicle run summary')
  assert.equal(summaries.length,2)
  assert.ok(summaries.some(job=>job.text.includes('Lobby A 3 pax')))
  assert.ok(summaries.some(job=>job.text.includes('Lobby B 4 pax')))
  assert.ok(!summaries.some(job=>job.text.includes('Own guest group')||job.text.includes('Other driver customer')))
  f.runs[0].staff=[{userId:'staff',role:'DRIVER'}]
  const personal=(await previewStaffDailyDigests(f.db,{...f.options,config:{...f.options.config,baseUrl:'https://backoffice.greenviewtour.com'}})).rows[0]
  assert.ok(personal.jobs.some(job=>job.kind==='Driver manifest'&&job.text.includes('Own guest group')))
 }
})

test('scheduled live delivery bypasses manual owner-only rule but remains idempotent',async()=>{
 const f=fixture(),live={...f.options.config,enabled:true,mode:'live',liveEnabled:true,automaticEnabled:true,accessToken:'fixture-token'}
 const options={...f.options,config:live,mode:'live'}
 const id=(await prepareStaffDailyDigests(f.db,options)).rows[0].id
 let calls=0
 const first=await deliverStaffDailyDigest(f.db,{...options,id,enabled:true,scope:'scheduled',transport:async()=>{calls++;return new Response('',{status:200})}})
 assert.equal(first.status,'ACCEPTED')
 assert.equal(calls,1)
 const second=await deliverStaffDailyDigest(f.db,{...options,id,enabled:true,scope:'scheduled',transport:async()=>{throw new Error('DUPLICATE_SEND')}})
 assert.equal(second.status,'ACCEPTED')
 assert.equal(calls,1)
})

test('head guide exposes unknown preparation state instead of guessing',async()=>{
 const f=fixture();f.staff.roles=[role('HEAD_GUIDE')];f.runs[0].staff=[];f.guides.length=0;f.work.length=0
 f.bookings.push({id:'unknown-hg',code:'UHG',name:'Unknown prep',adults:1,children:0,programSnapshot:{tourId:'tour-unknown',name:'Unknown Tour'},trip:{tourId:'tour-unknown',name:'Unknown Tour',tour:{name:'Unknown Tour',printCode:'UNK'}},specialRequirements:[],allergyStatus:'UNKNOWN',allergies:null})
 const row=(await previewStaffDailyDigests(f.db,f.options)).rows[0]
 const text=row.jobs.find(job=>job.kind==='Island preparation').text
 for(const value of ['Park fee: unconfirmed','Meals: unconfirmed','Accommodation: unconfirmed','Unknown/unconfirmed pax 1','Services: unconfirmed source data'])assert.ok(text.includes(value),value)
})


test('Daily Work Assignment message chunks stay within LINE limits without silent omission',async()=>{
 const f=fixture();f.staff.roles=[role('MANAGER')];f.runs[0].staff=[];f.guides.length=0;f.work.length=0
 for(let index=0;index<30;index++){
  const suffix=String(index).padStart(2,'0'),name='Program '+suffix+' '+('X'.repeat(160))
  f.bookings.push({id:'bulk-'+suffix,name,adults:2,children:1,programSnapshot:{tourId:'tour-'+suffix,name},trip:{tourId:'tour-'+suffix,name,tour:{name,printCode:'P'+suffix}}})
 }
 const row=(await previewStaffDailyDigests(f.db,f.options)).rows[0]
 assert.ok(row.messages.length>1)
 assert.ok(row.messages.length<=5)
 assert.ok(row.messages.every(message=>message.text.length<=4800))
 assert.ok(row.messages[0].text.includes('P00'))
 assert.ok(row.messages.at(-1).text.includes('P29'))
})
