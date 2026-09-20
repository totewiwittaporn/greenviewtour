import {requireOpenServiceDays} from '../operations/service-day.js'
// Local-only, exact retained-fixture allowlist. Never creates a charge or sends LINE.
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {createDemoPayment,applyDemoPaymentEvent,demoPaymentNotification} from '../../platform/payments/preparation.js'
import {pushText} from '../../platform/line/messaging.js'
import {programBookingPlan,storedJourney} from '../operations/booking-plan.js'
import {customerFor} from './service.js'
import {uuid,fail,hash} from '../operations/common.js'
let fixture=null
try{fixture=JSON.parse(readFileSync(new URL('../../../../docs/validation/commerce-demo-manifest.json',import.meta.url),'utf8'))}catch{/* Missing fixture disables simulation. */}
export function demoTourEnabled(id){return process.env.NODE_ENV!=='production'&&fixture?.retained===true&&fixture.tour===id}
export function assertDemoRequest(row,customerId){
 if(!row||row.customerId!==customerId)fail('NOT_FOUND',404)
 if(!demoTourEnabled(row.tourId))fail('DEMO_ONLY',403)
}
export async function demoCheckout(db,user,input,now=new Date()){
 uuid(input.requestId)
 if(!['PREPARE','SUCCEED'].includes(input.action))fail('INVALID_ACTION',400)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const customer=await customerFor(tx,user),row=await tx.customerRequest.findUnique({where:{id:input.requestId}})
  assertDemoRequest(row,customer.id)
  if(row.snapshot.demoCheckout?.payment.status==='SUCCEEDED')return {ok:true,bookingId:row.bookingId,status:'SIMULATED_SUCCESS'}
  if(row.status!=='REQUESTED'||row.bookingId)fail('BOOKING_LOCKED')
  if(row.holdUntil&&row.holdUntil<=now)fail('PROMOTION_HOLD_EXPIRED')
  const amountMinor=Math.round(Number(row.snapshot.packageTotal)*100)
  let payment=row.snapshot.demoCheckout?.payment
  if(input.action==='PREPARE'){
   if(!payment||new Date(payment.expiresAt)<=now)payment=createDemoPayment({orderId:'DEMO-'+row.id,amountMinor,expiresAt:new Date(Math.min(+now+900000,row.holdUntil?+row.holdUntil:Infinity)).toISOString()},now)
   await tx.customerRequest.update({where:{id:row.id},data:{snapshot:{...row.snapshot,demoCheckout:{payment}},version:{increment:1}}})
   return {ok:true,status:'PENDING'}
  }
  if(!payment||input.paymentId!==payment.id)fail('PAYMENT_REFERENCE_MISMATCH',409)
  if(new Date(payment.expiresAt)<=now)fail('DEMO_PAYMENT_EXPIRED',409)
  // Current tour components must still match the request. No real inventory is allocated.
  const plan=await programBookingPlan(tx,{tourId:row.tourId,serviceDate:row.serviceDate.toISOString().slice(0,10),adults:row.adults,children:row.children,returnStatus:'PENDING'})
  if(plan.program.version!==row.snapshot.tourVersion||plan.lines.length!==row.snapshot.components.length||plan.lines.some(l=>!row.snapshot.components.some(c=>c.componentId===l.componentId&&c.componentVersion===l.snapshot.componentVersion&&c.quantity===l.quantity)))fail('PROGRAM_COMPONENTS_STALE')
  if(plan.lines.some(l=>l.resourceId!==fixture.resource||l.componentId!==fixture.component))fail('DEMO_ONLY',403)
  payment=applyDemoPaymentEvent(payment,{id:'success-'+payment.id,provider:'SIMULATOR',paymentId:payment.id,orderId:payment.orderId,amountMinor,currency:'THB',status:'SUCCEEDED'},now)
  const id=randomUUID(),code='DEMO-'+id.slice(0,8),name='DEMO · '+row.details.name.slice(0,190)
  await tx.operationTrip.create({data:{id:plan.trip.id,code:'T-'+id,name,tourId:row.tourId,startsAt:plan.trip.startsAt,endsAt:plan.trip.endsAt,capacity:row.adults+row.children,status:'OPEN'}})
  await requireOpenServiceDays(tx,[plan.journey.outboundDate,plan.journey.returnDate])
  await tx.tourBooking.create({data:{id,code,name,tripId:plan.trip.id,adults:row.adults,children:row.children,status:'CONFIRMED',paymentTerms:'PREPAID',adultPrice:row.snapshot.adultPrice,childPrice:row.snapshot.childPrice,contactPhone:row.details.phone,allergyStatus:row.details.allergyStatus,allergies:row.details.allergies,...storedJourney(plan.journey),requestHash:hash({demoPayment:payment.id}),programSnapshot:{tourId:row.tourId,name:plan.program.name,bookingOwnedTrip:true,journeyMode:plan.program.journeyMode,durationDays:plan.program.durationDays,customerRequestId:row.id,customerId:customer.id,demo:true,demoPaymentStatus:'SUCCEEDED',paymentNotice:'SIMULATION ONLY — no real money received',startsAt:plan.trip.startsAt.toISOString(),endsAt:plan.trip.endsAt.toISOString()},lines:{create:plan.lines.map(l=>({id:randomUUID(),resourceId:l.resourceId,quantity:l.quantity,selected:row.snapshot.components.find(c=>c.componentId===l.componentId).selected,included:l.included,usagePoint:l.usagePoint,dispatchDirection:l.dispatchDirection,unitPrice:l.unitPrice,snapshot:{...l.snapshot,componentId:l.componentId,demo:true}}))}}})
  const prepared=demoPaymentNotification(payment)
  // Synthetic identity is never saved as a verified LINE account or passed to live mode.
  const delivery=await pushText({payload:{to:'U'+'0'.repeat(32),messages:[{type:'text',text:prepared.text}]},retryKey:payment.id,mode:'simulation',transport:()=>{throw Error('SIMULATION_NETWORK_FORBIDDEN')}})
  const notification={...prepared,customerId:customer.id,accountLinked:false,status:delivery.status,accepted:false,text:prepared.text+' · Booking '+code}
  await tx.customerRequest.update({where:{id:row.id},data:{status:'ACCEPTED',bookingId:id,snapshot:{...row.snapshot,confirmedTotal:row.snapshot.packageTotal,bookingCode:code,demoCheckout:{payment,notification}},version:{increment:1}}})
  await tx.auditEvent.create({data:{actorId:user.id,targetId:row.id,action:'demo.checkout.simulated',details:{mode:'simulation',bookingId:id,paymentId:payment.id,realMoney:false,lineSent:false}}})
  return {ok:true,status:'SIMULATED_SUCCESS',bookingId:id}
 },{timeout:30000})
}
