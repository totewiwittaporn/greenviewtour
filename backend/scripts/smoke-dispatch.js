// Verified Preview only. Creates isolated QA fixtures and cleans only this run's records.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
import { profileInclude } from '../src/modules/identity-access/policy.js'
import { managementScope } from '../src/modules/identity-access/user-management.js'
import { initialValues } from '../../packages/contracts/catalog.js'
import { saveSettings } from '../src/modules/service-catalog/settings.js'
import { saveOperationCatalog, listOperations } from '../src/modules/operations/catalog.js'
import { saveBooking, bookingStatus, amendBookingDetails } from '../src/modules/operations/bookings.js'
import { saveRun, dispatchCommand, listJobs, dispatchOptions } from '../src/modules/operations/dispatch.js'
import { prepareDailySummary } from '../src/modules/operations/notifications.js'
loadEnvFile(new URL('../.env', import.meta.url))
const pool = createDatabasePool(), prisma = createPrisma(pool), prefix = `QADSP-${Date.now()}`
const ids = new Set(), profiles = [], snapshots = [], checks = []
let manager
const id = () => { const value = randomUUID(); ids.add(value); return value }
const pass = name => { checks.push(name); console.log('PASS ' + name) }
const reject = async (fn, code) => { await assert.rejects(fn, error => error.code === code); pass(code) }
const params = value => new URLSearchParams(value)
const catalog = async (entity, data) => (await saveOperationCatalog(prisma, manager, entity, { ...initialValues(entity), ...data, id: id(), version: 0 })).row
const fleet = async (suffix, kind) => (await saveSettings(prisma, manager, 'vehicles', { ...initialValues('vehicles'), id: id(), version: 0, code: prefix + suffix, name: prefix + suffix, kind, engineCount:kind==='SPEEDBOAT'?'2':'', capacity: '5', totalCapacity: '7', expectedCrew: '1', ownership: 'GREENVIEW' })).row
const staff = async role => { const userId = id(); profiles.push(userId); await prisma.userProfile.create({ data: { id: userId, displayName: prefix + role, status: 'ACTIVE', roles: { create: { roleCode: role, scope: 'SELF' } } } }); return userId }
const command = async (actor, run, data) => { const result = await dispatchCommand(prisma, actor, { id: id(), runId: run.id, version: run.version, ...data }); run.version = result.version; return result }
let date
try {
  manager = (await prisma.userProfile.findMany({ where: { status: 'ACTIVE' }, include: profileInclude })).find(p => managementScope(p)?.company)?.id
  assert.ok(manager, 'An active company manager is required')
  // Find an unused far-future service date; snapshots must never overwrite user data.
  for (let day = 1; day <= 28; day++) {
    const candidate = `2098-11-${String(day).padStart(2, '0')}`
    if (!await prisma.operationDailySnapshot.count({ where: { serviceDate: new Date(candidate + 'T00:00:00Z') } }) && !await prisma.serviceSlot.count({ where: { startsAt: { gte: new Date(candidate + 'T00:00:00+07:00'), lt: new Date(candidate + 'T23:59:59+07:00') } } })) { date = candidate; break }
  }
  assert.ok(date, 'Unused QA date required')
  const bookingUser = await staff('BOOKING'), guide = await staff('GUIDE'), captain = await staff('CAPTAIN'), headDriver = await staff('HEAD_DRIVER'), driver = await staff('DRIVER'), otherDriver = await staff('DRIVER')
  const boat = await fleet('-BOAT', 'SPEEDBOAT'), boat2 = await fleet('-BOAT2', 'SPEEDBOAT'), van = await fleet('-VAN', 'VAN')
  const boatService = await catalog('services', { code: prefix + '-TOUR', name: prefix + ' Tour boat', category: 'TOUR_BOAT', baseUnit: 'PERSON', salePrice: '100', serviceMode: 'JOIN', ownership: 'GREENVIEW' })
  const transfer = await catalog('services', { code: prefix + '-TRANSFER', name: prefix + ' Transfer', category: 'TRANSFER', baseUnit: 'PERSON', salePrice: '50', ownership: 'GREENVIEW' })
  const trip = (await saveOperationCatalog(prisma, bookingUser, 'trips', { ...initialValues('trips'), id: id(), version: 0, code: prefix + '-TRIP', name: prefix + ' Trip', startsAt: date + ' 07:00', endsAt: date + ' 18:00', capacity: '30' })).row
  const bookingInput = { id: id(), version: 0, code: prefix + '-GROUP', name: prefix + ' Group', tripId: trip.id, adults: 3, children: 1, adultPrice: '0', childPrice: '0', paymentTerms: 'COUNTER', hotel: 'QA hotel', room: '123', contactPhone: '0812345678', allergies: 'QA shellfish', assistance: 'Wheelchair assistance requested', lines: [{ resourceId: boatService.id, quantity: 4, selected: true, dispatchDirection: 'BOTH' }, { resourceId: transfer.id, quantity: 4, selected: true, dispatchDirection: 'OUTBOUND' }] }
  const booking = (await saveBooking(prisma, bookingUser, bookingInput)).row
  await bookingStatus(prisma, bookingUser, { id: id(), bookingId: booking.id, version: booking.version, action: 'CONFIRM' }); booking.version++
  pass('Booking SELF role confirms unassigned boat and transfer independently')
  await reject(() => saveRun(prisma, bookingUser, { id: id(), version: 0, code: prefix + '-DENIED', name: 'Denied', kind: 'BOAT', direction: 'OUTBOUND', period: 'AM', resourceId: boatService.id, vehicleId: boat.id, startsAt: date + ' 10:00', endsAt: date + ' 12:00', capacity: 5, staff: [] }), 'PERMISSION_DENIED')
  await reject(() => saveBooking(prisma, bookingUser, { ...bookingInput, id: id(), code: prefix + '-AFTER', paymentTerms: 'AFTER_SERVICE', afterServiceReason: 'Requested exception' }), 'PERMISSION_DENIED')
  await reject(() => listOperations(prisma, guide, 'bookings', params({})), 'PERMISSION_DENIED')
  const runInput = { id: id(), version: 0, code: prefix + '-OUT', name: prefix + ' Boat outbound', kind: 'BOAT', direction: 'OUTBOUND', period: 'AM', resourceId: boatService.id, vehicleId: boat.id, startsAt: date + ' 10:00', endsAt: date + ' 12:00', capacity: 5, staff: [{ userId: captain, role: 'CAPTAIN' }] }
  await reject(() => saveRun(prisma, guide, { ...runInput, id: id(), code: prefix + '-WRONG', vehicleId: van.id }), 'INVALID_VEHICLE_ASSIGNMENT')
  const out = (await saveRun(prisma, guide, runInput)).row
  assert.equal((await saveRun(prisma, guide, runInput)).row.version, out.version); pass('run creation retry is idempotent')
  await reject(() => saveRun(prisma, guide, { ...runInput, id: id(), code: prefix + '-CLASH', vehicleId: boat2.id }), 'STAFF_TIME_CONFLICT')
  const back = (await saveRun(prisma, guide, { ...runInput, id: id(), code: prefix + '-BACK', name: prefix + ' Boat return', direction: 'RETURN', period: 'PM', startsAt: date + ' 14:00', endsAt: date + ' 16:00' })).row
  const road = (await saveRun(prisma, headDriver, { id: id(), version: 0, code: prefix + '-ROAD', name: prefix + ' Van', kind: 'VEHICLE', direction: 'OUTBOUND', period: 'AM', resourceId: transfer.id, vehicleId: van.id, startsAt: date + ' 08:00', endsAt: date + ' 09:00', capacity: 5, staff: [{ userId: driver, role: 'DRIVER' }] })).row
  const boatLine = booking.lines.find(l => l.resourceId === boatService.id), roadLine = booking.lines.find(l => l.resourceId === transfer.id)
  const assignInput = { id: id(), runId: out.id, version: out.version, action: 'ASSIGN', bookingLineId: boatLine.id, adults: 3, children: 1 }
  const assigned = await dispatchCommand(prisma, guide, assignInput); out.version = assigned.version
  assert.deepEqual(await dispatchCommand(prisma, guide, assignInput), assigned); assert.equal(await prisma.dispatchAssignment.count({ where: { runId: out.id } }), 1); pass('assignment retry cannot double allocate passengers')
  await command(guide, back, { action: 'ASSIGN', bookingLineId: boatLine.id, adults: 3, children: 1 })
  await reject(() => command(guide, road, { action: 'ASSIGN', bookingLineId: roadLine.id, adults: 3, children: 1, pickupAt: date + ' 08:15' }), 'PERMISSION_DENIED')
  await reject(() => command(headDriver, road, { action: 'ASSIGN', bookingLineId: roadLine.id, adults: 3, children: 1 }), 'PICKUP_TIME_REQUIRED')
  await command(headDriver, road, { action: 'ASSIGN', bookingLineId: roadLine.id, adults: 3, children: 1, pickupAt: date + ' 08:15' })
  const extra = (await saveRun(prisma, guide, { ...runInput, id: id(), code: prefix + '-EXTRA', vehicleId: boat2.id, staff: [] })).row
  await reject(() => command(guide, extra, { action: 'ASSIGN', bookingLineId: boatLine.id, adults: 1, children: 0 }), 'BOOKING_PASSENGERS_EXCEEDED')
  const crewJob = (await listJobs(prisma, captain, params({ kind: 'BOAT', runId: out.id }))).rows[0]
  assert.equal(crewJob.assignments[0].booking.allergies, 'QA shellfish'); assert.equal(crewJob.assignments[0].booking.hotel, undefined); assert.equal(crewJob.assignments[0].booking.paymentTerms, undefined)
  const driverJob = (await listJobs(prisma, driver, params({ kind: 'VEHICLE' }))).rows.find(r => r.id === road.id)
  assert.ok(driverJob); assert.equal(driverJob.assignments[0].booking.hotel, 'QA hotel'); assert.equal(driverJob.assignments[0].booking.allergies, undefined)
  assert.equal((await listJobs(prisma, otherDriver, params({ kind: 'VEHICLE', runId: road.id }))).total, 0)
  await reject(() => command(driver, road, { action: 'REMOVE', assignmentId: driverJob.assignments[0].id }), 'PERMISSION_DENIED'); pass('crew and driver jobs enforce own assignment and field projections')
  const pending = await dispatchOptions(prisma, headDriver, params({ kind: 'VEHICLE', entity: 'pending', date, direction: 'RETURN', resourceId: transfer.id }))
  assert.equal(pending.rows.some(l => l.id === roadLine.id), false); pass('one-way transfers do not appear as return requests')
  const amendment = { id: id(), bookingId: booking.id, version: booking.version, amendmentReason: 'Agent corrected the hotel room', room: '456' }
  const amended = await amendBookingDetails(prisma, bookingUser, amendment); booking.version = amended.version
  assert.deepEqual(await amendBookingDetails(prisma, bookingUser, amendment), amended)
  const refreshedRoad = (await listJobs(prisma, driver, params({ kind: 'VEHICLE', runId: road.id }))).rows[0]
  assert.equal(refreshedRoad.assignments[0].booking.room, '456'); assert.equal(refreshedRoad.version, road.version + 1); road.version = refreshedRoad.version
  out.version++; back.version++; pass('confirmed detail amendments refresh job revisions without changing reservations')
  await reject(() => bookingStatus(prisma, bookingUser, { id: id(), bookingId: booking.id, version: booking.version, action: 'COMPLETE' }), 'DISPATCH_INCOMPLETE')
  const assignment = async run => (await prisma.dispatchAssignment.findMany({ where: { runId: run.id } }))[0]
  await command(guide, out, { action: 'ACTUAL', assignmentId: (await assignment(out)).id, actualAdults: 3, actualChildren: 1 })
  await reject(() => command(guide, back, { action: 'ACTUAL', assignmentId: 'invalid', actualAdults: 2, actualChildren: 1 }), 'INVALID_REFERENCE')
  await reject(async () => command(guide, back, { action: 'ACTUAL', assignmentId: (await assignment(back)).id, actualAdults: 2, actualChildren: 1 }), 'PASSENGER_CHANGE_REASON_REQUIRED')
  await command(guide, back, { action: 'ACTUAL', assignmentId: (await assignment(back)).id, actualAdults: 2, actualChildren: 1, changeReason: 'One adult remains on the island with an agreed later return' })
  await command(headDriver, road, { action: 'ACTUAL', assignmentId: (await assignment(road)).id, actualAdults: 3, actualChildren: 1 })
  await bookingStatus(prisma, bookingUser, { id: id(), bookingId: booking.id, version: booking.version, action: 'COMPLETE' }); pass('outbound and return actuals are independent and changes require reasons')
  const summary = await prepareDailySummary(prisma, manager, { serviceDate: date, kind: 'SUMMARY' }, undefined, {})
  snapshots.push(summary.snapshot.id); assert.equal(summary.readiness.status, 'NOT_CONFIGURED'); assert.equal(summary.outbox, null)
  assert.equal(summary.snapshot.runs.find(r => r.id === out.id).passengers, 4)
  assert.equal((await prepareDailySummary(prisma, manager, { serviceDate: date, kind: 'SUMMARY' }, undefined, {})).snapshot.id, summary.snapshot.id)
  pass('real daily snapshot stores safe totals idempotently without sending LINE')
  const charterService=await catalog('services',{code:prefix+'-CHARTER',name:prefix+' Charter',category:'TOUR_BOAT',baseUnit:'BOAT',salePrice:'1000',serviceMode:'CHARTER',ownership:'GREENVIEW'})
  const charterRun=(await saveRun(prisma,guide,{...runInput,id:id(),code:prefix+'-CHARTER-RUN',resourceId:charterService.id,startsAt:date+' 16:30',endsAt:date+' 17:30',period:'PM'})).row
  const charterBookings=[]
  for(let index=0;index<2;index++){
    const item=(await saveBooking(prisma,bookingUser,{...bookingInput,id:id(),code:prefix+'-CHARTER-'+index,adults:1,children:0,lines:[{resourceId:charterService.id,quantity:1,selected:true,dispatchDirection:'OUTBOUND'}]})).row
    await bookingStatus(prisma,bookingUser,{id:id(),bookingId:item.id,version:item.version,action:'CONFIRM'})
    charterBookings.push(item)
  }
  await command(guide,charterRun,{action:'ASSIGN',bookingLineId:charterBookings[0].lines[0].id,adults:1,children:0})
  await reject(()=>command(guide,charterRun,{action:'ASSIGN',bookingLineId:charterBookings[1].lines[0].id,adults:1,children:0}),'CHARTER_ALREADY_ASSIGNED')
  const stale={...runInput,id:out.id,version:1}
  await reject(()=>saveRun(prisma,guide,stale),'SETTINGS_CONFLICT')
  const security = await pool.query("SELECT relname,relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') AS anon_read,has_table_privilege('authenticated',c.oid,'SELECT') AS user_read FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app_private' AND c.relname IN ('DispatchRun','DispatchStaff','DispatchAssignment')")
  assert.equal(security.rows.length, 3); assert.ok(security.rows.every(r => r.relrowsecurity && !r.anon_read && !r.user_read)); pass('dispatch tables are private with RLS enabled')
  console.log(JSON.stringify({ result: 'PASS', environment: 'preview', checks: checks.length, prefix }))
} catch (error) { console.error('QA DISPATCH FAILED', error.code || error.message); process.exitCode = 1 }
finally {
  try {
    await prisma.$transaction(async tx => {
      await tx.operationNotificationOutbox.deleteMany({ where: { snapshotId: { in: snapshots } } })
      await tx.operationDailySnapshot.deleteMany({ where: { id: { in: snapshots } } })
      const runs = await tx.dispatchRun.findMany({ where: { code: { startsWith: prefix } }, select: { id: true, slotId: true } })
      const runIds = runs.map(r => r.id)
      await tx.dispatchAssignment.deleteMany({ where: { runId: { in: runIds } } }); await tx.dispatchStaff.deleteMany({ where: { runId: { in: runIds } } }); await tx.dispatchRun.deleteMany({ where: { id: { in: runIds } } })
      const bookings = await tx.tourBooking.findMany({ where: { code: { startsWith: prefix } }, select: { id: true } }), bookingIds = bookings.map(b => b.id)
      await tx.bookingComponent.deleteMany({ where: { bookingId: { in: bookingIds } } }); await tx.tourBooking.deleteMany({ where: { id: { in: bookingIds } } })
      await tx.serviceSlot.deleteMany({ where: { code: { startsWith: prefix } } }); await tx.operationTrip.deleteMany({ where: { code: { startsWith: prefix } } })
      await tx.operationResource.deleteMany({ where: { code: { startsWith: prefix } } }); await tx.fleetVehicle.deleteMany({ where: { code: { startsWith: prefix } } })
      await tx.userProfile.deleteMany({ where: { id: { in: profiles } } }); await tx.operationCommand.deleteMany({ where: { id: { in: [...ids] } } }); await tx.auditEvent.deleteMany({ where: { targetId: { in: [...ids] } } })
    }, { timeout: 30000 })
    console.log('QA dispatch fixture cleanup complete')
  } catch (error) { console.error('QA cleanup requires follow-up', error.code || error.message, prefix); process.exitCode = 1 }
  await prisma.$disconnect(); await pool.end()
}
