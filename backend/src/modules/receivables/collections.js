import {randomUUID} from 'node:crypto'
import {bookingQuote} from '../../../../packages/contracts/booking-plan.js'
import {cents} from '../../../../packages/contracts/personnel-finance.js'
import {agentCollection} from '../../../../packages/contracts/agent-billing.js'
import {dateOnly,fail,hash,int,keys,string,uuid} from '../operations/common.js'
import {receivableAccess} from './service.js'
const money=n=>(n/100).toFixed(2)
export async function bookingReceived(tx,booking){
 const receipts=await tx.bookingReceipt.findMany({where:{bookingId:booking.id}})
 const offsets=await tx.agentMarginOffset.findMany({where:{bookingId:booking.id}})
 return receipts.reduce((n,r)=>n+cents(String(r.net)),0)+offsets.reduce((n,r)=>n+cents(String(r.amount)),0)
}
// One verified collection per command. Shared finance lock serializes billing,
// receiving and offsets; an offset never creates an AgentPayment cash movement.
export async function recordBookingCollection(prisma,actorId,input){
 keys(input,['id','bookingId','version','payer','basis','received','receivedOn','reference']);uuid(input.id);uuid(input.bookingId);int(input.version)
 const fingerprint=hash(input)
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  await receivableAccess(tx,actorId)
  const prior=await tx.financePersonnelCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.actorId!==actorId||prior.requestHash!==fingerprint)fail('COMMAND_CONFLICT');return prior.result}
  const booking=await tx.tourBooking.findUnique({where:{id:input.bookingId},include:{lines:true,billLine:{include:{bill:true}}}})
  if(!booking||booking.version!==input.version)fail('RECORD_CONFLICT')
  if(!['CONFIRMED','COMPLETED'].includes(booking.status))fail('BOOKING_NOT_COLLECTIBLE')
  if(await tx.customerRequest.findFirst({where:{bookingId:booking.id},select:{id:true}}))fail('RECORD_PAYMENT_ON_CUSTOMER_REQUEST')
  const bill=booking.billLine?.bill
  if(bill&&bill.status!=='OPEN')fail('BOOKING_ALREADY_PAID')
  if(!['CUSTOMER','AGENT'].includes(input.payer)||input.payer==='AGENT'&&!booking.agentId||input.basis==='FULL'&&!booking.agentId)fail('INVALID_PAYER',400)
  if(await tx.bookingAttendance.count({where:{bookingId:booking.id,financeStatus:{notIn:['NONE','RETAIN_CHARGES']}}}))fail('NO_SHOW_FINANCE_REVIEW_REQUIRED')
  const quote=bookingQuote(booking).total;if(quote===null)fail('PRICE_NOT_CONFIGURED')
  let remaining=cents(quote)-await bookingReceived(tx,booking)
  if(bill){
   const line=bill.snapshot.find(line=>line.bookingId===booking.id);if(!line)fail('STATEMENT_ALLOCATION_REQUIRED')
   const allocations=await Promise.all(bill.snapshot.map(async line=>({id:line.bookingId,amount:Math.max(0,await bookingReceived(tx,{id:line.bookingId})-cents(line.previouslySettled||'0'))})))
   const known=allocations.reduce((n,line)=>n+line.amount,0),paid=cents(String(bill.paid))
   if(bill.snapshot.length>1&&paid!==known)fail('STATEMENT_ALLOCATION_REQUIRED')
   remaining=cents(line.total)-(bill.snapshot.length===1?paid:allocations.find(row=>row.id===booking.id).amount)
  }
  if(remaining<=0||booking.paymentTerms==='PAID')fail('BOOKING_ALREADY_PAID')
  let split;try{split=agentCollection({net:money(remaining),received:input.received,basis:input.basis})}catch{fail('INVALID_AGENT_COLLECTION',400)}
  const receivedOn=dateOnly(input.receivedOn)
  if(input.receivedOn>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}))fail('PAYMENT_DATE_IN_FUTURE',400)
  const receipt=await tx.bookingReceipt.create({data:{id:input.id,bookingId:booking.id,agentId:booking.agentId,payer:input.payer,basis:input.basis,received:money(split.receivedCents),net:money(split.netCents),margin:money(split.marginCents),receivedOn,reference:string(input.reference,300),recordedBy:actorId}})
  if(bill){const paid=cents(String(bill.paid))+split.netCents,total=cents(String(bill.total));if(paid>total)fail('PAYMENT_EXCEEDS_BALANCE');await tx.agentBill.update({where:{id:bill.id},data:{paid:money(paid),status:paid===total?'PAID':'OPEN',version:{increment:1}}})}
  const margin=await applyHeldMargin(tx,actorId,receipt)
  await tx.tourBooking.update({where:{id:booking.id},data:{version:{increment:1}}})
  await tx.auditEvent.create({data:{actorId,targetId:booking.id,action:'receivable.COLLECT',details:{receiptId:receipt.id,offset:money(split.marginCents-margin),refundable:money(margin)}}})
  const result={receipt:JSON.parse(JSON.stringify(receipt)),offset:money(split.marginCents-margin),refundable:money(margin)}
  await tx.financePersonnelCommand.create({data:{id:input.id,actorId,requestHash:fingerprint,result}})
  return result
 },{maxWait:15000,timeout:30000})
}

export async function applyHeldMargin(tx,actorId,receipt){
  const previous=await tx.agentMarginOffset.findMany({where:{receiptId:receipt.id}})
  let margin=cents(String(receipt.margin))-cents(String(receipt.refunded||0))-previous.reduce((n,row)=>n+cents(String(row.amount)),0)
  if(margin){
   const bills=await tx.agentBill.findMany({where:{agentId:receipt.agentId,status:'OPEN'},orderBy:[{dueOn:'asc'},{id:'asc'}]})
   for(const bill of bills){
    const outstanding=cents(String(bill.total))-cents(String(bill.paid)),offset=Math.min(margin,outstanding)
    if(offset<=0)continue
    await tx.agentMarginOffset.create({data:{id:randomUUID(),receiptId:receipt.id,billId:bill.id,amount:money(offset),recordedBy:actorId}})
    await tx.agentBill.update({where:{id:bill.id},data:{paid:money(cents(String(bill.paid))+offset),status:offset===outstanding?'PAID':'OPEN',version:{increment:1}}})
    margin-=offset;if(!margin)break
   }
   if(margin){
    const unbilled=await tx.tourBooking.findMany({where:{agentId:receipt.agentId,id:{not:receipt.bookingId},status:'COMPLETED',paymentTerms:'AGENT_CREDIT',billLine:null,attendance:{none:{financeStatus:{notIn:['NONE','RETAIN_CHARGES']}}}},include:{lines:true},orderBy:[{createdAt:'asc'},{id:'asc'}]})
    for(const other of unbilled){
     const total=bookingQuote(other).total;if(total===null)continue
     const outstanding=cents(total)-await bookingReceived(tx,other),offset=Math.min(margin,outstanding)
     if(offset<=0)continue
     await tx.agentMarginOffset.create({data:{id:randomUUID(),receiptId:receipt.id,bookingId:other.id,amount:money(offset),recordedBy:actorId}})
     margin-=offset;if(!margin)break
    }
   }
  }
  return margin
}

export async function reconcileAgentMargin(prisma,actorId,input){
 keys(input,['id','receiptId']);uuid(input.id);uuid(input.receiptId);const fingerprint=hash(input)
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  await receivableAccess(tx,actorId)
  const prior=await tx.financePersonnelCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.actorId!==actorId||prior.requestHash!==fingerprint)fail('COMMAND_CONFLICT');return prior.result}
  const receipt=await tx.bookingReceipt.findUnique({where:{id:input.receiptId}})
  if(!receipt?.agentId)fail('AGENT_RECEIPT_REQUIRED')
  if(await tx.agentRefundClaim.findUnique({where:{receiptId:receipt.id}}))fail('REFUND_ALREADY_CLAIMED')
  const remaining=await applyHeldMargin(tx,actorId,receipt),result={refundable:money(remaining)}
  await tx.auditEvent.create({data:{actorId,targetId:receipt.bookingId,action:'receivable.OFFSET',details:{receiptId:receipt.id,remaining:result.refundable}}})
  await tx.financePersonnelCommand.create({data:{id:input.id,actorId,requestHash:fingerprint,result}})
  return result
 },{maxWait:15000,timeout:30000})
}
