import {hash,fail} from '../operations/common.js'
import {localStamp} from '../../../../packages/contracts/operations.js'

export const rateRevisionAction='settings.rates.revision'
export function rateRevisionId(rate){
 const key=hash({rateId:rate.id,version:rate.version})
 return `${key.slice(0,8)}-${key.slice(8,12)}-4${key.slice(13,16)}-a${key.slice(17,20)}-${key.slice(20,32)}`
}
export function rateSnapshot(rate){
 return {id:rate.id,version:rate.version,revisionId:rateRevisionId(rate),agentId:rate.agentId,tourId:rate.tourId,agreementId:rate.agreementId??null,agreementCode:rate.agreement?.code??null,seasonId:null,adultPrice:rate.adultPrice?.toString()??null,childPrice:rate.childPrice?.toString()??null,status:rate.status}
}
export async function captureRateRevision(tx,rate,actorId,{origin='OBSERVED_CURRENT',effectiveFrom=null,now=new Date()}={}){
 const id=rateRevisionId(rate),prior=await tx.auditEvent.findUnique({where:{id}})
 if(prior){if(prior.action!==rateRevisionAction||prior.targetId!==rate.id||prior.details.version!==rate.version)fail('PRICE_HISTORY_CONFLICT');return id}
 const agreement=rate.agreementId?(rate.agreement||await tx.agentAgreement.findUnique({where:{id:rate.agreementId}})):null
 const agreementSnapshot=agreement?{id:agreement.id,code:agreement.code,name:agreement.name,startsOn:agreement.startsOn?.toISOString()??null,endsOn:agreement.endsOn?.toISOString()??null,status:agreement.status}:null
 await tx.auditEvent.create({data:{id,actorId,targetId:rate.id,action:rateRevisionAction,createdAt:now,details:{...rateSnapshot({...rate,agreement}),agreementSnapshot,origin,effectiveFrom,recordedAt:now.toISOString()}}})
 return id
}
// Agreement windows are evaluated at the booking's original creation day,
// never at its travel date. Revisions are offered only at explicit Confirm.
export async function currentBookingRate(tx,{agentId,tourId,bookedAt=new Date()}){
 if(!agentId||!tourId)return null
 const day=new Date(localStamp(bookedAt).slice(0,10)+'T00:00:00Z')
 const rates=await tx.agentTourPrice.findMany({where:{agentId,tourId,status:'ACTIVE',OR:[{agreementId:null},{agreement:{status:'ACTIVE',startsOn:{lte:day},endsOn:{gte:day}}}]},include:{agreement:true}})
 const dated=rates.filter(rate=>rate.agreementId),applicable=dated.length?dated:rates
 if(applicable.length>1)fail('AMBIGUOUS_AGENT_PRICE')
 return applicable[0]||null
}
export async function confirmationRate(tx,booking){
 const rate=await currentBookingRate(tx,{agentId:booking.agentId,tourId:booking.programSnapshot?.tourId,bookedAt:booking.createdAt})
 return rate?{status:'AVAILABLE',rate:rateSnapshot(rate),record:rate}:{status:'NONE'}
}
