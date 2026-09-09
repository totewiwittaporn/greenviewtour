import { programBookingPlan,storedJourney } from './booking-plan.js'
import { bookingJourney,bookingQuote,specialRequirements } from '../../../../packages/contracts/booking-plan.js'
import { dispatchCategories } from './dispatch.js'
import { randomUUID } from 'node:crypto'
import { componentQuantity,tripNights,localStamp } from '../../../../packages/contracts/operations.js'
import { active,audit,authorize,fail,hash,int,keys,money,string,uuid,write } from './common.js'
import { ensureBookingAvailability } from './reservations.js'
const full={trip:{include:{tour:true}},lines:{include:{resource:true,slot:true,source:true,dispatchAssignments:{include:{run:{include:{slot:{include:{vehicle:true}}}}}}}}}
async function blueprint(tx,tripId,adults,children){
 const trip=await tx.operationTrip.findUnique({where:{id:uuid(tripId)},include:{tour:{include:{components:{where:{status:'ACTIVE'},include:{resource:{include:{provider:true}}},orderBy:[{day:'asc'},{createdAt:'asc'}]}}}}})
 if(!trip||trip.status!=='OPEN'||trip.tour&&trip.tour.status!=='ACTIVE')fail('TRIP_UNAVAILABLE')
 if(adults+children<1||adults+children>trip.capacity)fail('TRIP_CAPACITY_EXCEEDED')
 const nights=tripNights(trip)
 const lines=(trip.tour?.components||[]).map(c=>({componentId:c.id,resourceId:c.resourceId,resource:c.resource,selection:c.selection,quantity:componentQuantity(c,adults,children,nights),selected:['INCLUDED','REQUIRED'].includes(c.selection),included:['INCLUDED','REQUIRED'].includes(c.selection),usagePoint:c.usagePoint,unitPrice:['INCLUDED','REQUIRED'].includes(c.selection)?'0':c.resource.salePrice?.toString()??null,snapshot:{name:c.resource.name,code:c.resource.code,baseUnit:c.resource.baseUnit,kind:c.resource.kind,category:c.resource.category,size:c.resource.size,provider:c.resource.provider?.name||null,costPrice:c.resource.costPrice?.toString()??null,day:c.day,notes:c.notes,basis:c.basis,selection:c.selection,componentVersion:c.version,basisQuantity:c.quantity}}))
 return {trip,adultPrice:trip.tour?trip.tour.adultPrice?.toString()??null:'0',childPrice:trip.tour?trip.tour.childPrice?.toString()??null:'0',lines}
}
async function intakeAccess(tx,actorId){const {access}=await authorize(tx,actorId,'islandBooking');return access}
function intakePlanView(plan){
 const safeResource=r=>r?Object.fromEntries(['id','name','code','category','kind','baseUnit','size','mealPeriod','accommodationType','occupancy','origin','destination'].map(k=>[k,r[k]])):null
 return {...plan,program:plan.program?{id:plan.program.id,name:plan.program.name,journeyMode:plan.program.journeyMode,durationDays:plan.program.durationDays,childPolicy:plan.program.childPolicy}:undefined,trip:{id:plan.trip.id,tourId:plan.trip.tourId,name:plan.trip.name,startsAt:plan.trip.startsAt,endsAt:plan.trip.endsAt},lines:plan.lines.map(l=>({...l,resource:safeResource(l.resource),snapshot:l.snapshot?Object.fromEntries(Object.entries(l.snapshot).filter(([k])=>k!=='costPrice')):undefined}))}
}
export async function getBlueprint(prisma,actorId,params){
 const access=await intakeAccess(prisma,actorId)
 const adults=int(params.get('adults'),0,9999),children=int(params.get('children'),0,9999)
 if(adults+children<1)fail('INVALID_PASSENGER_COUNT',400)
 if(params.get('tourId')){const existing=params.get('bookingId')?await prisma.tourBooking.findUnique({where:{id:uuid(params.get('bookingId'))},include:full}):null;if(existing&&!access.booking&&existing.createdById!==actorId)fail('PERMISSION_DENIED',403);const plan=await programBookingPlan(prisma,{...Object.fromEntries(params),adults,children},existing);if(!access.booking&&plan.program.journeyMode!=='RETURN_ONLY')fail('PERMISSION_DENIED',403);return intakePlanView(plan)}
 if(!access.booking)fail('PERMISSION_DENIED',403)
 return blueprint(prisma,params.get('tripId'),adults,children)
}
export async function saveBooking(prisma,actorId,input){
 keys(input,['id','version','code','name','tripId','adults','children','adultPrice','childPrice','lines','agentId','agentReference','contactPhone','hotel','room','pickupPoint','dropoffPoint','allergies','assistance','requestNotes','paymentTerms','afterServiceReason','tourId','serviceDate','returnStatus','returnDate','hotelId','channelId','allergyStatus','specialRequirements']);uuid(input.id);int(input.version,0)
 const requestHash=hash(input)
 return write(prisma,actorId,async tx=>{
  const existing=await tx.tourBooking.findUnique({where:{id:input.id},include:full})
  const access=await intakeAccess(tx,actorId)
  if(existing&&!access.booking&&existing.createdById!==actorId)fail('PERMISSION_DENIED',403)
  if(existing&&existing.requestHash===requestHash&&existing.version===input.version+1)return {row:existing}
  if(existing&&input.version===0){if(existing.requestHash===requestHash)return {row:existing};fail('SETTINGS_CONFLICT')}
  if(existing&&(existing.status!=='DRAFT'||existing.version!==input.version)||!existing&&input.version!==0)fail('BOOKING_LOCKED')
  const adults=int(input.adults,0,9999),children=int(input.children,0,9999)
  if(adults+children<1)fail('INVALID_PASSENGER_COUNT',400)
  const modern=Boolean(input.tourId)
  if(!access.booking&&(!modern||existing&&existing.createdById!==actorId))fail('PERMISSION_DENIED',403)
  const plan=modern?await programBookingPlan(tx,{...input,adults,children},existing):await blueprint(tx,input.tripId,adults,children)
  if(!access.booking&&plan.program?.journeyMode!=='RETURN_ONLY')fail('PERMISSION_DENIED',403)
  const sequence=existing?null:await tx.bookingSequence.upsert({where:{year:Number((input.serviceDate||localStamp(plan.trip.startsAt)).slice(0,4))},create:{year:Number((input.serviceDate||localStamp(plan.trip.startsAt)).slice(0,4)),value:1},update:{value:{increment:1}}})
  const code=existing?.code||`BK-${sequence.year}-${String(sequence.value).padStart(6,'0')}`,name=string(input.name)
  if(modern){
   // Each new Booking owns its dated envelope; dispatch still owns fleet capacity.
   const tripData={code:`T-${input.id}`,name,tourId:input.tourId,startsAt:plan.trip.startsAt,endsAt:plan.trip.endsAt,capacity:adults+children,status:'OPEN'}
   if(existing&&existing.programSnapshot?.bookingOwnedTrip){plan.trip.id=existing.tripId;await tx.operationTrip.update({where:{id:existing.tripId},data:tripData})}
   else await tx.operationTrip.create({data:{id:plan.trip.id,...tripData}})
  }
  const preserve=existing&&!modern&&existing.tripId===input.tripId
  if(preserve)plan.lines=existing.lines.filter(l=>l.snapshot.componentId).map(l=>({componentId:l.snapshot.componentId,resourceId:l.resourceId,resource:l.resource,selection:l.snapshot.selection,quantity:componentQuantity({basis:l.snapshot.basis||'PER_BOOKING',quantity:l.snapshot.basisQuantity||1,occupancy:l.snapshot.occupancy},adults,children,tripNights(plan.trip)),included:l.included,snapshot:l.snapshot}))
  if(!Array.isArray(input.lines)||input.lines.length>100)fail('INVALID_COMPONENTS',400)
  const seen=new Set(),lines=[]
  for(const candidate of input.lines){
   keys(candidate,['componentId','resourceId','selected','quantity','slotId','sourceId','usagePoint','dispatchDirection'])
   if(typeof candidate.selected!=='boolean')fail('INVALID_COMPONENTS',400)
   const component=candidate.componentId?plan.lines.find(l=>l.componentId===candidate.componentId):null
   if(candidate.componentId&&!component||component&&component.resourceId!==candidate.resourceId)fail('INVALID_COMPONENTS',400)
   const key=candidate.componentId||`${candidate.resourceId}:${candidate.usagePoint||'OTHER'}`
   if(seen.has(key))fail('DUPLICATE_COMPONENT',400);seen.add(key)
   if(component?.selection==='REQUIRED'&&component.quantity>0&&!candidate.selected||component?.selection==='EXCLUDED'&&candidate.selected)fail('REQUIRED_COMPONENT',400)
   const resource=await active(tx,'operationResource',candidate.resourceId)
   const quantity=int(candidate.quantity, candidate.selected?1:0)
   if(modern&&component&&candidate.selected===false&&quantity!==component.quantity)fail('INVALID_COMPONENT_QUANTITY',400)
   if(modern&&component&&component.included&&quantity!==component.quantity)fail('INVALID_COMPONENT_QUANTITY',400)
   if(component?.selection==='REQUIRED'&&quantity<component.quantity)fail('REQUIRED_COMPONENT',400)
   const slotId=candidate.slotId?uuid(candidate.slotId):null,sourceId=candidate.sourceId?uuid(candidate.sourceId):null
   if(dispatchCategories.includes(resource.category)&&slotId)fail('DISPATCH_ASSIGNMENT_OWNED',400)
   const dispatchDirection=modern&&dispatchCategories.includes(resource.category)?component?.dispatchDirection||(plan.journey.outboundDate?(plan.journey.returnStatus==='NONE'||plan.journey.returnStatus==='OTHER'?'OUTBOUND':'BOTH'):'RETURN'):candidate.dispatchDirection||'BOTH';if(!['OUTBOUND','RETURN','BOTH'].includes(dispatchDirection))fail('INVALID_INPUT',400)
   if(resource.kind==='SERVICE'&&sourceId||resource.kind!=='SERVICE'&&slotId)fail('INVALID_COMPONENTS',400)
   if(slotId){const slot=await active(tx,'serviceSlot',slotId);if(slot.resourceId!==resource.id||slot.startsAt<plan.trip.startsAt||slot.endsAt>plan.trip.endsAt)fail('SERVICE_SLOT_UNAVAILABLE')}
   if(sourceId)await active(tx,'stockLocation',sourceId)
   const usagePoint=candidate.usagePoint||component?.usagePoint||'OTHER';if(!['BOAT','ISLAND','TRANSFER','OTHER'].includes(usagePoint))fail('INVALID_COMPONENTS',400)
   const previous=preserve?existing.lines.find(l=>candidate.componentId?l.snapshot.componentId===candidate.componentId:l.resourceId===candidate.resourceId&&!l.snapshot.componentId&&l.usagePoint===usagePoint):null
   const included=previous?.included??component?.included??false
   lines.push({id:randomUUID(),dispatchDirection,resourceId:resource.id,slotId,sourceId,quantity,selected:candidate.selected,included,usagePoint,unitPrice:previous?previous.unitPrice?.toString()??null:component?component.unitPrice??null:included?'0':resource.salePrice?.toString()??null,snapshot:previous?previous.snapshot:{...(component?.snapshot||{name:resource.name,code:resource.code,baseUnit:resource.baseUnit,kind:resource.kind,category:resource.category,size:resource.size,costPrice:resource.costPrice?.toString()??null,selection:'OPTIONAL'}),componentId:component?.componentId||null}})
  }
  if(modern&&plan.lines.some(l=>!seen.has(l.componentId)))fail('PROGRAM_COMPONENTS_STALE',400)
  if(plan.lines.some(l=>l.selection==='REQUIRED'&&l.quantity>0&&!seen.has(l.componentId)))fail('REQUIRED_COMPONENT',400)
  if(!lines.some(l=>l.selected))fail('SELECT_COMPONENT',400)
  const details={}
  for(const [key,max] of Object.entries({agentReference:100,contactPhone:32,hotel:200,room:100,pickupPoint:200,dropoffPoint:200,allergies:2000,assistance:2000,requestNotes:2000,afterServiceReason:1000})){
   details[key]=input[key]===undefined?existing?.[key]||null:input[key]===null||input[key]===''?null:string(input[key],max,false)
  }
  details.paymentTerms=input.paymentTerms||existing?.paymentTerms||'UNSET'
  if(!['UNSET','PREPAID','PAID','COUNTER','AGENT_CREDIT','AFTER_SERVICE'].includes(details.paymentTerms))fail('INVALID_PAYMENT_TERMS',400)
  if(details.paymentTerms==='AFTER_SERVICE'){
   if(!details.afterServiceReason)fail('AFTER_SERVICE_REASON_REQUIRED',400)
   if(existing?.paymentTerms!=='AFTER_SERVICE'||details.afterServiceReason!==existing.afterServiceReason)await authorize(tx,actorId,'manager')
  }else details.afterServiceReason=null
  details.agentId=input.agentId===undefined?existing?.agentId||null:input.agentId?uuid(input.agentId):null
  if(details.agentId){
   const agent=await active(tx,'businessPartner',details.agentId)
   if(!agent.roles.includes('SALES_AGENT'))fail('INVALID_AGENT',400)
   details.agentName=existing?.agentId===agent.id?existing.agentName:agent.name
   details.agentPhone=existing?.agentId===agent.id?existing.agentPhone:agent.phone
  }else{details.agentName=null;details.agentPhone=null}
  if(details.paymentTerms==='AGENT_CREDIT'&&!details.agentId)fail('AGENT_REQUIRED',400)
  if(modern){
   if(details.paymentTerms!=='UNSET'&&!plan.allowedPaymentTerms.includes(details.paymentTerms)&&details.paymentTerms!=='AFTER_SERVICE')fail('AGENT_PAYMENT_TERM_NOT_ALLOWED',400)
   details.allergyStatus=input.allergyStatus||'UNKNOWN'
   if(!['UNKNOWN','NONE','HAS'].includes(details.allergyStatus)||details.allergyStatus==='HAS'&&!details.allergies)fail('ALLERGY_DETAILS_REQUIRED',400)
   if(details.allergyStatus==='NONE')details.allergies=null
   if(!Array.isArray(input.specialRequirements)||input.specialRequirements.some(x=>!specialRequirements.includes(x)))fail('INVALID_SPECIAL_REQUIREMENTS',400)
   details.specialRequirements=[...new Set(input.specialRequirements)]
   const exclusions={NO_MEALS:'MEAL',NO_PARK_FEE:'PARK_FEE',NO_TRANSFER:'TRANSFER',OWN_TENT:'ACCOMMODATION',OWN_BUNGALOW:'ACCOMMODATION'}
   if(details.specialRequirements.some(x=>exclusions[x]&&lines.some(l=>l.selected&&l.snapshot.category===exclusions[x])))fail('SPECIAL_REQUIREMENT_COMPONENT_CONFLICT',400)
   if(details.specialRequirements.includes('OTHER')&&!details.requestNotes)fail('SPECIAL_REQUIREMENT_NOTES_REQUIRED',400)
   details.hotelId=input.hotelId?uuid(input.hotelId):null;details.channelId=input.channelId?uuid(input.channelId):null
   if(details.hotelId){const hotel=await active(tx,'pickupLocation',details.hotelId);if(hotel.kind!=='HOTEL')fail('INVALID_HOTEL',400);details.hotel=hotel.name;details.pickupPoint=details.pickupPoint||hotel.pickupNotes||hotel.name}
   if(details.channelId){const channel=await active(tx,'salesChannel',details.channelId);if(channel.kind==='AGENT'&&!details.agentId)fail('AGENT_REQUIRED',400)}
   Object.assign(details,storedJourney(plan.journey))
   // Refunds use the snapshotted selling credit, never procurement cost.
   const quote=bookingQuote({adultPrice:plan.adultPrice,childPrice:plan.childPrice,adults,children,lines})
   if(lines.some(l=>!l.selected&&l.included&&l.quantity>0&&l.snapshot.removalCredit==null))fail('REMOVAL_CREDIT_REQUIRED',400)
   if(quote.base!==null&&quote.credit!==null&&quote.addons!==null&&quote.total===null)fail('NEGATIVE_BOOKING_TOTAL',400)
  }
  if(!modern)Object.assign(details,{outboundDate:new Date(localStamp(plan.trip.startsAt).slice(0,10)+'T00:00:00Z'),returnDate:new Date(localStamp(plan.trip.endsAt).slice(0,10)+'T00:00:00Z'),returnStatus:'OUR'})
  const data={...details,createdById:existing?.createdById||actorId,code,name,tripId:plan.trip.id,adults,children,adultPrice:modern?plan.adultPrice:plan.trip.tour?money(input.adultPrice):'0',childPrice:modern?plan.childPrice:plan.trip.tour?money(input.childPrice):'0',requestHash,programSnapshot:preserve?existing.programSnapshot:{tourId:plan.trip.tourId,name:plan.trip.tour?.name||'Standalone service',route:plan.trip.tour?.route||null,cancellationTerms:plan.trip.tour?.cancellationTerms||null,startsAt:plan.trip.startsAt.toISOString(),endsAt:plan.trip.endsAt.toISOString(),savedAt:new Date().toISOString(),...(modern?{bookingOwnedTrip:true,journeyMode:plan.program.journeyMode,durationDays:plan.program.durationDays,priceSource:plan.priceSource,allowedPaymentTerms:plan.allowedPaymentTerms,childPolicy:plan.program.childPolicy,bookingCutoff:plan.program.bookingCutoff,confirmationMode:plan.program.confirmationMode}: {})}}
  if(existing)await tx.bookingComponent.deleteMany({where:{bookingId:existing.id}})
  const row=existing?await tx.tourBooking.update({where:{id:existing.id},data:{...data,version:{increment:1},lines:{create:lines}},include:full}):await tx.tourBooking.create({data:{id:input.id,...data,lines:{create:lines}},include:full})
  await audit(tx,actorId,row.id,'booking.saved',{version:row.version,lineCount:lines.length});return {row}
 },'islandBooking')
}
export async function bookingStatus(prisma,actorId,input){
 keys(input,['id','bookingId','version','action']);uuid(input.id);uuid(input.bookingId);int(input.version)
 if(!['CONFIRM','CANCEL','COMPLETE'].includes(input.action))fail('INVALID_ACTION',400)
 return write(prisma,actorId,async tx=>{
  const requestHash=hash(input),prior=await tx.operationCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  const booking=await tx.tourBooking.findUnique({where:{id:input.bookingId},include:full})
  if(!booking||booking.version!==input.version)fail('SETTINGS_CONFLICT')
  const access=await intakeAccess(tx,actorId);if(!access.booking&&(booking.createdById!==actorId||booking.programSnapshot?.journeyMode!=='RETURN_ONLY'))fail('PERMISSION_DENIED',403)
  let status
  if(input.action==='CONFIRM'){
   if(booking.status!=='DRAFT')fail('BOOKING_LOCKED')
   if(booking.programSnapshot?.bookingOwnedTrip&&booking.allergyStatus==='UNKNOWN')fail('ALLERGY_STATUS_REQUIRED',400)
   if(bookingQuote(booking).total===null)fail('PRICE_REQUIRED')
   if(booking.paymentTerms==='UNSET')fail('PAYMENT_TERMS_REQUIRED',400)
   if(booking.adults&&!booking.adultPrice||booking.children&&!booking.childPrice||booking.lines.some(l=>l.selected&&l.unitPrice===null))fail('PRICE_REQUIRED')
   status='CONFIRMED'
  }else if(input.action==='CANCEL'){
   if(!['DRAFT','CONFIRMED'].includes(booking.status)||booking.lines.some(l=>l.issuedQty)||await tx.dispatchAssignment.count({where:{bookingLine:{bookingId:booking.id},actualAdults:{not:null}}}))fail('BOOKING_HAS_ISSUES')
   status='CANCELLED'
  }else{
   if(booking.status!=='CONFIRMED')fail('BOOKING_LOCKED')
   if(booking.returnStatus==='PENDING')fail('RETURN_STATUS_PENDING')
   for(const line of booking.lines.filter(l=>l.selected&&dispatchCategories.includes(l.resource.category))){
    const assignments=await tx.dispatchAssignment.findMany({where:{bookingLineId:line.id},include:{run:true}})
    const expected=line.resource.baseUnit==='PERSON'?Math.min(line.quantity,booking.adults+booking.children):booking.adults+booking.children
    for(const direction of (line.dispatchDirection==='BOTH'?['OUTBOUND','RETURN']:[line.dispatchDirection]).filter(d=>d!=='RETURN'||booking.returnStatus==='OUR')){
     const leg=assignments.filter(a=>a.run.direction===direction)
     if(leg.reduce((n,a)=>n+a.adults+a.children,0)!==expected||leg.some(a=>a.actualAdults===null||a.actualChildren===null))fail('DISPATCH_INCOMPLETE')
    }
   }
   if(booking.lines.some(l=>l.selected&&l.resource.kind!=='SERVICE'&&l.issuedQty!==l.quantity))fail('PREPARATION_INCOMPLETE')
   const issues=await tx.stockIssue.findMany({where:{bookingLine:{bookingId:booking.id}}})
   if(issues.some(i=>i.settledQty!==i.quantity))fail('OUTSTANDING_ISSUES')
   status='COMPLETED'
  }
  await tx.tourBooking.update({where:{id:booking.id},data:{status,version:{increment:1}}})
  if(status==='CONFIRMED')await ensureBookingAvailability(tx,booking)
  if(status!=='CONFIRMED'){
   const assignments=await tx.dispatchAssignment.findMany({where:{bookingLine:{bookingId:booking.id}},select:{runId:true}})
   const runIds=[...new Set(assignments.map(a=>a.runId))]
   if(runIds.length)await tx.dispatchRun.updateMany({where:{id:{in:runIds}},data:{version:{increment:1}}})
  }
  await audit(tx,actorId,booking.id,`booking.${status.toLowerCase()}`,{version:booking.version+1})
  const result={ok:true,status,version:booking.version+1}
  await tx.operationCommand.create({data:{id:input.id,requestHash,result}});return result
 },'islandBooking')
}
export function bookingDisplayDate(value){return localStamp(value)}
export async function tripPreparation(prisma,actorId,params){
 await authorize(prisma,actorId,'booking')
 const tripId=uuid(params.get('tripId')),requested=int(params.get('page')||1,1,100000)
 return prisma.$transaction(async tx=>{
  const trip=await tx.operationTrip.findUnique({where:{id:tripId}});if(!trip)fail('NOT_FOUND',404)
  const bookings=await tx.tourBooking.findMany({where:{tripId,status:{in:['CONFIRMED','COMPLETED']}},include:{lines:{where:{selected:true},include:{resource:true,source:true,slot:true,issues:true}}}})
  const grouped=new Map()
  for(const booking of bookings)for(const l of booking.lines){
   const key=`${l.resourceId}:${l.usagePoint}`,r=grouped.get(key)||{resourceId:l.resourceId,name:l.snapshot.name,code:l.snapshot.code,kind:l.snapshot.kind,baseUnit:l.snapshot.baseUnit,usagePoint:l.usagePoint,quantity:0,issuedQty:0,outstandingQty:0,sourceNames:[],slotNames:[]}
   r.quantity+=l.quantity;r.issuedQty+=l.issuedQty;r.outstandingQty+=l.issues.reduce((n,i)=>n+i.quantity-i.settledQty,0)
   if(l.source&&!r.sourceNames.includes(l.source.name))r.sourceNames.push(l.source.name)
   if(l.slot&&!r.slotNames.includes(l.slot.name))r.slotNames.push(l.slot.name)
   grouped.set(key,r)
  }
  const all=[...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.usagePoint.localeCompare(b.usagePoint)),total=all.length,pages=Math.max(1,Math.ceil(total/25)),page=Math.min(requested,pages)
  return {trip,bookings:{confirmed:bookings.length,passengers:bookings.reduce((n,b)=>n+b.adults+b.children,0)},rows:all.slice((page-1)*25,page*25),total,page,pages,pageSize:25}
 },{isolationLevel:'RepeatableRead',timeout:15000})
}

// Confirmed reservations stay fixed; operational contact/request details may be amended with an audit reason.
export async function amendBookingDetails(prisma,actorId,input){
 const limits={contactPhone:32,hotel:200,room:100,pickupPoint:200,dropoffPoint:200,allergies:2000,assistance:2000,requestNotes:2000,afterServiceReason:1000}
 keys(input,['id','bookingId','version','amendmentReason','paymentTerms',...Object.keys(limits)])
 uuid(input.id);uuid(input.bookingId);int(input.version)
 const reason=string(input.amendmentReason,1000)
 return write(prisma,actorId,async tx=>{
  const requestHash=hash(input),prior=await tx.operationCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  const booking=await tx.tourBooking.findUnique({where:{id:input.bookingId},include:full})
  if(!booking||booking.status!=='CONFIRMED'||booking.version!==input.version)fail('SETTINGS_CONFLICT')
  const data={}
  for(const[key,max]of Object.entries(limits))if(key in input)data[key]=input[key]===null||input[key]===''?null:string(input[key],max,false)
  const paymentTerms=input.paymentTerms||booking.paymentTerms
  if(!['PREPAID','PAID','COUNTER','AGENT_CREDIT','AFTER_SERVICE'].includes(paymentTerms))fail('INVALID_PAYMENT_TERMS',400)
  if(input.paymentTerms&&booking.programSnapshot?.allowedPaymentTerms&&!booking.programSnapshot.allowedPaymentTerms.includes(paymentTerms)&&paymentTerms!=='AFTER_SERVICE')fail('AGENT_PAYMENT_TERM_NOT_ALLOWED',400)
  if(paymentTerms==='AGENT_CREDIT'&&!booking.agentId)fail('AGENT_REQUIRED',400)
  if(paymentTerms==='AFTER_SERVICE'){
   const resolvedReason='afterServiceReason' in data?data.afterServiceReason:booking.afterServiceReason
   if(!resolvedReason)fail('AFTER_SERVICE_REASON_REQUIRED',400)
   if(booking.paymentTerms!=='AFTER_SERVICE'||resolvedReason!==booking.afterServiceReason)await authorize(tx,actorId,'manager')
  }else data.afterServiceReason=null
  data.paymentTerms=paymentTerms
  await tx.tourBooking.update({where:{id:booking.id},data:{...data,version:{increment:1}}})
  // Jobs derive these details live; bump every affected job revision so printed copies can be compared.
  const links=await tx.dispatchAssignment.findMany({where:{bookingLine:{bookingId:booking.id}},select:{runId:true}})
  const runIds=[...new Set(links.map(a=>a.runId))]
  if(runIds.length)await tx.dispatchRun.updateMany({where:{id:{in:runIds}},data:{version:{increment:1}}})
  const result={ok:true,version:booking.version+1}
  await audit(tx,actorId,booking.id,'booking.details-amended',{reason,fields:Object.keys(data),version:result.version})
  await tx.operationCommand.create({data:{id:input.id,requestHash,result}})
  return result
 },'booking')
}

export async function amendBookingReturn(prisma,actorId,input){
 keys(input,['id','bookingId','version','returnStatus','returnDate','reason'])
 uuid(input.id);uuid(input.bookingId);int(input.version)
 const reason=string(input.reason,1000)
 return write(prisma,actorId,async tx=>{
  const booking=await tx.tourBooking.findUnique({where:{id:input.bookingId},include:full})
  if(!booking)fail('NOT_FOUND',404)
  const requestHash=hash(input),prior=await tx.operationCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  if(booking.status!=='CONFIRMED'||booking.version!==input.version)fail('SETTINGS_CONFLICT')
  if(booking.programSnapshot?.journeyMode!=='OPEN_RETURN')fail('RETURN_NOT_OPEN',400)
  let journey
  try{journey=bookingJourney({journeyMode:'OPEN_RETURN'},booking.outboundDate.toISOString().slice(0,10),input.returnStatus,input.returnDate||null)}catch(e){fail(e.message,400)}
  if(await tx.dispatchAssignment.count({where:{bookingLine:{bookingId:booking.id},run:{direction:'RETURN'}}}))fail('RETURN_ALREADY_ASSIGNED')
  // A changed stay affects per-night services; do not silently resize already committed supplies.
  if(booking.lines.some(l=>l.selected&&['PER_PERSON_NIGHT','PER_ROOM_NIGHT'].includes(l.snapshot?.basis)))fail('RETURN_STAY_COMPONENTS_LOCKED')
  const data=storedJourney(journey)
  await tx.tourBooking.update({where:{id:booking.id},data:{...data,version:{increment:1}}})
  const end=localStamp(new Date((journey.returnDate||journey.outboundDate)+'T23:59:00+07:00'))
  await tx.operationTrip.update({where:{id:booking.tripId},data:{endsAt:new Date(end.replace(' ','T')+':00+07:00')}})
  await tx.bookingComponent.updateMany({where:{bookingId:booking.id,resource:{category:{in:dispatchCategories}}},data:{dispatchDirection:journey.returnStatus==='OTHER'?'OUTBOUND':'BOTH'}})
  const result={ok:true,version:booking.version+1}
  await audit(tx,actorId,booking.id,'booking.return-amended',{reason,...journey,version:result.version})
  await tx.operationCommand.create({data:{id:input.id,requestHash,result}})
  return result
 },'booking')
}
