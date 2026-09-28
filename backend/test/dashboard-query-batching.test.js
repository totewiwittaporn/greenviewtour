import test from 'node:test'
import assert from 'node:assert/strict'
import {managerWidgetCounts} from '../src/backoffice/dashboard/overview/manager-widgets.js'
import {managementPageSummary} from '../src/backoffice/dashboard/overview/management-page.js'
const id='40000000-0000-4000-8000-000000000001'
const clock={today:'2026-10-20',end:'2026-11-03',now:new Date('2026-10-20T04:00Z'),startTime:new Date('2026-10-19T17:00Z'),endTime:new Date('2026-11-02T17:00Z'),tomorrowTime:new Date('2026-10-20T17:00Z')}
const run={id:'guide',title:'Boat jobs',href:'/operations/guide',base:{kind:'BOAT'},detail:'Open jobs',visibility:'Company'}
test('no authorized operational widgets performs no operational query',async()=>{
 const db={$queryRaw:()=>{throw Error('unexpected read')}};assert.deepEqual(await managerWidgetCounts(db,[],[],clock),[])
})
test('batched run counts retain widget metadata and distinct crew/today fields',async()=>{
 let calls=0;const db={$queryRaw:async()=>{calls++;return [{runs:[{kind:'BOAT',pending:9,overdue:2,today:3,crew:1}],allocations:[{area:'guide',pending:4,today:2}]}]}}
 const rows=await managerWidgetCounts(db,[run,{...run,id:'guide-crew'}],[{route:'guide',title:'Waiting',categories:['TOUR_BOAT','LONGTAIL_BOAT']}],clock)
 assert.equal(calls,1);assert.equal(rows[0].pending,9);assert.equal(rows[0].overdue,2);assert.equal(rows[0].today,3)
 assert.equal(rows[1].pending,1);assert.equal(rows[1].overdue,null);assert.equal(rows[1].today,null)
 assert.equal(rows[2].pending,4);assert.equal(rows[2].today,2);assert.equal(rows[2].scope,'Company')
})
test('restricted planning retains per-user staff scope and never adds vehicle categories',async()=>{
 let query;const db={$queryRaw:async q=>{query=q;return [{runs:[],allocations:[]}]}}
 const rows=await managerWidgetCounts(db,[{...run,base:{kind:'BOAT',staff:{some:{userId:{in:[id]}}}},visibility:'My assigned jobs'}],[],clock)
 assert.match(query.sql,/mine\."userId" IN/);assert.ok(query.values.includes(id));assert.ok(query.values.includes('BOAT'))
 assert.equal(query.values.includes('TRANSFER'),false);assert.equal(query.values.includes('VEHICLE'),false);assert.equal(rows.length,1);assert.equal(rows[0].pending,0)
})
test('allocation aggregates keep no-show, cancelled assignment, service direction and unique Booking rules',async()=>{
 let query;const db={$queryRaw:async q=>{query=q;return [{runs:[],allocations:[]}]}}
 await managerWidgetCounts(db,[],[{route:'driver',title:'Waiting',categories:['TRANSFER']}],clock)
 assert.match(query.sql,/COUNT\(DISTINCT leg\.booking\)/);assert.match(query.sql,/a\.status<>'CANCELLED'/)
 assert.match(query.sql,/"returnStatus"='OUR'/);assert.match(query.sql,/"dispatchDirection" IN \('BOTH',leg\.direction\)/)
 assert.match(query.sql,/leg\."noShowAdults"/);assert.match(query.sql,/leg\."noShowChildren"/)
 assert.ok(query.values.includes('TRANSFER'));assert.equal(query.values.includes('TOUR_BOAT'),false)
 assert.doesNotMatch(query.sql,/LIMIT|programSnapshot|contactPhone/)
})
test('one management query supplies complete 30-day calendar, daily rows, months and reporting season',async()=>{
 let calls=0;const db={$queryRaw:async q=>{calls++;assert.match(q.sql,/ROW_NUMBER\(\)/);return [{grouped:[{day:'2026-10-20',programId:'tour',name:'Surin',status:'CONFIRMED',bookings:3,pax:15}],preview:[{id,code:'BK',status:'CONFIRMED',day:'2026-10-20',program:'Surin',pax:5}],months:[{month:'2026-10',bookings:3,pax:15}],agents:[{id:'agent',name:'Agent',bookings:3,pax:15}]}]}}
 const result=await managementPageSummary(db,'2026-10-20')
 assert.equal(calls,1);assert.equal(result.calendar30.length,30);assert.equal(result.calendar30[0].pax,15)
 assert.equal(result.bookingDays[0].total,3);assert.equal(result.bookingDays[0].rows.length,1)
 assert.equal(result.seasonAgents.totalPax,15);assert.equal(result.seasonAgents.from,'2026-10-15');assert.equal(result.seasonAgents.through,'2027-05-15')
 assert.equal(result.monthly.rows.at(-1).pax,15);assert.equal(result.revenue,null)
})
