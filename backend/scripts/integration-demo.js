// Offline deterministic demonstration. Never creates money, a payable QR or a LINE binding.
import {writeFile} from 'node:fs/promises'
import {createDemoPayment,applyDemoPaymentEvent,demoPaymentNotification,paymentReadiness} from '../src/platform/payments/preparation.js'
import {lineAccountReadiness,resolveNotificationRecipient} from '../src/platform/line/account-link.js'
import {pushText} from '../src/platform/line/messaging.js'
import {randomUUID} from 'node:crypto'
const now=new Date(),payment=createDemoPayment({orderId:'DEMO-MANUAL-QR-001',amountMinor:250000,expiresAt:new Date(+now+900000).toISOString()},now)
const result=applyDemoPaymentEvent(payment,{id:randomUUID(),provider:'SIMULATOR',paymentId:payment.id,orderId:payment.orderId,amountMinor:payment.amountMinor,currency:payment.currency,status:'SUCCEEDED'},now)
const message=demoPaymentNotification(result),account={accountId:'DEMO-CUSTOMER',audience:'CUSTOMER',providerKey:'SIMULATOR'}
const recipient=resolveNotificationRecipient({...account,status:'LINKED',lineUserId:'U'+'0'.repeat(32)},account)
const delivery=await pushText({payload:{to:recipient,messages:[{type:'text',text:message.text}]},retryKey:randomUUID(),mode:'simulation',transport:()=>{throw Error('NETWORK_NOT_ALLOWED')}})
const evidence={label:'DEMO ONLY — not a real payment or LINE delivery',retained:true,generatedAt:now.toISOString(),paymentReadiness:paymentReadiness(),lineReadiness:lineAccountReadiness(),payment:result,notification:{...message,...delivery},limitations:['Not linked to an operational Booking','No provider credentials, live QR, webhook or authenticated LINE callback','Account binding above is synthetic and is not stored as a verified identity']}
await writeFile(new URL('../../docs/validation/qr-line-demo.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n')
console.log('Saved retained offline QR/LINE simulation evidence; no external calls.')
