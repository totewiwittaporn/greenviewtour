import {randomUUID} from 'node:crypto'
import {authorize, audit, dateOnly, fail, hash, int, keys, string, uuid, write} from './common.js'
import {parseStamp,localStamp} from '../../../../packages/contracts/operations.js'
import {programBookingPlan} from './booking-plan.js'
import {requireBookingEdit} from './booking-ownership.js'
import {requireOpenServiceDays} from './service-day.js'
import {assessBookingCapacity,boatCategories,bookingLegs,capacityBookingInclude,capacityInclude,dayString,poolContainsRun,poolContext,poolsForLeg,selections,solveContext,usableCapacity,vanEstimate} from './capacity-core.js'
import {readTransaction} from '../../platform/database/read-transaction.js'
export async function capacityAccess(tx,actorId,kind='BOAT',edit=false) {
  const {actor,access} = await authorize(tx,actorId,'active')
  if (edit ? !(kind==='BOAT'?access.manageGuide:access.manageDriver) : !(access.booking || access.manageGuide || access.manageDriver)) fail('PERMISSION_DENIED',403)
  return {actor,access}
}
export async function saveCapacityPool(db,actorId,input) {
  keys(input,['id','commandId','version','code','name','kind','serviceDate','direction','startsAt','endsAt','resourceIds','status','holdMinutes','overnightLoadTenths','offers','notes'])
  uuid(input.id);uuid(input.commandId);int(input.version,0)
  if (!['BOAT','VEHICLE'].includes(input.kind) || !['OUTBOUND','RETURN'].includes(input.direction) || !['ACTIVE','INACTIVE'].includes(input.status)) fail('INVALID_INPUT',400)
  const serviceDate = dateOnly(input.serviceDate)
  let startsAt,endsAt
  try {startsAt=parseStamp(input.startsAt);endsAt=parseStamp(input.endsAt)} catch {fail('INVALID_TIME',400)}
  if (localStamp(startsAt).slice(0,10)!==input.serviceDate || endsAt<=startsAt || +endsAt-+startsAt>86400000) fail('INVALID_TIME_RANGE',400)
  if (!Array.isArray(input.resourceIds) || !input.resourceIds.length || input.resourceIds.length>100 || new Set(input.resourceIds).size!==input.resourceIds.length) fail('INVALID_CAPACITY_SERVICES',400)
  input.resourceIds.forEach(uuid)
  if (!Array.isArray(input.offers) || input.offers.length>64 || new Set(input.offers.map(o=>o.vehicleId)).size!==input.offers.length) fail('INVALID_CAPACITY_OFFERS',400)
  for (const offer of input.offers) {keys(offer,['vehicleId','capacity','status']);uuid(offer.vehicleId);int(offer.capacity);if(!['READY','PROPOSED','UNAVAILABLE'].includes(offer.status))fail('INVALID_CAPACITY_OFFERS',400)}
  return write(db,actorId,async tx=>{
    await capacityAccess(tx,actorId,input.kind,true)
    const requestHash=hash({...input,actorId}),prior=await tx.operationCommand.findUnique({where:{id:input.commandId}})
    if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
    const old=await tx.capacityPool.findUnique({where:{id:input.id},include:capacityInclude})
    if(old ? old.version!==input.version : input.version!==0)fail('SETTINGS_CONFLICT')
    if(old)await capacityAccess(tx,actorId,old.kind,true)
    await requireOpenServiceDays(tx,[input.serviceDate,...(old?[old.serviceDate]:[])])
    const resources=await tx.operationResource.findMany({where:{id:{in:input.resourceIds},status:'ACTIVE'}})
    if(resources.length!==input.resourceIds.length || resources.some(r=>r.kind!=='SERVICE'||!(input.kind==='BOAT'?boatCategories:['TRANSFER']).includes(r.category)) || new Set(resources.map(r=>`${r.category}:${r.origin||''}:${r.destination||''}`)).size!==1)fail('INCOMPATIBLE_CAPACITY_SERVICES',400)
    const vehicles=await tx.fleetVehicle.findMany({where:{id:{in:input.offers.map(o=>o.vehicleId)}}})
    const offers=input.offers.map(o=>({...o,vehicle:vehicles.find(v=>v.id===o.vehicleId)}))
    if(offers.some(o=>!o.vehicle || (input.kind==='BOAT' ? !['SPEEDBOAT','LONGTAIL_BOAT'].includes(o.vehicle.kind) : ['SPEEDBOAT','LONGTAIL_BOAT'].includes(o.vehicle.kind)) || input.kind==='BOAT'&&(resources[0].category==='TOUR_BOAT'?o.vehicle.kind!=='SPEEDBOAT':o.vehicle.kind!=='LONGTAIL_BOAT') || o.capacity>o.vehicle.capacity || o.status==='READY'&&usableCapacity(o)!==o.capacity)) fail('INVALID_CAPACITY_OFFERS',400)
    const data={code:string(input.code,40),name:string(input.name,200),kind:input.kind,serviceDate,direction:input.direction,startsAt,endsAt,resourceIds:input.resourceIds,status:input.status,holdMinutes:int(input.holdMinutes,1,1440),overnightLoadTenths:int(input.overnightLoadTenths,10,100),notes:string(input.notes||'',1000,false)}
    if(!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(data.code))fail('INVALID_CODE',400)
    if(old){
      const priorContext=await poolContext(tx,old)
      const structural=old.kind!==data.kind || dayString(old.serviceDate)!==input.serviceDate || old.direction!==data.direction || +old.startsAt!==+startsAt || +old.endsAt!==+endsAt || JSON.stringify([...old.resourceIds].sort())!==JSON.stringify([...data.resourceIds].sort()) || data.status==='INACTIVE'
      if(structural&&priorContext.groups.length)fail('CAPACITY_WINDOW_HAS_RESERVATIONS')
    }
    if(input.status==='ACTIVE')for(const offer of offers.filter(o=>o.status==='READY')){
      if(await tx.capacityOffer.count({where:{vehicleId:offer.vehicleId,status:'READY',poolId:{not:input.id},pool:{status:'ACTIVE',startsAt:{lt:endsAt},endsAt:{gt:startsAt}}}}))fail('VEHICLE_TIME_CONFLICT')
      const slots=await tx.serviceSlot.findMany({where:{vehicleId:offer.vehicleId,status:'ACTIVE',startsAt:{lt:endsAt},endsAt:{gt:startsAt}},include:{run:true}})
      if(slots.some(slot=>!slot.run||!poolContainsRun({...data,id:input.id},{...slot.run,slot})))fail('VEHICLE_TIME_CONFLICT')
    }
    const row=old?await tx.capacityPool.update({where:{id:input.id},data:{...data,version:{increment:1}}}):await tx.capacityPool.create({data:{id:input.id,...data}})
    await tx.capacityOffer.deleteMany({where:{poolId:input.id}})
    if(offers.length)await tx.capacityOffer.createMany({data:offers.map(o=>({id:randomUUID(),poolId:input.id,vehicleId:o.vehicleId,capacity:o.capacity,status:o.status}))})
    const current=await tx.capacityPool.findUnique({where:{id:input.id},include:capacityInclude}),context=await poolContext(tx,current)
    // A real breakdown may reduce supply. Keep obligations visible; never silently cancel them.
    const plan=input.kind==='BOAT'?solveContext(context):null
    await audit(tx,actorId,input.id,'capacity.saved',{version:row.version,readiness:offers.map(o=>({vehicleId:o.vehicleId,status:o.status})),requiresTeamReview:plan?.status!=='FEASIBLE'})
    const result={ok:true,id:row.id,version:row.version,requiresTeamReview:input.kind==='BOAT'&&plan.status!=='FEASIBLE'}
    await tx.operationCommand.create({data:{id:input.commandId,requestHash,result}});return result
  },'active')
}
export async function listCapacityPools(db,actorId,params) {
  const kind=params.get('kind')||'BOAT',date=params.get('date')||localStamp(new Date()).slice(0,10)
  if(!['BOAT','VEHICLE'].includes(kind))fail('INVALID_INPUT',400)
  await capacityAccess(db,actorId,kind)
  return readTransaction(db,async tx=>{
    const {access}=await capacityAccess(tx,actorId,kind)
    const pools=await tx.capacityPool.findMany({where:{serviceDate:dateOnly(date),kind},include:capacityInclude,orderBy:[{startsAt:'asc'},{id:'asc'}]})
    const rows=[]
    for(const pool of pools){const context=await poolContext(tx,pool);rows.push({...pool,offers:pool.offers.map(o=>({...o,vehicle:{id:o.vehicle.id,name:o.vehicle.name,capacity:o.vehicle.capacity,ownership:o.vehicle.ownership},usableCapacity:context.boats.find(b=>b.id===o.vehicleId)?.capacity||0})),passengers:context.groups.reduce((n,g)=>n+g.pax,0),heldPassengers:context.groups.filter(g=>g.hold).reduce((n,g)=>n+g.pax,0),groups:context.groups.map(g=>({id:g.id,code:g.code||'Temporary hold',version:g.version,needsWindowSelection:g.needsWindowSelection||false,pax:g.pax,fixedBoatId:g.fixedBoatId||null,exclusive:g.exclusive||false})),plan:kind==='BOAT'?solveContext(context):null,van:kind==='VEHICLE'?vanEstimate(context):null})}
    return {rows,date,kind,canManage:kind==='BOAT'?Boolean(access.manageGuide):Boolean(access.manageDriver)}
  },{isolationLevel:'RepeatableRead',timeout:30000})
}
export async function bookingCapacityPreview(db,actorId,input) {
  await authorize(db,actorId,'islandBooking')
  return readTransaction(db,async tx=>{
    let booking
    if(input.bookingId){booking=await tx.tourBooking.findUnique({where:{id:uuid(input.bookingId)},include:capacityBookingInclude});if(!booking)fail('NOT_FOUND',404);await requireBookingEdit(tx,actorId,booking);if(input.capacitySelections)booking={...booking,programSnapshot:{...booking.programSnapshot,capacitySelections:selections(input.capacitySelections)}}}
    else {
      const plan=await programBookingPlan(tx,{...input,adults:int(input.adults,0,9999),children:int(input.children,0,9999)})
      const {access}=await authorize(tx,actorId,'islandBooking');if(!access.booking&&plan.program.journeyMode!=='RETURN_ONLY')fail('PERMISSION_DENIED',403)
      booking={adults:input.adults,children:input.children,...plan.journey,programSnapshot:{capacitySelections:selections(input.capacitySelections||[])},lines:plan.lines.map(l=>({...l,selected:input.lines?.find(x=>x.componentId===l.componentId)?.selected??l.selected}))}
    }
    if(input.returnChange===true){
      if(!input.bookingId||booking.programSnapshot?.journeyMode!=='OPEN_RETURN'||!['OUR','OTHER','PENDING'].includes(input.returnStatus))fail('RETURN_NOT_OPEN',400)
      const returnDate=input.returnStatus==='OUR'?dateOnly(input.returnDate):null
      if(returnDate&&booking.outboundDate&&returnDate<booking.outboundDate)fail('INVALID_DATE',400)
      booking={...booking,outboundDate:null,returnDate,returnStatus:input.returnStatus,lines:booking.lines.map(line=>({...line,selected:line.selected&&input.returnStatus==='OUR',dispatchDirection:'RETURN'}))}
    }
    return assessBookingCapacity(tx,booking,{excludeRequestId:booking.programSnapshot?.customerRequestId||null})
  },{isolationLevel:'RepeatableRead',timeout:30000})
}
export async function holdRequestCapacity(tx,requestId,availability,now=new Date(),promotionHoldUntil=null) {
  await releaseRequestCapacity(tx,requestId,now)
  if(!availability.canConfirm)return null
  let minimum=null
  for(const poolId of [...new Set(availability.selections.map(s=>s.poolId))]){
    const leg=availability.legs.find(l=>l.poolId===poolId)
    const expiresAt=new Date(Math.min(+now+leg.holdMinutes*60000,promotionHoldUntil?+promotionHoldUntil:Infinity))
    if(expiresAt<=now)fail('PROMOTION_HOLD_EXPIRED')
    minimum=minimum&&minimum<expiresAt?minimum:expiresAt
    const data={passengers:availability.groupSize,exclusive:availability.legs.some(l=>l.poolId===poolId&&l.exclusive),expiresAt}
    await tx.capacityHold.upsert({where:{poolId_requestId:{poolId,requestId}},create:{id:randomUUID(),poolId,requestId,...data},update:data})
  }
  return minimum
}
export async function releaseRequestCapacity(tx,requestId,now=new Date()) {
  await tx.capacityHold.updateMany({where:{requestId,expiresAt:{gt:now}},data:{expiresAt:now}})
}
export async function assertExistingBookingCapacity(tx,bookingId) {
  const booking=await tx.tourBooking.findUnique({where:{id:bookingId},include:capacityBookingInclude})
  if(!booking||!['CONFIRMED','COMPLETED'].includes(booking.status))fail('BOOKING_LOCKED')
  const result=await assessBookingCapacity(tx,booking,{excludeRequestId:booking.programSnapshot?.customerRequestId||null})
  if(!result.canConfirm)fail('BOAT_CAPACITY_REVIEW_REQUIRED')
  return result
}
export async function assertRunCapacity(tx,runId) {
  const run=await tx.dispatchRun.findUnique({where:{id:runId},include:{slot:true,assignments:{include:{bookingLine:{include:{booking:true}}}}}})
  if(!run||run.kind!=='BOAT')return
  const relevant=await tx.capacityPool.findMany({where:{status:'ACTIVE',startsAt:{lt:run.slot.endsAt},endsAt:{gt:run.slot.startsAt},offers:{some:{vehicleId:run.slot.vehicleId,status:'READY'}}},include:capacityInclude})
  for(const pool of relevant){
    if(!poolContainsRun(pool,run))fail('CAPACITY_WINDOW_CONFLICT')
    const context=await poolContext(tx,pool)
    if(context.groups.length&&solveContext(context).status!=='FEASIBLE')fail('BOAT_CAPACITY_REVIEW_REQUIRED')
  }
  const live=run.assignments.filter(a=>a.status!=='CANCELLED'&&['CONFIRMED','COMPLETED'].includes(a.bookingLine.booking.status))
  if(!live.length)return
  const leg={resourceId:run.slot.resourceId,direction:run.direction,serviceDate:localStamp(run.slot.startsAt).slice(0,10)}
  const pools=(await poolsForLeg(tx,leg)).filter(p=>poolContainsRun(p,run)&&p.offers.some(o=>o.vehicleId===run.slot.vehicleId&&usableCapacity(o)>=run.capacity))
  if(pools.length!==1)fail('BOAT_CAPACITY_REVIEW_REQUIRED')
  for(const id of [...new Set(live.map(a=>a.bookingLine.booking.id))])await assertExistingBookingCapacity(tx,id)
}

// Reconcile an already-confirmed legacy Booking with no recorded service window.
// This cannot change a recorded window or create/confirm a new Booking.
export async function bindLegacyBookingWindow(db,actorId,input){
 keys(input,['id','bookingId','version','poolId','reason']);uuid(input.id);uuid(input.bookingId);uuid(input.poolId);int(input.version)
 const reason=string(input.reason,1000)
 return write(db,actorId,async tx=>{
  await capacityAccess(tx,actorId,'BOAT',true)
  const requestHash=hash({...input,actorId}),prior=await tx.operationCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  const booking=await tx.tourBooking.findUnique({where:{id:input.bookingId},include:capacityBookingInclude})
  const pool=await tx.capacityPool.findUnique({where:{id:input.poolId},include:capacityInclude})
  if(!booking||booking.status!=='CONFIRMED'||booking.version!==input.version)fail('SETTINGS_CONFLICT')
  if(!pool||pool.kind!=='BOAT'||pool.status!=='ACTIVE')fail('CAPACITY_NOT_CONFIGURED')
  await requireOpenServiceDays(tx,[pool.serviceDate])
  const legs=bookingLegs(booking).filter(leg=>leg.serviceDate===dayString(pool.serviceDate)&&leg.direction===pool.direction&&pool.resourceIds.includes(leg.resourceId))
  const existing=selections(booking.programSnapshot?.capacitySelections||[])
  if(!legs.length||legs.some(leg=>existing.some(chosen=>chosen.resourceId===leg.resourceId&&chosen.direction===leg.direction&&chosen.serviceDate===leg.serviceDate)))fail('CAPACITY_SELECTION_ALREADY_RECORDED')
  const assignments=booking.lines.filter(line=>pool.resourceIds.includes(line.resourceId)).flatMap(line=>line.dispatchAssignments).filter(a=>a.status!=='CANCELLED'&&a.run.direction===pool.direction&&localStamp(a.run.slot.startsAt).slice(0,10)===dayString(pool.serviceDate))
  if(assignments.some(a=>!poolContainsRun(pool,a.run)))fail('CAPACITY_WINDOW_CONFLICT')
  const capacitySelections=[...existing,...legs.map(({resourceId,direction,serviceDate})=>({resourceId,direction,serviceDate,poolId:pool.id}))]
  await tx.tourBooking.update({where:{id:booking.id},data:{programSnapshot:{...booking.programSnapshot,capacitySelections},version:{increment:1}}})
  const plan=solveContext(await poolContext(tx,pool)),result={ok:true,version:booking.version+1,requiresTeamReview:plan.status!=='FEASIBLE'}
  await audit(tx,actorId,booking.id,'booking.legacy-window-bound',{poolId:pool.id,reason,requiresTeamReview:result.requiresTeamReview})
  await tx.operationCommand.create({data:{id:input.id,requestHash,result}});return result
 },'active')
}
