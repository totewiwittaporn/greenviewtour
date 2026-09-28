import {dispatchOptions} from '../src/modules/operations/dispatch.js'
import {loadEnvFile} from 'node:process'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {checkInCommand,checkInState} from '../src/modules/operations/check-in.js'
import {profileInclude} from '../src/modules/identity-access/policy.js'
import {managementScope} from '../src/modules/identity-access/user-management.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),db=createPrisma(pool),rollback=new Error('ROLLBACK')
try{await db.$transaction(async tx=>{
 const nested=new Proxy(tx,{get(target,key){return key==='$transaction'?fn=>fn(target):target[key]}})
 const staff=await tx.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude})
 const actor=staff.find(p=>managementScope(p)?.company);assert.ok(actor,'manager required')
 const source=await tx.tourBooking.findFirst({where:{code:'DEMO-a1c8a60c'},include:{lines:true,trip:true}});assert.ok(source)
 const date='2030-01-15',now=new Date(date+'T08:00:00+07:00'),id=randomUUID(),tripId=randomUUID()
 await tx.operationTrip.create({data:{id:tripId,code:'T-'+tripId,name:'Rollback check-in',tourId:source.trip.tourId,startsAt:now,endsAt:new Date(+now+3600000),capacity:3,status:'OPEN'}})
 await tx.tourBooking.create({data:{id,tripId,code:'T-'+id,name:'Rollback check-in',status:'CONFIRMED',adults:3,children:0,adultPrice:1000,childPrice:500,outboundDate:new Date(date),returnStatus:'OTHER',paymentTerms:'PREPAID',programSnapshot:{demo:true},requestHash:'0'.repeat(64)}})
 const vehicle=await tx.fleetVehicle.findFirst({where:{name:'DEMO · เรือทดสอบเช็กอิน'}});assert.ok(vehicle)
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
 throw rollback
},{timeout:30000})}catch(e){if(e!==rollback){console.error({error:e.code||e.name,message:/^[A-Z_]+$/.test(e.message)?e.message:'CHECK_FAILED'});process.exitCode=1}else console.log('PASS: real Preview transaction: partial arrivals, replay, stale version, mandatory reason, no-show financial hold, unchanged prices, close/reopen guards. Rolled back temporary records; retained DEMO untouched.')}
finally{await db.$disconnect();await pool.end()}
