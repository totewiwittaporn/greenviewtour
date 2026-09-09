import { randomUUID } from 'node:crypto'
import { convertQuantity,localStamp } from '../../../../packages/contracts/operations.js'
import { active,audit,authorize,dateOnly,fail,hash,int,keys,money,string,uuid,write } from './common.js'
import { ensureStockReservations } from './reservations.js'
const currentDay=()=>localStamp(new Date()).slice(0,10)
const expired=(lot,by=currentDay())=>lot.expiresOn&&lot.expiresOn.toISOString().slice(0,10)<by
async function add(tx,lotId,locationId,condition,quantity){
 return tx.stockBalance.upsert({where:{lotId_locationId_condition:{lotId,locationId,condition}},create:{id:randomUUID(),lotId,locationId,condition,quantity},update:{quantity:{increment:quantity},version:{increment:1}}})
}
function units(resource,input){try{return convertQuantity(resource,input.quantity,input.unit||'BASE')}catch(error){fail(error.message,400)}}
export async function stockCommand(prisma,actorId,input){
 keys(input,['id','action','resourceId','locationId','quantity','unit','lotLabel','receivedOn','expiresOn','unitCost','note','balanceId','version','destinationId','custodian','bookingLineId','countedQuantity','condition','issueId','disposition','runId'])
 uuid(input.id)
 if(!['RECEIVE','TRANSFER','ISSUE','COUNT','CONDITION','SETTLE'].includes(input.action))fail('INVALID_ACTION',400)
 const requestHash=hash(input)
 return write(prisma,actorId,async tx=>{
  const {access}=await authorize(tx,actorId,['ISSUE','SETTLE'].includes(input.action)?'prepareStock':'manager')
  if(!access.manager&&input.action==='ISSUE'&&(!input.runId||!input.bookingLineId))fail('PERMISSION_DENIED',403)
  let preparation=null
  if(input.action==='ISSUE'&&input.runId&&!input.bookingLineId)fail('BOOKING_LINE_UNAVAILABLE')
  if(input.runId)preparation=projectBoatPreparation(await preparationRun(tx,actorId,input.runId))
  const prior=await tx.stockMovement.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return {row:prior}}
  const note=string(input.note||'',2000,['COUNT','CONDITION'].includes(input.action))
  let resource,lot,source,destination,converted,details={note}
  const touched=new Set()
  if(input.action==='RECEIVE'){
   resource=await active(tx,'operationResource',input.resourceId);if(resource.kind==='SERVICE')fail('INVALID_RESOURCE',400)
   destination=await active(tx,'stockLocation',input.locationId);converted=units(resource,input)
   const receivedOn=dateOnly(input.receivedOn),expiresOn=input.expiresOn?dateOnly(input.expiresOn):null
   if(receivedOn.toISOString().slice(0,10)>currentDay()||expiresOn&&expiresOn<receivedOn)fail('INVALID_DATE',400)
   lot=await tx.stockLot.create({data:{id:randomUUID(),resourceId:resource.id,label:string(input.lotLabel),receivedOn,expiresOn}})
   const condition=expired(lot)?'DAMAGED':'READY'
   await add(tx,lot.id,destination.id,condition,converted.quantity)
   details={...details,condition,unitCost:money(input.unitCost),receivedOn:input.receivedOn,expiresOn:input.expiresOn||null}
  }else if(input.action==='SETTLE'){
   const issue=await tx.stockIssue.findUnique({where:{id:uuid(input.issueId)},include:{lot:{include:{resource:true}}}})
   if(!issue)fail('NOT_FOUND',404)
   if(!access.manager){if(!issue.runId)fail('PERMISSION_DENIED',403);await preparationRun(tx,actorId,issue.runId)}
   lot=issue.lot;resource=lot.resource;converted=units(resource,input)
   if(converted.quantity>issue.quantity-issue.settledQty)fail('RETURN_EXCEEDS_ISSUE')
   const disposition=input.disposition
   const condition={RETURN_READY:'READY',RETURN_CLEANING:'CLEANING',RETURN_DAMAGED:'DAMAGED'}[disposition]
   if(!condition&&!['CONSUMED','WASTED'].includes(disposition))fail('INVALID_DISPOSITION',400)
   if(resource.kind==='EQUIPMENT'&&disposition==='CONSUMED'||resource.kind==='CONSUMABLE'&&condition==='CLEANING')fail('INVALID_DISPOSITION',400)
   if(condition){destination=await active(tx,'stockLocation',input.locationId);if(condition==='READY'&&expired(lot))fail('EXPIRED_STOCK');await add(tx,lot.id,destination.id,condition,converted.quantity)}
   source=await tx.stockLocation.findUnique({where:{id:issue.destinationId}})
   await tx.stockIssue.update({where:{id:issue.id},data:{settledQty:{increment:converted.quantity}}})
   details={...details,issueId:issue.id,bookingLineId:issue.bookingLineId,disposition,condition:condition||null}
  }else{
   const balance=await tx.stockBalance.findUnique({where:{id:uuid(input.balanceId)},include:{lot:{include:{resource:true}},location:true}})
   if(!balance||balance.version!==int(input.version))fail('SETTINGS_CONFLICT')
   lot=balance.lot;resource=lot.resource;source=balance.location
   if(source.status!=='ACTIVE'||resource.status!=='ACTIVE')fail('RELATED_RECORD_UNAVAILABLE')
   if(input.action==='COUNT'){
    const counted=int(input.countedQuantity,0,100000000),difference=counted-balance.quantity
    if(!difference)fail('COUNT_UNCHANGED',400)
    converted={quantity:difference,enteredQuantity:counted,enteredUnit:'BASE',factor:1}
    await tx.stockBalance.update({where:{id:balance.id},data:{quantity:counted,version:{increment:1}}})
    details={...details,balanceId:balance.id,previousQuantity:balance.quantity,countedQuantity:counted,condition:balance.condition}
   }else{
    converted=units(resource,input);if(converted.quantity>balance.quantity)fail('INSUFFICIENT_STOCK')
    if(input.action==='TRANSFER'){
     destination=await active(tx,'stockLocation',input.destinationId);if(destination.id===source.id)fail('SAME_LOCATION',400)
     await add(tx,lot.id,destination.id,balance.condition,converted.quantity)
    }else if(input.action==='CONDITION'){
     if(!['READY','CLEANING','DAMAGED'].includes(input.condition)||input.condition===balance.condition||resource.kind==='CONSUMABLE'&&input.condition==='CLEANING')fail('INVALID_CONDITION',400)
     if(input.condition==='READY'&&expired(lot))fail('EXPIRED_STOCK')
     destination=source;await add(tx,lot.id,source.id,input.condition,converted.quantity)
     details={...details,previousCondition:balance.condition,condition:input.condition}
    }else{
     if(balance.condition!=='READY'||expired(lot))fail('STOCK_NOT_READY')
     destination=await active(tx,'stockLocation',input.destinationId)
     const custodian=string(input.custodian)
     let line=null
     if(input.bookingLineId){
      line=await tx.bookingComponent.findUnique({where:{id:uuid(input.bookingLineId)},include:{booking:{include:{trip:true}}}})
      if(!line||!line.selected||line.booking.status!=='CONFIRMED'||line.resourceId!==resource.id||line.sourceId&&line.sourceId!==source.id)fail('BOOKING_LINE_UNAVAILABLE')
      if(preparation){
       if(preparation.run.status!=='OPEN')fail('BOOKING_LINE_UNAVAILABLE')
       const requirement=preparation.rows.find(r=>r.bookingLineId===line.id)
       if(!requirement||converted.quantity>requirement.remainingQty)fail('ISSUE_EXCEEDS_REQUIREMENT')
      }
      if(converted.quantity>line.quantity-line.issuedQty)fail('ISSUE_EXCEEDS_REQUIREMENT')
      if(expired(lot,localStamp(line.booking.returnDate||line.booking.outboundDate||line.booking.trip.endsAt).slice(0,10)))fail('EXPIRED_STOCK')
      await tx.bookingComponent.update({where:{id:line.id},data:{issuedQty:{increment:converted.quantity}}})
     }
     const issue=await tx.stockIssue.create({data:{id:randomUUID(),runId:input.runId||null,lotId:lot.id,bookingLineId:line?.id||null,sourceId:source.id,destinationId:destination.id,custodian,quantity:converted.quantity}})
     details={...details,issueId:issue.id,runId:input.runId||null,bookingLineId:line?.id||null,custodian}
    }
    await tx.stockBalance.update({where:{id:balance.id},data:{quantity:{decrement:converted.quantity},version:{increment:1}}})
    details={...details,balanceId:balance.id,fromCondition:balance.condition}
   }
   touched.add(`${resource.id}:${source.id}`)
  }
  for(const pair of touched){const[r,s]=pair.split(':');await ensureStockReservations(tx,r,s)}
  details={...details,resourceId:resource.id,resourceName:resource.name,resourceCode:resource.code,baseUnit:resource.baseUnit,lotId:lot.id,lotLabel:lot.label,sourceId:source?.id||null,sourceName:source?.name||'Supplier / opening stock',destinationId:destination?.id||null,destinationName:destination?.name||null}
  const row=await tx.stockMovement.create({data:{id:input.id,requestHash,kind:input.action,...converted,details,actorId}})
  await audit(tx,actorId,row.id,`stock.${input.action.toLowerCase()}`,{resourceId:resource.id,quantity:converted.quantity});return {row}
 },['ISSUE','SETTLE'].includes(input.action)?'prepareStock':'manager')
}

// Quantities belong to the booking once, not once per boat leg. Allocate the
// primary boarding leg using cumulative integer shares, leaving unassigned
// passengers' stock unallocated until the guide places them on a boat.
export function preparationShare(line, booking, runId) {
 const transport=booking.lines.filter(l=>l.selected&&['TOUR_BOAT','LONGTAIL_BOAT'].includes(l.snapshot?.category||l.resource?.category))
 const outbound=transport.filter(l=>l.dispatchDirection!=='RETURN')
 const candidates=(outbound.length?outbound:transport).sort((a,b)=>Number((a.snapshot?.category||a.resource?.category)==='LONGTAIL_BOAT')-Number((b.snapshot?.category||b.resource?.category)==='LONGTAIL_BOAT')||a.id.localeCompare(b.id))
 const primary=candidates[0],direction=outbound.length?'OUTBOUND':'RETURN'
 if(!primary)return 0
 const allocations=(primary.dispatchAssignments||[]).filter(a=>a.run.kind==='BOAT'&&a.run.status!=='CANCELLED'&&a.run.direction===direction).sort((a,b)=>a.runId.localeCompare(b.runId))
 const weight=value=>line.snapshot?.basis==='PER_CHILD'?value.children:line.snapshot?.basis==='PER_ADULT'?value.adults:value.adults+value.children
 const total=weight(booking)
 if(!total)return 0
 let prior=0,quantity=0
 for(const a of allocations){
  const next=Math.min(total,prior+weight(a))
  if(a.runId===runId)quantity+=Math.floor(line.quantity*next/total)-Math.floor(line.quantity*prior/total)
  prior=next
 }
 return quantity
}
const preparationInclude={
 slot:{include:{vehicle:true}},staff:true,
 assignments:{include:{bookingLine:{include:{booking:{include:{trip:true,lines:{include:{resource:true,source:true,issues:true,dispatchAssignments:{include:{run:true}}}}}}}}}},
}
async function preparationRun(tx,actorId,runId){
 const {access}=await authorize(tx,actorId,'prepareStock')
 const run=await tx.dispatchRun.findUnique({where:{id:uuid(runId)},include:preparationInclude})
 if(!run||run.kind!=='BOAT')fail('NOT_FOUND',404)
 if(!access.manager&&!access.manageGuide&&!run.staff.some(s=>s.userId===actorId))fail('PERMISSION_DENIED',403)
 return run
}
export function projectBoatPreparation(run){
 const assigned=run.assignments.filter(a=>['CONFIRMED','COMPLETED'].includes(a.bookingLine.booking.status))
 const bookings=[...new Map(assigned.map(a=>[a.bookingLine.booking.id,a.bookingLine.booking])).values()]
 const rows=[],services=[]
 for(const booking of bookings)for(const line of booking.lines){
  const kind=line.snapshot?.kind||line.resource.kind
  if(!line.selected||line.usagePoint==='TRANSFER')continue
  if(kind==='SERVICE'){
   const category=line.snapshot?.category||line.resource.category
   if(['TRANSFER','TOUR_BOAT','LONGTAIL_BOAT'].includes(category))continue
   const quantity=preparationShare(line,booking,run.id)
   if(quantity)services.push({bookingLineId:line.id,bookingId:booking.id,bookingCode:booking.code,bookingName:booking.name,
    resourceId:line.resourceId,name:line.snapshot?.name||line.resource.name,code:line.snapshot?.code||line.resource.code,
    category,baseUnit:line.snapshot?.baseUnit||line.resource.baseUnit,quantity,day:line.snapshot?.day||null,
    usagePoint:line.usagePoint,provider:line.snapshot?.provider||null,notes:line.snapshot?.notes||null,
    mealPeriod:line.snapshot?.mealPeriod||line.resource.mealPeriod||null,accommodationType:line.snapshot?.accommodationType||line.resource.accommodationType||null,
   })
   continue
  }
  const issues=(line.issues||[]).filter(i=>i.runId===run.id)
  const quantity=preparationShare(line,booking,run.id),issuedQty=issues.reduce((n,i)=>n+i.quantity,0)
  if(!quantity&&!issuedQty)continue
  rows.push({bookingLineId:line.id,bookingId:booking.id,bookingCode:booking.code,bookingName:booking.name,
   resourceId:line.resourceId,name:line.snapshot?.name||line.resource.name,code:line.snapshot?.code||line.resource.code,kind,
   baseUnit:line.snapshot?.baseUnit||line.resource.baseUnit,size:line.snapshot?.size||line.resource.size||null,
   usagePoint:line.usagePoint,useBy:localStamp(booking.returnDate||booking.outboundDate||booking.trip?.endsAt||new Date()).slice(0,10),quantity,issuedQty,remainingQty:Math.max(0,Math.min(quantity-issuedQty,line.quantity-line.issuedQty)),
   outstandingQty:issues.reduce((n,i)=>n+i.quantity-i.settledQty,0),sourceId:line.sourceId,sourceName:line.source?.name||null,
   issues:issues.filter(i=>i.quantity>i.settledQty).map(i=>({id:i.id,quantity:i.quantity,settledQty:i.settledQty})),
  })
 }
 const passengers=assigned.reduce((n,a)=>n+a.adults+a.children,0)
 return {run:{id:run.id,code:run.code,name:run.name,direction:run.direction,status:run.status,passengers,capacity:run.capacity,vehicleName:run.slot?.vehicle?.name||null},
  bookings:{count:bookings.length,passengers},rows,services,
  guestRequirements:bookings.map(b=>({bookingId:b.id,bookingCode:b.code,bookingName:b.name,allergyStatus:b.allergyStatus||'UNKNOWN',allergies:b.allergies||null,specialRequirements:b.specialRequirements||[],assistance:b.assistance||null,requestNotes:b.requestNotes||null})),
  totals:{consumables:rows.filter(r=>r.kind==='CONSUMABLE').reduce((n,r)=>n+r.quantity,0),equipment:rows.filter(r=>r.kind==='EQUIPMENT').reduce((n,r)=>n+r.quantity,0)}}
}
export async function boatPreparation(prisma,actorId,params){
 return prisma.$transaction(async tx=>{
  const result=projectBoatPreparation(await preparationRun(tx,actorId,params.get('runId')))
  const resourceIds=[...new Set(result.rows.map(row=>row.resourceId))]
  const balances=resourceIds.length?await tx.stockBalance.findMany({where:{condition:'READY',quantity:{gt:0},location:{status:'ACTIVE'},lot:{resourceId:{in:resourceIds},resource:{status:'ACTIVE'}}},include:{location:true,lot:true},orderBy:[{lot:{expiresOn:'asc'}},{id:'asc'}]}):[]
  for(const row of result.rows)row.readyBalances=balances.filter(b=>b.lot.resourceId===row.resourceId&&(!row.sourceId||b.locationId===row.sourceId)&&!expired(b.lot)&&!expired(b.lot,row.useBy)).map(b=>({id:b.id,version:b.version,quantity:b.quantity,locationId:b.locationId,locationName:b.location.name,lotId:b.lotId,lotLabel:b.lot.label,expiresOn:b.lot.expiresOn}))
  result.destinations=await tx.stockLocation.findMany({where:{status:'ACTIVE'},select:{id:true,name:true},orderBy:{name:'asc'}})
  return result
 },{isolationLevel:'RepeatableRead',timeout:15000})
}
