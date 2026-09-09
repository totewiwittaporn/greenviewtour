import { randomUUID } from 'node:crypto'
import { catalog, validateCatalog } from '../../../../packages/contracts/catalog.js'
import { operationCatalog } from '../../../../packages/contracts/operations.js'
import { active,audit,authorize,fail,hash,int,keys,uuid,write } from './common.js'
const include={services:{provider:true},components:{tour:true,resource:true},slots:{resource:true,vehicle:true},trips:{tour:true},bookings:{trip:{include:{tour:true}},lines:{include:{resource:true,source:true,slot:true,dispatchAssignments:{include:{run:{include:{slot:{include:{vehicle:true}}}}}}}}},stock:{lot:{include:{resource:true}},location:true},issues:{lot:{include:{resource:true}},bookingLine:{include:{booking:{include:{trip:true}}}}}}
const extra={resources:'operationResource',bookings:'tourBooking',stock:'stockBalance',issues:'stockIssue',movements:'stockMovement'}
export async function listOperations(prisma,actorId,entity,params){
 await authorize(prisma,actorId,['bookings','services','resources','stores','trips','slots'].includes(entity)?'booking':'manager')
 const definition=operationCatalog[entity],model=definition?.model||extra[entity];if(!model)fail('NOT_FOUND',404)
 const q=(params.get('q')||'').trim(),requested=Number(params.get('page')||1),status=params.get('status')
 if(q.length>100||!Number.isSafeInteger(requested)||requested<1||requested>100000)fail('INVALID_FILTER',400)
 if(status&&!['ACTIVE','INACTIVE','OPEN','DRAFT','CONFIRMED','COMPLETED','CANCELLED','READY','CLEANING','DAMAGED'].includes(status))fail('INVALID_FILTER',400)
 const base=definition?.kind?{kind:definition.kind}:{},where={...base}
 if(params.get('bookingId')){if(entity!=='bookings')fail('INVALID_FILTER',400);where.id=uuid(params.get('bookingId'))}
 if(entity==='resources'&&params.get('kind')){const kind=params.get('kind');if(!['SERVICE','EQUIPMENT','CONSUMABLE','MATERIAL'].includes(kind))fail('INVALID_FILTER',400);where.kind=kind==='MATERIAL'?{in:['EQUIPMENT','CONSUMABLE']}:kind}
 if(status&&!['stock','issues','movements'].includes(entity))where.status=status
 if(entity==='stock'){where.quantity={gt:0};if(status)where.condition=status}
 for(const key of ['tourId','resourceId','tripId'])if(params.get(key)){
  const allowed={tourId:['components','trips'],resourceId:['slots'],tripId:['bookings']}[key]
  if(!allowed.includes(entity))fail('INVALID_FILTER',400);where[key]=uuid(params.get(key))
 }
 if(q)where.OR=entity==='components'?[{tour:{name:{contains:q,mode:'insensitive'}}},{resource:{name:{contains:q,mode:'insensitive'}}}]:['stock','issues'].includes(entity)?[{lot:{resource:{name:{contains:q,mode:'insensitive'}}}},{lot:{label:{contains:q,mode:'insensitive'}}}]:entity==='movements'?[{kind:{contains:q,mode:'insensitive'}}]:['code','name'].map(k=>({[k]:{contains:q,mode:'insensitive'}}))
 return prisma.$transaction(async tx=>{
  const total=await tx[model].count({where}),pages=Math.max(1,Math.ceil(total/25)),page=Math.min(requested,pages)
  let rows=await tx[model].findMany({where,include:include[entity],skip:(page-1)*25,take:25,orderBy:entity==='stock'?[{id:'asc'}]:[{createdAt:'desc'},{id:'asc'}]})
  if(entity==='components')rows=rows.map(r=>({...r,name:r.resource.name,code:r.tour.code}))
  if(entity==='issues'){
   const ids=[...new Set(rows.flatMap(r=>[r.sourceId,r.destinationId]))],stores=await tx.stockLocation.findMany({where:{id:{in:ids}}})
   rows=rows.map(r=>({...r,source:stores.find(s=>s.id===r.sourceId),destination:stores.find(s=>s.id===r.destinationId)}))
  }
  const all=await tx[model].count({where:entity==='stock'?{quantity:{gt:0}}:base})
  let activeCount,featured=all,extraSummary={}
  if(entity==='stock'){
   activeCount=await tx.stockBalance.count({where:{condition:'READY',quantity:{gt:0}}})
   featured=await tx.stockBalance.count({where:{condition:'CLEANING',quantity:{gt:0}}})
  }else if(entity==='issues'){
   const issues=await tx.stockIssue.findMany({select:{quantity:true,settledQty:true}})
   activeCount=issues.filter(i=>i.quantity>i.settledQty).length
  }else if(entity==='movements')activeCount=all
  else activeCount=await tx[model].count({where:{...base,status:entity==='trips'?'OPEN':entity==='bookings'?'CONFIRMED':'ACTIVE'}})
  const featuredWhere={services:{salePrice:{not:null}},equipment:{size:{not:null}},consumables:{OR:[{packSize:{not:null}},{caseSize:{not:null}}]},stores:{kind:'BOAT'},components:{selection:'REQUIRED'},slots:{vehicleId:{not:null}},trips:{tourId:{not:null}}}
  if(featuredWhere[entity])featured=await tx[model].count({where:{...base,...featuredWhere[entity]}})
  if(entity==='bookings')for(const status of ['DRAFT','CONFIRMED','COMPLETED','CANCELLED'])extraSummary[status.toLowerCase()]=await tx.tourBooking.count({where:{status}})
  return {rows,total,page,pages,pageSize:25,summary:{total:all,active:activeCount,inactive:all-activeCount,featured,...extraSummary}}

 },{isolationLevel:'RepeatableRead',timeout:15000})
}
export async function saveOperationCatalog(prisma,actorId,entity,input){
 const definition=operationCatalog[entity];if(!definition)fail('NOT_FOUND',404)
 keys(input,['id','version',...definition.fields.map(f=>f.key)]);uuid(input.id);int(input.version,0)
 return write(prisma,actorId,async tx=>{
  const {data,errors}=validateCatalog(entity,input);if(Object.keys(errors).length)fail('INVALID_SETTINGS',400)
  if(definition.kind)data.kind=definition.kind
  const existing=await tx[definition.model].findUnique({where:{id:input.id}})
  if(existing&&definition.kind&&existing.kind!==definition.kind)fail('INVALID_REFERENCE',400)
  if(existing&&input.version===0){if(Object.keys(data).every(k=>String(data[k]??'')===String(existing[k]??'')))return {row:existing};fail('SETTINGS_CONFLICT')}
  if(existing?existing.version!==input.version:input.version!==0)fail('SETTINGS_CONFLICT')
  for(const f of definition.fields.filter(f=>f.type==='reference'))if(data[f.key]){
   const model=f.entity==='resources'?'operationResource':catalog[f.entity].model
   const related=await active(tx,model,data[f.key])
   if(operationCatalog[f.entity]?.kind&&related.kind!==operationCatalog[f.entity].kind)fail('INVALID_REFERENCE',400)
  }
  if(definition.kind){
   if(['WATER','SOFT_DRINK','JUICE'].includes(data.category)&&data.baseUnit!=='BOTTLE')fail('INVALID_UNIT',400)
   if(['WATERMELON','PINEAPPLE'].includes(data.category)&&data.baseUnit!=='FRUIT')fail('INVALID_UNIT',400)
   if(data.category==='FINS'&&data.baseUnit!=='PAIR')fail('INVALID_UNIT',400)
   if(['SNORKEL_MASK','TOWEL','LIFEJACKET'].includes(data.category)&&data.baseUnit!=='PIECE')fail('INVALID_UNIT',400)
   if(data.baseUnit!=='BOTTLE'&&(data.packSize||data.caseSize))fail('INVALID_UNIT',400)
   if(existing){
    const used=await tx.stockLot.count({where:{resourceId:existing.id}})||await tx.bookingComponent.count({where:{resourceId:existing.id}})||await tx.programComponent.count({where:{resourceId:existing.id}})||await tx.serviceSlot.count({where:{resourceId:existing.id}})
    if(used&&(data.baseUnit!==existing.baseUnit||data.category!==existing.category||['size','ownership','mealPeriod','accommodationType','occupancy','serviceMode'].some(key=>data[key]!==undefined&&data[key]!==existing[key])))fail('RESOURCE_IDENTITY_IN_USE')
    if(data.status==='INACTIVE'&&(await tx.programComponent.count({where:{resourceId:existing.id,status:'ACTIVE'}})||await tx.serviceSlot.count({where:{resourceId:existing.id,status:'ACTIVE'}})||await tx.bookingComponent.count({where:{resourceId:existing.id,selected:true,booking:{status:'CONFIRMED'}}})))fail('RESOURCE_IN_USE')
   }
  }
  if(entity==='components'&&data.basis==='PER_PERSON_NIGHT'&&data.quantity<1)fail('INVALID_QUANTITY',400)
  if(['slots','trips'].includes(entity)){
   if(data.endsAt<=data.startsAt)fail('INVALID_TIME_RANGE',400)
   if(+data.endsAt-+data.startsAt>366*86400000)fail('INVALID_TIME_RANGE',400)
   if(entity==='slots'&&existing&&await tx.dispatchRun.count({where:{slotId:existing.id}}))fail('RUN_IN_USE')
   if(existing&&(entity==='trips'?await tx.tourBooking.count({where:{tripId:existing.id}}):await tx.bookingComponent.count({where:{slotId:existing.id}})))fail('SCHEDULE_IN_USE')
   if(entity==='slots'&&data.vehicleId&&data.status==='ACTIVE'){
    const v=await active(tx,'fleetVehicle',data.vehicleId),resource=await active(tx,'operationResource',data.resourceId)
    if(!['TRANSFER','TOUR_BOAT','LONGTAIL_BOAT'].includes(resource.category))fail('INVALID_VEHICLE_ASSIGNMENT',400)
    if(resource.baseUnit==='PERSON'&&data.capacity>v.capacity)fail('VEHICLE_CAPACITY_EXCEEDED')
    if(['VEHICLE','BOAT','TRIP'].includes(resource.baseUnit)&&data.capacity>1)fail('VEHICLE_CAPACITY_EXCEEDED')
    if(await tx.serviceSlot.count({where:{id:{not:input.id},vehicleId:data.vehicleId,status:'ACTIVE',startsAt:{lt:data.endsAt},endsAt:{gt:data.startsAt}}}))fail('VEHICLE_TIME_CONFLICT')
   }
  }
  if(entity==='stores'&&existing&&data.status==='INACTIVE'&&(await tx.stockBalance.count({where:{locationId:existing.id,quantity:{gt:0}}})||await tx.bookingComponent.count({where:{sourceId:existing.id,booking:{status:'CONFIRMED'}}})||(await tx.stockIssue.findMany({where:{OR:[{sourceId:existing.id},{destinationId:existing.id}]}})).some(i=>i.quantity>i.settledQty)))fail('LOCATION_IN_USE')
  const row=existing?await tx[definition.model].update({where:{id:input.id},data:{...data,version:{increment:1}}}):await tx[definition.model].create({data:{...data,id:input.id}})
  await audit(tx,actorId,row.id,`${entity}.saved`,{fields:Object.keys(data),version:row.version});return {row}
 },entity==='trips'?'booking':'manager')
}
export const operationHash=hash
export const operationId=randomUUID
