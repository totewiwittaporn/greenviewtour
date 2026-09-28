import {jobPageSection} from './job-page.js'
import { effectiveAccess } from '../../../../../packages/contracts/access.js'
import { dateOnly } from '../../../modules/operations/common.js'
import { thailandDay } from '../../../modules/operations/check-in.js'
import { preparationInclude, projectBoatPreparation } from '../../../modules/operations/stock.js'

const addDay = (day, n) => new Date(+dateOnly(day) + n * 86400000).toISOString().slice(0, 10)
const key = date => date ? new Date(date).toISOString().slice(0, 10) : null
const unfinished = new Set(['DRAFT', 'REJECTED', 'PENDING', 'SUBMITTED', 'APPROVED', 'ISSUED', 'DONE'])
const live = assignment => assignment.status !== 'CANCELLED' && ['CONFIRMED', 'COMPLETED'].includes(assignment.bookingLine.booking.status)
const crewInclude = { include: { user: { select: { displayName: true } } } }
const runInclude = {
 slot: { select: { startsAt:true,vehicle:{select:{name:true,registration:true}} } }, staff: crewInclude,
 assignments: { select: { status:true,adults:true,children:true,dropoffPoint:true,bookingLine:{select:{booking:{select:{status:true,pickupPoint:true,dropoffPoint:true}}}} } },
}

export function preparationGroups(run) {
 const groups = new Map()
 for (const row of projectBoatPreparation(run).rows) {
  const id = [row.resourceId, row.size || '', row.baseUnit, row.kind].join(':')
  const item = groups.get(id) || { id, name: row.name, size: row.size, unit: row.baseUnit, required: 0, issued: 0, remaining: 0, outstanding: 0 }
  item.required += row.quantity; item.issued += row.issuedQty
  item.remaining += row.remainingQty; item.outstanding += row.outstandingQty
  groups.set(id, item)
 }
 const items = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
 return { pendingLines: items.filter(r => r.remaining > 0).length, unsettledLines: items.filter(r => r.outstanding > 0).length, totalLines: items.length, items: items.slice(0, 20) }
}
export function projectWorkRun(run, href, prepare = false) {
 const assignments = run.assignments.filter(live)
 const date = thailandDay(run.slot.startsAt)
 const row = { id: run.id, code: run.code, name: run.name, status: run.status, kind: run.kind,
  direction: run.direction, date, startsAt: run.slot.startsAt, capacity: run.capacity,
  vehicle: run.slot.vehicle?.name || null, registration: run.slot.vehicle?.registration || null,
  passengers: assignments.reduce((n, item) => n + item.adults + item.children, 0),
  crew: run.staff.map(s => ({ role: s.role, name: s.user.displayName })),
  href: `${href}?date=${date}&runId=${encodeURIComponent(run.id)}`,
 }
 if (run.kind === 'VEHICLE') row.stops = [...new Set(assignments.map(a => run.direction === 'OUTBOUND'
  ? a.bookingLine.booking.pickupPoint : a.dropoffPoint || a.bookingLine.booking.dropoffPoint).filter(Boolean))]
 if (prepare) row.preparation = preparationGroups(run)
 return row
}
async function runSection(tx, source, days, allowed) {
 const prepare = source.base.kind === 'BOAT' && (allowed('operations.prepareStock') || allowed('operations.stock'))
 const range = { gte: new Date(days[0] + 'T00:00:00+07:00'), lt: new Date(addDay(days[0], 2) + 'T00:00:00+07:00') }
 const rows = await tx.dispatchRun.findMany({ where: { AND: [source.base, { status: { not: 'CANCELLED' }, slot: { startsAt: range } }] },
  include: prepare ? { ...preparationInclude, staff: crewInclude } : runInclude,
  orderBy: [{ slot: { startsAt: 'asc' } }, { id: 'asc' }],
 })
 const projected = rows.map(row => projectWorkRun(row, source.href, prepare))
 return { id: source.id, kind: source.base.kind, title: source.title, href: source.href, scope: source.visibility, prepare,
  days: days.map(date => { const work = projected.filter(r => r.date === date); return { date, total: work.length,
   outboundPax: work.filter(r => r.direction === 'OUTBOUND').reduce((n, r) => n + r.passengers, 0), returnPax: work.filter(r => r.direction === 'RETURN').reduce((n, r) => n + r.passengers, 0),
   pendingLines: prepare ? work.reduce((n, r) => n + r.preparation.pendingLines, 0) : null, unsettledLines: prepare ? work.reduce((n, r) => n + r.preparation.unsettledLines, 0) : null, rows: work.slice(0, 10) } }),
 }
}
async function jobSection(tx, source, days, lean=false) {
 if(lean)return jobPageSection(tx,source,days)
 const select = { id: true, name: true, status: true, dueOn: true, assigneeId: true }
 const orderBy = [{ dueOn: 'asc' }, { id: 'asc' }]
 const [dated, pending, review] = await Promise.all([
  tx.companyWorkRecord.findMany({ where: { AND: [source.base, { dueOn: { gte: dateOnly(days[0]), lt: dateOnly(addDay(days[0], 2)) }, status: { notIn: ['CANCELLED', 'INACTIVE'] } }] }, select, orderBy }),
  tx.companyWorkRecord.findMany({ where: { AND: [source.base, source.pending] }, select, orderBy, take: 10 }),
  tx.companyWorkRecord.findMany({ where: { AND: [source.base, { status: 'DONE' }] }, select, orderBy, take: 10 }),
 ])
 const ids = [...new Set([...dated, ...pending, ...review].map(r => r.assigneeId).filter(Boolean))]
 const users = ids.length ? await tx.userProfile.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } }) : []
 const names = new Map(users.map(u => [u.id, u.displayName]))
 const project = row => ({ id: row.id, name: row.name, status: row.status, date: key(row.dueOn), assignee: names.get(row.assigneeId) || null, href: source.href })
 return { id: source.id, title: source.title, href: source.href, scope: source.visibility,
  days: days.map(date => { const work = dated.filter(r => key(r.dueOn) === date); return { date, total: work.length, pending: work.filter(r => unfinished.has(r.status)).length, rows: work.slice(0, 10).map(project) } }),
  pending: pending.map(project), review: review.map(project),
 }
}
async function financeRows(tx, source) {
 const bill = source.model === 'agentBill'
 const select = bill ? { id: true, title: true, status: true, dueOn: true, agentName: true, total: true, paid: true } : { id: true, title: true, status: true }
 const rows = await tx[source.model].findMany({ where: { AND: [source.base, source.pending] }, select, take: 5, orderBy: bill ? [{ dueOn: 'asc' }, { id: 'asc' }] : [{ updatedAt: 'desc' }, { id: 'asc' }] })
 return rows.map(row => ({ id: row.id, title: row.title, status: row.status, area: source.title, href: source.href,
  ...(bill ? { dueOn: key(row.dueOn), agent: row.agentName, balance: Math.round((Number(row.total) - Number(row.paid)) * 100) / 100 } : {}),
 }))
}
// Sources are supplied only after the overview's existing read permission and
// scope checks. Reuse those exact predicates; a role name never widens them.
export async function workSummary(tx, actor, today, sources, now = new Date(), {lean=false}={}) {
 const days = [today, addDay(today, 1)]
 const allowed = code => effectiveAccess(actor, code, { now }).allowed
 const runs = sources.filter(s => s.model === 'dispatchRun' && ['guide', 'driver'].includes(s.id))
 const job = sources.find(s => s.model === 'companyWorkRecord' && s.base.kind === 'JOB')
 const finance = sources.filter(s => ['financePersonnelRecord', 'agentBill'].includes(s.model))
 const [dispatch, jobs, queues] = await Promise.all([
  Promise.all(runs.map(source => runSection(tx, source, days, allowed))),
  job ? jobSection(tx, job, days, lean) : null,
  Promise.all(finance.map(source => financeRows(tx, source))),
 ])
 return { days, dispatch, jobs, finance: queues.flat(), rowLimit: 10 }
}
