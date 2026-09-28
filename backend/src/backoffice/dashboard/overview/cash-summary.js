import {effectiveAccess} from '../../../../../packages/contracts/access.js'
import {financialTotal,cents} from '../../../../../packages/contracts/personnel-finance.js'
import {bookingQuote} from '../../../../../packages/contracts/booking-plan.js'
import {billingCycleClose,billingDueDate} from '../../../../../packages/contracts/agent-billing.js'
import {dateOnly} from '../../../modules/operations/common.js'
const day=value=>value?new Date(value).toISOString().slice(0,10):null
export function summarizeCash({today,receipts=[],payments=[],expenses=[],bills=[],bookings=[],offsets=[],memberPayments=[]}){
 const through=new Date(+dateOnly(today)+29*86400000).toISOString().slice(0,10),from=today.slice(0,8)+'01'
 const actual={from,through:today,incoming:{},outgoing:{}},forecast=[]
 const add=(direction,category,amount,date)=>{if(date>=from&&date<=today)actual[direction][category]=(actual[direction][category]||0)+amount}
 for(const row of receipts){add('incoming','GREENVIEW_NET',cents(String(row.net)),day(row.receivedOn));add('incoming','AGENT_MONEY_HELD',cents(String(row.margin)),day(row.receivedOn))}
 for(const row of payments)add('incoming','AGENT_BILL_PAYMENT',cents(String(row.amount)),day(row.receivedOn))
 for(const row of memberPayments)if(row.snapshot?.payment){const p=row.snapshot.payment;add('incoming','CUSTOMER_PAYMENT',cents(String(p.amount)),p.receivedOn)}
 for(const row of expenses){
  // Payment evidence survives advance clearance. Count it once; clearance is not a second payment.
  if(row.payment)add('outgoing',row.kind,row.payment.amountCents,row.payment.paidOn)
  if(['SUBMITTED','APPROVED'].includes(row.status))forecast.push({id:row.id,title:row.title,direction:'OUT',category:row.kind,amountCents:financialTotal(row.kind,row.payload),date:row.payload.plannedPaymentOn||null,status:row.status,href:'/company/'+({AGENT_REFUND:'agent-refunds',BOOKING_COMMISSION:'booking-commissions',PAYROLL:'payroll',ALLOWANCE:'allowances',REIMBURSEMENT:'expenses',WORK_ADVANCE:'advances',SALARY_ADVANCE:'salary-advances',SUPPLIER_PAYMENT:'supplier-payments'}[row.kind]||'expenses')})
 }
 for(const bill of bills){const amountCents=cents(String(bill.total))-cents(String(bill.paid));if(amountCents>0)forecast.push({id:bill.id,title:bill.title,direction:'IN',category:'BILLED',amountCents,date:day(bill.promisedOn||bill.dueOn),dueOn:day(bill.dueOn),originalDueOn:day(bill.originalDueOn||bill.dueOn),status:'OPEN',href:'/company/receivables'})}
 const received=new Map(),offsetByBooking=new Map(),offsetByReceipt=new Map()
 for(const r of receipts)received.set(r.bookingId,(received.get(r.bookingId)||0)+cents(String(r.net)))
 for(const r of offsets){if(r.bookingId)offsetByBooking.set(r.bookingId,(offsetByBooking.get(r.bookingId)||0)+cents(String(r.amount)));offsetByReceipt.set(r.receiptId,(offsetByReceipt.get(r.receiptId)||0)+cents(String(r.amount)))}
 for(const b of bookings){
  if(b.billLine||b.paymentTerms==='PAID')continue
  const total=bookingQuote(b).total;if(total===null){forecast.push({id:b.id,title:b.code,direction:'IN',category:'UNPRICED',amountCents:null,date:null,status:'NEEDS_REVIEW',href:'/operations/bookings?bookingId='+b.id});continue}
  const amountCents=cents(total)-(received.get(b.id)||0)-(offsetByBooking.get(b.id)||0);if(amountCents<=0)continue
  const agent=b.agent,serviceOn=day(b.outboundDate||b.returnDate),policy=agent?.billingMode?{mode:agent.billingMode,cycleCount:agent.billingCycleCount,cycleUnit:agent.billingCycleUnit,cycleAnchor:day(agent.billingCycleAnchor),creditCount:agent.creditCount,creditUnit:agent.creditUnit,creditAnchor:agent.creditAnchor}:null
  let date=null
  if(policy&&serviceOn){const cycleCloseOn=billingCycleClose(policy,serviceOn);date=policy.mode==='IMMEDIATE'?serviceOn:billingDueDate(policy,{cycleCloseOn})}
  forecast.push({id:b.id,title:b.code,direction:'IN',category:b.status==='COMPLETED'?'UNBILLED':'FUTURE_TRIP',amountCents,date,status:'ESTIMATE',href:'/operations/bookings?bookingId='+b.id})
 }
 const plannedRefunds=new Set(expenses.filter(row=>row.kind==='AGENT_REFUND'&&['SUBMITTED','APPROVED'].includes(row.status)).map(row=>row.payload.receiptId))
 for(const receipt of receipts){if(plannedRefunds.has(receipt.id))continue;const amountCents=cents(String(receipt.margin))-(offsetByReceipt.get(receipt.id)||0)-cents(String(receipt.refunded||0));if(amountCents>0)forecast.push({id:receipt.id,title:receipt.reference,direction:'OUT',category:'AGENT_REFUND',amountCents,date:null,status:'AWAITING_PLAN',href:'/company/agent-refunds'})}
 const rows=forecast.map(row=>({...row,timing:!row.date?'UNSCHEDULED':row.date<today?'OVERDUE':row.date<=through?'NEXT_30_DAYS':'LATER'}))
 return {actual,forecast:{from:today,through,rows,incomingCents:rows.filter(r=>r.direction==='IN'&&r.timing==='NEXT_30_DAYS').reduce((n,r)=>n+r.amountCents,0),approvedOutgoingCents:rows.filter(r=>r.direction==='OUT'&&r.status==='APPROVED'&&r.timing==='NEXT_30_DAYS').reduce((n,r)=>n+r.amountCents,0)},balanceAvailable:false}
}
export async function cashSummary(tx,actor,today){
 if(!effectiveAccess(actor,'finance.receive').allowed||!effectiveAccess(actor,'expenses.view').allowed)return null
 const kinds=['AGENT_REFUND','BOOKING_COMMISSION','ALLOWANCE','REIMBURSEMENT','WORK_ADVANCE','SUPPLIER_PAYMENT',...(effectiveAccess(actor,'payroll.view').allowed?['PAYROLL','SALARY_ADVANCE']:[])]
 const from=dateOnly(today.slice(0,8)+'01'),through=dateOnly(today),fromDay=today.slice(0,8)+'01'
 const [payments,expenses,bills,bookings,memberPayments]=await Promise.all([
  tx.agentPayment.findMany({where:{receivedOn:{gte:from,lte:through}},select:{amount:true,receivedOn:true}}),
  tx.financePersonnelRecord.findMany({where:{kind:{in:kinds},OR:[{status:{in:['SUBMITTED','APPROVED']}},{status:{in:['PAID','CLEARANCE_SUBMITTED','CLEARED']},payment:{path:['paidOn'],gte:fromDay}}]},select:{id:true,kind:true,title:true,status:true,payload:true,payment:true}}),
  tx.agentBill.findMany({where:{status:'OPEN'},select:{id:true,title:true,total:true,paid:true,dueOn:true,originalDueOn:true,promisedOn:true}}),
  tx.tourBooking.findMany({where:{status:{in:['CONFIRMED','COMPLETED']},paymentTerms:{not:'PAID'},billLine:null,attendance:{none:{financeStatus:{notIn:['NONE','RETAIN_CHARGES']}}}},select:{id:true,code:true,status:true,paymentTerms:true,outboundDate:true,returnDate:true,adults:true,children:true,adultPrice:true,childPrice:true,lines:{select:{selected:true,included:true,quantity:true,unitPrice:true,snapshot:true}},agent:{select:{billingMode:true,billingCycleCount:true,billingCycleUnit:true,billingCycleAnchor:true,creditCount:true,creditUnit:true,creditAnchor:true}}}}),
  tx.customerRequest.findMany({where:{status:'PAID',snapshot:{path:['payment','receivedOn'],gte:fromDay}},select:{snapshot:true}})
 ])
 const bookingIds=bookings.map(row=>row.id)
 const receipts=await tx.bookingReceipt.findMany({where:{OR:[{receivedOn:{gte:from,lte:through}},{margin:{gt:0}},...(bookingIds.length?[{bookingId:{in:bookingIds}}]:[])]},select:{id:true,bookingId:true,net:true,margin:true,refunded:true,receivedOn:true,reference:true}})
 const receiptIds=receipts.map(row=>row.id)
 const offsets=receiptIds.length||bookingIds.length?await tx.agentMarginOffset.findMany({where:{OR:[...(receiptIds.length?[{receiptId:{in:receiptIds}}]:[]),...(bookingIds.length?[{bookingId:{in:bookingIds}}]:[])]},select:{receiptId:true,bookingId:true,amount:true}}):[]
 return {...summarizeCash({today,receipts,payments,expenses,bills,bookings,offsets,memberPayments}),payrollIncluded:effectiveAccess(actor,'payroll.view').allowed}
}
