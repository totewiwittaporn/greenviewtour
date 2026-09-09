import { randomUUID } from 'node:crypto'
import { parseStamp, localStamp } from '../../../../packages/contracts/operations.js'
import { active, audit, authorize, dateOnly, fail, hash, int, keys, string, uuid, write } from './common.js'
import { profileInclude } from '../identity-access/policy.js'

export const dispatchCategories = ['TRANSFER', 'TOUR_BOAT', 'LONGTAIL_BOAT']
const boatRoles = ['GUIDE', 'HEAD_GUIDE', 'ASSISTANT_TOUR_GUIDE', 'CAPTAIN', 'HEAD_CAPTAIN', 'ASSISTANT_CAPTAIN']
const driverRoles = ['DRIVER', 'HEAD_DRIVER']
const fullRun = {
  slot: { include: { resource: true, vehicle: true } },
  staff: { include: { user: true } },
  assignments: { include: { bookingLine: { include: { booking: { include: { trip: true } }, resource: true } } } },
}
const categoryKind = category => category === 'TRANSFER' ? 'VEHICLE' : ['TOUR_BOAT', 'LONGTAIL_BOAT'].includes(category) ? 'BOAT' : null
const liveAssignment = item => ['CONFIRMED', 'COMPLETED'].includes(item.bookingLine.booking.status)
function kind(value) { if (!['BOAT', 'VEHICLE'].includes(value)) fail('INVALID_DISPATCH_KIND', 400); return value }
function stamp(value) { try { return parseStamp(value) } catch { fail('INVALID_TIME', 400) } }
function optional(value, max = 200) { return value == null || value === '' ? null : string(value, max, false) }
function duty(runKind, edit = false) { return runKind === 'BOAT' ? edit ? 'manageGuide' : 'guide' : edit ? 'manageDriver' : 'driver' }
function serviceDay(value) {
  dateOnly(value)
  const start = stamp(`${value} 00:00`)
  return { gte: start, lt: new Date(+start + 86400000) }
}
function paging(params) {
  return { page: int(params.get('page') || 1, 1, 100000), q: string(params.get('q') || '', 100, false) }
}
function pageResult(rows, total, requested, extra = {}) {
  const pages = Math.max(1, Math.ceil(total / 25)), page = Math.min(requested, pages)
  return { rows, total, page, pages, pageSize: 25, ...extra }
}
export function jobBooking(booking, runKind) {
  const row = {
    id: booking.id, code: booking.code, name: booking.name, status: booking.status,
    adults: booking.adults, children: booking.children, agentId: booking.agentId,
    agentName: booking.agentName || 'Direct booking', agentPhone: booking.agentPhone,
    agentReference: booking.agentReference, contactPhone: booking.contactPhone,
    hotel: booking.hotel, room: booking.room, pickupPoint: booking.pickupPoint,
    dropoffPoint: booking.dropoffPoint, allergies: booking.allergies, assistance: booking.assistance,
    arrivalAt: booking.trip?.startsAt, departureAt: booking.trip?.endsAt,
    requestNotes: booking.requestNotes, programName: booking.programSnapshot?.name || booking.trip?.name,
  }
  if(runKind==='BOAT'){delete row.hotel;delete row.room;delete row.agentPhone;delete row.contactPhone;delete row.pickupPoint;delete row.dropoffPoint}
  if(runKind==='VEHICLE'){delete row.allergies;delete row.requestNotes}
  return row
}
export function jobRun(row) {
  const assignments = row.assignments.filter(liveAssignment).map(item => ({
    id: item.id, bookingLineId: item.bookingLineId, adults: item.adults, children: item.children,
    pickupAt: item.pickupAt, dropoffPoint: item.dropoffPoint, notes: item.notes,
    actualAdults: item.actualAdults, actualChildren: item.actualChildren, changeReason: item.changeReason,
    booking: jobBooking(item.bookingLine.booking,row.kind),
  }))
  return {
    id: row.id, version: row.version, code: row.code, name: row.name, kind: row.kind,
    direction: row.direction, period: row.period, capacity: row.capacity, status: row.status,
    updatedAt: row.updatedAt,
    slot: {
      id: row.slot.id, resourceId: row.slot.resourceId, vehicleId: row.slot.vehicleId,
      startsAt: row.slot.startsAt, endsAt: row.slot.endsAt, capacity: row.slot.capacity,
      resource: { id: row.slot.resource.id, name: row.slot.resource.name, category: row.slot.resource.category },
      vehicle: row.slot.vehicle ? { id: row.slot.vehicle.id, name: row.slot.vehicle.name, capacity: row.slot.vehicle.capacity } : null,
    },
    staff: row.staff.map(member => ({ userId: member.userId, role: member.role, name: member.user.displayName })),
    assignments, passengers: assignments.reduce((sum, item) => sum + item.adults + item.children, 0),
  }
}

export async function listJobs(prisma, actorId, params) {
  const runKind = kind(params.get('kind') || 'BOAT')
  const { access } = await authorize(prisma, actorId, duty(runKind))
  const canManage = access[duty(runKind, true)]
  const { page: requested, q } = paging(params)
  const where = { kind: runKind, ...(canManage ? {} : { staff: { some: { userId: actorId } } }) }
  if (params.get('direction')) { if(!['OUTBOUND','RETURN'].includes(params.get('direction'))) fail('INVALID_FILTER',400); where.direction=params.get('direction') }
  if (params.get('runId')) where.id = uuid(params.get('runId'))
  if (params.get('date')) where.slot = { startsAt: serviceDay(params.get('date')) }
  if (q) where.OR = [{ code: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }]
  return prisma.$transaction(async tx => {
    const total = await tx.dispatchRun.count({ where }), page = Math.min(requested, Math.max(1, Math.ceil(total / 25)))
    const rows = await tx.dispatchRun.findMany({ where, include: fullRun, skip: (page - 1) * 25, take: 25, orderBy: [{ slot: { startsAt: 'asc' } }, { id: 'asc' }] })
    const summaryWhere={...where};delete summaryWhere.direction
    const summaryRows=await tx.dispatchRun.findMany({where:summaryWhere,select:{direction:true,assignments:{where:{bookingLine:{booking:{status:{in:['CONFIRMED','COMPLETED']}}}},select:{adults:true,children:true}}}})
    const summary={total:summaryRows.length,outbound:summaryRows.filter(r=>r.direction==='OUTBOUND').length,return:summaryRows.filter(r=>r.direction==='RETURN').length,passengers:summaryRows.reduce((n,r)=>n+r.assignments.reduce((sum,a)=>sum+a.adults+a.children,0),0)}
    let documentRuns
    if (params.get('document') === 'boat-day' && runKind === 'BOAT' && params.get('runId') && rows[0]?.slot.vehicleId) {
      // Keep the same per-run staff authorization when collecting the other direction.
      const anchor = rows[0]
      documentRuns = (await tx.dispatchRun.findMany({
        where: { kind: 'BOAT', ...(canManage ? {} : { staff: { some: { userId: actorId } } }), slot: { vehicleId: anchor.slot.vehicleId, startsAt: serviceDay(localStamp(anchor.slot.startsAt).slice(0, 10)) } },
        include: fullRun, orderBy: [{ slot: { startsAt: 'asc' } }, { id: 'asc' }],
      })).map(jobRun)
    }
    return pageResult(rows.map(jobRun), total, page, { canManage, summary, ...(documentRuns ? { documentRuns } : {}) })
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 })
}

export async function dispatchOptions(prisma, actorId, params) {
  const runKind = kind(params.get('kind') || 'BOAT')
  await authorize(prisma, actorId, duty(runKind, true))
  const entity = params.get('entity'), { page: requested, q } = paging(params)
  if (!['services', 'vehicles', 'staff', 'pending'].includes(entity)) fail('INVALID_FILTER', 400)
  const categories = runKind === 'BOAT' ? ['TOUR_BOAT', 'LONGTAIL_BOAT'] : ['TRANSFER']
  const allowedRoles = runKind === 'BOAT' ? boatRoles : driverRoles
  let model, where, select, include
  if (entity === 'services') {
    model = 'operationResource'; where = { status: 'ACTIVE', kind: 'SERVICE', category: { in: categories } }
    select = { id: true, code: true, name: true, category: true, baseUnit: true }
  } else if (entity === 'vehicles') {
    model = 'fleetVehicle'; where = { status: 'ACTIVE', kind: runKind === 'BOAT' ? {in:['SPEEDBOAT','LONGTAIL_BOAT']} : {notIn:['SPEEDBOAT','LONGTAIL_BOAT']} }
    select = { id: true, code: true, name: true, kind: true, capacity: true, totalCapacity: true, expectedCrew: true }
  } else if (entity === 'staff') {
    model = 'userProfile'; where = { status: 'ACTIVE', roles: { some: { roleCode: { in: allowedRoles }, scope: { in: ['SELF', 'COMPANY'] } } } }
    select = { id: true, displayName: true, roles: { select: { roleCode: true, scope: true } } }
  } else {
    model = 'bookingComponent'
    where = { dispatchDirection:{in:[params.get('direction')||'OUTBOUND','BOTH']}, selected: true, resource: { category: { in: categories } }, booking: { status: 'CONFIRMED' } }
    if(params.get('resourceId'))where.resourceId=uuid(params.get('resourceId'))
    if (params.get('date')) {
      const range = serviceDay(params.get('date'))
      where.booking.trip = { startsAt: { lt: range.lt }, endsAt: { gte: range.gte } }
    }
    include = { resource: true, booking: { include: { trip: true } }, dispatchAssignments: { include: { run: true } } }
  }
  if (q) {
    if (entity === 'staff') where.displayName = { contains: q, mode: 'insensitive' }
    else if (entity === 'pending') where.booking.OR = [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }]
    else where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }]
  }
  return prisma.$transaction(async tx => {
    const total = await tx[model].count({ where }), page = Math.min(requested, Math.max(1, Math.ceil(total / 25)))
    let rows = await tx[model].findMany({ where, select, include, skip: (page - 1) * 25, take: 25, orderBy: { id: 'asc' } })
    if (entity === 'staff') rows = rows.map(row => ({ id: row.id, name: row.displayName, roles: row.roles.filter(g => ['SELF', 'COMPANY'].includes(g.scope) && allowedRoles.includes(g.roleCode)).map(g => g.roleCode) }))
    if (entity === 'pending') rows = rows.map(row => {
      const assignments = row.dispatchAssignments.filter(a => a.run.direction === (params.get('direction') || 'OUTBOUND'))
      return { id: row.id, name: row.booking.name+' · '+row.resource.name, code: row.booking.code, quantity: row.quantity, resource: { id: row.resource.id, name: row.resource.name }, booking: jobBooking(row.booking,runKind), assignedAdults: assignments.reduce((n, a) => n + a.adults, 0), assignedChildren: assignments.reduce((n, a) => n + a.children, 0) }
    })
    return pageResult(rows, total, page)
  }, { isolationLevel: 'RepeatableRead', timeout: 15000 })
}

async function checkRun(tx, data, existing) {
  const resource = await active(tx, 'operationResource', data.resourceId)
  const vehicle = await active(tx, 'fleetVehicle', data.vehicleId)
  if (categoryKind(resource.category) !== data.kind || (['SPEEDBOAT','LONGTAIL_BOAT'].includes(vehicle.kind)) !== (data.kind === 'BOAT')) fail('INVALID_VEHICLE_ASSIGNMENT', 400)
  if(resource.category==='TOUR_BOAT'&&vehicle.kind!=='SPEEDBOAT'||resource.category==='LONGTAIL_BOAT'&&vehicle.kind!=='LONGTAIL_BOAT')fail('INVALID_VEHICLE_ASSIGNMENT',400)
  if (data.capacity > vehicle.capacity || vehicle.totalCapacity && data.capacity + data.staff.length > vehicle.totalCapacity) fail('VEHICLE_CAPACITY_EXCEEDED')
  if (data.endsAt <= data.startsAt || +data.endsAt - +data.startsAt > 86400000) fail('INVALID_TIME_RANGE', 400)
  if (data.period === 'AM' && Number(localStamp(data.startsAt).slice(11, 13)) >= 12 || data.period === 'PM' && Number(localStamp(data.startsAt).slice(11, 13)) < 12) fail('INVALID_RUN_PERIOD', 400)
  if (await tx.serviceSlot.count({ where: { id: { not: existing?.slotId || data.id }, status: 'ACTIVE', vehicleId: vehicle.id, startsAt: { lt: data.endsAt }, endsAt: { gt: data.startsAt } } })) fail('VEHICLE_TIME_CONFLICT')
  const seen = new Set(), allowedRoles = data.kind === 'BOAT' ? boatRoles : driverRoles
  for (const member of data.staff) {
    keys(member, ['userId', 'role']); uuid(member.userId)
    if (seen.has(member.userId) || !allowedRoles.includes(member.role)) fail('INVALID_RUN_STAFF', 400)
    seen.add(member.userId)
    const user = await tx.userProfile.findUnique({ where: { id: member.userId }, include: profileInclude })
    if (user?.status !== 'ACTIVE' || !user.roles.some(g => g.roleCode === member.role && ['SELF', 'COMPANY'].includes(g.scope))) fail('INVALID_RUN_STAFF', 400)
    if (await tx.dispatchStaff.count({ where: { userId: member.userId, runId: { not: data.id }, run: { status: 'OPEN', slot: { startsAt: { lt: data.endsAt }, endsAt: { gt: data.startsAt } } } } })) fail('STAFF_TIME_CONFLICT')
  }
  if (existing?.assignments.some(liveAssignment)) {
    if (existing.kind !== data.kind || existing.direction !== data.direction || existing.slot.resourceId !== data.resourceId || +existing.slot.startsAt !== +data.startsAt || +existing.slot.endsAt !== +data.endsAt) fail('RUN_IN_USE')
    const passengers = existing.assignments.filter(liveAssignment).reduce((n, a) => n + Math.max(a.adults + a.children, (a.actualAdults || 0) + (a.actualChildren || 0)), 0)
    if (passengers > data.capacity) fail('VEHICLE_CAPACITY_EXCEEDED')
  }
  return resource
}

export async function saveRun(prisma, actorId, input) {
  keys(input, ['id', 'version', 'code', 'name', 'kind', 'direction', 'period', 'resourceId', 'vehicleId', 'startsAt', 'endsAt', 'capacity', 'staff'])
  uuid(input.id); int(input.version, 0); kind(input.kind)
  if (!['OUTBOUND', 'RETURN'].includes(input.direction) || !['AM', 'PM', 'CUSTOM'].includes(input.period)) fail('INVALID_INPUT', 400)
  if (!Array.isArray(input.staff) || input.staff.length > 50) fail('INVALID_RUN_STAFF', 400)
  const requestHash = hash(input)
  return write(prisma, actorId, async tx => {
    const existing = await tx.dispatchRun.findUnique({ where: { id: input.id }, include: fullRun })
    if (existing && existing.kind !== input.kind) fail('INVALID_DISPATCH_KIND', 400)
    if (existing?.requestHash === requestHash && existing.version === input.version + 1) return { row: jobRun(existing) }
    if (existing ? existing.version !== input.version || existing.status !== 'OPEN' : input.version !== 0) fail('SETTINGS_CONFLICT')
    const data = { ...input, code: string(input.code, 40).toUpperCase(), name: string(input.name), resourceId: uuid(input.resourceId), vehicleId: uuid(input.vehicleId), startsAt: stamp(input.startsAt), endsAt: stamp(input.endsAt), capacity: int(input.capacity, 1, 10000) }
    if (!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(data.code)) fail('INVALID_CODE', 400)
    const resource = await checkRun(tx, data, existing)
    const slotData = { code: data.code, name: data.name, resourceId: data.resourceId, vehicleId: data.vehicleId, startsAt: data.startsAt, endsAt: data.endsAt, capacity: ['PERSON', 'PERSON_MEAL'].includes(resource.baseUnit) ? data.capacity : 1, status: 'ACTIVE' }
    const slot = existing ? await tx.serviceSlot.update({ where: { id: existing.slotId }, data: { ...slotData, version: { increment: 1 } } }) : await tx.serviceSlot.create({ data: { id: randomUUID(), ...slotData } })
    const runData = { code: data.code, name: data.name, kind: data.kind, direction: data.direction, period: data.period, capacity: data.capacity, slotId: slot.id, requestHash }
    if (existing) await tx.dispatchStaff.deleteMany({ where: { runId: existing.id } })
    const staff = { create: data.staff.map(member => ({ id: randomUUID(), userId: member.userId, role: member.role })) }
    const row = existing ? await tx.dispatchRun.update({ where: { id: existing.id }, data: { ...runData, version: { increment: 1 }, staff }, include: fullRun }) : await tx.dispatchRun.create({ data: { id: input.id, ...runData, staff }, include: fullRun })
    await audit(tx, actorId, row.id, 'run.saved', { kind: row.kind, version: row.version })
    return { row: jobRun(row) }
  }, duty(input.kind, true))
}

export async function dispatchCommand(prisma, actorId, input) {
  keys(input, ['id', 'runId', 'version', 'action', 'bookingLineId', 'assignmentId', 'adults', 'children', 'pickupAt', 'dropoffPoint', 'notes', 'actualAdults', 'actualChildren', 'changeReason'])
  uuid(input.id); uuid(input.runId); int(input.version)
  if (!['ASSIGN', 'REMOVE', 'ACTUAL'].includes(input.action)) fail('INVALID_ACTION', 400)
  // The transaction rechecks both account and run role; this initial lookup grants nothing.
  const ref = await prisma.dispatchRun.findUnique({ where: { id: input.runId }, select: { kind: true } })
  if (!ref) fail('NOT_FOUND', 404)
  return write(prisma, actorId, async tx => {
    const requestHash = hash(input), prior = await tx.operationCommand.findUnique({ where: { id: input.id } })
    if (prior) { if (prior.requestHash !== requestHash) fail('COMMAND_CONFLICT'); return prior.result }
    const run = await tx.dispatchRun.findUnique({ where: { id: input.runId }, include: fullRun })
    if (!run || run.version !== input.version || run.status !== 'OPEN') fail('SETTINGS_CONFLICT')
    const vehicle = await active(tx, 'fleetVehicle', run.slot.vehicleId)
    await active(tx, 'operationResource', run.slot.resourceId)
    if (run.slot.status !== 'ACTIVE' || vehicle.capacity < run.capacity || vehicle.totalCapacity && run.capacity + run.staff.length > vehicle.totalCapacity) fail('SERVICE_SLOT_UNAVAILABLE')
    for(const member of run.staff){
      const user=await tx.userProfile.findUnique({where:{id:member.userId},include:profileInclude})
      if(user?.status!=='ACTIVE'||!user.roles.some(g=>g.roleCode===member.role&&['SELF','COMPANY'].includes(g.scope)))fail('INVALID_RUN_STAFF',400)
    }
    if(input.action==='ACTUAL'&&vehicle.expectedCrew&&run.staff.length<vehicle.expectedCrew)fail('RUN_STAFF_INCOMPLETE')
    if (input.action === 'ASSIGN') {
      const line = await tx.bookingComponent.findUnique({ where: { id: uuid(input.bookingLineId) }, include: { resource: true, booking: { include: { trip: true } }, dispatchAssignments: { include: { run: true } } } })
      if (!line?.selected || !['BOTH',run.direction].includes(line.dispatchDirection) || line.booking.status !== 'CONFIRMED' || line.resourceId !== run.slot.resourceId || categoryKind(line.resource.category) !== run.kind) fail('INVALID_DISPATCH_BOOKING')
      if (run.slot.startsAt < line.booking.trip.startsAt || run.slot.endsAt > line.booking.trip.endsAt) fail('SERVICE_SLOT_UNAVAILABLE')
      const adults = int(input.adults, 0, 9999), children = int(input.children, 0, 9999)
      if (!adults && !children) fail('INVALID_QUANTITY', 400)
      const existing = run.assignments.find(a => a.bookingLineId === line.id)
      if (existing?.actualAdults != null) fail('ACTUAL_ALREADY_RECORDED')
      const other = line.dispatchAssignments.filter(a => a.run.direction === run.direction && a.runId !== run.id)
      if (other.reduce((n, a) => n + a.adults, adults) > line.booking.adults || other.reduce((n, a) => n + a.children, children) > line.booking.children) fail('BOOKING_PASSENGERS_EXCEEDED')
      if (line.resource.baseUnit === 'PERSON' && other.reduce((n, a) => n + a.adults + a.children, adults + children) > line.quantity) fail('BOOKING_PASSENGERS_EXCEEDED')
      const others = run.assignments.filter(a => liveAssignment(a) && a.id !== existing?.id)
      if (others.reduce((n, a) => n + a.adults + a.children, adults + children) > run.capacity) fail('VEHICLE_CAPACITY_EXCEEDED')
      if (line.resource.serviceMode === 'CHARTER' && others.some(a => a.bookingLine.bookingId !== line.bookingId)) fail('CHARTER_ALREADY_ASSIGNED')
      const pickupAt = input.pickupAt ? stamp(input.pickupAt) : null
      if (run.kind === 'VEHICLE' && !pickupAt) fail('PICKUP_TIME_REQUIRED', 400)
      if (pickupAt && (pickupAt < run.slot.startsAt || pickupAt > run.slot.endsAt)) fail('INVALID_PICKUP_TIME', 400)
      const data = { adults, children, pickupAt, dropoffPoint: optional(input.dropoffPoint), notes: optional(input.notes, 1000) }
      if (existing) await tx.dispatchAssignment.update({ where: { id: existing.id }, data })
      else await tx.dispatchAssignment.create({ data: { id: randomUUID(), runId: run.id, bookingLineId: line.id, ...data } })
    } else {
      const assignment = run.assignments.find(a => a.id === uuid(input.assignmentId))
      if (!assignment || !liveAssignment(assignment)) fail('NOT_FOUND', 404)
      if (input.action === 'REMOVE') {
        if (assignment.actualAdults != null) fail('ACTUAL_ALREADY_RECORDED')
        await tx.dispatchAssignment.delete({ where: { id: assignment.id } })
      } else {
        const actualAdults = int(input.actualAdults, 0, assignment.adults), actualChildren = int(input.actualChildren, 0, assignment.children)
        const changeReason = optional(input.changeReason, 1000)
        if ((actualAdults !== assignment.adults || actualChildren !== assignment.children) && !changeReason) fail('PASSENGER_CHANGE_REASON_REQUIRED', 400)
        await tx.dispatchAssignment.update({ where: { id: assignment.id }, data: { actualAdults, actualChildren, changeReason } })
      }
    }
    await tx.dispatchRun.update({ where: { id: run.id }, data: { version: { increment: 1 } } })
    const result = { ok: true, version: run.version + 1 }
    await audit(tx, actorId, run.id, `dispatch.${input.action.toLowerCase()}`, { version: result.version, bookingLineId: input.bookingLineId || null, assignmentId: input.assignmentId || null })
    await tx.operationCommand.create({ data: { id: input.id, requestHash, result } })
    return result
  }, duty(ref.kind, true))
}

export async function bookingOptions(prisma, actorId, params) {
  await authorize(prisma, actorId, 'booking')
  if (params.get('entity') !== 'agents') fail('INVALID_FILTER', 400)
  const { page: requested, q } = paging(params)
  const where = { status: 'ACTIVE', roles: { has: 'SALES_AGENT' } }
  if (q) where.OR = [{ code: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }]
  const total = await prisma.businessPartner.count({ where }), page = Math.min(requested, Math.max(1, Math.ceil(total / 25)))
  const rows = await prisma.businessPartner.findMany({ where, select: { id: true, code: true, name: true, phone: true }, skip: (page - 1) * 25, take: 25, orderBy: { name: 'asc' } })
  return pageResult(rows, total, page)
}
