import { randomUUID } from 'node:crypto'
import { audit, authorize, dateOnly, fail, hash, int, keys, string, uuid, write } from './common.js'
import { receivableAccess } from '../receivables/service.js'

export const thailandDay = (now = new Date()) => new Date(+now + 7 * 3600000).toISOString().slice(0, 10)
const day = value => value ? new Date(value).toISOString().slice(0, 10) : null
const include = { attendance: true, trip: true, lines: { include: { dispatchAssignments: { include: { run: { include: { slot: true } } } } } } }
const eligible = ['CONFIRMED', 'COMPLETED']
export function attendanceLegs(booking, date) {
 return ['OUTBOUND', 'RETURN'].filter(direction => direction === 'RETURN' ? booking.returnStatus === 'OUR' && day(booking.returnDate) === date : (booking.outboundDate ? day(booking.outboundDate) : booking.trip?.startsAt ? thailandDay(new Date(booking.trip.startsAt)) : null) === date)
}
export function attendanceRow(booking, date, direction) {
 const entry = booking.attendance.find(a => day(a.serviceDate) === date && a.direction === direction)
 const adults = entry?.adults || 0, children = entry?.children || 0, noShowAdults = entry?.noShowAdults || 0, noShowChildren = entry?.noShowChildren || 0
 return { bookingId: booking.id, code: booking.code, name: booking.name, program: booking.programSnapshot?.name || booking.trip?.name, serviceDate: date, direction, bookingVersion: booking.version, version: entry?.version || 0, adults, children, noShowAdults, noShowChildren, expectedAdults: booking.adults, expectedChildren: booking.children, remainingAdults: booking.adults - adults - noShowAdults, remainingChildren: booking.children - children - noShowChildren, reason: entry?.reason, financeStatus: entry?.financeStatus || 'NONE', financeReason: entry?.financeReason, changes: entry?.changes || [], demo: booking.programSnapshot?.demo === true, status: noShowAdults + noShowChildren ? adults + children ? 'PARTIAL_NO_SHOW' : 'NO_SHOW' : adults + children === booking.adults + booking.children ? 'CHECKED_IN' : adults + children ? 'PARTIAL' : 'WAITING' }
}
const whereDate = date => ({ status: { in: eligible }, OR: [{ outboundDate: dateOnly(date) }, { returnDate: dateOnly(date), returnStatus: 'OUR' }, { outboundDate: null, trip: { startsAt: { gte: new Date(`${date}T00:00:00+07:00`), lt: new Date(+new Date(`${date}T00:00:00+07:00`) + 86400000) } } }] })
async function allRows(tx, date) {
 const bookings = await tx.tourBooking.findMany({ where: whereDate(date), include, orderBy: { code: 'asc' } })
 return bookings.flatMap(b => attendanceLegs(b, date).map(direction => attendanceRow(b, date, direction)))
}
export async function checkInState(prisma, actorId, params) {
 await authorize(prisma, actorId, 'booking')
 const date = params.get('date') || thailandDay(); dateOnly(date)
 const q = string(params.get('q') || '', 100, false)?.toLowerCase(), requested = int(params.get('page') || 1, 1, 100000)
 return prisma.$transaction(async tx => {
  const all = await allRows(tx, date), filtered = all.filter(r => !q || `${r.code} ${r.name}`.toLowerCase().includes(q))
  const page = Math.min(requested, Math.max(1, Math.ceil(filtered.length / 25)))
  return { rows: filtered.slice((page - 1) * 25, page * 25), page, pageSize: 25, total: filtered.length, serviceDate: date, close: await tx.serviceDayClose.findUnique({ where: { serviceDate: dateOnly(date) } }), summary: { bookings: new Set(all.map(r => r.bookingId)).size, expected: all.reduce((n, r) => n + r.expectedAdults + r.expectedChildren, 0), present: all.reduce((n, r) => n + r.adults + r.children, 0), noShow: all.reduce((n, r) => n + r.noShowAdults + r.noShowChildren, 0), unresolved: all.filter(r => r.remainingAdults + r.remainingChildren > 0).length, financePending: all.filter(r => !['NONE', 'RETAIN_CHARGES'].includes(r.financeStatus)).length } }
 }, { isolationLevel: 'RepeatableRead', timeout: 30000 })
}
// One allowance per booking component, not per vehicle: split groups cannot be counted twice.
export function noShowPlan(booking, date, direction, presentAdults, presentChildren) {
 const changes = []
 for (const line of booking.lines) {
  const assignments = line.dispatchAssignments.filter(a => a.status !== 'CANCELLED' && a.run.direction === direction && thailandDay(new Date(a.run.slot.startsAt)) === date)
  const served = assignments.filter(a => a.actualAdults != null || a.actualChildren != null)
  let adults = Math.max(0, presentAdults - served.reduce((n, a) => n + (a.actualAdults || 0), 0)), children = Math.max(0, presentChildren - served.reduce((n, a) => n + (a.actualChildren || 0), 0))
  // Already recorded service remains immutable here, even when it exceeds arrivals.
  for (const a of served) changes.push({ id: a.id, runId: a.runId, run: a.run.name, beforeAdults: a.adults, beforeChildren: a.children, adults: a.adults, children: a.children, preserved: true, actualAdults: a.actualAdults, actualChildren: a.actualChildren })
  for (const a of assignments.filter(a => !served.includes(a)).sort((a, b) => +new Date(a.run.slot.startsAt) - +new Date(b.run.slot.startsAt) || a.id.localeCompare(b.id))) {
   const nextAdults = Math.min(a.adults, adults), nextChildren = Math.min(a.children, children)
   adults -= nextAdults; children -= nextChildren
   if (nextAdults !== a.adults || nextChildren !== a.children) changes.push({ id: a.id, runId: a.runId, run: a.run.name, beforeAdults: a.adults, beforeChildren: a.children, adults: nextAdults, children: nextChildren, status: nextAdults + nextChildren ? 'ASSIGNED' : 'CANCELLED', preserved: false })
  }
 }
 return changes
}
export async function checkInCommand(prisma, actorId, input, now = new Date()) {
 keys(input, ['id', 'action', 'serviceDate', 'direction', 'bookingId', 'bookingVersion', 'version', 'adults', 'children', 'reason', 'previewHash', 'financeStatus'])
 uuid(input.id); const serviceDate = dateOnly(input.serviceDate)
 if (!['CHECK_IN', 'PREVIEW_NO_SHOW', 'NO_SHOW', 'CLOSE', 'REOPEN', 'FINANCE_REVIEW'].includes(input.action)) fail('INVALID_ACTION', 400)
 return write(prisma, actorId, async tx => {
  if (input.action === 'FINANCE_REVIEW') await receivableAccess(tx, actorId)
  else await authorize(tx, actorId, ['NO_SHOW', 'CLOSE', 'REOPEN'].includes(input.action) ? 'manager' : 'booking')
  const requestHash = hash({ actorId, input }), prior = await tx.operationCommand.findUnique({ where: { id: input.id } })
  if (prior) { if (prior.requestHash !== requestHash) fail('COMMAND_CONFLICT'); return prior.result }
  const close = await tx.serviceDayClose.findUnique({ where: { serviceDate } })
  let result
  if (['CLOSE', 'REOPEN'].includes(input.action)) {
   int(input.version, 0)
   if ((close?.version || 0) !== input.version) fail('SETTINGS_CONFLICT')
   if (input.serviceDate > thailandDay(now)) fail('SERVICE_DATE_IN_FUTURE')
   if (input.action === 'REOPEN' && close?.status !== 'CLOSED') fail('SETTINGS_CONFLICT')
   if (input.action === 'CLOSE' && close?.status === 'CLOSED') fail('SERVICE_DAY_CLOSED')
   const rows = await allRows(tx, input.serviceDate)
   if (input.action === 'CLOSE' && rows.some(r => r.remainingAdults + r.remainingChildren)) fail('CHECK_IN_REVIEW_REQUIRED')
   const data = { status: input.action === 'CLOSE' ? 'CLOSED' : 'OPEN', snapshot: rows, updatedBy: actorId, reason: input.action === 'REOPEN' ? string(input.reason, 1000) : null }
   const row = close ? await tx.serviceDayClose.update({ where: { id: close.id }, data: { ...data, version: { increment: 1 } } }) : await tx.serviceDayClose.create({ data: { id: randomUUID(), serviceDate, ...data } })
   result = { ok: true, version: row.version }
  } else {
   uuid(input.bookingId); int(input.version, 0); int(input.bookingVersion)
   if (!['OUTBOUND', 'RETURN'].includes(input.direction)) fail('INVALID_INPUT', 400)
   if (close?.status === 'CLOSED' && input.action !== 'FINANCE_REVIEW') fail('SERVICE_DAY_CLOSED')
   const booking = await tx.tourBooking.findUnique({ where: { id: input.bookingId }, include })
   if (!booking || !eligible.includes(booking.status) || !attendanceLegs(booking, input.serviceDate).includes(input.direction)) fail('CHECK_IN_BOOKING_UNAVAILABLE')
   const row = attendanceRow(booking, input.serviceDate, input.direction)
   if (row.version !== input.version || row.bookingVersion !== input.bookingVersion) fail('SETTINGS_CONFLICT')
   if (input.serviceDate !== thailandDay(now) && input.action === 'CHECK_IN' && !row.demo) fail('CHECK_IN_WRONG_DAY')
   if (input.serviceDate > thailandDay(now) && ['NO_SHOW', 'PREVIEW_NO_SHOW'].includes(input.action)) fail('SERVICE_DATE_IN_FUTURE')
   const data = { updatedBy: actorId }
   if (input.action === 'CHECK_IN') {
    const adults = int(input.adults, 0, row.remainingAdults), children = int(input.children, 0, row.remainingChildren)
    if (!adults && !children) fail('INVALID_QUANTITY', 400)
    data.adults = row.adults + adults; data.children = row.children + children
   } else if (input.action === 'FINANCE_REVIEW') {
    if (row.financeStatus === 'NONE' || !['RETAIN_CHARGES', 'ADJUSTMENT_REQUIRED', 'REFUND_REQUIRED'].includes(input.financeStatus)) fail('INVALID_ACTION', 400)
    Object.assign(data, { financeStatus: input.financeStatus, financeReason: string(input.reason, 1000), financeReviewedBy: actorId })
   } else {
    if (!row.remainingAdults && !row.remainingChildren) fail('NO_REMAINING_PASSENGERS')
    const changes = noShowPlan(booking, input.serviceDate, input.direction, row.adults, row.children)
    const previewHash = hash({ bookingVersion: booking.version, version: row.version, changes })
    if (input.action === 'PREVIEW_NO_SHOW') return { changes, previewHash, noShowAdults: row.remainingAdults, noShowChildren: row.remainingChildren }
    if (input.previewHash !== previewHash) fail('SETTINGS_CONFLICT')
    const reason = string(input.reason, 1000)
    for (const change of changes.filter(c => !c.preserved)) {
     const issues = await tx.stockIssue.findMany({ where: { runId: change.runId, bookingLine: { bookingId: booking.id } }, select: { quantity: true, settledQty: true } })
     if (issues.some(i => i.quantity > i.settledQty)) fail('OUTSTANDING_ISSUES')
     await tx.dispatchAssignment.update({ where: { id: change.id }, data: { adults: change.adults, children: change.children, status: change.status, cancellationReason: reason } })
    }
    const runIds = [...new Set(changes.filter(c => !c.preserved).map(c => c.runId))]
    if (runIds.length) await tx.dispatchRun.updateMany({ where: { id: { in: runIds } }, data: { version: { increment: 1 } } })
    Object.assign(data, { noShowAdults: row.noShowAdults + row.remainingAdults, noShowChildren: row.noShowChildren + row.remainingChildren, reason, financeStatus: 'PENDING', changes })
   }
   await tx.bookingAttendance.upsert({ where: { bookingId_serviceDate_direction: { bookingId: booking.id, serviceDate, direction: input.direction } }, create: { id: randomUUID(), bookingId: booking.id, serviceDate, direction: input.direction, ...data }, update: { ...data, version: { increment: 1 } } })
   result = { ok: true, version: row.version + 1 }
  }
  await audit(tx, actorId, input.bookingId || input.id, `checkin.${input.action.toLowerCase()}`, { serviceDate: input.serviceDate, direction: input.direction || null, reason: input.reason || null, commandId: input.id, result, adults: input.adults ?? null, children: input.children ?? null, financeStatus: input.financeStatus || null })
  await tx.operationCommand.create({ data: { id: input.id, requestHash, result } })
  return result
 }, 'active')
}
