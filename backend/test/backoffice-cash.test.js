import test from 'node:test'
import assert from 'node:assert/strict'
import {summarizeCash} from '../src/backoffice/dashboard/overview/cash-summary.js'
import {validateCommission} from '../src/modules/personnel-finance/booking-commission.js'
import {validateAgentRefund} from '../src/modules/personnel-finance/agent-refund.js'
import {notificationFor} from '../src/modules/notifications/service.js'
import {deliverPersonalNotification} from '../src/modules/notifications/line.js'
const id=n=>`b0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
test('Agent refund rechecks exact remainder, new debt and duplicate claims before payment',async()=>{
 const receipt={id:id(1),agentId:id(2),margin:'1200',refunded:'0'},record={id:id(3),payload:{receiptId:id(1),amount:'400'}}
 const tx={bookingReceipt:{findUnique:async()=>receipt},agentMarginOffset:{findMany:async()=>[{amount:'800'}]},agentBill:{findMany:async()=>[]},tourBooking:{findMany:async()=>[]},agentRefundClaim:{findUnique:async()=>null}}
 assert.equal(await validateAgentRefund(tx,record),receipt)
 record.payload.amount='1200';await assert.rejects(validateAgentRefund(tx,record),{code:'REFUND_BALANCE_CHANGED'});record.payload.amount='400'
 tx.agentBill.findMany=async()=>[{total:'100',paid:'0'}];await assert.rejects(validateAgentRefund(tx,record),{code:'AGENT_DEBT_REQUIRES_OFFSET'});tx.agentBill.findMany=async()=>[]
 tx.agentRefundClaim.findUnique=async()=>({recordId:id(4)});await assert.rejects(validateAgentRefund(tx,record),{code:'REFUND_ALREADY_CLAIMED'})
 tx.agentRefundClaim.findUnique=async()=>({recordId:record.id});await validateAgentRefund(tx,record)
 receipt.refunded='400';await assert.rejects(validateAgentRefund(tx,record),{code:'REFUND_BALANCE_CHANGED'})
})
test('cash shows actual dates, separates held margin and never counts offset or advance clearance as cash',()=>{
 const data=summarizeCash({today:'2026-09-28',receipts:[{id:'receipt',bookingId:'booking',net:'2300',margin:'1200',receivedOn:'2026-09-28'}],offsets:[{receiptId:'receipt',billId:'bill',amount:'1200'}],bills:[{id:'bill',title:'Agent bill',total:'2000',paid:'1200',dueOn:'2026-09-15',promisedOn:'2026-10-01'}],expenses:[{id:'advance',kind:'WORK_ADVANCE',status:'CLEARED',payment:{amountCents:100000,paidOn:'2026-09-10'},clearance:{returnedAmount:'100'},payload:{amount:'1000'}},{id:'pending',kind:'REIMBURSEMENT',title:'Pending',status:'SUBMITTED',payload:{amount:'300',plannedPaymentOn:'2026-10-01'}},{id:'approved',kind:'REIMBURSEMENT',title:'Approved',status:'APPROVED',payload:{amount:'400',plannedPaymentOn:'2026-10-02'}}]})
 assert.deepEqual(data.actual.incoming,{GREENVIEW_NET:230000,AGENT_MONEY_HELD:120000})
 assert.equal(data.actual.outgoing.WORK_ADVANCE,100000)
 assert.equal(data.forecast.incomingCents,80000);assert.equal(data.forecast.approvedOutgoingCents,40000)
 assert.equal(data.forecast.rows.filter(r=>r.category==='AGENT_REFUND').length,0)
 assert.equal(data.forecast.rows.find(r=>r.id==='bill').dueOn,'2026-09-15')
})
test('unknown and overdue dates stay outside dated totals',()=>{
 const result=summarizeCash({today:'2026-09-28',bills:[{id:'old',total:'100',paid:'0',dueOn:'2026-09-01'}],expenses:[{id:'unknown',kind:'WORK_ADVANCE',status:'APPROVED',payload:{amount:'100',dueOn:'2026-10-01'}}]})
 assert.equal(result.forecast.incomingCents,0);assert.equal(result.forecast.approvedOutgoingCents,0)
 assert.deepEqual(result.forecast.rows.map(r=>r.timing).sort(),['OVERDUE','UNSCHEDULED'])
})
test('commission requires completed trip and verified full receipt; paid label alone is insufficient',async()=>{
 const booking={id:id(1),status:'CONFIRMED',paymentTerms:'PAID',adults:1,children:0,adultPrice:'100',childPrice:'0',lines:[],commissionSnapshot:{eligible:true,amount:'10',beneficiaryId:id(2)}}
 let receipts=[]
 const tx={tourBooking:{findUnique:async()=>booking},bookingAttendance:{count:async()=>0},bookingReceipt:{findMany:async()=>receipts},agentMarginOffset:{findMany:async()=>[]},customerRequest:{findFirst:async()=>null},bookingCommissionClaim:{findUnique:async()=>null}}
 const record={id:id(3),employeeId:id(2),payload:{bookingId:id(1),amount:'10'}}
 await assert.rejects(validateCommission(tx,record),{code:'COMMISSION_TRIP_NOT_COMPLETED'})
 booking.status='COMPLETED';await assert.rejects(validateCommission(tx,record),{code:'COMMISSION_PAYMENT_NOT_RECEIVED'})
 receipts=[{net:'100'}];await validateCommission(tx,record)
 tx.bookingCommissionClaim.findUnique=async()=>({recordId:id(4)});await assert.rejects(validateCommission(tx,record),{code:'COMMISSION_ALREADY_CLAIMED'})
})
test('notifications protect unrelated bookings and confidential payroll',async()=>{
 const actor={id:id(1),status:'ACTIVE',roles:[{roleCode:'BOOKING',scope:'SELF'}]},event={id:id(2),targetId:id(3),action:'operations.booking.confirmed',createdAt:new Date()}
 const tx={tourBooking:{findUnique:async()=>({createdById:id(4)})},financePersonnelRecord:{findUnique:async()=>({kind:'PAYROLL',createdBy:id(1),employeeId:id(1)})}}
 assert.equal(await notificationFor(tx,actor,event),null)
 tx.tourBooking.findUnique=async()=>({createdById:id(1)});assert.equal((await notificationFor(tx,actor,event)).href,'/operations/bookings?bookingId='+id(3))
 assert.equal(await notificationFor(tx,actor,{...event,action:'personnelFinance.PAY'}),null)
})
test('personal LINE fails closed before transport without explicit matching gates',async()=>{
 let calls=0
 for(const mode of ['test','live'])await assert.rejects(deliverPersonalNotification({}, {eventId:id(1),userId:id(2),mode,transport:async()=>{calls++}}),{code:'LINE_DELIVERY_DISABLED'})
 assert.equal(calls,0)
})

test('planned Agent refunds replace held-margin forecast and external payment counts once',()=>{
 const base={today:'2026-09-28',receipts:[{id:'receipt',bookingId:'booking',net:'2300',margin:'1200',refunded:'0',receivedOn:'2026-09-28'}],expenses:[{id:'refund',kind:'AGENT_REFUND',title:'Return margin',status:'APPROVED',payload:{receiptId:'receipt',amount:'1200',plannedPaymentOn:'2026-10-01'}}]}
 const planned=summarizeCash(base);assert.equal(planned.forecast.rows.length,1);assert.equal(planned.forecast.approvedOutgoingCents,120000)
 base.receipts[0].refunded='1200';base.expenses[0].status='PAID';base.expenses[0].payment={amountCents:120000,paidOn:'2026-09-28'}
 const paid=summarizeCash(base);assert.equal(paid.forecast.rows.length,0);assert.equal(paid.actual.outgoing.AGENT_REFUND,120000)
})
test('personal LINE simulation never invokes provider transport',async()=>{
 let calls=0
 const actor={id:id(2),status:'ACTIVE',roles:[{roleCode:'ACCOUNT',scope:'COMPANY'}]}
 const db={userProfile:{findUnique:async()=>actor},auditEvent:{findUnique:async()=>({id:id(1),targetId:id(3),action:'receivable.PAY',createdAt:new Date()})}}
 const result=await deliverPersonalNotification(db,{eventId:id(1),userId:id(2),mode:'simulation',env:{PERSONAL_LINE_VERIFIED_RECIPIENTS:JSON.stringify({[id(2)]:'U'+'1'.repeat(32)}),OPERATIONS_PUBLIC_BASE_URL:'https://backoffice.example.test'},transport:async()=>{calls++;throw new Error('must not send')}})
 assert.equal(result.status,'SIMULATED');assert.equal(calls,0)
})
