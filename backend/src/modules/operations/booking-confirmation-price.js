import {localStamp} from '../../../../packages/contracts/operations.js'
import {bookingQuote} from '../../../../packages/contracts/booking-plan.js'
import {fail,hash,int,keys,uuid} from './common.js'

// The caller supplies a server-resolved candidate inside the booking write unit.
// This module deliberately does not select a season or reinterpret agreement dates.
const money=value=>value==null?null:String(value)
function cents(value){const [whole,fraction='']=value.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))}
function delta(before,after){
 if(before==null||after==null)return null
 const value=cents(after)-cents(before),absolute=value<0n?-value:value
 return `${value<0n?'-':''}${absolute/100n}.${String(absolute%100n).padStart(2,'0')}`
}
function prices(booking,values,source){
 const adultPrice=money(values.adultPrice),childPrice=money(values.childPrice)
 return {adultPrice,childPrice,total:bookingQuote({...booking,adultPrice,childPrice}).total,source:structuredClone(source??null)}
}
export function bookingPriceReview(booking,resolution){
 if(!resolution||!['NONE','AVAILABLE'].includes(resolution.status))fail('PRICE_RESOLUTION_REQUIRED')
 const stored=prices(booking,booking,booking.programSnapshot?.priceSource)
 let latest=null
 if(resolution.status==='AVAILABLE'){
  const rate=resolution.rate
  if(!rate||!booking.agentId||rate.agentId!==booking.agentId||rate.tourId!==booking.programSnapshot?.tourId||!rate.id||!rate.revisionId||!Number.isInteger(rate.version)||rate.version<1)fail('INVALID_PRICE_REVISION')
  latest=prices(booking,rate,{kind:'AGENT',pricingBasis:'BOOKING_DATE',agentId:rate.agentId,rateId:rate.id,rateVersion:rate.version,revisionId:rate.revisionId,agreementId:rate.agreementId??null,agreementCode:rate.agreementCode??null,seasonId:rate.seasonId??null})
 }
 const dated=booking.outboundDate||booking.returnDate
 const serviceDate=dated?new Date(dated).toISOString().slice(0,10):localStamp(booking.trip?.startsAt).slice(0,10)||null
 const review={serviceDate,bookingId:booking.id,bookingVersion:booking.version,stored,latest,delta:delta(stored.total,latest?.total??null),latestStatus:resolution.status,defaultChoice:'KEEP_STORED',requiresConfirmation:true,canUseNew:Boolean(latest&&latest.total!==null&&!booking.programSnapshot?.priceException)}
 // Bind the exact commercial context, not just the net total: equal totals can
 // hide changed passenger counts, service prices or source revisions.
 return {...review,reviewToken:hash({review,adults:booking.adults,children:booking.children,lines:booking.lines,paymentTerms:booking.paymentTerms,priceException:booking.programSnapshot?.priceException??null})}
}

// Returns a write plan, not a separate booking mutation. The booking-status
// transaction must persist this patch, audit and its OperationCommand atomically.
export function planBookingPriceConfirmation(booking,resolution,input,actorId,now=new Date()){
 keys(input,['commandId','version','confirmation'])
 uuid(input.commandId);uuid(actorId);int(input.version)
 const selection=input.confirmation
 if(!selection)fail('PRICE_CONFIRMATION_REQUIRED',400)
 keys(selection,['confirmed','choice','reviewToken','serviceDate'])
 if(selection.confirmed!==true||!['KEEP_STORED','USE_NEW'].includes(selection.choice)||typeof selection.reviewToken!=='string')fail('PRICE_CONFIRMATION_REQUIRED',400)
 const requestHash=hash({input,actorId})
 const history=booking.programSnapshot?.priceConfirmations||[]
 const prior=history.find(row=>row.commandId===input.commandId)
 if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return {replayed:true,patch:null,decision:structuredClone(prior)}}
 if(booking.version!==input.version)fail('SETTINGS_CONFLICT')
 if(booking.status!=='DRAFT')fail('BOOKING_LOCKED')
 const review=bookingPriceReview(booking,resolution)
 if(!review.serviceDate||!selection.serviceDate)fail('SERVICE_DATE_REQUIRED',400)
 if(selection.serviceDate!==review.serviceDate)fail('SERVICE_DATE_REVIEW_REQUIRED')
 if(selection.reviewToken!==review.reviewToken)fail('PRICE_REVIEW_STALE')
 if(selection.choice==='USE_NEW'&&!review.canUseNew)fail('NEW_PRICE_UNAVAILABLE')
 const selected=selection.choice==='USE_NEW'?review.latest:review.stored
 if(selected.total===null)fail('PRICE_REQUIRED')
 const decision={serviceDate:review.serviceDate,commandId:input.commandId,requestHash,actorId,confirmedAt:now.toISOString(),bookingVersion:booking.version,choice:selection.choice,stored:review.stored,offered:review.latest,selected,delta:review.delta,reviewToken:review.reviewToken}
 return {replayed:false,decision,patch:{adultPrice:selected.adultPrice,childPrice:selected.childPrice,programSnapshot:{...structuredClone(booking.programSnapshot||{}),priceSource:structuredClone(selected.source),priceConfirmations:[...structuredClone(history),decision]}}}
}
