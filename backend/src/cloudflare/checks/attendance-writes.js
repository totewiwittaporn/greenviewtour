import {dispatchOptions} from '../../modules/operations/dispatch.js'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
import {checkInCommand,checkInState} from '../../modules/operations/check-in.js'
import {profileInclude} from '../../modules/identity-access/policy.js'
import {managementScope} from '../../modules/identity-access/user-management.js'
import {createD1Prisma} from '../../platform/database/d1-client.ts'
export async function attendanceWrites(env){
const tx=createD1Prisma(env.DB,{files:env.FILES})
try{

 const nested=tx
 const staff=await tx.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude})
 const actor=staff.find(p=>managementScope(p)?.company);assert.ok(actor,'manager required')
 const resource=await tx.operationResource.create({data:{id:randomUUID(),code:'QAATT-'+randomUUID().slice(0,8),name:'Attendance service',kind:'SERVICE',category:'TOUR_BOAT',baseUnit:'PERSON',status:'ACTIVE'}});const source={trip:{tourId:null},lines:[{resourceId:resource.id}]}
 const date='2030-01-15',now=new Date(date+'T08:00:00+07:00'),id=randomUUID(),tripId=randomUUID()
 await tx.operationTrip.create({data:{id:tripId,code:'T-'+tripId,name:'Rollback check-in',tourId:source.trip.tourId,startsAt:now,endsAt:new Date(+now+3600000),capacity:3,status:'OPEN'}})
 await tx.tourBooking.create({data:{id,tripId,code:'T-'+id,name:'Rollback check-in',status:'CONFIRMED',adults:3,children:0,adultPrice:1000,childPrice:500,outboundDate:new Date(date),returnStatus:'OTHER',paymentTerms:'PREPAID',programSnapshot:{demo:true},requestHash:'0'.repeat(64)}})
 const vehicle=await tx.fleetVehicle.create({data:{id:randomUUID(),code:'QAATT-'+randomUUID().slice(0,8),name:'Attendance boat',kind:'SPEEDBOAT',ownership:'GREENVIEW',capacity:3,status:'ACTIVE'}})
 const slotId=randomUUID(),runId=randomUUID(),lineId=randomUUID(),assignmentId=randomUUID()
 await tx.serviceSlot.create({data:{id:slotId,code:'S-'+slotId,name:'Rollback slot',resourceId:source.lines[0].resourceId,vehicleId:vehicle.id,startsAt:now,endsAt:new Date(+now+3600000),capacity:3,status:'ACTIVE'}})
 await tx.dispatchRun.create({data:{id:runId,code:'R-'+runId,name:'Rollback run',kind:'BOAT',direction:'OUTBOUND',period:'AM',capacity:3,slotId,requestHash:'0'.repeat(64)}})
 await tx.bookingComponent.create({data:{id:lineId,bookingId:id,resourceId:source.lines[0].resourceId,quantity:3,selected:true,included:true,usagePoint:'BOAT',dispatchDirection:'OUTBOUND',unitPrice:0,snapshot:{demo:true}}})
 await tx.dispatchAssignment.create({data:{id:assignmentId,runId,bookingLineId:lineId,adults:3,children:0}})
 const base={bookingId:id,serviceDate:date,direction:'OUTBOUND',bookingVersion:1}
 const command={id:randomUUID(),...base,version:0,action:'CHECK_IN',adults:1,children:0}
 await checkInCommand(nested,actor.id,command,now);await checkInCommand(nested,actor.id,command,now)
 let row=await tx.bookingAttendance.findFirst({where:{bookingId:id}});assert.equal(row.adults,1);assert.equal(row.version,1)
 await assert.rejects(()=>checkInCommand(nested,actor.id,{...command,id:randomUUID()},now),{code:'SETTINGS_CONFLICT'})
 await assert.rejects(()=>checkInCommand(nested,actor.id,{id:randomUUID(),action:'CLOSE',serviceDate:date,version:0},now),{code:'CHECK_IN_REVIEW_REQUIRED'})
 const preview=await checkInCommand(nested,actor.id,{id:randomUUID(),...base,version:1,action:'PREVIEW_NO_SHOW'},now)
 await assert.rejects(()=>checkInCommand(nested,actor.id,{id:randomUUID(),...base,version:1,action:'NO_SHOW',previewHash:preview.previewHash,reason:''},now),{code:'INVALID_INPUT'})
 await checkInCommand(nested,actor.id,{id:randomUUID(),...base,version:1,action:'NO_SHOW',previewHash:preview.previewHash,reason:'DEMO no-show'},now)
 const allocation=await tx.dispatchAssignment.findUnique({where:{id:assignmentId}});assert.equal(allocation.adults,1);assert.equal(allocation.status,'ASSIGNED');assert.equal(allocation.cancellationReason,'DEMO no-show')
 row=await tx.bookingAttendance.findFirst({where:{bookingId:id}});assert.equal(row.noShowAdults,2);assert.equal(row.financeStatus,'PENDING')
 const pending=await dispatchOptions(nested,actor.id,new URLSearchParams({kind:'BOAT',entity:'pending',date,direction:'OUTBOUND'}));assert.equal(pending.rows.find(r=>r.id===lineId).remainingPassengers,0)
 const booking=await tx.tourBooking.findUnique({where:{id}});assert.equal(booking.adults,3);assert.equal(booking.paymentTerms,'PREPAID');assert.equal(String(booking.adultPrice),'1000')
 await checkInCommand(nested,actor.id,{id:randomUUID(),action:'CLOSE',serviceDate:date,version:0},now)
 await assert.rejects(()=>checkInCommand(nested,actor.id,{id:randomUUID(),...base,version:2,action:'CHECK_IN',adults:1,children:0},now),{code:'SERVICE_DAY_CLOSED'})
 const state=await checkInState(nested,actor.id,new URLSearchParams({date}));assert.equal(state.summary.unresolved,0);assert.equal(state.summary.financePending,1);assert.equal(state.close.status,'CLOSED')
 await checkInCommand(nested,actor.id,{id:randomUUID(),action:'REOPEN',serviceDate:date,version:1,reason:'DEMO correction review'},now)
 assert.equal(await tx.auditEvent.count({where:{targetId:id,action:'operations.checkin.check_in'}}),1)

return {checks:['partial arrival and replay produce one attendance/audit','stale version and missing no-show reason denied','no-show adjusts allocation without changing booking price or finance state','closed day prevents check-in and reviewed reopen succeeds']}
}catch(error){console.error('ATTENDANCE_D1_FAILED',error);throw error}
finally{await tx.$disconnect()}
}
