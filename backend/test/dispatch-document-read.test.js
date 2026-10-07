import test from 'node:test'
import assert from 'node:assert/strict'
import {loadRunDocuments} from '../src/modules/operations/dispatch-document-read.js'

const booking={
 id:'booking-1',code:'BK-1',name:'Group',status:'CONFIRMED',adults:2,children:1,agentId:'agent-1',agentName:'Agent',agentReference:'REF',assistance:'Wheelchair',
 outboundDate:new Date('2026-10-01T00:00:00Z'),returnDate:new Date('2026-10-01T00:00:00Z'),returnStatus:'OUR',
 allergies:'Peanut',requestNotes:'Note',allergyStatus:'HAS',specialRequirements:['TENT'],
 programSnapshot:{tourId:'tour-1',name:'Surin',demoDataset:true,privatePrice:'DO_NOT_LEAK'},
 trip:{tourId:'tour-1',name:'Trip',startsAt:new Date('2026-10-01T01:00:00Z'),endsAt:new Date('2026-10-01T09:00:00Z'),tour:{printCode:'SURIN'}},
 agent:{shortName:'AG'},
}

test('Job Order document reader stays bounded and strips non-document JSON keys',async()=>{
 let assignmentQuery,staffQuery,lineQuery
 const tx={
  dispatchAssignment:{findMany:async args=>{assignmentQuery=args;return [{
   id:'assignment-1',runId:'run-1',bookingLineId:'line-1',adults:2,children:1,pickupAt:null,dropoffPoint:null,notes:null,actualAdults:null,actualChildren:null,changeReason:null,cancellationReason:null,status:'ASSIGNED',bookingLine:{booking}
  }]}},
  dispatchStaff:{findMany:async args=>{staffQuery=args;return [{runId:'run-1',userId:'user-1',role:'GUIDE',user:{displayName:'Guide One'}}]}},
  bookingComponent:{findMany:async args=>{lineQuery=args;return [{bookingId:'booking-1',selected:true,snapshot:{category:'MEAL',mealPeriod:'LUNCH',accommodationType:null,ownership:'GREENVIEW',day:1,privateCost:'DO_NOT_LEAK'},resource:{category:'MEAL',mealPeriod:'LUNCH',accommodationType:null,ownership:'GREENVIEW',salePrice:'999'}}]}},
 }
 const [result]=await loadRunDocuments(tx,[{id:'run-1',name:'Boat 1'}],'BOAT')
 assert.deepEqual(assignmentQuery.where,{runId:{in:['run-1']}})
 assert.deepEqual(staffQuery.where,{runId:{in:['run-1']}})
 assert.deepEqual(lineQuery.where,{bookingId:{in:['booking-1']},selected:true})
 const output=result.assignments[0].bookingLine.booking
 assert.deepEqual(output.programSnapshot,{tourId:'tour-1',name:'Surin',demoDataset:true})
 assert.equal(output.programSnapshot.privatePrice,undefined)
 assert.deepEqual(output.agent,{shortName:'AG'})
 assert.deepEqual(output.lines[0].snapshot,{category:'MEAL',mealPeriod:'LUNCH',accommodationType:null,ownership:'GREENVIEW',day:1})
 assert.equal(output.lines[0].snapshot.privateCost,undefined)
 assert.equal(output.lines[0].resource.salePrice,undefined)
 assert.deepEqual(result.staff,[{userId:'user-1',role:'GUIDE',user:{displayName:'Guide One'}}])
})

test('vehicle document reader never loads boat-only component rows',async()=>{
 let componentReads=0,bookingProjection
 const vehicleBooking={...booking,agentPhone:'0800000000',contactPhone:'0810000000',hotel:'Hotel',room:'101',pickupPoint:'Pier',dropoffPoint:'Hotel'}
 const tx={
  dispatchAssignment:{findMany:async args=>{bookingProjection=args.select.bookingLine.select.booking.select;return [{id:'a',runId:'run-v',bookingLineId:'l',adults:1,children:0,pickupAt:null,dropoffPoint:null,notes:null,actualAdults:null,actualChildren:null,changeReason:null,cancellationReason:null,status:'ASSIGNED',bookingLine:{booking:vehicleBooking}}]}},
  dispatchStaff:{findMany:async()=>[]},
  bookingComponent:{findMany:async()=>{componentReads++;return []}},
 }
 const [result]=await loadRunDocuments(tx,[{id:'run-v'}],'VEHICLE')
 assert.equal(componentReads,0)
 assert.equal(bookingProjection.agentPhone,true)
 assert.equal(bookingProjection.allergies,undefined)
 assert.equal(result.assignments[0].bookingLine.booking.lines,undefined)
})
