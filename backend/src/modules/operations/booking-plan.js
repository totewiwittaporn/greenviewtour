import {currentBookingRate,rateRevisionId} from '../service-catalog/agent-price-history.js'
import { randomUUID } from 'node:crypto'
import { bookingJourney } from '../../../../packages/contracts/booking-plan.js'
import { componentQuantity,parseStamp } from '../../../../packages/contracts/operations.js'
import { active,fail,uuid } from './common.js'

export async function programBookingPlan(tx,input,existing=null,{bookedAt=new Date(),allowUndated=false}={}){
 let program=await tx.tourProgram.findUnique({where:{id:uuid(input.tourId)},include:{components:{where:{status:'ACTIVE'},include:{resource:{include:{provider:true}}},orderBy:[{day:'asc'},{createdAt:'asc'}]}}})
 if(!program||program.status!=='ACTIVE')fail('PROGRAM_UNAVAILABLE')
 // Moving the service date must not silently replace an already agreed fare.
 const preservePrice=Boolean(existing&&existing.programSnapshot?.bookingOwnedTrip&&existing.programSnapshot.tourId===program.id&&(existing.agentId||null)===(input.agentId||null))
 const preserve=Boolean(preservePrice&&((existing.outboundDate||existing.returnDate)?.toISOString().slice(0,10)||'')===(input.serviceDate||''))
 if(preserve)program={...program,journeyMode:existing.programSnapshot.journeyMode,durationDays:existing.programSnapshot.durationDays}
 let journey
 const undated=input.serviceDate==null||input.serviceDate===''
 if(undated){
  if(!allowUndated)fail('SERVICE_DATE_REQUIRED',400)
  if(input.returnDate||input.returnStatus==='OUR'&&program.journeyMode==='OPEN_RETURN')fail('SERVICE_DATE_REQUIRED',400)
  journey={outboundDate:null,returnDate:null,returnStatus:program.journeyMode==='OPEN_RETURN'?(input.returnStatus==='OTHER'?'OTHER':'PENDING'):program.journeyMode==='OUTBOUND_ONLY'?'NONE':'OUR'}
 }else try{journey=bookingJourney(program,input.serviceDate,input.returnStatus||'PENDING',input.returnDate||null)}catch(e){fail(e.message,400)}
 const first=journey.outboundDate||journey.returnDate,last=journey.returnDate||first
 const nights=undated?(program.journeyMode==='FIXED'?Math.max(0,program.durationDays-1):0):Math.round((Date.parse(last)-Date.parse(first))/86400000)
 let adultPrice=program.adultPrice?.toString()??null,childPrice=program.childPrice?.toString()??null,priceSource={kind:'DIRECT',programId:program.id,programVersion:program.version}
 let allowedPaymentTerms=['PREPAID','PAID','COUNTER'],defaultPaymentTerms='COUNTER'
 if(input.agentId&&!preservePrice){
  const agent=await active(tx,'businessPartner',input.agentId)
  if(!agent.roles.includes('SALES_AGENT'))fail('INVALID_AGENT',400)
  allowedPaymentTerms=agent.allowedPaymentTerms;defaultPaymentTerms=agent.defaultPaymentTerms
  const rate=await currentBookingRate(tx,{agentId:agent.id,tourId:program.id,bookedAt:existing?.createdAt||bookedAt})
  // An absent negotiated price is not silently replaced by the direct price.
  adultPrice=rate?.adultPrice?.toString()??null;childPrice=rate?.childPrice?.toString()??null
  priceSource={kind:'AGENT',pricingBasis:'BOOKING_DATE',revisionId:rate?rateRevisionId(rate):null,seasonId:null,agentId:agent.id,rateId:rate?.id||null,rateVersion:rate?.version||null,agreementId:rate?.agreementId||null,agreementCode:rate?.agreement?.code||null}
 }
 if(preservePrice){adultPrice=existing.programSnapshot.priceException?existing.programSnapshot.priceException.standard.adultPrice:existing.adultPrice?.toString()??null;childPrice=existing.programSnapshot.priceException?existing.programSnapshot.priceException.standard.childPrice:existing.childPrice?.toString()??null;priceSource=existing.programSnapshot.priceSource;allowedPaymentTerms=existing.programSnapshot.allowedPaymentTerms||allowedPaymentTerms;defaultPaymentTerms=existing.paymentTerms}
 const direction=program.journeyMode==='RETURN_ONLY'?'RETURN':program.journeyMode==='OUTBOUND_ONLY'||journey.returnStatus==='OTHER'?'OUTBOUND':'BOTH'
 const components=preserve?existing.lines.filter(l=>l.snapshot?.componentId).map(l=>({id:l.snapshot.componentId,resourceId:l.resourceId,resource:l.resource,selection:l.snapshot.selection,basis:l.snapshot.basis,quantity:l.snapshot.basisQuantity,usagePoint:l.usagePoint,day:l.snapshot.day,notes:l.snapshot.notes,version:l.snapshot.componentVersion,removalCredit:l.snapshot.removalCredit,prior:l})):program.components
 const lines=components.map(c=>{
  let quantity
  try{quantity=componentQuantity(c,input.adults,input.children,nights)}catch(e){fail(e.message,400)}
  return {componentId:c.id,resourceId:c.resourceId,resource:c.resource,selection:c.selection,quantity,selected:quantity>0&&['INCLUDED','REQUIRED'].includes(c.selection),included:['INCLUDED','REQUIRED'].includes(c.selection),usagePoint:c.usagePoint,dispatchDirection:direction,removalCredit:c.removalCredit?.toString()??null,unitPrice:c.prior?c.prior.unitPrice?.toString()??null:['INCLUDED','REQUIRED'].includes(c.selection)?'0':c.resource.salePrice?.toString()??null,snapshot:{name:c.resource.name,code:c.resource.code,baseUnit:c.resource.baseUnit,kind:c.resource.kind,category:c.resource.category,size:c.resource.size,mealPeriod:c.resource.mealPeriod,accommodationType:c.resource.accommodationType,ownership:c.resource.ownership,provider:c.resource.provider?.name||null,costPrice:c.resource.costPrice?.toString()??null,day:c.day,notes:c.notes,basis:c.basis,selection:c.selection,componentVersion:c.version,basisQuantity:c.quantity,occupancy:c.resource.occupancy,removalCredit:c.removalCredit?.toString()??null}}
 })
 return {preserve,undated,program,journey,adultPrice,childPrice,priceSource,allowedPaymentTerms,defaultPaymentTerms,lines,trip:undated?null:{id:randomUUID(),tourId:program.id,tour:program,name:program.name,startsAt:parseStamp(first+' 00:00'),endsAt:parseStamp(last+' 23:59'),capacity:input.adults+input.children,status:'OPEN'}}
}
export const storedJourney=journey=>Object.fromEntries(Object.entries(journey).map(([key,value])=>[key,key.endsWith('Date')&&value?new Date(value+'T00:00:00Z'):value]))
