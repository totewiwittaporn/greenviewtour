import test from 'node:test'
import assert from 'node:assert/strict'
import {saleDateAllowed,promotionAllowed,commerceErrors,cents,safeImageUrl} from '../../packages/contracts/commerce.js'
import {saveCustomerProfile,customerFor,quoteRequest,publicTourSelect,submitCustomerRequest,publicCatalog,requestDisplayStatus,customerDocument,cancelCustomerRequest} from '../src/modules/commerce/service.js'
import {SessionStore} from '../src/platform/auth/sessions.js'
const tourId='11111111-1111-4111-8111-111111111111'
const now=new Date('2026-10-31T18:00:00Z')
const season={status:'ACTIVE',startsOn:'2026-10-01',endsOn:'2027-05-31',onlineStartsOn:'2026-11-01',onlineEndsOn:'2027-04-30',bookingStartsOn:'2026-10-01',bookingEndsOn:'2027-04-30',cutoffDays:1,closedDates:'2026-11-03'}
test('online travel is narrower than service dates; Bangkok cutoff and closures apply',()=>{
 assert.equal(saleDateAllowed([season],'2026-11-02',now),true)
 for(const date of ['2026-11-01','2026-11-03','2026-10-25','2027-05-01','2026-02-30'])assert.equal(saleDateAllowed([season],date,now),false)
 assert.equal(saleDateAllowed([{...season,status:'INACTIVE'}],'2026-11-02',now),false)
})
test('promotion booking period and service period are independent and inclusive',()=>{
 const p={status:'ACTIVE',startsOn:'2026-11-01',endsOn:'2026-11-02',serviceStartsOn:'2026-12-01',serviceEndsOn:'2026-12-15'}
 assert.equal(promotionAllowed(p,'2026-12-01',now),true)
 assert.equal(promotionAllowed(p,'2026-11-02',now),false)
 assert.equal(promotionAllowed(p,'2026-12-15',new Date('2026-11-03T00:00:00Z')),false)
})
test('content URLs reject executable and credential-bearing URLs',()=>{
 for(const url of ['javascript:alert(1)','https://user:pass@example.com/image.png','data:image/svg+xml,test'])assert.equal(safeImageUrl(url),false)
 assert.equal(safeImageUrl('/api/public/images/'+tourId),true)
 assert.ok(commerceErrors('tours',{publicStatus:'PUBLISHED',slug:'Bad Slug'}).slug)
 assert.ok(commerceErrors('promotions',{adultPrice:null,childPrice:null}).adultPrice)
})
test('money handles zero without treating it as absent',()=>{assert.equal(cents('0'),0);assert.equal(cents(null),null);assert.equal(cents('12.34'),1234);assert.equal(cents('12.345'),null)})
test('public tour allowlist contains no procurement or Agent fields',()=>{for(const key of ['supplierAdultNet','supplierChildNet','supplierPricing','agentPrices','operator','operatorId'])assert.equal(publicTourSelect[key],undefined)})
test('customer ownership requires confirmed identity and active exact auth link',async()=>{
 let where
 const db={customerProfile:{findUnique:async input=>{where=input.where;return {id:tourId,status:'ACTIVE'}}}}
 await assert.rejects(()=>customerFor(db,{id:tourId}),{message:'EMAIL_VERIFICATION_REQUIRED'})
 await customerFor(db,{id:tourId,email_confirmed_at:'yes'});assert.deepEqual(where,{authUserId:tourId})
 await assert.rejects(()=>customerFor({customerProfile:{findUnique:async()=>({status:'SUSPENDED'})}},{id:tourId,email_confirmed_at:'yes'}),{message:'CUSTOMER_UNAVAILABLE'})
})
test('member and employee cookies are isolated',()=>{
 const staff=new SessionStore(),member=new SessionStore('gv_member_session')
 const req={headers:{cookie:'gv_session=STAFF; gv_member_session=MEMBER'}}
 assert.equal(staff.id(req),'STAFF');assert.equal(member.id(req),'MEMBER');assert.ok(member.cookie('x').startsWith('gv_member_session='))
})
function quoteDb(){const tour={id:tourId,name:'DEMO',status:'ACTIVE',publicStatus:'PUBLISHED',version:1,journeyMode:'FIXED',durationDays:1,adultPrice:'1000',childPrice:'500',components:[],seasons:[season]};return {tourProgram:{findUnique:async()=>tour},tourPromotion:{findUnique:async()=>({id:tourId,tourId,status:'ACTIVE',startsOn:'2026-10-01',endsOn:'2026-12-31',serviceStartsOn:'2026-11-01',serviceEndsOn:'2026-12-31',adultPrice:'800',childPrice:'400',quota:2,quotaUnit:'SEAT'})},customerRequest:{aggregate:async()=>({_count:{id:1},_sum:{adults:1,children:0}})}}}
test('quote computes on server and refuses exhausted promotion seats',async()=>{
 const db=quoteDb(),input={tourId,serviceDate:'2026-11-02',adults:1,children:1}
 assert.equal((await quoteRequest(db,input,now)).packageTotal,'1500.00')
 await assert.rejects(()=>quoteRequest(db,{...input,promotionId:tourId},now),{message:'PROMOTION_SOLD_OUT'})
 assert.equal((await quoteRequest(db,{...input,children:0,promotionId:tourId},now)).packageTotal,'800.00')
})
test('idempotent request retries cannot read another customer request',async()=>{
 const tx={customerProfile:{findUnique:async()=>({id:'mine',status:'ACTIVE'})},$executeRaw:async()=>{},customerRequest:{findUnique:async()=>({customerId:'other',requestHash:'anything'})}}
 await assert.rejects(()=>submitCustomerRequest({$transaction:fn=>fn(tx)},{id:tourId,email_confirmed_at:'yes'},{id:tourId}),{message:'COMMAND_CONFLICT'})
})

test('promotion filtering happens before pagination and uses the Bangkok booking window',async()=>{
 let countWhere,listWhere
 await publicCatalog({tourProgram:{count:async({where})=>{countWhere=where;return 0},findMany:async({where})=>{listWhere=where;return []}}},new URLSearchParams({promotionsOnly:'true'}),now)
 assert.deepEqual(countWhere,listWhere)
 assert.equal(countWhere.promotions.some.status,'ACTIVE')
 assert.equal(countWhere.promotions.some.startsOn.lte.toISOString(),'2026-11-01T00:00:00.000Z')
})
test('expired requests and cancelled operational bookings never display as payable',()=>{
 assert.equal(requestDisplayStatus({status:'REQUESTED',holdUntil:'2026-10-31T00:00Z'},now),'EXPIRED')
 assert.equal(requestDisplayStatus({status:'AWAITING_PAYMENT',booking:{status:'CANCELLED'}},now),'CANCELLED')
 assert.equal(requestDisplayStatus({status:'PAID',holdUntil:'2026-10-31T00:00Z'},now),'PAID')
})
test('document retrieval rejects another customer and non-customer evidence',async()=>{
 const db={customerProfile:{findUnique:async()=>({id:'mine',status:'ACTIVE'})},evidenceAttachment:{findUnique:async()=>({targetKind:'CUSTOMER_REQUEST',targetId:tourId})},customerRequest:{findUnique:async()=>({customerId:'other'})}}
 const user={id:tourId,email_confirmed_at:'yes'}
 await assert.rejects(()=>customerDocument(db,user,tourId),{message:'NOT_FOUND'})
 db.evidenceAttachment.findUnique=async()=>({targetKind:'BOOKING',targetId:tourId})
 await assert.rejects(()=>customerDocument(db,user,tourId),{message:'NOT_FOUND'})
})
test('customer cancellation cannot cancel an accepted operational booking',async()=>{
 const tx={$executeRaw:async()=>{},customerProfile:{findUnique:async()=>({id:'mine',status:'ACTIVE'})},customerRequest:{findUnique:async()=>({customerId:'mine',status:'AWAITING_PAYMENT',bookingId:tourId,version:1})}}
 await assert.rejects(()=>cancelCustomerRequest({$transaction:fn=>fn(tx)},{id:tourId,email_confirmed_at:'yes'},{requestId:tourId,version:1}),{message:'BOOKING_LOCKED'})
})

function profileDb() {
 const customer={id:'mine',authUserId:tourId,status:'ACTIVE',version:3,displayName:'Customer',phone:null,lineId:'previous.line'}
 const queries=[],writes=[]
 return {customer,queries,writes,customerProfile:{findUnique:async({where})=>{queries.push(where);assert.deepEqual(where,{authUserId:tourId});return {...customer}},updateMany:async({where,data})=>{writes.push({where,data});assert.deepEqual(where,{id:'mine',version:3,status:'ACTIVE'});Object.assign(customer,data,{version:4});return {count:1}}}}
}
const memberUser={id:tourId,email_confirmed_at:'yes'}
test('member profile saves optional LINE ID on the authenticated customer only',async()=>{
 const db=profileDb()
 const result=await saveCustomerProfile(db,memberUser,{version:3,displayName:' Customer ',phone:' 123 ',lineId:' my.line '})
 assert.equal(result.customer.lineId,'my.line')
 assert.deepEqual(db.writes[0].data,{displayName:'Customer',phone:'123',lineId:'my.line',version:{increment:1}})
 assert.equal(db.queries.length,2)
})
test('member LINE ID can be cleared while omitted values preserve existing contact data',async()=>{
 for(const lineId of ['',null,'   ']){
  const db=profileDb()
  assert.equal((await saveCustomerProfile(db,memberUser,{version:3,displayName:'Customer',lineId})).customer.lineId,null)
 }
 const db=profileDb()
 assert.equal((await saveCustomerProfile(db,memberUser,{version:3,displayName:'Customer'})).customer.lineId,'previous.line')
 assert.equal(Object.hasOwn(db.writes[0].data,'lineId'),false)
})
test('member profile rejects invalid LINE ID and locked or foreign profile fields before writing',async()=>{
 for(const extra of [{lineId:'x'.repeat(101)},{lineId:42},{lineId:false},{lineId:{}},{lineId:'bad\u0000id'},{id:'other'},{authUserId:'other'},{email:'changed@example.test'},{status:'ACTIVE'}]){
  const db=profileDb()
  await assert.rejects(()=>saveCustomerProfile(db,memberUser,{version:3,displayName:'Customer',...extra}),{message:'INVALID_INPUT'})
  assert.equal(db.writes.length,0)
 }
 const db=profileDb()
 assert.equal((await saveCustomerProfile(db,memberUser,{version:3,displayName:'Customer',lineId:'x'.repeat(100)})).customer.lineId.length,100)
})
test('member profile preserves optimistic locking before and during updates',async()=>{
 const stale=profileDb()
 await assert.rejects(()=>saveCustomerProfile(stale,memberUser,{version:2,displayName:'Customer',lineId:'new'}),{message:'SETTINGS_CONFLICT'})
 assert.equal(stale.writes.length,0)
 const concurrent=profileDb();concurrent.customerProfile.updateMany=async()=>({count:0})
 await assert.rejects(()=>saveCustomerProfile(concurrent,memberUser,{version:3,displayName:'Customer',lineId:'new'}),{message:'SETTINGS_CONFLICT'})
})

test('member nickname is owned, optional and independent from full display name',async()=>{
 const db=profileDb();db.customer.nickname='Previous'
 const result=await saveCustomerProfile(db,memberUser,{version:3,displayName:'Customer',nickname:' Nick '})
 assert.equal(result.customer.nickname,'Nick');assert.equal(result.customer.displayName,'Customer')
 const omitted=profileDb();omitted.customer.nickname='Previous'
 assert.equal((await saveCustomerProfile(omitted,memberUser,{version:3,displayName:'Customer'})).customer.nickname,'Previous')
 assert.equal(Object.hasOwn(omitted.writes[0].data,'nickname'),false)
 for(const nickname of [null,'','   '])assert.equal((await saveCustomerProfile(profileDb(),memberUser,{version:3,displayName:'Customer',nickname})).customer.nickname,null)
 assert.equal((await saveCustomerProfile(profileDb(),memberUser,{version:3,displayName:'Customer',nickname:'x'.repeat(50)})).customer.nickname.length,50)
})
test('member nickname rejects invalid values and preserves stale-write protection',async()=>{
 for(const nickname of [42,false,{},undefined,'x'.repeat(51),'bad\nname','bad\tname','bad\u0000name','bad\u007fname','bad\u0085name']){
  const db=profileDb()
  await assert.rejects(()=>saveCustomerProfile(db,memberUser,{version:3,displayName:'Customer',nickname}),{message:'INVALID_INPUT'})
  assert.equal(db.writes.length,0)
 }
 const stale=profileDb()
 await assert.rejects(()=>saveCustomerProfile(stale,memberUser,{version:2,displayName:'Customer',nickname:'New'}),{message:'SETTINGS_CONFLICT'})
 assert.equal(stale.writes.length,0)
 const concurrent=profileDb();concurrent.customerProfile.updateMany=async()=>({count:0})
 await assert.rejects(()=>saveCustomerProfile(concurrent,memberUser,{version:3,displayName:'Customer',nickname:'New'}),{message:'SETTINGS_CONFLICT'})
})
