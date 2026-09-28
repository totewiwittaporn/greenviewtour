import test from 'node:test'
import assert from 'node:assert/strict'
import {planBoatGroups} from '../src/modules/operations/boat-capacity-plan.js'
import {bookingLegs,usableCapacity,solveContext,vanEstimate,selections} from '../src/modules/operations/capacity-core.js'
const id=n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const boats=[{id:'a',capacity:30},{id:'b',capacity:45},{id:'c',capacity:65}]
test('pinned groups stay on their assigned boat; no hidden repacking',()=>{
 const plan=planBoatGroups({boats,bookings:[{id:'one',pax:35,fixedBoatId:'b'},{id:'two',pax:35,fixedBoatId:'c'},{id:'new',pax:35}]})
 assert.equal(plan.status,'INSUFFICIENT_CAPACITY')
 assert.equal(planBoatGroups({boats,bookings:[{id:'one',pax:35,fixedBoatId:'missing'}]}).status,'REVIEW_REQUIRED')
})
test('charters cannot share a boat even with spare passenger capacity',()=>{
 assert.equal(planBoatGroups({boats:[{id:'a',capacity:65}],bookings:[{id:'private',pax:2,exclusive:true},{id:'join',pax:1}]}).status,'INSUFFICIENT_CAPACITY')
 assert.equal(planBoatGroups({boats,bookings:[{id:'private',pax:2,exclusive:true},{id:'join',pax:1}]}).boatCount,2)
})
test('compatible-boat restrictions survive symmetry pruning',()=>{
 const plan=planBoatGroups({boats:[{id:'a',capacity:10},{id:'b',capacity:10}],bookings:[{id:'one',pax:10,eligibleBoatIds:['b']},{id:'two',pax:10,eligibleBoatIds:['a']}]})
 assert.equal(plan.status,'FEASIBLE');assert.deepEqual(plan.assignments.find(a=>a.boatId==='b').bookingIds,['one'])
})
test('each selected direction uses its real service date; unknown and third-party returns are excluded',()=>{
 const booking={outboundDate:new Date('2026-10-26'),returnDate:new Date('2026-10-28'),returnStatus:'OUR',lines:[{selected:true,resourceId:id(1),dispatchDirection:'BOTH',resource:{category:'TOUR_BOAT',serviceMode:'JOIN'}}]}
 assert.deepEqual(bookingLegs(booking).map(l=>[l.direction,l.serviceDate]),[['OUTBOUND','2026-10-26'],['RETURN','2026-10-28']])
 assert.equal(bookingLegs({...booking,returnStatus:'PENDING',returnDate:null}).length,1)
 assert.equal(bookingLegs({...booking,returnStatus:'OTHER'}).length,1)
 assert.equal(bookingLegs({...booking,lines:[{...booking.lines[0],selected:false}]}).length,0)
})
test('readiness never infers rentals or crew capacity from an ACTIVE vehicle alone',()=>{
 const offer={status:'READY',capacity:40,vehicle:{status:'ACTIVE',capacity:40,totalCapacity:45,expectedCrew:6}}
 assert.equal(usableCapacity(offer),39);assert.equal(usableCapacity({...offer,status:'PROPOSED'}),0);assert.equal(usableCapacity({...offer,vehicle:{...offer.vehicle,expectedCrew:null}}),0)
})
test('unresolved existing bookings require review rather than a fabricated zero',()=>{
 assert.equal(solveContext({problems:['EXISTING_BOOKING_SPLIT'],groups:[],boats}).status,'REVIEW_REQUIRED')
})
test('a stale or duplicated capacity selection is never normalized into a different leg',()=>{
 const selection={resourceId:id(1),poolId:id(2),direction:'OUTBOUND',serviceDate:'2026-10-26'}
 assert.deepEqual(selections([selection]),[selection]);assert.throws(()=>selections([selection,selection]));assert.throws(()=>selections([{...selection,direction:'BOTH'}]))
})
test('van luggage units never change passenger totals or exceed individual vehicle capacity',()=>{
 const fleet=Array.from({length:7},(_,i)=>({id:String(i),capacity:10}))
 const context={pool:{overnightLoadTenths:12,offers:fleet.map(b=>({...b,vehicle:{status:'ACTIVE',capacity:10}}))},boats:fleet,groups:[{pax:50,overnight:false},{pax:20,overnight:true}]}
 const result=vanEstimate(context);assert.equal(result.actualPassengers,70);assert.equal(result.weightedUnits,74);assert.equal(result.minimumAvailableVehicles,8);assert.equal(result.extraVehicles,1)
 assert.equal(result.allocations.reduce((n,a)=>n+a.passengers,0),70)
 for(const a of result.allocations){assert.ok(a.passengers<=a.capacity);assert.ok(a.weightedUnits<=a.capacity)}
 assert.equal(result.provisional,true)
})
test('van planning with no known vehicle size stays unknown, not zero vehicles required',()=>{
 const result=vanEstimate({pool:{overnightLoadTenths:12,offers:[]},boats:[],groups:[{pax:5,overnight:true}]})
 assert.equal(result.actualPassengers,5);assert.equal(result.minimumAvailableVehicles,null);assert.equal(result.additionalUnitsNeeded,6)
})
test('a pinned candidate outside its reserved time window cannot pass the confirmation proof',async()=>{
 const {assessBookingCapacity}=await import('../src/modules/operations/capacity-core.js')
 const pool={id:id(20),kind:'BOAT',serviceDate:new Date('2026-10-26'),direction:'OUTBOUND',resourceIds:[id(1)],startsAt:new Date('2026-10-26T00:00:00Z'),endsAt:new Date('2026-10-26T05:00:00Z'),holdMinutes:30,offers:[{vehicleId:id(30),capacity:65,status:'READY',vehicle:{status:'ACTIVE',capacity:65}}]}
 const tx={capacityPool:{findMany:async()=>[pool]},tourBooking:{findMany:async()=>[]},capacityHold:{findMany:async()=>[]},serviceSlot:{findMany:async()=>[]},capacityOffer:{findMany:async()=>[]}}
 const booking={id:id(40),adults:5,children:0,outboundDate:new Date('2026-10-26'),returnStatus:'NONE',programSnapshot:{capacitySelections:[{resourceId:id(1),poolId:pool.id,serviceDate:'2026-10-26',direction:'OUTBOUND'}]},lines:[{selected:true,resourceId:id(1),quantity:5,dispatchDirection:'OUTBOUND',resource:{category:'TOUR_BOAT',baseUnit:'PERSON'},dispatchAssignments:[{status:'ACTIVE',run:{kind:'BOAT',direction:'OUTBOUND',slot:{resourceId:id(1),vehicleId:id(30),startsAt:new Date('2026-10-26T06:00:00Z'),endsAt:new Date('2026-10-26T09:00:00Z')}}}]}]}
 const result=await assessBookingCapacity(tx,booking);assert.equal(result.canConfirm,false);assert.equal(result.legs[0].reason,'ASSIGNMENT_WINDOW_CONFLICT')
 const partial={...booking,lines:[{...booking.lines[0],quantity:3,dispatchAssignments:[]}]}
 const mismatch=await assessBookingCapacity(tx,partial);assert.equal(mismatch.canConfirm,false);assert.equal(mismatch.legs[0].reason,'GROUP_SERVICE_QUANTITY_MISMATCH')
})
test('readiness does not grant a captain company-wide planning or Booking staff fleet-edit rights',async()=>{
 const {capacityAccess}=await import('../src/modules/operations/capacity-service.js')
 const profile=role=>({id:id(1),status:'ACTIVE',displayName:'Fixture',roles:[{roleCode:role,scope:'SELF'}],permissionOverrides:[]})
 const db=role=>({userProfile:{findUnique:async()=>profile(role)}})
 await assert.rejects(()=>capacityAccess(db('CAPTAIN'),id(1),'BOAT'),{code:'PERMISSION_DENIED'})
 await assert.rejects(()=>capacityAccess(db('BOOKING'),id(1),'BOAT',true),{code:'PERMISSION_DENIED'})
 assert.ok((await capacityAccess(db('BOOKING'),id(1),'BOAT')).access.booking)
})
test('selected boat services with no recorded journey cannot be treated as no transport demand',async()=>{
 const {assessBookingCapacity}=await import('../src/modules/operations/capacity-core.js')
 const result=await assessBookingCapacity({}, {adults:2,children:0,outboundDate:null,returnDate:null,returnStatus:'PENDING',lines:[{selected:true,resourceId:id(1),quantity:2,dispatchDirection:'BOTH',resource:{category:'TOUR_BOAT',baseUnit:'PERSON'}}]})
 assert.equal(result.canConfirm,false);assert.equal(result.legs[0].reason,'CAPACITY_JOURNEY_UNRESOLVED')
})
test('authoritative no-shows reduce an existing service-leg demand without rewriting Booking passenger totals',async()=>{
 const {assessBookingCapacity}=await import('../src/modules/operations/capacity-core.js')
 const pool={id:id(20),kind:'BOAT',serviceDate:new Date('2026-10-26'),direction:'OUTBOUND',resourceIds:[id(1)],startsAt:new Date('2026-10-26T00:00:00Z'),endsAt:new Date('2026-10-26T05:00:00Z'),holdMinutes:30,offers:[{vehicleId:id(30),capacity:3,status:'READY',vehicle:{status:'ACTIVE',capacity:3}}]}
 const tx={capacityPool:{findMany:async()=>[pool]},tourBooking:{findMany:async()=>[]},capacityHold:{findMany:async()=>[]},serviceSlot:{findMany:async()=>[]},capacityOffer:{findMany:async()=>[]}}
 const booking={id:id(40),adults:5,children:0,outboundDate:new Date('2026-10-26'),returnStatus:'NONE',attendance:[{serviceDate:new Date('2026-10-26'),direction:'OUTBOUND',noShowAdults:2,noShowChildren:0}],lines:[{selected:true,resourceId:id(1),quantity:5,dispatchDirection:'OUTBOUND',resource:{category:'TOUR_BOAT',baseUnit:'PERSON'},dispatchAssignments:[]}]}
 const result=await assessBookingCapacity(tx,booking);assert.equal(result.canConfirm,true);assert.equal(result.groupSize,5)
 const newRequest=await assessBookingCapacity(tx,{...booking,id:undefined,attendance:[]});assert.equal(newRequest.canConfirm,false)
})
