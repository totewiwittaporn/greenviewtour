import test from 'node:test'
import assert from 'node:assert/strict'
import {checkStaffAvailability} from '../src/modules/operations/staff-availability.js'
import {listGuideAssignments} from '../src/modules/operations/guide-assignments.js'
test('guide-only assignments conflict with boat/vehicle work and vice versa',async()=>{
 const start=new Date('2026-11-01T00:00Z'),end=new Date('2026-11-01T08:00Z')
 for(const [dispatch,guide] of [[1,0],[0,1]]){
  const db={dispatchStaff:{count:async()=>dispatch},guideAssignment:{count:async()=>guide}}
  await assert.rejects(()=>checkStaffAvailability(db,'guide',start,end,{assignmentId:'self'}),{code:'STAFF_TIME_CONFLICT'})
 }
 let query
 await checkStaffAvailability({dispatchStaff:{count:async()=>0},guideAssignment:{count:async q=>{query=q;return 0}}},'guide',start,end,{assignmentId:'self'})
 assert.equal(query.where.id.not,'self')
 assert.equal(query.where.booking.status.not,'CANCELLED')
 assert.equal(query.where.startsAt.lt,end);assert.equal(query.where.endsAt.gt,start)
})
test('assistant guides receive only their assigned jobs; guides cannot leak pricing through projection',async()=>{
 const where=[]
 const db={userProfile:{findUnique:async()=>({status:'ACTIVE',roles:[{roleCode:'ASSISTANT_TOUR_GUIDE',scope:'SELF'}]})},guideAssignment:{count:async q=>{where.push(q.where);return 1},findMany:async q=>{where.push(q.where);return [{id:'assignment',guide:{displayName:'QA'},status:'PLANNED',requestHash:'secret',booking:{id:'booking',status:'CONFIRMED',adultPrice:'1000',supplierAdultNet:'500',name:'QA',adults:1,children:0}}]}}}
 const result=await listGuideAssignments(db,'owned-guide',new URLSearchParams())
 assert.equal(result.canManage,false);assert.equal(where[0].guideId,'owned-guide');assert.deepEqual(where[0],where[1])
 assert.equal(result.rows[0].booking.adultPrice,undefined);assert.equal(result.rows[0].booking.supplierAdultNet,undefined);assert.equal(result.rows[0].requestHash,undefined)
})
