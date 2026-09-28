import test from 'node:test'
import assert from 'node:assert/strict'
import { customerCalendar, dashboardScope, dashboardOverview } from '../src/backoffice/dashboard/overview/service.js'
import { pendingPassengers } from '../src/modules/operations/dispatch.js'
const now = new Date('2026-09-20T18:00:00Z')
const actor = (role = 'MANAGER', scope = 'COMPANY', extra = {}) => ({ id: 'actor', status: 'ACTIVE', department: null, permissionOverrides: [], roles: [{ roleCode: role, scope, role: { permissions: [{ permissionCode: 'users.read' }] } }], ...extra })
function database(profile) {
 const calls = []
 const db = new Proxy({ $transaction: fn => fn(db), userProfile: { findUnique: async () => profile, findMany: async args => { calls.push(['team', args]); return [{ id: 'teammate' }] } } }, { get(target, model) {
  return target[model] || { count: async args => { calls.push([model, args]); return 31 }, findMany: async args => { calls.push([model, args]); return [] } }
 } })
 return { db, calls }
}
const booking = (id, patch = {}) => ({ id, status: 'CONFIRMED', outboundDate: '2026-09-21', returnDate: '2026-09-22', returnStatus: 'OUR', adults: 3, children: 2, programSnapshot: { tourId: 'tour', name: 'Surin' }, ...patch })
test('calendar counts arrivals once, separates program IDs and excludes drafts/cancellations/outside window', () => {
 const rows = [booking('one'), booking('one'), booking('two', { outboundDate: null }), booking('three', { status: 'CANCELLED' }), booking('four', { status: 'DRAFT' }), booking('five', { outboundDate: '2026-10-05' }), booking('six', { programSnapshot: { tourId: 'other', name: 'Surin' } }), booking('seven', { outboundDate: null, returnStatus: 'OTHER' })]
 const days = customerCalendar(rows, '2026-09-21')
 assert.equal(days.length, 14); assert.equal(days.at(-1).date, '2026-10-04')
 assert.equal(days[0].bookings, 2); assert.equal(days[0].pax, 10); assert.equal(days[0].programs.length, 2)
 assert.equal(days[1].bookings, 1); assert.equal(days[1].pax, 5)
 assert.equal(days.reduce((n, d) => n + d.bookings, 0), 3)
 assert.equal(JSON.stringify(days).includes('outboundDate'), false)
})
test('calendar handles year rollover and completed bookings', () => {
 const days = customerCalendar([booking('one', { status: 'COMPLETED', outboundDate: '2027-01-01' })], '2026-12-30')
 assert.equal(days[2].pax, 5); assert.equal(days.at(-1).date, '2027-01-12')
})
test('inactive and missing profiles fail closed; SELF Manager never becomes company', () => {
 assert.throws(() => dashboardScope(null)); assert.throws(() => dashboardScope(actor('MANAGER', 'COMPANY', { status: 'SUSPENDED' })))
 assert.equal(dashboardScope(actor('MANAGER', 'SELF')).company, false)
 assert.equal(dashboardScope(actor('HEAD_GUIDE', 'TEAM', { department: 'GUIDE' })).department, null)
 assert.equal(dashboardScope(actor('HEAD_GUIDE', 'SELF', { department: 'DRIVER' })).department, null)
})
test('Manager calendar is Thailand dated, counts are not limited to 25, salary data is not queried', async () => {
 const { db, calls } = database(actor())
 const result = await dashboardOverview(db, 'actor', now)
 assert.equal(result.today, '2026-09-21'); assert.equal(result.calendar.length, 14)
 assert.equal(result.widgets.find(w => w.id === 'receivables').pending, 31)
 assert.equal(result.widgets.some(w => ['payroll', 'salary-advances'].includes(w.id)), false)
 assert.equal(calls.some(([, a]) => JSON.stringify(a).includes('PAYROLL')), false)
 assert.equal(calls.some(([, a]) => a.take || a.skip), false)
})
test('active deny overrides Manager defaults and omits queries and links', async () => {
 const denied = ['operations.booking', 'operations.islandBooking', 'operations.guide', 'expenses.view', 'finance.receive']
 const { db, calls } = database(actor('ADMIN_MANAGER', 'COMPANY', { permissionOverrides: denied.map(permissionCode => ({ permissionCode, effect: 'DENY' })) }))
 const result = await dashboardOverview(db, 'actor', now)
 assert.equal(result.calendar, null)
 assert.equal(result.widgets.some(w => ['bookings', 'guide', 'guide-assignments', 'guide-allocation', 'expenses', 'receivables'].includes(w.id)), false)
 assert.equal(calls.some(([m]) => m === 'tourBooking' || m === 'agentBill'), false)
})
test('scope-bound ALLOW cannot leak a company metric; expired grants are ignored', async () => {
 const { db } = database(actor('SALES', 'SELF', { permissionOverrides: [{ permissionCode: 'expenses.view', effect: 'ALLOW', scopeId: 'a-warehouse' }, { permissionCode: 'payroll.view', effect: 'ALLOW', expiresAt: '2026-09-01' }] }))
 const result = await dashboardOverview(db, 'actor', now)
 assert.equal(result.widgets.some(w => ['expenses', 'payroll'].includes(w.id)), false)
})
test('special permission works without hardcoded Account role and active DENY wins', async () => {
 const profile = actor('SALES', 'SELF', { permissionOverrides: [{ permissionCode: 'expenses.view', effect: 'ALLOW' }] })
 assert.equal((await dashboardOverview(database(profile).db, 'actor', now)).widgets.some(w => w.id === 'expenses'), true)
 profile.permissionOverrides.push({ permissionCode: 'expenses.view', effect: 'DENY' })
 assert.equal((await dashboardOverview(database(profile).db, 'actor', now)).widgets.some(w => w.id === 'expenses'), false)
})
for (const role of ['GUIDE', 'ASSISTANT_TOUR_GUIDE', 'CAPTAIN', 'ASSISTANT_CAPTAIN', 'DRIVER']) test(`${role} jobs stay assigned to the actor`, async () => {
 const { db, calls } = database(actor(role, 'SELF'))
 const result = await dashboardOverview(db, 'actor', now)
 assert.equal(result.calendar, null)
 for (const [model, args] of calls.filter(([m]) => m === 'dispatchRun')) {
  assert.equal(model, 'dispatchRun'); assert.deepEqual(args.where.AND[0].staff.some.userId.in, ['actor'])
 }
 assert.equal(calls.some(([m]) => m === 'team'), false)
})
test('Head Guide sees department assignments only, with matching scope and read/manage grants', async () => {
 const { db, calls } = database(actor('HEAD_GUIDE', 'SELF', { department: 'GUIDE' }))
 const result = await dashboardOverview(db, 'actor', now)
 assert.equal(result.scope, 'guide department')
 const team = calls.find(([m]) => m === 'team')[1]
 assert.equal(team.where.department, 'GUIDE'); assert.ok(team.where.roles.none)
 for (const [, args] of calls.filter(([m]) => m === 'dispatchRun')) assert.deepEqual(args.where.AND[0].staff.some.userId.in, ['actor', 'teammate'])
})
test('housekeeping counts DONE awaiting acceptance; workers cannot see another assignee', async () => {
 const { db, calls } = database(actor('HOUSEKEEPING', 'SELF'))
 await dashboardOverview(db, 'actor', now)
 const jobs = calls.filter(([m, a]) => m === 'companyWorkRecord' && a.where.AND[0].kind === 'JOB')
 assert.ok(jobs.length)
 for (const [, args] of jobs) assert.deepEqual(args.where.AND[0].OR, [{ assigneeId: 'actor' }])
 assert.ok(jobs[0][1].where.AND[1].status.in.includes('DONE'))
 assert.equal(jobs[0][1].where.AND[1].status.in.includes('ACCEPTED'), false)
})
test('warehouse restriction prevents custodian-based widening', async () => {
 const { db, calls } = database(actor('SALES', 'SELF', { permissionOverrides: [{ permissionCode: 'operations.stock', effect: 'DENY' }] }))
 await dashboardOverview(db, 'actor', now)
 assert.equal(calls.some(([m]) => m === 'warehouseResponsibility'), false)
 const requests = calls.find(([m, a]) => m === 'companyWorkRecord' && a.where.AND[0].kind === 'STOCK_REQUEST')[1]
 assert.deepEqual(requests.where.AND[0].OR.at(-1), { storeId: { in: [] } })
})
test('remaining allocation excludes no-show and cancelled allocations, and keeps directions independent', () => {
 const row = { quantity: 10, resource: { baseUnit: 'PERSON' }, booking: { adults: 8, children: 2, outboundDate: new Date('2026-09-21'), returnDate: new Date('2026-09-22'), returnStatus: 'OUR', attendance: [{ direction: 'OUTBOUND', serviceDate: new Date('2026-09-21'), noShowAdults: 2, noShowChildren: 0 }] }, dispatchAssignments: [{ status: 'ASSIGNED', adults: 6, children: 2, run: { direction: 'OUTBOUND' } }, { status: 'CANCELLED', adults: 8, children: 2, run: { direction: 'RETURN' } }] }
 assert.equal(pendingPassengers(row, 'OUTBOUND').remainingPassengers, 0)
 assert.equal(pendingPassengers(row, 'RETURN').remainingPassengers, 10)
})

test('Head Guide island booking counts never expand to department without booking permission', async () => {
 const { db, calls } = database(actor('HEAD_GUIDE', 'SELF', { department: 'GUIDE' }))
 await dashboardOverview(db, 'actor', now)
 for (const [, args] of calls.filter(([model]) => model === 'tourBooking')) assert.deepEqual(args.where.AND[0], { createdById: 'actor' })
})
test('standalone bookings share an honest service label instead of the first trip name', () => {
 const days = customerCalendar([booking('one', { programSnapshot: {}, trip: { name: 'First transfer' } }), booking('two', { programSnapshot: {}, trip: { name: 'Second transfer' } })], '2026-09-21')
 assert.equal(days[0].programs[0].name, 'Standalone services'); assert.equal(days[0].programs[0].pax, 10)
})

test('return-only drafts use our return date for today/overdue, without double-counting an outbound booking', async () => {
 const { db } = database(actor('ASSISTANT_TOUR_GUIDE', 'SELF'))
 const rows = [
  { outboundDate: null, returnDate: new Date('2026-09-21'), returnStatus: 'OUR' },
  { outboundDate: null, returnDate: new Date('2026-09-20'), returnStatus: 'OUR' },
  { outboundDate: null, returnDate: new Date('2026-09-21'), returnStatus: 'OTHER' },
  { outboundDate: new Date('2026-09-21'), returnDate: new Date('2026-09-21'), returnStatus: 'OUR' },
  { outboundDate: new Date('2026-09-22'), returnDate: new Date('2026-09-20'), returnStatus: 'OUR' },
 ].map(row => ({ ...row, status: 'DRAFT', createdById: 'actor' }))
 const matches = (row, where) => Object.entries(where).every(([key, value]) => {
  if (key === 'AND') return value.every(part => matches(row, part))
  if (key === 'OR') return value.some(part => matches(row, part))
  if (value instanceof Date) return +row[key] === +value
  if (value && typeof value === 'object' && 'lt' in value) return row[key] !== null && +row[key] < +value.lt
  return row[key] === value
 })
 db.tourBooking = { count: async ({ where }) => rows.filter(row => matches(row, where)).length }
 const data = await dashboardOverview(db, 'actor', now)
 const drafts = data.widgets.find(widget => widget.id === 'bookings')
 assert.equal(drafts.pending, 5); assert.equal(drafts.today, 2); assert.equal(drafts.overdue, 1)
})

test('management summary uses arrival dates, real statuses, bounded non-PII rows and explicit ranges', async () => {
 const { db } = database(actor())
 const rows = [
  ...Array.from({ length: 7 }, (_, i) => booking('b' + i, { code: 'B' + i, name: 'PRIVATE GUEST', contactPhone: 'SECRET', agent: { id: 'a', name: 'Agent A' } })),
  booking('draft', { code: 'D1', status: 'DRAFT' }),
  booking('cancel', { code: 'C1', status: 'CANCELLED' }),
  booking('return', { code: 'R1', outboundDate: null }),
  booking('not-ours', { code: 'N1', outboundDate: null, returnStatus: 'OTHER' }),
  booking('last-day', { code: 'L1', outboundDate: '2026-10-20' }),
  booking('outside', { code: 'O1', outboundDate: '2026-10-21' }),
  booking('past', { code: 'P1', outboundDate: '2026-04-05', status: 'COMPLETED' }),
 ]
 db.tourBooking = { count: async () => 0, findMany: async () => rows }
 const result = await dashboardOverview(db, 'actor', now)
 const summary = result.managementOverview
 assert.equal(result.calendar.length, 14)
 assert.equal(summary.calendar30.length, 30)
 assert.equal(summary.through, '2026-10-20')
 assert.equal(summary.calendar30[0].pax, 35)
 assert.equal(summary.calendar30[1].pax, 5)
 assert.equal(summary.calendar30.at(-1).pax, 5)
 assert.deepEqual(Object.fromEntries(Object.entries(summary.bookingDays[0]).filter(([key]) => key !== 'rows')), { date: '2026-09-21', total: 9, confirmed: 7, draft: 1, completed: 0, cancelled: 1 })
 assert.equal(summary.bookingDays[0].rows.length, 5)
 assert.equal(summary.topAgents.rows[0].name, 'Agent A')
 assert.equal(summary.topAgents.rows[0].pax, 35)
 assert.equal(summary.topAgents.rows[0].share, 77.8)
 assert.equal(summary.monthly.from, '2026-04-01')
 assert.equal(summary.monthly.rows[0].bookings, 1)
 assert.equal(summary.monthly.rows.at(-1).bookings, 7)
 assert.equal(summary.revenue, null)
 assert.doesNotMatch(JSON.stringify(summary), /PRIVATE GUEST|SECRET|contactPhone|adultPrice/)
})

test('management queries require company scope and each effective booking permission', async () => {
 for (const profile of [actor('MANAGER', 'SELF'), ...['operations.booking', 'operations.islandBooking'].map(permissionCode => actor('MANAGER', 'COMPANY', { permissionOverrides: [{ permissionCode, effect: 'DENY' }] }))]) {
  const { db, calls } = database(profile)
  assert.equal((await dashboardOverview(db, 'actor', now)).managementOverview, null)
  assert.equal(calls.some(([model, args]) => model === 'tourBooking' && args.select?.agent), false)
 }
})

test('management periods cross years without month overflow and query remains date bounded', async () => {
 const { db, calls } = database(actor())
 const result = await dashboardOverview(db, 'actor', new Date('2027-01-30T18:00:00Z'))
 const summary = result.managementOverview
 assert.equal(summary.from, '2027-01-31')
 assert.equal(summary.through, '2027-03-01')
 assert.deepEqual(summary.monthly.rows.map(row => row.month), ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'])
 assert.equal(summary.monthly.through, '2027-01-31')
 const query = calls.find(([model, args]) => model === 'tourBooking' && args.select?.agent)[1]
 assert.equal(query.where.OR[0].outboundDate.gte.toISOString().slice(0, 10), '2026-08-01')
 assert.equal(query.where.OR[0].outboundDate.lt.toISOString().slice(0, 10), '2027-03-02')
 assert.equal(query.where.OR[1].outboundDate, null)
 assert.equal(query.where.OR[1].returnStatus, 'OUR')
 assert.deepEqual(Object.keys(query.select).sort(), ['adults', 'agent', 'children', 'code', 'id', 'outboundDate', 'programSnapshot', 'returnDate', 'returnStatus', 'status', 'trip'])
 assert.deepEqual(query.select.agent, { select: { id: true, name: true } })
})

test('both Booking roles share all 30-day arrivals while work uses owner and manager scope', async () => {
 const source = [
  booking('own', { code: 'B1', createdById: 'actor' }),
  booking('assigned', { code: 'B2', createdById: 'other', assigneeId: 'actor', status: 'DRAFT' }),
  booking('reassigned', { code: 'B3', createdById: 'actor', assigneeId: 'other' }),
  booking('return', { code: 'B4', createdById: 'other', outboundDate: null }),
  booking('last', { code: 'B5', createdById: 'other', outboundDate: '2026-10-20', status: 'COMPLETED' }),
  booking('cancelled', { code: 'B6', createdById: 'other', status: 'CANCELLED' }),
  booking('outside', { code: 'B7', createdById: 'actor', outboundDate: '2026-10-21' }),
  booking('past', { code: 'B8', createdById: 'actor', outboundDate: '2026-09-20' }),
  booking('not-ours', { code: 'B9', createdById: 'actor', outboundDate: null, returnStatus: 'OTHER' }),
 ]
 const results = []
 for (const role of ['BOOKING', 'HEAD_BOOKING']) {
  const { db, calls } = database(actor(role, 'SELF', { department: 'BOOKING' }))
  db.tourBooking = { findMany: async args => {
   calls.push(['bookingSummary', args])
   const range = args.where.OR[0].outboundDate
   const filtered = source.filter(row => {
    const value = row.outboundDate || (row.returnStatus === 'OUR' ? row.returnDate : null)
    return value && +new Date(value) >= +range.gte && +new Date(value) < +range.lt
   })
   return [...filtered, filtered[0]] // Duplicate joined records must not inflate totals.
  } }
  db.userProfile.findMany = async () => [{ id: 'actor', displayName: 'My Name' }, { id: 'other', displayName: 'Colleague' }]
  const result = await dashboardOverview(db, 'actor', now)
  results.push(result.bookingOverview)
  assert.equal(result.widgets, undefined)
  assert.equal(result.managementOverview, undefined)
  assert.equal(result.bookingOverview.calendar30.length, 30)
  assert.equal(result.bookingOverview.through, '2026-10-20')
  assert.equal(calls.filter(([model]) => model === 'bookingSummary').length, 1)
  assert.equal(calls.some(([model]) => ['companyWorkRecord', 'agentBill', 'financePersonnelRecord'].includes(model)), false)
  assert.doesNotMatch(JSON.stringify(result), /B7|B8|B9/)
 }
 assert.deepEqual(results[0].calendar30, results[1].calendar30)
 assert.equal(results[0].calendar30.reduce((sum, day) => sum + day.pax, 0), 20)
 assert.equal(results[0].scope, 'own'); assert.equal(results[0].work.total, 2)
 assert.equal(results[0].work.draft, 1); assert.equal(results[0].team.length, 0)
 assert.deepEqual(results[0].rows.map(row => row.code), ['B1', 'B2'])
 assert.equal(results[1].scope, 'team'); assert.equal(results[1].work.total, 6)
 assert.equal(results[1].team.length, 2)
 assert.equal(results[1].team.reduce((sum, member) => sum + member.total, 0), 6)
})

test('Booking dashboard rejects department-only roles, scoped grants, and effective denials', async () => {
 for (const profile of [
  actor('HEAD_BOOKING', 'TEAM', { department: 'BOOKING' }),
  actor('BOOKING', 'TEAM', { permissionOverrides: [{ permissionCode: 'operations.booking', effect: 'ALLOW', scopeId: 'department' }, { permissionCode: 'operations.islandBooking', effect: 'ALLOW', scopeId: 'department' }] }),
  ...['operations.booking', 'operations.islandBooking'].map(permissionCode => actor('BOOKING', 'SELF', { permissionOverrides: [{ permissionCode, effect: 'DENY' }] })),
 ]) {
  const { db, calls } = database(profile)
  const result = await dashboardOverview(db, 'actor', now)
  assert.equal(result.bookingOverview, undefined)
  assert.equal(calls.some(([model, args]) => model === 'tourBooking' && args.select?.assigneeId), false)
 }
})
