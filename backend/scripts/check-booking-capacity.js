import {bookingStatus,amendBookingReturn} from '../src/modules/operations/bookings.js'
// Opt-in integration check: exact verified Preview adapter; every synthetic row rolls back.
import {loadEnvFile} from 'node:process'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {saveCapacityPool,listCapacityPools,bookingCapacityPreview,releaseRequestCapacity,bindLegacyBookingWindow} from '../src/modules/operations/capacity-service.js'
import {publicQuoteAvailability,submitCustomerRequest,commandCustomerRequest,answerCustomerDate,memberRequests,cancelCustomerRequest} from '../src/modules/commerce/service.js'
import {saveRun,dispatchCommand,moveBoatGroup} from '../src/modules/operations/dispatch.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),db=createPrisma(pool),rollback=new Error('CAPACITY_QA_ROLLBACK'),checks=[]
try{await db.$transaction(async tx=>{
 const manager=await tx.userProfile.findFirst({where:{status:'ACTIVE',roles:{some:{roleCode:'ADMIN_MANAGER',scope:'COMPANY'}}}});assert.ok(manager)
 const nested=new Proxy(tx,{get(target,key){return key==='$transaction'?fn=>fn(target):target[key]}}),prefix='QA-CAP-'+randomUUID().slice(0,8).toUpperCase(),date='2026-10-26',now=new Date()
 const resource=await tx.operationResource.create({data:{id:randomUUID(),code:prefix,name:prefix,kind:'SERVICE',category:'TOUR_BOAT',baseUnit:'PERSON',status:'ACTIVE',salePrice:'0'}})
 const tour=await tx.tourProgram.create({data:{id:randomUUID(),code:prefix,name:prefix,status:'ACTIVE',ownership:'GREENVIEW',journeyMode:'OUTBOUND_ONLY',confirmationMode:'REQUEST',supplierPricing:'NOT_SET',publicStatus:'PUBLISHED',adultPrice:'1000',childPrice:'500',components:{create:{id:randomUUID(),resourceId:resource.id,selection:'REQUIRED',basis:'PER_PERSON',quantity:1,usagePoint:'BOAT',status:'ACTIVE'}},seasons:{create:{id:randomUUID(),code:prefix,name:prefix,status:'ACTIVE',startsOn:new Date('2026-10-01'),endsOn:new Date('2027-05-01'),onlineStartsOn:new Date('2026-10-01'),onlineEndsOn:new Date('2027-04-01'),bookingStartsOn:new Date('2026-09-01'),bookingEndsOn:new Date('2027-04-01'),cutoffDays:0}}}})
 const boats=[];for(const capacity of [30,45,65])boats.push(await tx.fleetVehicle.create({data:{id:randomUUID(),code:prefix+'-'+capacity,name:'QA boat '+capacity,kind:'SPEEDBOAT',ownership:'GREENVIEW',capacity,status:'ACTIVE'}}))
 const windowInput={id:randomUUID(),commandId:randomUUID(),version:0,code:prefix,name:prefix,kind:'BOAT',serviceDate:date,direction:'OUTBOUND',startsAt:date+' 07:00',endsAt:date+' 12:00',resourceIds:[resource.id],status:'ACTIVE',holdMinutes:60,overnightLoadTenths:12,offers:boats.map(b=>({vehicleId:b.id,capacity:b.capacity,status:'READY'}))}
 await saveCapacityPool(nested,manager.id,windowInput);await saveCapacityPool(nested,manager.id,windowInput)
 assert.equal(await tx.capacityPool.count({where:{id:windowInput.id}}),1);checks.push('readiness idempotency')
 const user={id:randomUUID(),email_confirmed_at:now.toISOString()},customer=await tx.customerProfile.create({data:{id:randomUUID(),authUserId:user.id,displayName:'QA capacity customer'}})
 const values=(pax,serviceDate=date)=>({tourId:tour.id,serviceDate,adults:pax,children:0,name:prefix,phone:'0000000000',allergyStatus:'NONE',optionalIds:[]})
 async function request(pax,serviceDate=date,allowWaitlist=false){const input=values(pax,serviceDate),quote=await publicQuoteAvailability(nested,input);const command={...input,id:randomUUID(),quoteKey:quote.quoteKey,allowWaitlist};return {result:await submitCustomerRequest(nested,user,command,now),command,quote}}
 const first=await request(35);assert.equal(first.result.status,'REQUESTED');assert.equal(await tx.capacityHold.count({where:{requestId:first.result.id,expiresAt:{gt:now}}}),1)
 await submitCustomerRequest(nested,user,first.command,now);assert.equal(await tx.capacityHold.count({where:{requestId:first.result.id}}),1);checks.push('request replay never duplicates hold')
 const second=await request(35);assert.equal(second.result.status,'REQUESTED')
 const plan=await listCapacityPools(nested,manager.id,new URLSearchParams({date,kind:'BOAT'}));assert.deepEqual(plan.rows[0].plan.assignments.map(a=>a.capacity).sort((a,b)=>a-b),[45,65]);checks.push('35+35 groups never use 30-seat boat')
 const blocked=await request(65,date,true);assert.equal(blocked.result.status,'WAITING_TEAM');assert.equal(blocked.quote.availability.legs[0].remainingSeats,70);assert.equal(blocked.quote.availability.canConfirm,false)
 assert.equal(await tx.capacityHold.count({where:{requestId:blocked.result.id}}),0);checks.push('aggregate space does not imply group fit; waiting has no hold')
 async function accept(requestId){const row=await tx.customerRequest.findUnique({where:{id:requestId}});return commandCustomerRequest(nested,manager.id,{id:randomUUID(),requestId,version:row.version,action:'ACCEPT',note:'QA readiness reviewed'})}
 const firstConfirmed=await accept(first.result.id),secondConfirmed=await accept(second.result.id)
 assert.equal(firstConfirmed.status,'AWAITING_PAYMENT');assert.equal(secondConfirmed.status,'AWAITING_PAYMENT')
 assert.equal(await tx.capacityHold.count({where:{requestId:{in:[first.result.id,second.result.id]},expiresAt:{gt:new Date()}}}),0)
 assert.equal((await listCapacityPools(nested,manager.id,new URLSearchParams({date}))).rows[0].passengers,70);checks.push('request conversion counts exactly once')
 const waiting=await accept(blocked.result.id);assert.equal(waiting.status,'WAITING_TEAM');assert.equal(waiting.bookingId,null)
 assert.equal(await tx.tourBooking.count({where:{programSnapshot:{path:['customerRequestId'],equals:blocked.result.id}}}),0);checks.push('failed acceptance creates no partial Booking')
 const extra=await tx.fleetVehicle.create({data:{id:randomUUID(),code:prefix+'-90',name:'QA hired boat',kind:'SPEEDBOAT',ownership:'GREENVIEW',capacity:90,status:'ACTIVE'}})
 const update={...windowInput,commandId:randomUUID(),version:1,offers:[...windowInput.offers,{vehicleId:extra.id,capacity:90,status:'PROPOSED'}]}
 await saveCapacityPool(nested,manager.id,update);assert.equal((await accept(blocked.result.id)).status,'WAITING_TEAM')
 await saveCapacityPool(nested,manager.id,{...update,commandId:randomUUID(),version:2,offers:update.offers.map(o=>({...o,status:'READY'}))})
 const thirdConfirmed=await accept(blocked.result.id);assert.equal(thirdConfirmed.status,'AWAITING_PAYMENT');checks.push('only verified extra boat enables confirmation')
 async function run(vehicle){return (await saveRun(nested,manager.id,{id:randomUUID(),version:0,code:prefix+'-'+vehicle.capacity+'-RUN',name:'QA boat run',kind:'BOAT',direction:'OUTBOUND',period:'AM',resourceId:resource.id,vehicleId:vehicle.id,startsAt:date+' 08:00',endsAt:date+' 11:00',capacity:vehicle.capacity,staff:[]})).row}
 const runs={};for(const boat of [...boats,extra])runs[boat.capacity]=await run(boat)
 async function booking(id){return tx.tourBooking.findUnique({where:{id},include:{lines:true}})}
 const firstBook=await booking(firstConfirmed.bookingId),secondBook=await booking(secondConfirmed.bookingId),thirdBook=await booking(thirdConfirmed.bookingId)
 async function rejectsTransaction(fn,code){await tx.$executeRawUnsafe('SAVEPOINT capacity_negative_case');try{await assert.rejects(fn,e=>{assert.equal(e.code||e.message,code);return true})}finally{await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT capacity_negative_case');await tx.$executeRawUnsafe('RELEASE SAVEPOINT capacity_negative_case')}}
 await rejectsTransaction(()=>dispatchCommand(nested,manager.id,{id:randomUUID(),runId:runs[30].id,version:1,action:'ASSIGN',bookingLineId:firstBook.lines[0].id,adults:30,children:0}),'BOOKING_GROUP_MUST_STAY_TOGETHER')
 async function assign(book,capacity){return dispatchCommand(nested,manager.id,{id:randomUUID(),runId:runs[capacity].id,version:1,action:'ASSIGN',bookingLineId:book.lines[0].id,adults:book.adults,children:book.children})}
 await assign(firstBook,45);await assign(secondBook,65);await assign(thirdBook,90);checks.push('whole-group dispatch retains all existing capacity commitments')
 const a=await tx.dispatchAssignment.findFirst({where:{bookingLineId:firstBook.lines[0].id}})
 await rejectsTransaction(()=>moveBoatGroup(nested,manager.id,{id:randomUUID(),runId:runs[45].id,version:2,assignmentId:a.id,targetRunId:runs[65].id,targetVersion:2,reason:'QA invalid target'}),'VEHICLE_CAPACITY_EXCEEDED')
 assert.equal((await tx.dispatchAssignment.findUnique({where:{id:a.id}})).runId,runs[45].id);checks.push('failed atomic move preserves original assignment')
 const fourth=await request(35,date,true);assert.equal(fourth.result.status,'WAITING_TEAM');checks.push('pinned assignments are not silently repacked')
 const next='2026-10-27';await saveCapacityPool(nested,manager.id,{...windowInput,id:randomUUID(),commandId:randomUUID(),code:prefix+'-NEXT',serviceDate:next,startsAt:next+' 07:00',endsAt:next+' 12:00'})
 const row4=await tx.customerRequest.findUnique({where:{id:fourth.result.id}})
 await commandCustomerRequest(nested,manager.id,{id:randomUUID(),requestId:row4.id,version:row4.version,action:'PROPOSE_DATE',proposedDate:next,note:'QA customer must agree'})
 const proposed=await tx.customerRequest.findUnique({where:{id:row4.id}});assert.equal(proposed.status,'DATE_PROPOSED');assert.equal(proposed.serviceDate.toISOString().slice(0,10),date)
 const proposal=proposed.snapshot.dateProposal
 await rejectsTransaction(()=>commandCustomerRequest(nested,manager.id,{id:randomUUID(),requestId:row4.id,version:proposed.version,action:'ACCEPT',note:'Cannot accept without consent'}),'BOOKING_LOCKED')
 const answered=await answerCustomerDate(nested,user,{id:randomUUID(),requestId:row4.id,version:proposed.version,answer:'ACCEPT',serviceDate:next,quoteKey:proposal.quoteKey})
 assert.equal(answered.status,'REQUESTED');assert.equal((await tx.customerRequest.findUnique({where:{id:row4.id}})).serviceDate.toISOString().slice(0,10),next);checks.push('only customer consent changes the proposed date')
 const fresh=await tx.customerRequest.findUnique({where:{id:row4.id}});await cancelCustomerRequest(nested,user,{requestId:row4.id,version:fresh.version})
 assert.equal(await tx.capacityHold.count({where:{requestId:row4.id,expiresAt:{gt:new Date()}}}),0);checks.push('cancellation releases seat hold')
 const expiring=await request(5,next);await releaseRequestCapacity(tx,expiring.result.id,new Date(0))
 const members=await memberRequests(nested,user,new URLSearchParams());assert.equal(members.rows.find(r=>r.id===expiring.result.id).seatHoldExpired,true);checks.push('expired holds are not counted or silently renewed')
 const safeQuote=await publicQuoteAvailability(nested,values(2,next));assert.equal(JSON.stringify(safeQuote.availability).includes(firstBook.code),false);assert.equal(safeQuote.availability.legs[0].remainingSeats,140)
 assert.equal(safeQuote.availability.legs.some(leg=>Object.hasOwn(leg,'groups')),false);checks.push('public availability excludes booking identity and contacts')
 const preview=await bookingCapacityPreview(nested,manager.id,{bookingId:firstBook.id});assert.equal(preview.canConfirm,true)
 await rejectsTransaction(()=>saveCapacityPool(nested,manager.id,{...windowInput,commandId:randomUUID(),version:3,startsAt:date+' 09:00'}),'CAPACITY_WINDOW_HAS_RESERVATIONS');checks.push('cannot move committed capacity window')
 const night=await tx.tourProgram.create({data:{id:randomUUID(),code:prefix+'-NIGHT',name:prefix+' overnight',status:'ACTIVE',ownership:'GREENVIEW',journeyMode:'FIXED',durationDays:2,confirmationMode:'REQUEST',supplierPricing:'NOT_SET',publicStatus:'PUBLISHED',adultPrice:'1000',childPrice:'500',components:{create:{id:randomUUID(),resourceId:resource.id,selection:'REQUIRED',basis:'PER_PERSON',quantity:1,usagePoint:'BOAT',status:'ACTIVE'}},seasons:{create:{id:randomUUID(),code:prefix+'-NIGHT',name:prefix,status:'ACTIVE',startsOn:new Date('2026-10-01'),endsOn:new Date('2027-05-01'),onlineStartsOn:new Date('2026-10-01'),onlineEndsOn:new Date('2027-04-01'),bookingStartsOn:new Date('2026-09-01'),bookingEndsOn:new Date('2027-04-01'),cutoffDays:0}}}})
 const nightInput={...values(1),tourId:night.id},nightQuote=await publicQuoteAvailability(nested,nightInput)
 assert.equal(nightQuote.availability.canConfirm,false);assert.equal(nightQuote.availability.legs.length,2)
 const nightRequest=await submitCustomerRequest(nested,user,{...nightInput,id:randomUUID(),quoteKey:nightQuote.quoteKey,allowWaitlist:true})
 assert.equal(nightRequest.status,'WAITING_TEAM');assert.equal(await tx.capacityHold.count({where:{requestId:nightRequest.id}}),0);checks.push('unavailable return prevents every leg from being held or confirmed')
 await saveCapacityPool(nested,manager.id,{...windowInput,id:randomUUID(),commandId:randomUUID(),code:prefix+'-RETURN',serviceDate:next,direction:'RETURN',startsAt:next+' 13:00',endsAt:next+' 18:00',offers:[{vehicleId:boats[0].id,capacity:1,status:'READY'}]})
 const acceptedNight=await accept(nightRequest.id);assert.equal(acceptedNight.status,'AWAITING_PAYMENT')
 const nightBooking=await booking(acceptedNight.bookingId);assert.equal(nightBooking.returnDate.toISOString().slice(0,10),next);assert.equal(nightBooking.programSnapshot.capacitySelections.length,2)
 await bookingStatus(nested,manager.id,{id:randomUUID(),bookingId:nightBooking.id,version:nightBooking.version,action:'CANCEL'});checks.push('overnight confirmation and cancellation account for both dates')
 const open=await tx.tourProgram.update({where:{id:night.id},data:{journeyMode:'OPEN_RETURN',durationDays:1}})
 const openQuote=await publicQuoteAvailability(nested,{...nightInput,tourId:open.id}),openRequest=await submitCustomerRequest(nested,user,{...nightInput,tourId:open.id,id:randomUUID(),quoteKey:openQuote.quoteKey})
 const acceptedOpen=await accept(openRequest.id),openBooking=await booking(acceptedOpen.bookingId)
 const amendment={id:randomUUID(),bookingId:openBooking.id,version:openBooking.version,returnStatus:'OUR',returnDate:'2026-10-28',reason:'QA open-return choice'}
 await rejectsTransaction(()=>amendBookingReturn(nested,manager.id,amendment),'BOAT_CAPACITY_REVIEW_REQUIRED')
 assert.equal((await booking(openBooking.id)).returnStatus,'PENDING');checks.push('failed return addition rolls back date, version and trip changes')
 const legacy=await booking(firstBook.id)
 await tx.tourBooking.update({where:{id:legacy.id},data:{programSnapshot:{...legacy.programSnapshot,capacitySelections:[]}}})
 const binding={id:randomUUID(),bookingId:legacy.id,version:legacy.version,poolId:windowInput.id,reason:'QA reconcile existing confirmed booking'}
 await bindLegacyBookingWindow(nested,manager.id,binding)
 const bound=await booking(legacy.id);assert.equal(bound.status,'CONFIRMED');assert.equal(bound.programSnapshot.capacitySelections[0].poolId,windowInput.id)
 await rejectsTransaction(()=>bindLegacyBookingWindow(nested,manager.id,{...binding,id:randomUUID(),version:bound.version}),'CAPACITY_SELECTION_ALREADY_RECORDED')
 checks.push('legacy window reconciliation cannot replace a recorded window or create confirmation')
 const thirdCurrent=await booking(thirdBook.id)
 await bookingStatus(nested,manager.id,{id:randomUUID(),bookingId:thirdBook.id,version:thirdCurrent.version,action:'CANCEL'})
 const fromNow=await tx.dispatchRun.findUnique({where:{id:runs[45].id}}),toNow=await tx.dispatchRun.findUnique({where:{id:runs[90].id}})
 const sourceAssignment=await tx.dispatchAssignment.findFirst({where:{bookingLineId:firstBook.lines[0].id}})
 await moveBoatGroup(nested,manager.id,{id:randomUUID(),runId:fromNow.id,version:fromNow.version,assignmentId:sourceAssignment.id,targetRunId:toNow.id,targetVersion:toNow.version,reason:'QA move whole group to verified empty boat'})
 const moved=await tx.dispatchAssignment.findMany({where:{bookingLineId:firstBook.lines[0].id}})
 assert.equal(moved.length,1);assert.equal(moved[0].runId,toNow.id);assert.equal(moved[0].adults,35)
 checks.push('successful atomic move preserves the whole Booking in one target boat')
 assert.equal(await tx.customerProfile.count({where:{id:customer.id}}),1)
 throw rollback
 },{maxWait:15000,timeout:360000})
}catch(error){if(error===rollback)console.log(JSON.stringify({result:'PASS',checks,mode:'transaction rollback',realEmails:0,realPayments:0}));else{console.error(JSON.stringify({result:'FAIL',completed:checks,error:error.code||error.message,stack:error.stack?.split('\n').slice(0,5)}));process.exitCode=1}}
finally{await db.$disconnect();await pool.end()}
