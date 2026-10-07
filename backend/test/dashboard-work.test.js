import test from 'node:test'
import assert from 'node:assert/strict'
import { projectWorkRun, workSummary } from '../src/backoffice/dashboard/overview/work-summary.js'
import { reportingSeason, rankSeasonAgents } from '../src/backoffice/dashboard/overview/season-summary.js'
const now = new Date('2026-09-26T05:00:00Z')
const actor = { id:'actor', status:'ACTIVE', roles:[{roleCode:'CAPTAIN',scope:'SELF'}], permissionOverrides:[] }
const assignment = (status='ASSIGNED', bookingStatus='CONFIRMED') => ({ status, adults:3, children:2, dropoffPoint:'Pier', bookingLine:{booking:{status:bookingStatus,pickupPoint:'Hotel',dropoffPoint:'Hotel',name:'PRIVATE GUEST',contactPhone:'SECRET'}} })
const run = (i=0) => ({ id:'run-'+i,code:'RUN-'+i,name:'Boat trip',kind:'BOAT',direction:'OUTBOUND',status:'OPEN',capacity:30,slot:{startsAt:new Date('2026-09-25T17:15:00Z'),vehicle:{name:'Boat 30'}},staff:[{role:'CAPTAIN',user:{displayName:'Captain'}}],assignments:[assignment(),assignment('CANCELLED'),assignment('ASSIGNED','CANCELLED')] })
test('work rows exclude cancelled allocations and bookings; Bangkok date, crew and pax remain distinct',()=>{
 const result=projectWorkRun(run(),'/operations/guide')
 assert.equal(result.passengers,5);assert.equal(result.crew.length,1)
 assert.equal(result.date,'2026-09-26');assert.match(result.href,/date=2026-09-26&runId=run-0/)
 assert.equal(result.stops,undefined);assert.equal(result.preparation,undefined)
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE GUEST|SECRET|contactPhone|pickupPoint/)
})
test('vehicle handover only shows recorded stops and never fabricates pickup times',()=>{
 const result=projectWorkRun({...run(),kind:'VEHICLE'},'/operations/driver')
 assert.deepEqual(result.stops,['Hotel']);assert.equal(result.pickupAt,undefined)
 assert.deepEqual(projectWorkRun({...run(),kind:'VEHICLE',direction:'RETURN'},'/operations/driver').stops,['Pier'])
})
test('authorized run summaries count every row, restrict table to 10, and reuse actor scope',async()=>{
 const source={id:'guide',title:'Boat jobs',href:'/operations/guide',model:'dispatchRun',base:{kind:'BOAT',staff:{some:{userId:{in:['actor']}}}},visibility:'My assigned jobs'}
 let query;const tx={dispatchRun:{findMany:async args=>{query=args;return Array.from({length:31},(_,i)=>run(i))}}}
 const result=await workSummary(tx,actor,'2026-09-26',[source],now)
 assert.deepEqual(query.where.AND[0],source.base);assert.equal(query.take,undefined)
 assert.equal(query.include,undefined);assert.deepEqual(Object.keys(query.select).sort(),['assignments','capacity','code','direction','id','kind','name','slot','staff','status']);assert.deepEqual(Object.keys(query.select.staff.select).sort(),['role','user','userId'])
 assert.equal(result.dispatch[0].days[0].total,31);assert.equal(result.dispatch[0].days[0].outboundPax,155)
 assert.equal(result.dispatch[0].days[0].rows.length,10);assert.equal(result.dispatch[0].days[1].total,0)
 assert.equal(query.select.assignments.select.bookingLine.select.booking.select.contactPhone,undefined);assert.equal(query.select.slot.select.vehicle.select.ownership,undefined);assert.equal(result.dispatch[0].prepare,false);assert.equal(query.select.assignments.select.bookingLine.select.booking.select.status,true)
})
test('reporting season includes May 15 and advances to next season on May 16',()=>{
 const expected={from:'2026-10-15',through:'2027-05-15'}
 for(const date of ['2026-09-26','2026-10-15','2026-12-31','2027-01-01','2027-05-15'])assert.deepEqual(reportingSeason(date),expected)
 assert.deepEqual(reportingSeason('2027-05-16'),{from:'2027-10-15',through:'2028-05-15'})
})
test('season ranking counts unique confirmed arrivals and our return-only bookings',()=>{
 const booking=(id,date,status='CONFIRMED')=>({id,status,outboundDate:date,adults:2,children:1,agent:{id:'agent',name:'Agent'}})
 const first=booking('first','2026-10-15')
 const rows=[first,first,booking('last','2027-05-15','COMPLETED'),booking('before','2026-10-14'),booking('after','2027-05-16'),booking('draft','2026-10-16','DRAFT'),{...booking('return',null),returnStatus:'OUR',returnDate:'2027-01-01'},{...booking('other',null),returnStatus:'OTHER',returnDate:'2027-01-01'}]
 const result=rankSeasonAgents(rows,reportingSeason('2026-09-26'))
 assert.equal(result.totalPax,9);assert.equal(result.rows[0].bookings,3);assert.equal(result.rows[0].share,100)
})
test('empty permitted source set returns no operational or finance rows',async()=>{
 const result=await workSummary({},actor,'2026-09-26',[],now)
 assert.deepEqual(result.dispatch,[]);assert.deepEqual(result.finance,[]);assert.equal(result.jobs,null)
})
test('finance card projection contains only list identity and status',async()=>{
 let query
 const tx={financePersonnelRecord:{findMany:async args=>{query=args;return [{id:'expense',title:'Expense',status:'SUBMITTED'}]}}}
 const source={id:'expenses',title:'Reimbursements',href:'/company/expenses',model:'financePersonnelRecord',base:{kind:'REIMBURSEMENT'},pending:{status:'SUBMITTED'}}
 const result=await workSummary(tx,actor,'2026-09-26',[source],now)
 assert.deepEqual(query.select,{id:true,title:true,status:true});assert.equal(query.take,5)
 assert.equal(result.finance.length,1);assert.equal(result.finance[0].href,'/company/expenses')
})


test('preparation dashboard uses explicit run and crew fields without dropping stock calculation relations',async()=>{
 let calls=0,query
 const tx={dispatchRun:{findMany:async args=>{calls++;query=args;return []}}}
 const source={id:'guide',title:'Boat jobs',href:'/operations/guide',model:'dispatchRun',base:{kind:'BOAT'},visibility:'Assigned'}
 await workSummary(tx,{...actor,permissionOverrides:[{permissionCode:'operations.prepareStock',effect:'ALLOW'}]},'2026-09-26',[source],now)
 assert.equal(calls,1);assert.equal(query.include,undefined);assert.equal(query.select.staff.include,undefined)
 assert.deepEqual(Object.keys(query.select.staff.select).sort(),['role','user','userId'])
 const booking=query.select.assignments.select.bookingLine.select.booking.select
 assert.equal(booking.lines.select.quantity,true);assert.equal(booking.lines.select.issuedQty,true);assert.equal(booking.lines.select.issues.select.settledQty,true);assert.equal(booking.lines.select.dispatchAssignments.select.run.select.direction,true)
 assert.equal(query.take,undefined,'complete day totals must not be capped to the preview size')
})
