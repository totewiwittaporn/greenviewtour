import test from 'node:test'
import assert from 'node:assert/strict'
import {bookingPriceReview,planBookingPriceConfirmation} from '../src/modules/operations/booking-confirmation-price.js'
const id=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const actor=id(8),commandId=id(9),now=new Date('2026-10-05T12:00:00Z')
function fixture(){
 const booking={id:id(1),version:4,status:'DRAFT',outboundDate:new Date('2026-11-10'),agentId:id(2),adults:2,children:1,adultPrice:'1000.10',childPrice:'500.20',paymentTerms:'PREPAID',deposit:'1000.00',commissionSnapshot:{amount:'50.00'},lines:[{id:id(7),selected:true,included:false,unitPrice:'100.00',quantity:1}],programSnapshot:{tourId:id(3),priceSource:{kind:'AGENT',rateId:id(4),rateVersion:1,agreementId:id(5),revisionId:id(6)},priceConfirmations:[]}}
 const rate={id:id(4),version:2,revisionId:id(10),agentId:id(2),tourId:id(3),agreementId:id(5),seasonId:null,adultPrice:'1200.10',childPrice:'600.20'}
 return {booking,resolution:{status:'AVAILABLE',rate}}
}
function input(review,choice='KEEP_STORED'){return {commandId,version:review.bookingVersion,confirmation:{confirmed:true,choice,serviceDate:review.serviceDate,reviewToken:review.reviewToken}}}
test('no new rate still requires explicit confirmation and keeps the actual stored price',()=>{
 const {booking}=fixture(),resolution={status:'NONE'},review=bookingPriceReview(booking,resolution)
 assert.equal(review.requiresConfirmation,true);assert.equal(review.defaultChoice,'KEEP_STORED');assert.equal(review.canUseNew,false)
 assert.equal(review.stored.total,'2600.40');assert.equal(review.latest,null)
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,{commandId,version:4},actor),{code:'PRICE_CONFIRMATION_REQUIRED'})
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,input(review,'USE_NEW'),actor),{code:'NEW_PRICE_UNAVAILABLE'})
 const result=planBookingPriceConfirmation(booking,resolution,input(review),actor,now)
 assert.equal(result.patch.adultPrice,'1000.10');assert.equal(result.decision.actorId,actor)
 assert.equal(result.decision.confirmedAt,now.toISOString());assert.equal(result.decision.choice,'KEEP_STORED')
})
test('unchanged amount and zero delta never bypass confirmation',()=>{
 const {booking,resolution}=fixture();Object.assign(resolution.rate,{adultPrice:booking.adultPrice,childPrice:booking.childPrice})
 const review=bookingPriceReview(booking,resolution)
 assert.equal(review.delta,'0.00');assert.equal(review.requiresConfirmation,true)
 const request=input(review);request.confirmation.confirmed=false
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,request,actor),{code:'PRICE_CONFIRMATION_REQUIRED'})
 assert.equal(planBookingPriceConfirmation(booking,resolution,input(review),actor,now).decision.choice,'KEEP_STORED')
})
test('changed rate defaults to stored; explicit new rate produces an audited snapshot without altering money received',()=>{
 const {booking,resolution}=fixture(),before=structuredClone(booking),review=bookingPriceReview(booking,resolution)
 assert.equal(review.delta,'500.00');assert.equal(review.defaultChoice,'KEEP_STORED')
 const keep=planBookingPriceConfirmation(booking,resolution,input(review),actor,now)
 assert.equal(keep.patch.adultPrice,booking.adultPrice)
 const use=planBookingPriceConfirmation(booking,resolution,input(review,'USE_NEW'),actor,now)
 assert.equal(use.patch.adultPrice,'1200.10');assert.equal(use.decision.selected.total,'3100.40')
 assert.equal(use.decision.stored.source.revisionId,id(6));assert.equal(use.decision.selected.source.revisionId,id(10))
 assert.deepEqual(Object.keys(use.patch).sort(),['adultPrice','childPrice','programSnapshot'])
 assert.deepEqual(booking,before)
})
test('lower newer prices show a negative delta, without creating refunds or rewriting deposits',()=>{
 const {booking,resolution}=fixture();Object.assign(resolution.rate,{adultPrice:'900.00',childPrice:'400.00'})
 const review=bookingPriceReview(booking,resolution),result=planBookingPriceConfirmation(booking,resolution,input(review,'USE_NEW'),actor,now)
 assert.equal(review.delta,'-300.40');assert.equal(result.decision.selected.total,'2300.00')
 assert.equal(result.patch.deposit,undefined);assert.equal(result.patch.commissionSnapshot,undefined)
})
test('missing new price never falls back to direct or zero; explicit zero is valid',()=>{
 const {booking,resolution}=fixture();resolution.rate.adultPrice=null
 let review=bookingPriceReview(booking,resolution)
 assert.equal(review.latest.adultPrice,null);assert.equal(review.latest.total,null);assert.equal(review.canUseNew,false)
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,input(review,'USE_NEW'),actor),{code:'NEW_PRICE_UNAVAILABLE'})
 resolution.rate.adultPrice='0';resolution.rate.childPrice='0';review=bookingPriceReview(booking,resolution)
 assert.equal(review.canUseNew,true);assert.equal(review.latest.total,'100.00')
 booking.adultPrice=null;review=bookingPriceReview(booking,{status:'NONE'})
 assert.throws(()=>planBookingPriceConfirmation(booking,{status:'NONE'},input(review),actor),{code:'PRICE_REQUIRED'})
})
test('stale booking, rate revision, same-total price distribution and tampered token are rejected',()=>{
 const {booking,resolution}=fixture(),review=bookingPriceReview(booking,resolution),request=input(review)
 assert.throws(()=>planBookingPriceConfirmation({...booking,version:5},resolution,request,actor),{code:'SETTINGS_CONFLICT'})
 assert.throws(()=>planBookingPriceConfirmation(booking,{...resolution,rate:{...resolution.rate,version:3}},request,actor),{code:'PRICE_REVIEW_STALE'})
 assert.throws(()=>planBookingPriceConfirmation({...booking,adultPrice:'1100.10',childPrice:'300.20'},resolution,request,actor),{code:'PRICE_REVIEW_STALE'})
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,{...request,confirmation:{...request.confirmation,reviewToken:'forged'}},actor),{code:'PRICE_REVIEW_STALE'})
})
test('replayed click retains one decision and its first timestamp; changed choice with same command conflicts',()=>{
 const {booking,resolution}=fixture(),review=bookingPriceReview(booking,resolution),request=input(review)
 const first=planBookingPriceConfirmation(booking,resolution,request,actor,now)
 Object.assign(booking,first.patch,{status:'CONFIRMED',version:5})
 const replay=planBookingPriceConfirmation(booking,resolution,request,actor,new Date('2026-10-06'))
 assert.equal(replay.replayed,true);assert.equal(replay.patch,null);assert.deepEqual(replay.decision,first.decision)
 assert.equal(booking.programSnapshot.priceConfirmations.length,1)
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,{...request,confirmation:{...request.confirmation,choice:'USE_NEW'}},actor),{code:'COMMAND_CONFLICT'})
})
test('unresolved season policy cannot masquerade as no-new-rate; cross-agent candidates cannot be used',()=>{
 const {booking,resolution}=fixture()
 assert.throws(()=>bookingPriceReview(booking),{code:'PRICE_RESOLUTION_REQUIRED'})
 assert.throws(()=>bookingPriceReview(booking,{status:'UNRESOLVED'}),{code:'PRICE_RESOLUTION_REQUIRED'})
 assert.throws(()=>bookingPriceReview(booking,{...resolution,rate:{...resolution.rate,agentId:id(99)}}),{code:'INVALID_PRICE_REVISION'})
})
test('negotiated price approval cannot be bypassed by selecting a catalog revision',()=>{
 const {booking,resolution}=fixture();booking.programSnapshot.priceException={status:'PENDING'}
 const review=bookingPriceReview(booking,resolution)
 assert.equal(review.canUseNew,false)
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,input(review,'USE_NEW'),actor),{code:'NEW_PRICE_UNAVAILABLE'})
})

test('confirmation requires the actual service date and rejects changing it without re-reviewing the booking',()=>{
 const {booking,resolution}=fixture(),review=bookingPriceReview(booking,resolution),request=input(review)
 assert.equal(review.serviceDate,'2026-11-10')
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,{...request,confirmation:{...request.confirmation,serviceDate:null}},actor),{code:'SERVICE_DATE_REQUIRED'})
 assert.throws(()=>planBookingPriceConfirmation(booking,resolution,{...request,confirmation:{...request.confirmation,serviceDate:'2026-11-11'}},actor),{code:'SERVICE_DATE_REVIEW_REQUIRED'})
 assert.equal(planBookingPriceConfirmation(booking,resolution,request,actor).decision.serviceDate,'2026-11-10')
})
