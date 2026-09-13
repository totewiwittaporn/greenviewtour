import test from 'node:test'
import assert from 'node:assert/strict'
import { dispatchCommand, dispatchOptions } from '../src/modules/operations/dispatch.js'
const id = n => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
function fixture({kind = 'VEHICLE', direction = 'OUTBOUND', capacity = 12, role = 'HEAD_DRIVER', adults = 14, children = 0, assigned = []} = {}) {
 const booking = {id:id(4),status:'CONFIRMED',adults,children,trip:{startsAt:new Date('2026-11-10T00:00Z'),endsAt:new Date('2026-11-10T16:00Z')}}
 const resource = {id:id(3),status:'ACTIVE',category:kind==='BOAT'?'TOUR_BOAT':'TRANSFER',baseUnit:'PERSON'}
 const vehicle = {id:id(5),status:'ACTIVE',capacity,totalCapacity:capacity+2}
 const line = {id:id(6),bookingId:booking.id,resourceId:resource.id,selected:true,dispatchDirection:'BOTH',resource,booking,quantity:adults+children,dispatchAssignments:assigned}
 const run = {id:id(2),version:1,kind,direction,status:'OPEN',capacity,staff:[],assignments:[],slot:{status:'ACTIVE',resourceId:resource.id,vehicleId:vehicle.id,startsAt:new Date('2026-11-10T01:00Z'),endsAt:new Date('2026-11-10T03:00Z')}}
 const events = [], creations = []
 const tx = {
  $executeRaw:async()=>{events.push('lock')},
  userProfile:{findUnique:async()=>{events.push('authorize');return {status:'ACTIVE',roles:[{roleCode:role,scope:'SELF'}]}}},
  dispatchRun:{findUnique:async()=>{events.push('readRun');return run},update:async()=>{events.push('writeRun')}},
  operationCommand:{findUnique:async()=>null,create:async()=>{}},
  fleetVehicle:{findUnique:async()=>vehicle},operationResource:{findUnique:async()=>resource},
  bookingComponent:{findUnique:async()=>line},
  dispatchAssignment:{create:async ({data})=>{creations.push(data)},update:async()=>{}},
  auditEvent:{create:async()=>{}},
 }
 const prisma = {dispatchRun:{findUnique:async()=>({kind})},$transaction:fn=>fn(tx)}
 const input = {id:id(1),runId:run.id,version:1,action:'ASSIGN',bookingLineId:line.id,adults,children,pickupAt:'2026-11-10 08:00'}
 return {prisma,tx,input,run,line,events,creations}
}
test('vehicle and boat reject capacity overflow and allow split groups within remaining headcount',async()=>{
 for(const [kind,role,capacity,adults] of [['VEHICLE','HEAD_DRIVER',12,14],['BOAT','GUIDE',40,45]]) {
  const f = fixture({kind,role,capacity,adults})
  await assert.rejects(()=>dispatchCommand(f.prisma,id(9),f.input),{code:'VEHICLE_CAPACITY_EXCEEDED'})
  assert.equal(f.creations.length,0)
  await dispatchCommand(f.prisma,id(9),{...f.input,adults:capacity})
  assert.equal(f.creations[0].adults,capacity)
  assert.ok(f.events.indexOf('lock')<f.events.indexOf('readRun'))
 }
})
test('assignments on other runs consume adults and children independently',async()=>{
 const f = fixture({adults:8,children:2,assigned:[{runId:id(20),run:{direction:'OUTBOUND'},adults:6,children:1}]})
 await assert.rejects(()=>dispatchCommand(f.prisma,id(9),{...f.input,adults:3,children:0}),{code:'BOOKING_PASSENGERS_EXCEEDED'})
 await assert.rejects(()=>dispatchCommand(f.prisma,id(9),{...f.input,adults:0,children:2}),{code:'BOOKING_PASSENGERS_EXCEEDED'})
 await dispatchCommand(f.prisma,id(9),{...f.input,adults:2,children:1})
 assert.equal(f.creations.length,1)
})
test('return transport does not require a promised time; outbound pickup does',async()=>{
 const outbound=fixture({adults:2})
 await assert.rejects(()=>dispatchCommand(outbound.prisma,id(9),{...outbound.input,pickupAt:null}),{code:'PICKUP_TIME_REQUIRED'})
 const back=fixture({adults:2,direction:'RETURN'})
 await dispatchCommand(back.prisma,id(9),{...back.input,pickupAt:null})
 assert.equal(back.creations[0].pickupAt,null)
})
test('unconfirmed or excluded components cannot be assigned',async()=>{
 for(const change of [{selected:false},{booking:{status:'DRAFT'}},{dispatchDirection:'RETURN'}]) {
  const f=fixture({adults:2});Object.assign(f.line,change)
  await assert.rejects(()=>dispatchCommand(f.prisma,id(9),f.input),{code:'INVALID_DISPATCH_BOOKING'})
 }
})
test('driver and assistant guide cannot allocate but head driver and guide can',async()=>{
 for(const [kind,role] of [['VEHICLE','DRIVER'],['BOAT','ASSISTANT_TOUR_GUIDE']]) {
  const f=fixture({kind,role,adults:2})
  await assert.rejects(()=>dispatchCommand(f.prisma,id(9),f.input),{code:'PERMISSION_DENIED'})
  assert.equal(f.creations.length,0)
 }
})
test('pending projection exposes remainder for split allocation and validates direction',async()=>{
 const f=fixture({adults:8,children:2,assigned:[{runId:id(20),run:{direction:'OUTBOUND'},adults:6,children:1},{runId:id(21),run:{direction:'RETURN'},adults:8,children:2}]})
 f.tx.bookingComponent.count=async()=>1
 f.tx.bookingComponent.findMany=async()=>[f.line]
 f.prisma.userProfile=f.tx.userProfile
 const result=await dispatchOptions(f.prisma,id(9),new URLSearchParams({kind:'VEHICLE',entity:'pending'}))
 assert.equal(result.rows[0].remainingAdults,2);assert.equal(result.rows[0].remainingChildren,1);assert.equal(result.rows[0].remainingPassengers,3)
 await assert.rejects(()=>dispatchOptions(f.prisma,id(9),new URLSearchParams({kind:'VEHICLE',entity:'pending',direction:'INVALID'})),{code:'INVALID_FILTER'})
})
test('dispatch uses the booked direction day, never an open return or another company leg',async()=>{
 for(const [direction,fields] of [
  ['OUTBOUND',{outboundDate:null,returnDate:new Date('2026-11-10'),returnStatus:'OUR'}],
  ['RETURN',{outboundDate:new Date('2026-11-10'),returnDate:null,returnStatus:'PENDING'}],
  ['RETURN',{outboundDate:new Date('2026-11-10'),returnDate:new Date('2026-11-10'),returnStatus:'OTHER'}],
  ['RETURN',{outboundDate:new Date('2026-11-10'),returnDate:new Date('2026-11-11'),returnStatus:'OUR'}],
 ]) {
  const f=fixture({direction,adults:2});Object.assign(f.line.booking,fields)
  await assert.rejects(()=>dispatchCommand(f.prisma,id(9),f.input),{code:'SERVICE_SLOT_UNAVAILABLE'})
 }
 const f=fixture({direction:'RETURN',adults:2})
 Object.assign(f.line.booking,{outboundDate:null,returnDate:new Date('2026-11-10'),returnStatus:'OUR'})
 await dispatchCommand(f.prisma,id(9),{...f.input,pickupAt:null})
 assert.equal(f.creations.length,1)
})
test('pending queries exact independent booking date and require our return service',async()=>{
 const f=fixture({adults:2});f.prisma.userProfile=f.tx.userProfile
 const queries=[]
 f.tx.bookingComponent.count=async({where})=>{queries.push(where);return 0}
 f.tx.bookingComponent.findMany=async()=>[]
 for(const direction of ['OUTBOUND','RETURN'])await dispatchOptions(f.prisma,id(9),new URLSearchParams({kind:'VEHICLE',entity:'pending',direction,date:'2026-11-10'}))
 assert.equal(queries[0].booking.outboundDate.toISOString(),'2026-11-10T00:00:00.000Z')
 assert.equal(queries[0].booking.trip,undefined)
 assert.equal(queries[1].booking.returnDate.toISOString(),'2026-11-10T00:00:00.000Z')
 assert.equal(queries[1].booking.returnStatus,'OUR')
})
test('booking setting options permit island return intake without exposing other tour programs',async()=>{
 const {bookingOptions}=await import('../src/modules/operations/dispatch.js')
 let query
 const actor={status:'ACTIVE',roles:[{roleCode:'ASSISTANT_TOUR_GUIDE',scope:'SELF'}]}
 const tx={tourProgram:{count:async()=>1,findMany:async q=>{query=q;return [{id:id(30),name:'Return ticket'}]}}}
 const prisma={userProfile:{findUnique:async()=>actor},$transaction:fn=>fn(tx)}
 const result=await bookingOptions(prisma,id(9),new URLSearchParams({entity:'tours'}))
 assert.equal(result.rows.length,1)
 assert.equal(query.where.status,'ACTIVE');assert.equal(query.where.journeyMode,'RETURN_ONLY')
 assert.equal(query.select.adultPrice,undefined)
 actor.roles=[{roleCode:'BOOKING',scope:'SELF'}]
 await bookingOptions(prisma,id(9),new URLSearchParams({entity:'tours'}))
 assert.equal(query.where.journeyMode,undefined)
 actor.roles=[{roleCode:'DRIVER',scope:'SELF'}]
 await assert.rejects(()=>bookingOptions(prisma,id(9),new URLSearchParams({entity:'tours'})),{code:'PERMISSION_DENIED'})
})
test('boat allocations cannot orphan outstanding issued stock by removal or reduction',async()=>{
 for(const action of ['REMOVE','ASSIGN']) {
  const f=fixture({kind:'BOAT',role:'GUIDE',adults:3})
  const assignment={id:id(40),bookingLineId:f.line.id,bookingLine:f.line,adults:3,children:0,actualAdults:null}
  f.run.assignments=[assignment]
  f.tx.stockIssue={findMany:async()=>[{quantity:3,settledQty:2}]}
  await assert.rejects(()=>dispatchCommand(f.prisma,id(9),{...f.input,action,assignmentId:assignment.id,adults:2}),{code:'OUTSTANDING_ISSUES'})
 }
})
