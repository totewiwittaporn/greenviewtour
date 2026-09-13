import test from 'node:test'
import assert from 'node:assert/strict'
import { bookingJourney, bookingQuote } from '../../packages/contracts/booking-plan.js'
import { programBookingPlan, storedJourney } from '../src/modules/operations/booking-plan.js'
const id=n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`
test('journeys derive same-day, overnight, open and independent return service dates',()=>{
 assert.deepEqual(bookingJourney({journeyMode:'FIXED',durationDays:1},'2026-11-10'),{outboundDate:'2026-11-10',returnDate:'2026-11-10',returnStatus:'OUR'})
 assert.equal(bookingJourney({journeyMode:'FIXED',durationDays:3},'2026-12-31').returnDate,'2027-01-02')
 assert.deepEqual(bookingJourney({journeyMode:'OPEN_RETURN'},'2026-11-10'),{outboundDate:'2026-11-10',returnDate:null,returnStatus:'PENDING'})
 assert.equal(bookingJourney({journeyMode:'OPEN_RETURN'},'2026-11-10','OUR','2026-11-14').returnDate,'2026-11-14')
 assert.deepEqual(bookingJourney({journeyMode:'OPEN_RETURN'},'2026-11-10','OTHER'),{outboundDate:'2026-11-10',returnDate:null,returnStatus:'OTHER'})
 assert.deepEqual(bookingJourney({journeyMode:'RETURN_ONLY'},'2026-11-10'),{outboundDate:null,returnDate:'2026-11-10',returnStatus:'OUR'})
 assert.deepEqual(bookingJourney({journeyMode:'OUTBOUND_ONLY'},'2026-11-10'),{outboundDate:'2026-11-10',returnDate:null,returnStatus:'NONE'})
 assert.throws(()=>bookingJourney({journeyMode:'OPEN_RETURN'},'2026-11-10','OUR','2026-11-09'),/INVALID_RETURN_DATE/)
 assert.throws(()=>bookingJourney({journeyMode:'FIXED',durationDays:1},'2026-02-30'),/INVALID_DATE/)
 assert.equal(storedJourney({outboundDate:'2026-11-10',returnDate:null,returnStatus:'PENDING'}).outboundDate.toISOString(),'2026-11-10T00:00:00.000Z')
})
test('quote deducts selling credit and ignores procurement cost with exact satang',()=>{
 const quote=bookingQuote({adults:2,children:1,adultPrice:'1000.10',childPrice:'800.20',lines:[
  {selected:false,included:true,quantity:3,snapshot:{removalCredit:'100.10',costPrice:'99.99'}},
  {selected:true,included:false,quantity:2,unitPrice:'30.25'},
  {selected:true,included:true,quantity:3,unitPrice:'500'},
 ]})
 assert.deepEqual(quote,{base:'2800.40',credit:'300.30',addons:'60.50',total:'2560.60'})
 assert.equal(bookingQuote({adults:1,children:0,adultPrice:'0',lines:[]}).total,'0.00')
 assert.equal(bookingQuote({adults:1,children:0,adultPrice:'100',lines:[{selected:false,included:true,quantity:1,snapshot:{costPrice:'50'}}]}).total,null)
 assert.equal(bookingQuote({adults:1,children:0,adultPrice:'100',lines:[{selected:false,included:true,quantity:1,removalCredit:'101'}]}).total,null)
})
function planFixture(){
 const resource={id:id(2),name:'Lunch',code:'LUNCH',baseUnit:'PERSON_MEAL',kind:'SERVICE',category:'MEAL',salePrice:'150',costPrice:'80'}
 const program={id:id(1),name:'Daytrip',version:2,status:'ACTIVE',journeyMode:'FIXED',durationDays:1,adultPrice:'1500',childPrice:'1000',components:[{id:id(3),resourceId:resource.id,resource,selection:'INCLUDED',basis:'PER_PERSON',quantity:1,usagePoint:'ISLAND',removalCredit:'100',day:1}]}
 const agent={id:id(4),status:'ACTIVE',roles:['SALES_AGENT'],allowedPaymentTerms:['PREPAID','COUNTER','AGENT_CREDIT'],defaultPaymentTerms:'AGENT_CREDIT'}
 let rateQuery
 const rates=[]
 const tx={tourProgram:{findUnique:async()=>program},businessPartner:{findUnique:async()=>agent},agentTourPrice:{findMany:async q=>{rateQuery=q;return rates}}}
 return {tx,program,agent,rates,query:()=>rateQuery,input:{tourId:program.id,serviceDate:'2026-11-10',adults:2,children:1}}
}
test('program plan snapshots negotiated annual agent price, allowed terms, components and Thailand envelope',async()=>{
 const f=planFixture()
 f.rates.push({id:id(5),version:3,agreementId:id(6),adultPrice:'1200',childPrice:'900',agreement:{code:'AG-2026'}})
 const p=await programBookingPlan(f.tx,{...f.input,agentId:f.agent.id})
 assert.equal(p.adultPrice,'1200');assert.equal(p.childPrice,'900')
 assert.equal(p.priceSource.agreementCode,'AG-2026');assert.equal(p.priceSource.rateVersion,3)
 assert.deepEqual(p.allowedPaymentTerms,['PREPAID','COUNTER','AGENT_CREDIT'])
 assert.equal(p.defaultPaymentTerms,'AGENT_CREDIT')
 assert.equal(p.lines[0].quantity,3);assert.equal(p.lines[0].snapshot.removalCredit,'100')
 assert.equal(p.trip.startsAt.toISOString(),'2026-11-09T17:00:00.000Z')
 assert.equal(p.trip.endsAt.toISOString(),'2026-11-10T16:59:00.000Z')
 assert.equal(f.query().where.OR[1].agreement.startsOn.lte.toISOString(),'2026-11-10T00:00:00.000Z')
})
test('missing negotiated rates stay unknown, ambiguous contracts fail and direct rate remains available',async()=>{
 const f=planFixture()
 const direct=await programBookingPlan(f.tx,f.input)
 assert.equal(direct.adultPrice,'1500');assert.equal(direct.priceSource.kind,'DIRECT')
 const missing=await programBookingPlan(f.tx,{...f.input,agentId:f.agent.id})
 assert.equal(missing.adultPrice,null);assert.equal(missing.childPrice,null)
 f.rates.push({id:id(5),agreementId:id(6)},{id:id(7),agreementId:id(8)})
 await assert.rejects(()=>programBookingPlan(f.tx,{...f.input,agentId:f.agent.id}),{code:'AMBIGUOUS_AGENT_PRICE'})
})
test('return-only and open return program plans never fabricate an outbound/return leg',async()=>{
 const f=planFixture();f.program.journeyMode='RETURN_ONLY';f.program.durationDays=null
 const back=await programBookingPlan(f.tx,f.input)
 assert.equal(back.journey.outboundDate,null);assert.equal(back.lines[0].dispatchDirection,'RETURN')
 f.program.journeyMode='OPEN_RETURN'
 const open=await programBookingPlan(f.tx,f.input)
 assert.equal(open.journey.returnDate,null);assert.equal(open.journey.returnStatus,'PENDING')
 const other=await programBookingPlan(f.tx,{...f.input,returnStatus:'OTHER'})
 assert.equal(other.lines[0].dispatchDirection,'OUTBOUND')
})
function saveFixture(){
 const f=planFixture(), records=new Map(), trips=new Map(), events=[]
 let sequence=0
 const tx={...f.tx,
  $executeRaw:async()=>{events.push('lock')},
  userProfile:{findUnique:async()=>({status:'ACTIVE',roles:[{roleCode:'BOOKING',scope:'SELF'}]})},
  bookingSequence:{upsert:async ({where})=>{events.push('sequence');return {year:where.year,value:++sequence}}},
  operationResource:{findUnique:async()=>({...f.program.components[0].resource,status:'ACTIVE'})},
  operationTrip:{create:async({data})=>{trips.set(data.id,data);return data},findUnique:async({where})=>({...trips.get(where.id),tour:f.program,bookings:[...records.values()].filter(r=>r.tripId===where.id&&r.status==='CONFIRMED')})},
  tourBooking:{findUnique:async({where})=>records.get(where.id)||null,create:async({data})=>{
   const row={...data,version:1,status:'DRAFT',trip:trips.get(data.tripId),lines:data.lines.create.map(l=>({...l,resource:f.program.components[0].resource,issuedQty:0}))}
   records.set(data.id,row);return row
  },update:async({where,data})=>{const row=records.get(where.id);Object.assign(row,{...data,version:row.version+1});return row}},
  auditEvent:{create:async()=>{}},operationCommand:{findUnique:async()=>null,create:async()=>{}},
 }
 const prisma={$transaction:fn=>fn(tx)}
 const input={...f.input,id:id(10),version:0,name:'Example group',code:'USER-CANNOT-CHOOSE',paymentTerms:'COUNTER',allergyStatus:'NONE',specialRequirements:[],lines:[{componentId:id(3),resourceId:id(2),selected:true,quantity:3,usagePoint:'ISLAND'}]}
 return {...f,tx,prisma,input,events,records}
}
test('Booking creates server-owned unique annual code and repeated request reuses existing result',async()=>{
 const {saveBooking}=await import('../src/modules/operations/bookings.js')
 const f=saveFixture()
 const first=await saveBooking(f.prisma,id(20),f.input)
 assert.equal(first.row.code,'BK-2026-000001')
 assert.equal(first.row.programSnapshot.bookingOwnedTrip,true)
 assert.equal(first.row.outboundDate.toISOString(),'2026-11-10T00:00:00.000Z')
 const repeated=await saveBooking(f.prisma,id(20),f.input)
 assert.equal(repeated.row.id,first.row.id)
 assert.equal(f.events.filter(e=>e==='sequence').length,1)
 const next=await saveBooking(f.prisma,id(20),{...f.input,id:id(11),name:'Next group'})
 assert.equal(next.row.code,'BK-2026-000002')
 assert.ok(f.events.indexOf('lock')<f.events.indexOf('sequence'))
})
test('included removal cannot alter computed quantity or deduct an unknown selling credit',async()=>{
 const {saveBooking}=await import('../src/modules/operations/bookings.js')
 const f=saveFixture()
 await assert.rejects(()=>saveBooking(f.prisma,id(20),{...f.input,lines:[{...f.input.lines[0],selected:false,quantity:30}]}))
 // Keep another service selected so a missing credit is the actual blocker.
 f.program.components.push({...f.program.components[0],id:id(30),selection:'REQUIRED',resourceId:id(31),resource:{...f.program.components[0].resource,id:id(31),category:'TOUR_BOAT',baseUnit:'PERSON'}})
 f.tx.operationResource.findUnique=async({where})=>({...f.program.components.find(c=>c.resourceId===where.id).resource,status:'ACTIVE'})
 f.program.components[0].removalCredit=null
 await assert.rejects(()=>saveBooking(f.prisma,id(20),{...f.input,lines:[{...f.input.lines[0],selected:false},{componentId:id(30),resourceId:id(31),selected:true,quantity:3,usagePoint:'BOAT'}]}),{code:'REMOVAL_CREDIT_REQUIRED'})
})
test('modern Booking confirmation does not require meal slots or supply warehouse choices',async()=>{
 const {saveBooking,bookingStatus}=await import('../src/modules/operations/bookings.js')
 const f=saveFixture()
 const {row}=await saveBooking(f.prisma,id(20),f.input)
 row.lines.push({id:id(41),resourceId:id(42),quantity:3,issuedQty:0,selected:true,included:true,unitPrice:'0',sourceId:null,resource:{id:id(42),kind:'CONSUMABLE',category:'DRINK'}})
 f.tx.operationResource.findUnique=async({where})=>where.id===id(42)?{id:id(42),status:'ACTIVE',kind:'CONSUMABLE',category:'DRINK'}:{...f.program.components[0].resource,status:'ACTIVE'}
 const result=await bookingStatus(f.prisma,id(20),{id:id(43),bookingId:row.id,version:1,action:'CONFIRM'})
 assert.equal(result.status,'CONFIRMED')
})
