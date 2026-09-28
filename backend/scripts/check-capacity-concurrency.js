// Explicit Preview-only race test. Isolated QA IDs; no Auth users, messages or payments.
import {loadEnvFile} from 'node:process'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {publicQuoteAvailability,submitCustomerRequest} from '../src/modules/commerce/service.js'
import {bookingStatus} from '../src/modules/operations/bookings.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),db=createPrisma(pool),ids=Object.fromEntries(['resource','tour','component','season','vehicle','pool','trip','booking','line','customer','auth','request','command'].map(key=>[key,randomUUID()]))
const code='QA-RACE-'+ids.pool.slice(0,8).toUpperCase(),date='2026-10-26';let result,cleanup=false
try{
 const manager=await db.userProfile.findFirst({where:{status:'ACTIVE',roles:{some:{roleCode:'ADMIN_MANAGER',scope:'COMPANY'}}}});assert.ok(manager)
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  await tx.operationResource.create({data:{id:ids.resource,code,name:code,kind:'SERVICE',category:'TOUR_BOAT',baseUnit:'PERSON',status:'ACTIVE',salePrice:'0'}})
  await tx.tourProgram.create({data:{id:ids.tour,code,name:code,status:'ACTIVE',ownership:'GREENVIEW',journeyMode:'OUTBOUND_ONLY',confirmationMode:'REQUEST',supplierPricing:'NOT_SET',publicStatus:'PUBLISHED',adultPrice:'1000',childPrice:'500',components:{create:{id:ids.component,resourceId:ids.resource,selection:'REQUIRED',basis:'PER_PERSON',quantity:1,usagePoint:'BOAT',status:'ACTIVE'}},seasons:{create:{id:ids.season,code,name:code,status:'ACTIVE',startsOn:new Date('2026-10-01'),endsOn:new Date('2027-05-01'),onlineStartsOn:new Date('2026-10-01'),onlineEndsOn:new Date('2027-04-01'),bookingStartsOn:new Date('2026-09-01'),bookingEndsOn:new Date('2027-04-01'),cutoffDays:0}}}})
  await tx.fleetVehicle.create({data:{id:ids.vehicle,code,name:code,kind:'SPEEDBOAT',ownership:'GREENVIEW',capacity:1,status:'ACTIVE'}})
  await tx.capacityPool.create({data:{id:ids.pool,code,name:code,kind:'BOAT',serviceDate:new Date(date),direction:'OUTBOUND',startsAt:new Date(date+'T00:00:00Z'),endsAt:new Date(date+'T05:00:00Z'),resourceIds:[ids.resource],holdMinutes:30,offers:{create:{id:randomUUID(),vehicleId:ids.vehicle,capacity:1,status:'READY'}}}})
  await tx.operationTrip.create({data:{id:ids.trip,code,name:code,tourId:ids.tour,startsAt:new Date(date+'T00:00:00Z'),endsAt:new Date(date+'T10:00:00Z'),capacity:1,status:'OPEN'}})
  await tx.tourBooking.create({data:{id:ids.booking,code,name:code,tripId:ids.trip,adults:1,children:0,createdById:manager.id,status:'DRAFT',outboundDate:new Date(date),returnStatus:'NONE',paymentTerms:'COUNTER',allergyStatus:'NONE',adultPrice:'1000',childPrice:'500',requestHash:'qa',programSnapshot:{tourId:ids.tour,bookingOwnedTrip:true,name:code},lines:{create:{id:ids.line,resourceId:ids.resource,selected:true,included:true,quantity:1,usagePoint:'BOAT',dispatchDirection:'OUTBOUND',unitPrice:'0',snapshot:{category:'TOUR_BOAT',selection:'REQUIRED'}}}}})
  await tx.customerProfile.create({data:{id:ids.customer,authUserId:ids.auth,displayName:code}})
 },{timeout:60000})
 const input={tourId:ids.tour,serviceDate:date,adults:1,children:0,name:code,phone:'0000000000',allergyStatus:'NONE',optionalIds:[]},quote=await publicQuoteAvailability(db,input)
 assert.equal(quote.availability.legs[0].remainingSeats,1)
 const outcomes=await Promise.allSettled([
  submitCustomerRequest(db,{id:ids.auth,email_confirmed_at:new Date().toISOString()},{...input,id:ids.request,quoteKey:quote.quoteKey}),
  bookingStatus(db,manager.id,{id:ids.command,bookingId:ids.booking,version:1,action:'CONFIRM'}),
 ])
 const held=await db.capacityHold.count({where:{poolId:ids.pool,expiresAt:{gt:new Date()}}}),confirmed=await db.tourBooking.count({where:{id:ids.booking,status:'CONFIRMED'}})
 assert.equal(held+confirmed,1)
 const web=outcomes[0],staff=outcomes[1]
 assert.equal(staff.status,'fulfilled')
 if(held){assert.equal(web.status,'fulfilled');assert.equal(web.value.status,'REQUESTED');assert.equal(staff.value.capacityStatus,'WAITING_TEAM')}
 else{assert.equal(staff.value.status,'CONFIRMED');assert.equal(web.status,'rejected');assert.equal(web.reason.code||web.reason.message,'CAPACITY_CHANGED')}
 result={result:'PASS',test:'simultaneous web request and staff confirmation compete for one seat',held,confirmed,oversold:false}
}catch(error){result={result:'FAIL',error:error.code||error.name};process.exitCode=1}
finally{
 try{await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  await tx.capacityHold.deleteMany({where:{poolId:ids.pool}})
  await tx.customerRequest.deleteMany({where:{id:ids.request,customerId:ids.customer}})
  await tx.operationCommand.deleteMany({where:{id:ids.command}})
  await tx.auditEvent.deleteMany({where:{targetId:{in:[ids.booking,ids.request,ids.pool]}}})
  await tx.bookingComponent.deleteMany({where:{bookingId:ids.booking}})
  await tx.tourBooking.deleteMany({where:{id:ids.booking,code}})
  await tx.operationTrip.deleteMany({where:{id:ids.trip,code}})
  await tx.capacityOffer.deleteMany({where:{poolId:ids.pool}})
  await tx.capacityPool.deleteMany({where:{id:ids.pool,code}})
  await tx.programComponent.deleteMany({where:{tourId:ids.tour}})
  await tx.tourSeason.deleteMany({where:{tourId:ids.tour}})
  await tx.tourProgram.deleteMany({where:{id:ids.tour,code}})
  await tx.operationResource.deleteMany({where:{id:ids.resource,code}})
  await tx.fleetVehicle.deleteMany({where:{id:ids.vehicle,code}})
  await tx.customerProfile.deleteMany({where:{id:ids.customer,authUserId:ids.auth}})
 },{timeout:60000});cleanup=true}catch(error){console.error(JSON.stringify({cleanup:'FAILED',fixtureIds:ids,error:error.code||error.name}));process.exitCode=1}
 console.log(JSON.stringify({...result,cleanup,realPayments:0,realEmails:0,persistentDemosChanged:false}))
 await db.$disconnect();await pool.end()
}
