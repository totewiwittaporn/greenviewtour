import test from 'node:test'
import assert from 'node:assert/strict'
import {attendanceLegs,attendanceRow,noShowPlan,thailandDay} from '../src/modules/operations/check-in.js'
const date='2026-09-15'
const assignment=(id,adults,actualAdults=null)=>({id,runId:id,adults,children:0,actualAdults,actualChildren:actualAdults===null?null:0,run:{name:id,direction:'OUTBOUND',slot:{startsAt:new Date('2026-09-15T01:00:00Z')}}})
test('service days use Thailand midnight and distinguish return legs',()=>{
 assert.equal(thailandDay(new Date('2026-09-14T18:00:00Z')),date)
 assert.deepEqual(attendanceLegs({trip:{startsAt:'2026-09-14T18:00:00Z'}},date),['OUTBOUND'])
 assert.deepEqual(attendanceLegs({outboundDate:date,returnDate:date,returnStatus:'OUR'},date),['OUTBOUND','RETURN'])
 assert.deepEqual(attendanceLegs({returnDate:date,returnStatus:'OTHER'},date),[])
})
test('partial attendance keeps original counts and identifies only unreviewed guests',()=>{
 const row=attendanceRow({id:'a',adults:4,children:2,version:1,attendance:[{serviceDate:date,direction:'OUTBOUND',version:2,adults:2,children:1,noShowAdults:1,noShowChildren:0}]},date,'OUTBOUND')
 assert.equal(row.expectedAdults,4);assert.equal(row.remainingAdults,1);assert.equal(row.remainingChildren,1);assert.equal(row.status,'PARTIAL_NO_SHOW')
})
test('split allocations share one passenger allowance; cancelled rows do not consume it',()=>{
 const booking={lines:[{dispatchAssignments:[assignment('a',3),assignment('b',3),{...assignment('c',4),status:'CANCELLED'}]}]}
 const changes=noShowPlan(booking,date,'OUTBOUND',4,0)
 assert.equal(changes.length,1);assert.equal(changes[0].id,'b');assert.equal(changes[0].adults,1)
 assert.equal(noShowPlan(booking,date,'OUTBOUND',0,0).filter(c=>c.status==='CANCELLED').length,2)
})
test('recorded actual service is preserved, with independent allowances per component',()=>{
 const booking={lines:[{dispatchAssignments:[assignment('served',3,3),assignment('pending',3)]},{dispatchAssignments:[assignment('car',6)]}]}
 const changes=noShowPlan(booking,date,'OUTBOUND',2,0)
 assert.equal(changes.find(c=>c.id==='served').preserved,true)
 assert.equal(changes.find(c=>c.id==='served').adults,3)
 assert.equal(changes.find(c=>c.id==='pending').status,'CANCELLED')
 assert.equal(changes.find(c=>c.id==='car').adults,2)
})
