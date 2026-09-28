import {bookingQuote} from '../../../../packages/contracts/booking-plan.js'
import {bookingReceived} from '../receivables/collections.js'
import {cents} from '../../../../packages/contracts/personnel-finance.js'
import {fail,uuid} from '../operations/common.js'
export async function validateAgentRefund(tx,record){
 const receipt=await tx.bookingReceipt.findUnique({where:{id:uuid(record.payload.receiptId)}})
 if(!receipt?.agentId)fail('AGENT_RECEIPT_REQUIRED')
 const offsets=await tx.agentMarginOffset.findMany({where:{receiptId:receipt.id}})
 const available=cents(String(receipt.margin))-cents(String(receipt.refunded))-offsets.reduce((n,row)=>n+cents(String(row.amount)),0)
 if(available<=0||available!==cents(record.payload.amount))fail('REFUND_BALANCE_CHANGED')
 const bills=await tx.agentBill.findMany({where:{agentId:receipt.agentId,status:'OPEN'},select:{total:true,paid:true}})
 if(bills.some(b=>cents(String(b.total))>cents(String(b.paid))))fail('AGENT_DEBT_REQUIRES_OFFSET')
 const bookings=await tx.tourBooking.findMany({where:{agentId:receipt.agentId,status:'COMPLETED',paymentTerms:'AGENT_CREDIT',billLine:null},include:{lines:true}})
 for(const booking of bookings){const total=bookingQuote(booking).total;if(total===null||cents(total)>await bookingReceived(tx,booking))fail('AGENT_DEBT_REQUIRES_OFFSET')}
 const claim=await tx.agentRefundClaim.findUnique({where:{receiptId:receipt.id}})
 if(claim&&claim.recordId!==record.id)fail('REFUND_ALREADY_CLAIMED')
 return receipt
}
