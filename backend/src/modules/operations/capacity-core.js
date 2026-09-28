import {capacityRelations,capacityDemandRows} from './capacity-read.js'
import {dateOnly, fail, int, keys, uuid} from './common.js'
import {localStamp} from '../../../../packages/contracts/operations.js'
import {planBoatGroups} from './boat-capacity-plan.js'
export const boatCategories = ['TOUR_BOAT','LONGTAIL_BOAT']
export const capacityInclude = {offers:{include:{vehicle:{select:{id:true,name:true,status:true,kind:true,ownership:true,capacity:true,totalCapacity:true,expectedCrew:true}}}}}
export const capacityBookingInclude = capacityRelations
export const dayString = value => value instanceof Date ? value.toISOString().slice(0,10) : typeof value === 'string' ? value.slice(0,10) : null
export const legKey = leg => `${leg.resourceId}:${leg.direction}:${leg.serviceDate}`
export function selections(input = []) {
  if (!Array.isArray(input) || input.length > 100) fail('INVALID_CAPACITY_SELECTION',400)
  const seen = new Set()
  return input.map(row => {
    keys(row,['resourceId','direction','serviceDate','poolId']);uuid(row.resourceId);uuid(row.poolId);dateOnly(row.serviceDate)
    if (!['OUTBOUND','RETURN'].includes(row.direction) || seen.has(legKey(row))) fail('INVALID_CAPACITY_SELECTION',400)
    seen.add(legKey(row));return {...row}
  })
}
export function bookingLegs(booking, kind = 'BOAT') {
  const categories = kind === 'BOAT' ? boatCategories : ['TRANSFER'], legs = new Map()
  for (const line of booking.lines || []) {
    const resource = line.resource || line.snapshot || {}
    if (!line.selected || !categories.includes(resource.category)) continue
    for (const direction of (line.dispatchDirection === 'BOTH' || !line.dispatchDirection ? ['OUTBOUND','RETURN'] : [line.dispatchDirection])) {
      if (direction === 'RETURN' && booking.returnStatus !== 'OUR') continue
      const field = direction === 'OUTBOUND' ? 'outboundDate' : 'returnDate'
      const date = Object.hasOwn(booking,field) ? dayString(booking[field]) : booking.trip ? localStamp(direction === 'OUTBOUND' ? booking.trip.startsAt : booking.trip.endsAt).slice(0,10) : null
      if (!date) continue
      const leg = {resourceId:line.resourceId,direction,serviceDate:date,category:resource.category,exclusive:resource.serviceMode === 'CHARTER'}
      const previous = legs.get(legKey(leg))
      legs.set(legKey(leg),{...leg,exclusive:leg.exclusive || Boolean(previous?.exclusive)})
    }
  }
  return [...legs.values()]
}
export function usableCapacity(offer, crew = null) {
  const v = offer.vehicle
  if (offer.status !== 'READY' || !v || v.status !== 'ACTIVE') return 0
  let capacity = Math.min(offer.capacity,v.capacity)
  if (v.totalCapacity != null) {
    const expected = crew ?? v.expectedCrew
    if (!Number.isInteger(expected) || expected < 0) return 0
    capacity = Math.min(capacity,v.totalCapacity - expected)
  }
  return Number.isInteger(capacity) && capacity > 0 ? capacity : 0
}
export async function poolsForLeg(tx, leg) {
  return tx.capacityPool.findMany({where:{serviceDate:dateOnly(leg.serviceDate),direction:leg.direction,status:'ACTIVE',resourceIds:{has:leg.resourceId}},include:capacityInclude,orderBy:[{startsAt:'asc'},{id:'asc'}]})
}
function selectedPool(booking, leg) {
  return booking.programSnapshot?.capacitySelections?.find(row => legKey(row) === legKey(leg))?.poolId
}
export function poolContainsRun(pool, run) {
  const slot = run.slot
  return pool.kind === run.kind && pool.direction === run.direction && pool.resourceIds.includes(slot.resourceId) && dayString(pool.serviceDate) === localStamp(slot.startsAt).slice(0,10) && +slot.startsAt >= +pool.startsAt && +slot.endsAt <= +pool.endsAt
}
// One complete, consistent read. Writes call this under operations' existing advisory lock.
export async function poolContext(tx,pool,{excludeBookingId=null,excludeRequestId=null,now=new Date()} = {}) {
  const day = dateOnly(dayString(pool.serviceDate)), field = pool.direction === 'OUTBOUND' ? 'outboundDate' : 'returnDate'
  const bookings = await capacityDemandRows(tx,{status:{in:['CONFIRMED','COMPLETED']},[field]:day,...(pool.direction === 'RETURN' ? {returnStatus:'OUR'} : {}),lines:{some:{selected:true,resourceId:{in:pool.resourceIds}}}})
  const holds = await tx.capacityHold.findMany({where:{poolId:pool.id,expiresAt:{gt:now},request:{bookingId:null,status:{in:['REQUESTED','DATE_PROPOSED']}}},select:{requestId:true,passengers:true,exclusive:true}})
  const otherPools = await tx.capacityPool.findMany({where:{serviceDate:day,direction:pool.direction,status:'ACTIVE',resourceIds:{hasSome:pool.resourceIds}},select:{id:true,resourceIds:true}})
  const slots = await tx.serviceSlot.findMany({where:{status:'ACTIVE',vehicleId:{in:pool.offers.map(o=>o.vehicleId)},startsAt:{lt:pool.endsAt},endsAt:{gt:pool.startsAt}},select:{vehicleId:true,resourceId:true,startsAt:true,endsAt:true,run:{select:{kind:true,direction:true,capacity:true,staff:{select:{userId:true}}}}}})
  const competing = await tx.capacityOffer.findMany({where:{poolId:{not:pool.id},status:'READY',vehicleId:{in:pool.offers.map(o=>o.vehicleId)},pool:{status:'ACTIVE',startsAt:{lt:pool.endsAt},endsAt:{gt:pool.startsAt}}},select:{vehicleId:true}})
  const boats = [], unavailable = []
  for (const offer of pool.offers) {
    let capacity = usableCapacity(offer)
    for (const slot of slots.filter(s=>s.vehicleId === offer.vehicleId)) {
      if (!slot.run || !poolContainsRun(pool,{...slot.run,slot})) capacity = 0
      else capacity = Math.min(capacity,slot.run.capacity,usableCapacity(offer,Math.max(offer.vehicle.expectedCrew || 0,slot.run.staff.length)))
    }
    if (competing.some(row=>row.vehicleId === offer.vehicleId)) capacity = 0
    if (capacity) boats.push({id:offer.vehicleId,capacity,name:offer.vehicle.name})
    else unavailable.push({vehicleId:offer.vehicleId,status:offer.status})
  }
  const groups = [], problems = []
  for (const booking of bookings) {
    if (booking.id === excludeBookingId || booking.programSnapshot?.customerRequestId === excludeRequestId && excludeRequestId) continue
    const legs = bookingLegs(booking,pool.kind).filter(l=>l.direction === pool.direction && l.serviceDate === dayString(pool.serviceDate) && pool.resourceIds.includes(l.resourceId))
    const relevant = legs.filter(l=>!selectedPool(booking,l) || selectedPool(booking,l) === pool.id)
    if (!relevant.length) continue
    if (relevant.some(l=>!selectedPool(booking,l) && otherPools.filter(p=>p.resourceIds.includes(l.resourceId)).length !== 1)) problems.push('EXISTING_BOOKING_WINDOW_UNRESOLVED')
    const attendance = booking.attendance?.find(a=>a.direction === pool.direction && dayString(a.serviceDate) === dayString(pool.serviceDate))
    const pax = booking.adults + booking.children - (attendance?.noShowAdults || 0) - (attendance?.noShowChildren || 0)
    if (pax <= 0) continue
    const assignments = booking.lines.filter(l=>pool.resourceIds.includes(l.resourceId)).flatMap(l=>l.dispatchAssignments || []).filter(a=>a.status !== 'CANCELLED' && a.run.direction === pool.direction && localStamp(a.run.slot.startsAt).slice(0,10) === dayString(pool.serviceDate))
    const vehicleIds = [...new Set(assignments.map(a=>a.run.slot.vehicleId))]
    if (vehicleIds.length > 1) problems.push('EXISTING_BOOKING_SPLIT')
    if (assignments.some(a=>!poolContainsRun(pool,a.run))) problems.push('ASSIGNMENT_WINDOW_CONFLICT')
    groups.push({id:booking.id,code:booking.code,version:booking.version,needsWindowSelection:relevant.some(leg=>!selectedPool(booking,leg)),pax,fixedBoatId:vehicleIds[0] || null,exclusive:relevant.some(l=>l.exclusive),overnight:(booking.programSnapshot?.durationDays || 1)>1 || Boolean(booking.outboundDate && booking.returnDate && +booking.returnDate > +booking.outboundDate)})
  }
  for (const hold of holds) if (hold.requestId !== excludeRequestId) groups.push({id:`hold:${hold.requestId}`,pax:hold.passengers,exclusive:hold.exclusive,hold:true})
  return {pool,boats,groups,unavailable,problems:[...new Set(problems)]}
}
export function solveContext(context, extra = []) {
  if (context.problems.length) return {status:'REVIEW_REQUIRED',reason:context.problems[0],assignments:[],optimal:false}
  return planBoatGroups({bookings:[...context.groups,...extra],boats:context.boats})
}
function publicChoices(pools) {
  return pools.map(p=>({id:p.id,startsAt:p.startsAt,endsAt:p.endsAt}))
}
export async function assessBookingCapacity(tx,booking,{excludeRequestId=null,now=new Date(),contextCache=null} = {}) {
  const wanted = selections(booking.programSnapshot?.capacitySelections || []), legs = bookingLegs(booking), groupSize = int(booking.adults,0,9999)+int(booking.children,0,9999)
  if (groupSize < 1) fail('INVALID_PASSENGER_COUNT',400)
  if(!legs.length&&(booking.lines||[]).some(line=>line.selected&&boatCategories.includes((line.resource||line.snapshot||{}).category))){
    return {canConfirm:false,status:'WAITING_TEAM',groupSize,legs:[{resourceId:null,direction:'OUTBOUND',serviceDate:null,status:'REVIEW_REQUIRED',canFit:false,remainingSeats:null,reason:'CAPACITY_JOURNEY_UNRESOLVED',choices:[]}],unresolvedReturn:booking.returnStatus==='PENDING',selections:wanted}
  }

  const results = [], contexts = new Map(), resolved = [], grouped = new Map()
  for (const leg of legs) {
    const cacheKey='leg:'+legKey(leg)
    if(contextCache&&!contextCache.has(cacheKey))contextCache.set(cacheKey,await poolsForLeg(tx,leg))
    const pools = contextCache?contextCache.get(cacheKey):await poolsForLeg(tx,leg), chosen = wanted.find(s=>legKey(s) === legKey(leg))
    const pool = chosen ? pools.find(p=>p.id === chosen.poolId) : pools.length === 1 ? pools[0] : null
    if (!pool) {if(chosen)resolved.push({...leg,poolId:chosen.poolId});results.push({...leg,status:'REVIEW_REQUIRED',canFit:false,remainingSeats:null,reason:pools.length>1?'SELECT_SERVICE_WINDOW':'CAPACITY_NOT_CONFIGURED',choices:publicChoices(pools)});continue}
    resolved.push({...leg,poolId:pool.id})
    const entry = grouped.get(pool.id) || {pool,legs:[],exclusive:false}
    entry.legs.push({...leg,choices:publicChoices(pools)});entry.exclusive ||= leg.exclusive;grouped.set(pool.id,entry)
  }
  for (const {pool,legs:poolLegs,exclusive} of grouped.values()) {
    let context
    if(contextCache){
      if(!contextCache.has(pool.id))contextCache.set(pool.id,await poolContext(tx,pool,{now}))
      const cached=contextCache.get(pool.id)
      context={...cached,problems:[...cached.problems],groups:cached.groups.filter(g=>g.id!==booking.id&&g.id!==`hold:${excludeRequestId}`)}
    }else context=await poolContext(tx,pool,{excludeBookingId:booking.id || null,excludeRequestId,now})
    contexts.set(pool.id,context)
    const before = solveContext(context)
    const attendance=booking.attendance?.find(row=>row.direction===pool.direction&&dayString(row.serviceDate)===dayString(pool.serviceDate))
    const activePax=Math.max(0,groupSize-(attendance?.noShowAdults||0)-(attendance?.noShowChildren||0))
    const candidate = {id:booking.id || 'candidate',pax:activePax,exclusive}
    const current = candidateAssignments(booking,pool,context,groupSize)
    const pinned = [...new Set(current.map(a=>a.run.slot.vehicleId))]
    if (pinned.length>1) context.problems.push('EXISTING_BOOKING_SPLIT')
    if (pinned.length===1) candidate.fixedBoatId=pinned[0]
    const plan = solveContext(context,activePax?[candidate]:[])
    const charterUnused = (before.assignments || []).filter(a=>a.exclusive).reduce((n,a)=>n+a.capacity-a.pax,0)
    const remainingSeats = before.status === 'FEASIBLE' ? Math.max(0,context.boats.reduce((n,b)=>n+b.capacity,0)-context.groups.reduce((n,g)=>n+g.pax,0)-charterUnused) : null
    for (const leg of poolLegs) results.push({...leg,poolId:pool.id,choices:leg.choices||publicChoices([pool]),status:plan.status,canFit:plan.status==='FEASIBLE',remainingSeats,reason:plan.reason || null,holdMinutes:pool.holdMinutes})
  }
  const canConfirm = results.every(r=>r.canFit)
  return {canConfirm,status:canConfirm?'AVAILABLE':'WAITING_TEAM',groupSize,legs:results,unresolvedReturn:booking.returnStatus === 'PENDING',selections:resolved.map(({resourceId,direction,serviceDate,poolId})=>({resourceId,direction,serviceDate,poolId}))}
}
export function vanEstimate(context) {
  const factor=context.pool.overnightLoadTenths,actualPassengers=context.groups.reduce((n,g)=>n+g.pax,0)
  let overnight=context.groups.filter(g=>g.overnight).reduce((n,g)=>n+g.pax,0),day=actualPassengers-overnight
  const weightedTenths=day*10+overnight*factor,sorted=[...context.boats].sort((a,b)=>b.capacity-a.capacity)
  const referenceVehicleCapacity=Math.max(0,...context.pool.offers.filter(o=>o.vehicle?.status==='ACTIVE').map(o=>Math.min(o.capacity,o.vehicle.capacity)))
  const allocations=[]
  function load(capacity,id){let units=capacity*10;const nights=Math.min(overnight,Math.floor(units/factor));overnight-=nights;units-=nights*factor;const days=Math.min(day,Math.floor(units/10));day-=days;if(nights+days)allocations.push({vehicleId:id,passengers:nights+days,overnight:nights,day:days,weightedUnits:(nights*factor+days*10)/10,capacity})}
  for(const vehicle of sorted){if(!overnight&&!day)break;load(vehicle.capacity,vehicle.id)}
  const availableVehiclesUsed=allocations.length,additionalUnitsNeeded=(overnight*factor+day*10)/10
  let extraVehicles=0
  if(referenceVehicleCapacity>0){while(overnight+day>0&&extraVehicles<10000){const before=overnight+day;load(referenceVehicleCapacity,null);if(before===overnight+day)break;extraVehicles++}}
  return {actualPassengers,weightedUnits:weightedTenths/10,overnightFactor:factor/10,minimumAvailableVehicles:overnight+day>0?null:allocations.length,availableVehiclesUsed,extraVehicles,referenceVehicleCapacity:referenceVehicleCapacity||null,additionalUnitsNeeded,allocations,provisional:true,optimal:false,requiresRouteAndLuggageReview:true}
}

function candidateAssignments(booking,pool,context,groupSize) {
  const lines=(booking.lines||[]).filter(line=>pool.resourceIds.includes(line.resourceId))
  const assignments=lines.flatMap(line=>line.dispatchAssignments||[]).filter(assignment=>{
    const run=assignment.run
    return assignment.status!=='CANCELLED'&&run.direction===pool.direction&&localStamp(run.slot.startsAt).slice(0,10)===dayString(pool.serviceDate)
  })
  if(assignments.some(assignment=>!poolContainsRun(pool,assignment.run)))context.problems.push('ASSIGNMENT_WINDOW_CONFLICT')
  if(lines.some(line=>line.selected&&line.resource?.baseUnit==='PERSON'&&Number(line.quantity)<groupSize))context.problems.push('GROUP_SERVICE_QUANTITY_MISMATCH')
  return assignments
}
