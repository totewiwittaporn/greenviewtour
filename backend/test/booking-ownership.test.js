import test from 'node:test'
import assert from 'node:assert/strict'
import { canEditBooking, canManageBookingTeam, roleNames } from '../../packages/contracts/access.js'
import { saveBooking, bookingStatus, amendBookingDetails, amendBookingReturn } from '../src/modules/operations/bookings.js'
import { bookingPriceCommand } from '../src/modules/operations/booking-price.js'
import { assignBooking, bookingAssignees } from '../src/modules/operations/booking-ownership.js'
const id = n => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const profile = (n, role = 'BOOKING', extra = {}) => ({ id: id(n), status: 'ACTIVE', displayName: `Staff ${n}`, roles: [{ roleCode: role, scope: 'SELF' }], ...extra })
function fixture(actor = profile(1)) {
 const row = { id: id(9), createdById: id(2), assigneeId: null, version: 1, status: 'DRAFT', programSnapshot: {}, lines: [] }, writes = [], commands = new Map()
 const tx = { $executeRaw: async () => {}, userProfile: { findUnique: async ({ where }) => where.id === actor.id ? actor : profile(2), count: async () => 2, findMany: async args => { writes.push(['lookup', args]); return [profile(2)] } }, tourBooking: { findUnique: async () => ({ ...row }), update: async ({ data }) => { writes.push(data); Object.assign(row, { ...data, version: row.version + 1 }); return row } }, operationCommand: { findUnique: async ({ where }) => commands.get(where.id), create: async ({ data }) => commands.set(data.id, data) }, auditEvent: { create: async args => writes.push(args) } }
 return { row, writes, commands, tx, prisma: { $transaction: fn => fn(tx), ...tx } }
}
test('display names retain persisted role codes; ownership uses assignee before immutable creator', () => {
 assert.equal(roleNames.BOOKING, 'Booking Assistant'); assert.equal(roleNames.HEAD_BOOKING, 'Booking Manager')
 assert.equal(canEditBooking(profile(1), { createdById: id(1) }), true)
 assert.equal(canEditBooking(profile(1), { createdById: id(1), assigneeId: id(2) }), false)
 assert.equal(canEditBooking(profile(2), { createdById: id(1), assigneeId: id(2) }), true)
 assert.equal(canEditBooking(profile(1), { createdById: null }), false)
 assert.equal(canManageBookingTeam(profile(1, 'HEAD_BOOKING')), true)
 assert.equal(canManageBookingTeam(profile(1)), false)
 assert.equal(canManageBookingTeam(profile(1, 'HEAD_BOOKING', { permissionOverrides: [{ permissionCode: 'operations.booking', effect: 'DENY' }] })), false)
})
test('every direct booking mutation rejects another assistant owner before replay or writing', async () => {
 const common = { id: id(10), bookingId: id(9), version: 1 }
 for (const [operation, input] of [
  [saveBooking, { id: id(9), version: 1 }],
  [bookingStatus, { ...common, action: 'CONFIRM' }],
  [amendBookingDetails, { ...common, amendmentReason: 'Update detail' }],
  [amendBookingReturn, { ...common, reason: 'Update return', returnStatus: 'OTHER' }],
  [bookingPriceCommand, { ...common, action: 'REQUEST', adultPrice: '10', childPrice: '0', reason: 'Review price' }],
 ]) {
  const f = fixture()
  f.commands.set(input.id, { requestHash: 'prior', result: { ok: true } })
  await assert.rejects(operation(f.prisma, id(1), input), { code: 'PERMISSION_DENIED' })
  assert.deepEqual(f.writes, [])
 }
})
test('assignment is manager-only, versioned and preserves creation attribution', async () => {
 const input = { id: id(10), bookingId: id(9), version: 1, assigneeId: id(2) }
 await assert.rejects(assignBooking(fixture().prisma, id(1), input), { code: 'PERMISSION_DENIED' })
 const f = fixture(profile(1, 'HEAD_BOOKING'))
 const result = await assignBooking(f.prisma, id(1), input)
 assert.equal(result.assigneeId, id(2)); assert.equal(result.version, 2)
 assert.equal(f.row.createdById, id(2)); assert.equal(f.writes[0].createdById, undefined)
 assert.deepEqual(await assignBooking(f.prisma, id(1), input), result)
 await assert.rejects(assignBooking(f.prisma, id(1), { ...input, id: id(11) }), { code: 'SETTINGS_CONFLICT' })
})
test('assignee lookup is manager-only and paged without contact details', async () => {
 await assert.rejects(bookingAssignees(fixture().prisma, id(1), new URLSearchParams()), { code: 'PERMISSION_DENIED' })
 const f = fixture(profile(1, 'HEAD_BOOKING'))
 await bookingAssignees(f.prisma, id(1), new URLSearchParams('page=2'))
 const query = f.writes[0][1]
 assert.equal(query.take, 25); assert.equal(query.skip, 25)
 assert.deepEqual(query.select, { id: true, displayName: true })
})

test('Booking Manager handles customer requests; Assistant remains read-only; deny overrides prevail', async () => {
 const { listCustomers } = await import('../src/modules/commerce/service.js')
 for (const role of ['BOOKING', 'HEAD_BOOKING']) {
  const f = fixture(profile(1, role)), seen = []
  f.prisma.customerProfile = { count: async args => { seen.push(args); return 1 }, findMany: async args => { seen.push(args); return [{ id: id(50), displayName: 'Customer' }] } }
  const result = await listCustomers(f.prisma, id(1), new URLSearchParams())
  assert.equal(result.rows.length, 1); assert.deepEqual(seen[0].where, {})
  if(role==='BOOKING')await assert.rejects(listCustomers(f.prisma, id(1), new URLSearchParams('kind=requests')), { code: 'PERMISSION_DENIED' })
  else {f.prisma.customerRequest={count:async()=>0,findMany:async()=>[]};assert.deepEqual((await listCustomers(f.prisma,id(1),new URLSearchParams('kind=requests'))).rows,[])}
 }
 for (const actor of [profile(1, 'GUIDE'), profile(1, 'BOOKING', { permissionOverrides: [{ permissionCode: 'operations.booking', effect: 'DENY' }] }), profile(1, 'BOOKING', { status: 'SUSPENDED' })]) {
  await assert.rejects(listCustomers(fixture(actor).prisma, id(1), new URLSearchParams()), { code: 'PERMISSION_DENIED' })
 }
})
test('Booking evidence remains readable but cross-owner upload is disabled even with paid-status permission', async () => {
 const { listEvidence } = await import('../src/modules/evidence/service.js')
 const f = fixture()
 f.prisma.evidenceAttachment = { count: async () => 0, findMany: async () => [] }
 const data = await listEvidence(f.prisma, id(1), new URLSearchParams({ targetKind: 'BOOKING', targetId: id(9) }))
 assert.equal(data.access.upload, false)
 f.row.assigneeId = id(1)
 assert.equal((await listEvidence(f.prisma, id(1), new URLSearchParams({ targetKind: 'BOOKING', targetId: id(9) }))).access.upload, true)
})

test('assignee search applies trimmed case-insensitive name filter and rejects excessive input', async () => {
 const f = fixture(profile(1, 'HEAD_BOOKING'))
 await bookingAssignees(f.prisma, id(1), new URLSearchParams('q=%20Alice%20'))
 assert.deepEqual(f.writes[0][1].where.displayName, { contains: 'Alice', mode: 'insensitive' })
 await assert.rejects(bookingAssignees(f.prisma, id(1), new URLSearchParams({ q: 'a'.repeat(101) })), { code: 'INVALID_INPUT' })
})

test('Booking staff effective denials block own mutations including price and evidence', async () => {
 const { listEvidence } = await import('../src/modules/evidence/service.js')
 for (const role of ['BOOKING', 'HEAD_BOOKING']) for (const permissionCode of ['operations.booking', 'operations.islandBooking']) {
  const actor = profile(1, role, { permissionOverrides: [{ permissionCode, effect: 'DENY' }] })
  const f = fixture(actor)
  f.row.createdById = id(1)
  assert.equal(canEditBooking(actor, f.row), false)
  await assert.rejects(bookingPriceCommand(f.prisma, id(1), { id: id(10), bookingId: id(9), version: 1, action: 'REQUEST', adultPrice: '10', childPrice: '0', reason: 'Review price' }), { code: 'PERMISSION_DENIED' })
  f.prisma.evidenceAttachment = { count: async () => 0, findMany: async () => [] }
  const params = new URLSearchParams({ targetKind: 'BOOKING', targetId: id(9) })
  if (permissionCode === 'operations.booking') await assert.rejects(listEvidence(f.prisma, id(1), params), { code: 'PERMISSION_DENIED' })
  else assert.equal((await listEvidence(f.prisma, id(1), params)).access.upload, false)
  assert.deepEqual(f.writes, [])
 }
})
