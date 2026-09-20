import {billDocument,billSignatures,signBill} from './signatures.js'
import {effectiveAccess} from '../../../../packages/contracts/access.js'
import {bookingQuote} from '../../../../packages/contracts/booking-plan.js'
import {cents} from '../../../../packages/contracts/personnel-finance.js'
import {profileInclude} from '../identity-access/policy.js'
import {fail,uuid,keys,string,hash,dateOnly,int} from '../operations/common.js'
const amount=n=>(n/100).toFixed(2)
export async function receivableAccess(tx,actorId){
 const actor=await tx.userProfile.findUnique({where:{id:uuid(actorId)},include:profileInclude})
 if(!effectiveAccess(actor,'finance.receive').allowed)fail('PERMISSION_DENIED',403)
}
export function positiveAmount(value){let n;try{n=cents(value)}catch{fail('INVALID_AMOUNT',400)}if(n<=0)fail('INVALID_AMOUNT',400);return n}
export async function listReceivables(prisma,actorId,params){
 await receivableAccess(prisma,actorId)
 const requested=Number(params.get('page')||1);int(requested,1,10000)
 if(params.get('id')){
  const row=await prisma.agentBill.findUnique({where:{id:uuid(params.get('id'))}});if(!row)fail('NOT_FOUND',404)
  const total=await prisma.agentPayment.count({where:{billId:row.id}}),page=Math.min(requested,Math.max(1,Math.ceil(total/25)))
  const payments=await prisma.agentPayment.findMany({where:{billId:row.id},orderBy:[{createdAt:'desc'},{id:'asc'}],take:25,skip:(page-1)*25})
  return {row,payments,total,page,documentHash:hash(billDocument(row)),signatures:await billSignatures(prisma,row.id)}
 }
 const q=string(params.get('q')||'',100,false),eligible=params.get('eligible')==='true'
 if(eligible){
  const where={status:'COMPLETED',paymentTerms:'AGENT_CREDIT',agentId:{not:null},...(q?{OR:[{code:{contains:q,mode:'insensitive'}},{agentName:{contains:q,mode:'insensitive'}}]}:{})}
  where.billLine=null
  where.attendance={none:{financeStatus:{notIn:['NONE','RETAIN_CHARGES']}}}
  const total=await prisma.tourBooking.count({where}),page=Math.min(requested,Math.max(1,Math.ceil(total/25)))
  const rows=await prisma.tourBooking.findMany({where,include:{lines:true},orderBy:[{createdAt:'desc'},{id:'asc'}],take:25,skip:(page-1)*25})
  return {rows:rows.map(row=>({id:row.id,code:row.code,agentId:row.agentId,agentName:row.agentName,name:row.name,total:bookingQuote(row).total})),total,page}
 }
 const where=q?{OR:[{title:{contains:q,mode:'insensitive'}},{agentName:{contains:q,mode:'insensitive'}}]}:{}
 const total=await prisma.agentBill.count({where}),page=Math.min(requested,Math.max(1,Math.ceil(total/25)))
 const rows=await prisma.agentBill.findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],take:25,skip:(page-1)*25})
 return {rows,total,page}
}
export async function commandReceivable(prisma,actorId,input){
 keys(input,['id','action','billId','version','title','bookingIds','dueOn','amount','receivedOn','reference','reason','side','signerName','strokes','documentHash']);uuid(input.id)
 if(!['CREATE','PAY','VOID','SIGN'].includes(input.action))fail('INVALID_INPUT',400)
 const requestHash=hash(input)
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  await receivableAccess(tx,actorId)
  const prior=await tx.financePersonnelCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.actorId!==actorId||prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  let row
  if(input.action==='CREATE'){
   if(!Array.isArray(input.bookingIds)||!input.bookingIds.length||input.bookingIds.length>50||new Set(input.bookingIds).size!==input.bookingIds.length)fail('INVALID_INPUT',400)
   input.bookingIds.forEach(uuid)
   const bookings=await tx.tourBooking.findMany({where:{id:{in:input.bookingIds}},include:{lines:true,agent:true}})
   if(bookings.length!==input.bookingIds.length||bookings.some(b=>b.status!=='COMPLETED'||b.paymentTerms!=='AGENT_CREDIT'||!b.agentId)||new Set(bookings.map(b=>b.agentId)).size!==1)fail('BOOKINGS_NOT_BILLABLE')
   if(await tx.bookingAttendance.count({where:{bookingId:{in:input.bookingIds},financeStatus:{notIn:['NONE','RETAIN_CHARGES']}}}))fail('NO_SHOW_FINANCE_REVIEW_REQUIRED')
   if(await tx.agentBillLine.count({where:{bookingId:{in:input.bookingIds}}}))fail('BOOKINGS_ALREADY_BILLED')
   const snapshot=bookings.map(b=>({bookingId:b.id,code:b.code,name:b.name,version:b.version,total:bookingQuote(b).total}))
   const total=snapshot.reduce((n,b)=>n+positiveAmount(b.total),0);if(total>999999999999||!Number.isSafeInteger(total))fail('INVALID_AMOUNT',400)
   row=await tx.agentBill.create({data:{id:input.id,title:string(input.title,160),agentId:bookings[0].agentId,agentName:bookings[0].agent.name,total:amount(total),dueOn:dateOnly(input.dueOn),snapshot,createdBy:actorId,lines:{create:input.bookingIds.map(bookingId=>({bookingId}))}}})
  }else{
   uuid(input.billId);int(input.version)
   const old=await tx.agentBill.findUnique({where:{id:input.billId}});if(!old)fail('NOT_FOUND',404)
   if(old.version!==input.version||(input.action==='SIGN'?old.status==='VOID':old.status!=='OPEN'))fail('RECORD_CONFLICT')
   if(input.action==='SIGN'){
    await signBill(tx,actorId,old,input)
    row=await tx.agentBill.update({where:{id:old.id},data:{version:{increment:1}}})
   }else if(input.action==='VOID'){
    if(cents(String(old.paid))!==0)fail('PAID_BILL_CANNOT_VOID')
    string(input.reason,1000)
    row=await tx.agentBill.update({where:{id:old.id},data:{status:'VOID',version:{increment:1}}})
    await tx.agentBillLine.deleteMany({where:{billId:old.id}})
   }else{
    const value=positiveAmount(input.amount),paid=cents(String(old.paid))+value,total=cents(String(old.total))
    if(paid>total)fail('PAYMENT_EXCEEDS_BALANCE')
    const receivedOn=dateOnly(input.receivedOn)
    if(input.receivedOn>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}))fail('PAYMENT_DATE_IN_FUTURE',400)
    await tx.agentPayment.create({data:{id:input.id,billId:old.id,amount:amount(value),receivedOn,reference:string(input.reference,300),recordedBy:actorId}})
    row=await tx.agentBill.update({where:{id:old.id},data:{paid:amount(paid),status:paid===total?'PAID':'OPEN',version:{increment:1}}})
   }
  }
  if(input.action!=='SIGN')await tx.auditEvent.create({data:{actorId,targetId:row.id,action:'receivable.'+input.action,details:{commandId:input.id,version:row.version,...(input.action==='VOID'?{reason:input.reason}:{})}}})
  const result=JSON.parse(JSON.stringify({row}));await tx.financePersonnelCommand.create({data:{id:input.id,actorId,requestHash,result}});return result
 },{maxWait:15000,timeout:30000})
}
