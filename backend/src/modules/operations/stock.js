import { randomUUID } from 'node:crypto'
import { convertQuantity,localStamp } from '../../../../packages/contracts/operations.js'
import { active,audit,dateOnly,fail,hash,int,keys,money,string,uuid,write } from './common.js'
import { ensureStockReservations } from './reservations.js'
const currentDay=()=>localStamp(new Date()).slice(0,10)
const expired=(lot,by=currentDay())=>lot.expiresOn&&lot.expiresOn.toISOString().slice(0,10)<by
async function add(tx,lotId,locationId,condition,quantity){
 return tx.stockBalance.upsert({where:{lotId_locationId_condition:{lotId,locationId,condition}},create:{id:randomUUID(),lotId,locationId,condition,quantity},update:{quantity:{increment:quantity},version:{increment:1}}})
}
function units(resource,input){try{return convertQuantity(resource,input.quantity,input.unit||'BASE')}catch(error){fail(error.message,400)}}
export async function stockCommand(prisma,actorId,input){
 keys(input,['id','action','resourceId','locationId','quantity','unit','lotLabel','receivedOn','expiresOn','unitCost','note','balanceId','version','destinationId','custodian','bookingLineId','countedQuantity','condition','issueId','disposition'])
 uuid(input.id)
 if(!['RECEIVE','TRANSFER','ISSUE','COUNT','CONDITION','SETTLE'].includes(input.action))fail('INVALID_ACTION',400)
 const requestHash=hash(input)
 return write(prisma,actorId,async tx=>{
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
      if(!line||!line.selected||line.booking.status!=='CONFIRMED'||line.resourceId!==resource.id||line.sourceId!==source.id)fail('BOOKING_LINE_UNAVAILABLE')
      if(converted.quantity>line.quantity-line.issuedQty)fail('ISSUE_EXCEEDS_REQUIREMENT')
      if(expired(lot,localStamp(line.booking.trip.endsAt).slice(0,10)))fail('EXPIRED_STOCK')
      await tx.bookingComponent.update({where:{id:line.id},data:{issuedQty:{increment:converted.quantity}}})
     }
     const issue=await tx.stockIssue.create({data:{id:randomUUID(),lotId:lot.id,bookingLineId:line?.id||null,sourceId:source.id,destinationId:destination.id,custodian,quantity:converted.quantity}})
     details={...details,issueId:issue.id,bookingLineId:line?.id||null,custodian}
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
 })
}
