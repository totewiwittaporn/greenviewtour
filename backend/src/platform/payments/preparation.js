// Provider-neutral simulation contract. No live charge or webhook endpoint is enabled.
import {randomUUID} from 'node:crypto'
const reject=code=>{throw new Error(code)}
export function paymentReadiness(){return {mode:'simulation',provider:null,liveEnabled:false,canCreateLiveQr:false,missing:['PAYMENT_PROVIDER','PROVIDER_TEST_CREDENTIALS','VERIFIED_HTTPS_WEBHOOK'],message:'Payment provider has not been connected.'}}
export function createDemoPayment({orderId,amountMinor,currency='THB',expiresAt},now=new Date()){
 if(typeof orderId!=='string'||!orderId.startsWith('DEMO-')||orderId.length>100)reject('DEMO_ORDER_REQUIRED')
 if(!Number.isSafeInteger(amountMinor)||amountMinor<=0||amountMinor>100000000||currency!=='THB')reject('INVALID_PAYMENT_AMOUNT')
 const expiry=new Date(expiresAt)
 if(!Number.isFinite(+expiry)||expiry<=now)reject('INVALID_PAYMENT_EXPIRY')
 return {id:randomUUID(),mode:'simulation',provider:'SIMULATOR',orderId,amountMinor,currency,status:'PENDING',expiresAt:expiry.toISOString(),createdAt:now.toISOString(),events:[],paidAt:null,qr:null}
}
// Call only with a server-verified provider result when an adapter is implemented.
// This version intentionally refuses live events, including a client-supplied verified flag.
export function applyDemoPaymentEvent(payment,event,now=new Date()){
 if(payment.mode!=='simulation'||payment.provider!=='SIMULATOR'||event.provider!=='SIMULATOR')reject('LIVE_PAYMENTS_DISABLED')
 if(typeof event.id!=='string'||!event.id||event.id.length>100||event.paymentId!==payment.id||event.orderId!==payment.orderId)reject('PAYMENT_REFERENCE_MISMATCH')
 if(event.currency!==payment.currency||event.amountMinor!==payment.amountMinor)reject('PAYMENT_AMOUNT_MISMATCH')
 if(!['SUCCEEDED','FAILED','EXPIRED'].includes(event.status))reject('INVALID_PAYMENT_EVENT')
 const prior=payment.events.find(e=>e.id===event.id)
 const normalized={id:event.id,status:event.status,amountMinor:event.amountMinor,currency:event.currency,orderId:event.orderId,paymentId:event.paymentId}
 if(prior){if(JSON.stringify(prior)!==JSON.stringify(normalized))reject('PAYMENT_EVENT_CONFLICT');return payment}
 let status=payment.status,paidAt=payment.paidAt
 if(!['SUCCEEDED','REVIEW_REQUIRED'].includes(status)){
  if(event.status==='SUCCEEDED'){
   status=now>=new Date(payment.expiresAt)||payment.status!=='PENDING'?'REVIEW_REQUIRED':'SUCCEEDED'
   paidAt=now.toISOString()
  }else status=event.status
 }
 return {...payment,status,paidAt,events:[...payment.events,normalized]}
}
export function demoPaymentNotification(payment){
 if(payment.mode!=='simulation'||payment.status!=='SUCCEEDED')reject('PAYMENT_NOT_SUCCESSFUL')
 return {dedupeKey:`demo-payment:${payment.id}:succeeded`,audience:'CUSTOMER',orderId:payment.orderId,text:`DEMO · ยืนยันการชำระเงินจำลอง ${payment.orderId} จำนวน ${(payment.amountMinor/100).toFixed(2)} บาท — ไม่มีการรับเงินจริง`,status:'PREPARED',delivery:'SIMULATION_ONLY'}
}
