import {getBookingPriceReview} from '../../modules/operations/bookings.js'
// Synthetic smoke checks explicitly accept the price they just read.
export async function confirmationInput(db,actorId,bookingId){
 const {review}=await getBookingPriceReview(db,actorId,bookingId)
 return {confirmed:true,choice:'KEEP_STORED',reviewToken:review.reviewToken,serviceDate:review.serviceDate}
}
