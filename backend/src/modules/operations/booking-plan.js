import { randomUUID } from 'node:crypto'
import { bookingJourney } from '../../../../packages/contracts/booking-plan.js'
import { componentQuantity,parseStamp } from '../../../../packages/contracts/operations.js'
import { active,fail,uuid } from './common.js'

export async function programBookingPlan(tx,input,existing=null){
 let program=await tx.tourProgram.findUnique({where:{id:uuid(input.tourId)},include:{components:{where:{status:'ACTIVE'},include:{resource:{include:{provider:true}}},orderBy:[{day:'asc'},{createdAt:'asc'}]}}})
 if(!program||program.status!=='ACTIVE')fail('PROGRAM_UNAVAILABLE')
 const preserve=Boolean(existing&&existing.programSnapshot?.bookingOwnedTrip&&existing.programSnapshot.tourId===program.id&&(existing.agentId||null)===(input.agentId||null)&&(existing.outboundDate||existing.returnDate)?.toISOString().slice(0,10)===input.serviceDate)
 if(preserve)program={...program,journeyMode:existing.programSnapshot.journeyMode,durationDays:existing.programSnapshot.durationDays}
 let journey
 try{journey=bookingJourney(program,input.serviceDate,input.returnStatus||'PENDING',input.returnDate||null)}catch(e){fail(e.message,400)}
 const first=journey.outboundDate||journey.returnDate,last=journey.returnDate||first
 const nights=Math.round((Date.parse(last)-Date.parse(first))/86400000)
 let adultPrice=program.adultPrice?.toString()??null,childPrice=program.childPrice?.toString()??null,priceSource={kind:'DIRECT',programId:program.id,programVersion:program.version}
 let allowedPaymentTerms=['PREPAID','PAID','COUNTER'],defaultPaymentTerms='COUNTER'
 if(input.agentId&&!preserve){
  const agent=await active(tx,'businessPartner',input.agentId)
  if(!agent.roles.includes('SALES_AGENT'))fail('INVALID_AGENT',400)
  allowedPaymentTerms=agent.allowedPaymentTerms;defaultPaymentTerms=agent.defaultPaymentTerms
  const day=new Date(first+'T00:00:00Z')
  const rates=await tx.agentTourPrice.findMany({where:{agentId:agent.id,tourId:program.id,status:'ACTIVE',OR:[{agreementId:null},{agreement:{status:'ACTIVE',startsOn:{lte:day},endsOn:{gte:day}}}]},include:{agreement:true}})
  const dated=rates.filter(r=>r.agreementId),candidates=dated.length?dated:rates
  if(candidates.length>1)fail('AMBIGUOUS_AGENT_PRICE')
  const rate=candidates[0]
  // An absent negotiated price is not silently replaced by the direct price.
  adultPrice=rate?.adultPrice?.toString()??null;childPrice=rate?.childPrice?.toString()??null
  priceSource={kind:'AGENT',agentId:agent.id,rateId:rate?.id||null,rateVersion:rate?.version||null,agreementId:rate?.agreementId||null,agreementCode:rate?.agreement?.code||null}
 }
 if(preserve){adultPrice=existing.adultPrice?.toString()??null;childPrice=existing.childPrice?.toString()??null;priceSource=existing.programSnapshot.priceSource;allowedPaymentTerms=existing.programSnapshot.allowedPaymentTerms||allowedPaymentTerms;defaultPaymentTerms=existing.paymentTerms}
 const direction=journey.outboundDate?(program.journeyMode==='OUTBOUND_ONLY'||journey.returnStatus==='OTHER'?'OUTBOUND':'BOTH'):'RETURN'
 const components=preserve?existing.lines.filter(l=>l.snapshot?.componentId).map(l=>({id:l.snapshot.componentId,resourceId:l.resourceId,resource:l.resource,selection:l.snapshot.selection,basis:l.snapshot.basis,quantity:l.snapshot.basisQuantity,usagePoint:l.usagePoint,day:l.snapshot.day,notes:l.snapshot.notes,version:l.snapshot.componentVersion,removalCredit:l.snapshot.removalCredit,prior:l})):program.components
 const lines=components.map(c=>{
  let quantity
  try{quantity=componentQuantity(c,input.adults,input.children,nights)}catch(e){fail(e.message,400)}
  return {componentId:c.id,resourceId:c.resourceId,resource:c.resource,selection:c.selection,quantity,selected:quantity>0&&['INCLUDED','REQUIRED'].includes(c.selection),included:['INCLUDED','REQUIRED'].includes(c.selection),usagePoint:c.usagePoint,dispatchDirection:direction,removalCredit:c.removalCredit?.toString()??null,unitPrice:c.prior?c.prior.unitPrice?.toString()??null:['INCLUDED','REQUIRED'].includes(c.selection)?'0':c.resource.salePrice?.toString()??null,snapshot:{name:c.resource.name,code:c.resource.code,baseUnit:c.resource.baseUnit,kind:c.resource.kind,category:c.resource.category,size:c.resource.size,provider:c.resource.provider?.name||null,costPrice:c.resource.costPrice?.toString()??null,day:c.day,notes:c.notes,basis:c.basis,selection:c.selection,componentVersion:c.version,basisQuantity:c.quantity,occupancy:c.resource.occupancy,removalCredit:c.removalCredit?.toString()??null}}
 })
 return {preserve,program,journey,adultPrice,childPrice,priceSource,allowedPaymentTerms,defaultPaymentTerms,lines,trip:{id:randomUUID(),tourId:program.id,tour:program,name:program.name,startsAt:parseStamp(first+' 00:00'),endsAt:parseStamp(last+' 23:59'),capacity:input.adults+input.children,status:'OPEN'}}
}
export const storedJourney=journey=>Object.fromEntries(Object.entries(journey).map(([key,value])=>[key,key.endsWith('Date')&&value?new Date(value+'T00:00:00Z'):value]))
