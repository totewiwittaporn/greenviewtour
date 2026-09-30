import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
import {quoteRequest,submitCustomerRequest,memberRequests,customerCapacity} from '../../modules/commerce/service.js'
import {demoCheckout} from '../../modules/commerce/demo-checkout.js'
import {hash} from '../../modules/operations/common.js'
import {createD1Prisma} from '../../platform/database/d1-client.ts'
import fixture from '../../../../docs/validation/commerce-demo-manifest.json' with {type:'json'}
import {demoTourEnabled} from '../../modules/commerce/demo-checkout.js'
export async function demoWrites(env){
const tx=createD1Prisma(env.DB,{files:env.FILES})
try{

 const nested=tx
 const boat=await tx.fleetVehicle.create({data:{id:randomUUID(),code:'QADEMO-'+randomUUID().slice(0,8),name:'Demo fixture boat',kind:'SPEEDBOAT',ownership:'GREENVIEW',capacity:30,status:'ACTIVE'}})
 await tx.capacityPool.create({data:{id:randomUUID(),code:'QADEMO-'+randomUUID().slice(0,8),name:'Demo fixture pool',kind:'BOAT',serviceDate:new Date('2026-11-02'),direction:'OUTBOUND',startsAt:new Date('2026-11-02T00:00:00Z'),endsAt:new Date('2026-11-02T12:00:00Z'),resourceIds:[fixture.resource],holdMinutes:30,offers:{create:{id:randomUUID(),vehicleId:boat.id,capacity:30,status:'READY'}}}})
 await tx.capacityPool.create({data:{id:randomUUID(),code:'QADEMO-'+randomUUID().slice(0,8),name:'Demo return pool',kind:'BOAT',serviceDate:new Date('2026-11-02'),direction:'RETURN',startsAt:new Date('2026-11-02T12:00:00Z'),endsAt:new Date('2026-11-02T23:00:00Z'),resourceIds:[fixture.resource],holdMinutes:30,offers:{create:{id:randomUUID(),vehicleId:boat.id,capacity:30,status:'READY'}}}})
 assert.equal(demoTourEnabled(fixture.tour,{APP_ENV:'production',NODE_ENV:'development'}),false)
 assert.equal(demoTourEnabled(fixture.tour,{APP_ENV:'preview',NODE_ENV:'development'}),false)
 assert.equal(demoTourEnabled(fixture.tour,{APP_ENV:'local',NODE_ENV:'production'}),false)
 const user={id:randomUUID(),email_confirmed_at:'test'},other={id:randomUUID(),email_confirmed_at:'test'}
 for(const u of [user,other])await tx.customerProfile.create({data:{id:randomUUID(),authUserId:u.id,displayName:'DEMO rollback'}})
 const input={id:randomUUID(),tourId:fixture.tour,serviceDate:'2026-11-02',adults:1,children:0,name:'DEMO rollback',phone:'0000000000',allergyStatus:'NONE',allergies:''}
 const quoted=await quoteRequest(tx,input);input.quoteKey=hash(quoted)
 const availability=await customerCapacity(tx,input,quoted);if(!availability.canConfirm)console.error('DEMO_CAPACITY_DIAGNOSTIC',availability)
 await submitCustomerRequest(nested,user,input)
 const listed=await memberRequests(tx,user,new URLSearchParams());assert.equal(listed.rows.find(r=>r.id===input.id).demoCheckoutEnabled,true)
 await assert.rejects(()=>demoCheckout(nested,other,{requestId:input.id,action:'PREPARE'}),{message:'NOT_FOUND'})
 await demoCheckout(nested,user,{requestId:input.id,action:'PREPARE'})
 const pending=await tx.customerRequest.findUnique({where:{id:input.id}}),paymentId=pending.snapshot.demoCheckout.payment.id
 await assert.rejects(()=>demoCheckout(nested,user,{requestId:input.id,action:'SUCCEED',paymentId:'wrong'}),{message:'PAYMENT_REFERENCE_MISMATCH'})
 const command={requestId:input.id,action:'SUCCEED',paymentId}
 const a=await demoCheckout(nested,user,command),b=await demoCheckout(nested,user,command)
 assert.equal(a.bookingId,b.bookingId)
 const row=await tx.customerRequest.findUnique({where:{id:input.id},include:{booking:{include:{lines:true}}}})
 assert.equal(row.booking.status,'CONFIRMED');assert.equal(row.booking.paymentTerms,'PREPAID');assert.equal(row.booking.programSnapshot.demo,true);assert.equal(row.booking.lines.length,1)
 assert.equal(row.snapshot.demoCheckout.notification.customerId,row.customerId);assert.equal(row.snapshot.demoCheckout.notification.status,'SIMULATED');assert.equal(row.snapshot.demoCheckout.notification.accepted,false)
 assert.equal(await tx.auditEvent.count({where:{targetId:input.id,action:'demo.checkout.simulated'}}),1)
return {checks:['Local-only demo is disabled for production and preview','retained fixture quote/hold/reference validation and customer isolation','simulated success creates one booking and one audit on retry','simulated LINE is not a live send or real payment']}
}catch(error){console.error('DEMO_D1_FAILED',error);throw error}
finally{await tx.$disconnect()}
}
