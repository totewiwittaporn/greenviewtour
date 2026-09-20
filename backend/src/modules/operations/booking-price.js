import { bookingQuote } from '../../../../packages/contracts/booking-plan.js'
import { audit,authorize,fail,hash,int,keys,money,string,uuid,write } from './common.js'

export function priceActions(booking,actorId,access){
 if(booking.status!=='DRAFT'||!booking.agentId||!access.booking)return []
 const request=booking.programSnapshot?.priceException
 return ['REQUEST',...(request?['WITHDRAW']:[]),...(request?.status==='PENDING'&&access.manager&&request.requestedById!==actorId?['APPROVE','REJECT']:[])]
}
export function requirePriceApproval(booking){
 const request=booking.programSnapshot?.priceException
 if(request&&request.status!=='APPROVED')fail('PRICE_APPROVAL_REQUIRED')
 if(request&&(Number(booking.adultPrice)!==Number(request.adultPrice)||Number(booking.childPrice)!==Number(request.childPrice)))fail('PRICE_APPROVAL_REQUIRED')
}
export async function bookingPriceCommand(prisma,actorId,input){
 keys(input,['id','bookingId','version','action','adultPrice','childPrice','reason'])
 uuid(input.id);uuid(input.bookingId);int(input.version)
 if(!['REQUEST','WITHDRAW','APPROVE','REJECT'].includes(input.action))fail('INVALID_ACTION',400)
 return write(prisma,actorId,async tx=>{
  const {actor,access}=await authorize(tx,actorId,'booking')
  if(['APPROVE','REJECT'].includes(input.action))await authorize(tx,actorId,'manager')
  const booking=await tx.tourBooking.findUnique({where:{id:input.bookingId},include:{lines:true}})
  if(!booking)fail('NOT_FOUND',404)
  const requestHash=hash({...input,actorId}),prior=await tx.operationCommand.findUnique({where:{id:input.id}})
  // Replay still checks current actor authority, but can return after a later lifecycle transition.
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  if(booking.version!==input.version)fail('SETTINGS_CONFLICT')
  if(!priceActions(booking,actorId,access).includes(input.action))fail('PRICE_REVIEW_NOT_ALLOWED',403)
  const previous=booking.programSnapshot?.priceException
  const standard=previous?.standard||{adultPrice:booking.adultPrice?.toString()??null,childPrice:booking.childPrice?.toString()??null}
  let request,adultPrice=standard.adultPrice,childPrice=standard.childPrice
  const reason=string(input.reason,1000)
  if(input.action==='REQUEST'){
   const proposed={adultPrice:money(input.adultPrice),childPrice:money(input.childPrice)}
   if(proposed.adultPrice===null||proposed.childPrice===null)fail('PRICE_REQUIRED',400)
   if(bookingQuote({...booking,...proposed}).total===null)fail('INVALID_NEGOTIATED_TOTAL',400)
   request={...proposed,standard,status:'PENDING',reason,requestedById:actorId,requestedByName:actor.displayName||actor.name||'Booking staff',requestedAt:new Date().toISOString()}
  }else if(input.action==='WITHDRAW')request=null
  else{
   request={...previous,status:input.action==='APPROVE'?'APPROVED':'REJECTED',reviewReason:reason,reviewedById:actorId,reviewedByName:actor.displayName||actor.name||'Manager',reviewedAt:new Date().toISOString()}
   if(input.action==='APPROVE'){
    adultPrice=request.adultPrice;childPrice=request.childPrice
    if(bookingQuote({...booking,adultPrice,childPrice}).total===null)fail('INVALID_NEGOTIATED_TOTAL',400)
   }
  }
  const programSnapshot={...booking.programSnapshot,priceException:request}
  await tx.tourBooking.update({where:{id:booking.id},data:{adultPrice,childPrice,programSnapshot,version:{increment:1}}})
  await audit(tx,actorId,booking.id,`booking.price.${input.action.toLowerCase()}`,{version:booking.version+1,reason,previous:previous||null,request,standard})
  const result={ok:true,version:booking.version+1,status:request?.status||'STANDARD'}
  await tx.operationCommand.create({data:{id:input.id,requestHash,result}})
  return result
 },'booking')
}
