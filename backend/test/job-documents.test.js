import test from 'node:test'
import assert from 'node:assert/strict'
import { jobBooking, jobRun } from '../src/modules/operations/dispatch.js'
const booking={id:'booking',code:'B1',name:'Guests',status:'CONFIRMED',adults:2,children:1,agentName:'Agent',agentPhone:'private contact',hotel:'private hotel',room:'private room',paymentTerms:'AGENT_CREDIT',adultPrice:'1000',allergies:'Peanut',assistance:'Wheelchair',requestNotes:'Boat request',trip:{name:'Surin',startsAt:'2026-05-01T01:00:00Z',endsAt:'2026-05-02T10:00:00Z'}}
test('boat documents include independent trip dates without booking payment or pickup details',()=>{
 const row=jobBooking(booking,'BOAT')
 assert.equal(row.arrivalAt,booking.trip.startsAt);assert.equal(row.departureAt,booking.trip.endsAt)
 assert.equal(row.allergies,'Peanut')
 for(const key of ['paymentTerms','adultPrice','agentPhone','hotel','room'])assert.equal(key in row,false)
})
test('driver documents retain assistance and logistics, without dietary or payment details',()=>{
 const row=jobBooking(booking,'VEHICLE')
 assert.equal(row.assistance,'Wheelchair');assert.equal(row.agentPhone,'private contact')
 for(const key of ['paymentTerms','adultPrice','allergies','requestNotes'])assert.equal(key in row,false)
})
test('job totals exclude cancelled guests and distinguish zero actual from unrecorded',()=>{
 const base={id:'a',bookingLine:{booking},adults:2,children:1,actualAdults:0,actualChildren:0}
 const row=jobRun({id:'r',kind:'BOAT',direction:'RETURN',staff:[],slot:{resource:{id:'res'}},assignments:[base,{...base,id:'cancel',bookingLine:{booking:{...booking,status:'CANCELLED'}}}]})
 assert.equal(row.passengers,3);assert.equal(row.assignments.length,1);assert.equal(row.assignments[0].actualAdults,0)
})

test('combined boat document collects the vessel day without direction/pagination filters and retains crew authorization',async()=>{
 const {listJobs}=await import('../src/modules/operations/dispatch.js')
 const actor='30000000-0000-4000-8000-000000000001',runId='30000000-0000-4000-8000-000000000002'
 const anchor={id:runId,kind:'BOAT',direction:'OUTBOUND',staff:[],assignments:[],slot:{vehicleId:'boat1',startsAt:new Date('2026-09-08T18:00:00Z'),resource:{id:'resource'}}}
 for(const role of ['MANAGER','CAPTAIN']){
  let documentWhere
  const tx={dispatchRun:{count:async()=>1,findMany:async args=>{
   if(args.select)return []
   if(args.take)return [anchor]
   documentWhere=args.where
   assert.equal(args.skip,undefined);assert.equal(args.take,undefined)
   return [anchor,{...anchor,id:'return',direction:'RETURN'}]
  }}}
  const prisma={userProfile:{findUnique:async()=>({status:'ACTIVE',roles:[{roleCode:role,scope:role==='MANAGER'?'COMPANY':'SELF'}]})},$transaction:fn=>fn(tx)}
  const result=await listJobs(prisma,actor,new URLSearchParams({kind:'BOAT',runId,direction:'OUTBOUND',document:'boat-day'}))
  assert.equal(result.documentRuns.length,2)
  assert.equal(documentWhere.id,undefined);assert.equal(documentWhere.direction,undefined)
  assert.equal(documentWhere.slot.vehicleId,'boat1')
  assert.equal(documentWhere.slot.startsAt.gte.toISOString(),'2026-09-08T17:00:00.000Z')
  assert.equal(documentWhere.slot.startsAt.lt.toISOString(),'2026-09-09T17:00:00.000Z')
  assert.deepEqual(documentWhere.staff,role==='CAPTAIN'?{some:{userId:actor}}:undefined)
 }
})
