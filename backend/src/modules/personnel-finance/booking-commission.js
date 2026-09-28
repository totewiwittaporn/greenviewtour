import {bookingQuote} from '../../../../packages/contracts/booking-plan.js'
import {cents} from '../../../../packages/contracts/personnel-finance.js'
import {bookingReceived} from '../receivables/collections.js'
import {fail,uuid} from '../operations/common.js'
export async function validateCommission(tx,record){
 const booking=await tx.tourBooking.findUnique({where:{id:uuid(record.payload.bookingId)},include:{lines:true,billLine:{include:{bill:true}}}})
 if(!booking||booking.status!=='COMPLETED')fail('COMMISSION_TRIP_NOT_COMPLETED')
 const snapshot=booking.commissionSnapshot
 if(!snapshot?.eligible||snapshot.amount==null||snapshot.beneficiaryId!==record.employeeId||cents(snapshot.amount)<=0||cents(snapshot.amount)!==cents(record.payload.amount))fail('COMMISSION_SNAPSHOT_MISMATCH')
 if(await tx.bookingAttendance.count({where:{bookingId:booking.id,financeStatus:{notIn:['NONE','RETAIN_CHARGES']}}}))fail('NO_SHOW_FINANCE_REVIEW_REQUIRED')
 const total=bookingQuote(booking).total;if(total===null)fail('COMMISSION_PAYMENT_NOT_RECEIVED')
 let received=await bookingReceived(tx,booking)
 if(booking.billLine?.bill?.status==='PAID')received=cents(total)
 if(received<cents(total)){
  const request=await tx.customerRequest.findFirst({where:{bookingId:booking.id,status:'PAID'}})
  if(request?.snapshot?.payment)received+=cents(request.snapshot.payment.amount)
 }
 if(received<cents(total))fail('COMMISSION_PAYMENT_NOT_RECEIVED')
 const claimed=await tx.bookingCommissionClaim.findUnique({where:{bookingId:booking.id}})
 if(claimed&&claimed.recordId!==record.id)fail('COMMISSION_ALREADY_CLAIMED')
 return booking
}
