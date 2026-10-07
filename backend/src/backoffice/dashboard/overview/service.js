import {isD1OwnerPage} from './owner-read.js'
import {cashSummary} from './cash-summary.js'
import {apiStatus} from '../../../platform/monitoring/api-status.js'
import {scalarArrayWhere} from '../../../platform/database/scalar-array.js'
import {jsonRangeWhere} from '../../../platform/database/json-range.js'
import {managerWidgetCounts} from './manager-widgets.js'
import { workSummary } from './work-summary.js'
import { bookingSummary } from './booking-summary.js'
import { managementSummary } from './management-summary.js'
import { effectiveAccess, isManager } from '../../../../../packages/contracts/access.js'
import { companyRoutes } from '../../../../../packages/contracts/company-routes.js'
import { accessProfileSelect } from '../../../modules/identity-access/policy.js'
import { managementScope } from '../../../modules/identity-access/user-management.js'
import { fail, dateOnly } from '../../../modules/operations/common.js'
import { pendingPassengers } from '../../../modules/operations/dispatch.js'
import { thailandDay } from '../../../modules/operations/check-in.js'
import {readTransaction} from '../../../platform/database/read-transaction.js'

const dayKey = value => value ? new Date(value).toISOString().slice(0, 10) : null
const arrivalWhere = filter => ({ OR: [{ outboundDate: filter }, { outboundDate: null, returnStatus: 'OUR', returnDate: filter }] })
const addDays = (day, n) => new Date(+dateOnly(day) + n * 86400000).toISOString().slice(0, 10)
// Match Reception: arrivals once per booking, or our return leg for return-only bookings.
export function customerCalendar(rows, start, length = 14) {
 const days = Array.from({ length }, (_, i) => ({ date: addDays(start, i), bookings: 0, pax: 0, programs: [] }))
 const seen = new Set()
 for (const row of rows) {
  if (seen.has(row.id) || !['CONFIRMED', 'COMPLETED'].includes(row.status)) continue
  seen.add(row.id)
  const date = dayKey(row.outboundDate || (row.returnStatus === 'OUR' ? row.returnDate : null))
  const day = days.find(d => d.date === date)
  if (!day) continue
  const id = row.programSnapshot?.tourId || row.trip?.tourId || 'standalone'
  let program = day.programs.find(p => p.id === id)
  if (!program) { program = { id, name: id === 'standalone' ? 'Standalone services' : row.programSnapshot?.name || row.trip?.name || 'Tour program', bookings: 0, pax: 0 }; day.programs.push(program) }
  const pax = row.adults + row.children
  program.bookings++; program.pax += pax; day.bookings++; day.pax += pax
 }
 for (const day of days) day.programs.sort((a, b) => a.name.localeCompare(b.name, 'en'))
 return days
}
export function dashboardScope(actor) {
 if (actor?.status !== 'ACTIVE') fail('PERMISSION_DENIED', 403)
 const management = managementScope(actor)
 const department = management?.department && actor.roles.some(g => ['SELF', 'COMPANY'].includes(g.scope) && g.roleCode === `HEAD_${management.department}`) ? management.department : null
 return { company: Boolean(isManager(actor) && management?.company), department }
}

const ownerOverview=now=>({today:thailandDay(now),timezone:'Asia/Bangkok',generatedAt:now.toISOString(),scope:'Company',systemOverview:apiStatus(now),widgets:[],calendar:null,managementOverview:null,workOverview:null})

// Counts are computed over complete authorized sets, never a paginated list response.
export async function dashboardOverview(prisma, actorId, now = new Date(), {surface='legacy'} = {}) {
 if(surface==='page'&&await isD1OwnerPage(prisma,actorId))return ownerOverview(now)
 return readTransaction(prisma,async tx => {
  const actor = await tx.userProfile.findUnique({ where: { id: actorId }, select: accessProfileSelect })
  const scope = dashboardScope(actor), allowed = code => effectiveAccess(actor, code, { now }).allowed
  const today = thailandDay(now), end = addDays(today, 14), date = dateOnly(today)
  const pageMode=surface==='page', pageManager=pageMode&&scope.company
  if(pageMode&&actor.roles.some(role=>role.roleCode==='ADMIN_MANAGER'&&role.scope==='COMPANY'))return ownerOverview(now)
  const gmWidgetIds=new Set(['guide','driver','guide-crew','driver-crew','guide-allocation','driver-allocation'])
  const bookingRole=actor.roles.some(g=>['SELF','COMPANY'].includes(g.scope)&&['BOOKING','HEAD_BOOKING'].includes(g.roleCode||g.code))
  if(!scope.company&&bookingRole&&allowed('operations.booking')&&allowed('operations.islandBooking'))return {today,through:addDays(today,29),timezone:'Asia/Bangkok',generatedAt:now.toISOString(),bookingOverview:await bookingSummary(tx,actor,today,customerCalendar,{lean:pageMode})}
  const startTime = new Date(today + 'T00:00:00+07:00'), endTime = new Date(end + 'T00:00:00+07:00')
  const tomorrowTime = new Date(addDays(today, 1) + 'T00:00:00+07:00')
  const widgets = [], tasks = [], sources = [], runWidgets=[], allocationWidgets=[]
  const team = scope.department ? await tx.userProfile.findMany({ where: { department: scope.department, roles: { none: { roleCode: { in: ['ADMIN_MANAGER', 'MANAGER'] } } } }, select: { id: true } }) : []
  const ids = [...new Set([actorId, ...team.map(u => u.id)])]
  const owned = field => scope.company ? {} : { [field]: { in: ids } }
  const scopeLabel = scope.company ? 'Company' : scope.department ? `${scope.department.toLowerCase()} department` : 'My work'
  async function countWidget({ id, title, href, model, base = {}, pending, overdue, todayWhere, review, detail, visibility = scopeLabel }) {
   if(pageManager&&!gmWidgetIds.has(id)){
    if(href.startsWith('/company/'))widgets.push({id,title,href,pending:null,overdue:null,today:null,review:null,scope:visibility})
    return
   }
   sources.push({ id, title, href, model, base, pending, visibility })
   if(pageManager&&model==='dispatchRun'){runWidgets.push({id,title,href,base,detail,visibility});return}
   const [pendingCount, overdueCount, todayCount, reviewCount] = await Promise.all([
    tx[model].count({ where: { AND: [base, pending] } }),
    overdue ? tx[model].count({ where: { AND: [base, pending, overdue] } }) : null,
    todayWhere ? tx[model].count({ where: { AND: [base, pending, todayWhere] } }) : null,
    review ? tx[model].count({ where: { AND: [base, pending, review] } }) : null,
   ])
   widgets.push({ id, title, href, pending: pendingCount, overdue: overdueCount, today: todayCount, review: reviewCount, detail, scope: visibility })
  }
  const calendarAllowed = scope.company && allowed('operations.booking') && allowed('operations.islandBooking')
  const calendarTask = !pageMode&&calendarAllowed ? tx.tourBooking.findMany({
   where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, OR: [{ outboundDate: { gte: date, lt: dateOnly(end) } }, { outboundDate: null, returnStatus: 'OUR', returnDate: { gte: date, lt: dateOnly(end) } }] },
   select: { id: true, status: true, outboundDate: true, returnDate: true, returnStatus: true, adults: true, children: true, programSnapshot: true, trip: { select: { tourId: true, name: true } } },
  }).then(rows => customerCalendar(rows, today)) : Promise.resolve(null)
  if (allowed('operations.islandBooking')) tasks.push(countWidget({ id: 'bookings', title: 'Bookings awaiting confirmation', href: '/operations/bookings?status=DRAFT', model: 'tourBooking', base: allowed('operations.booking') ? owned('createdById') : { createdById: actorId }, pending: { status: 'DRAFT' }, overdue: arrivalWhere({ lt: date }), todayWhere: arrivalWhere(date), detail: 'Draft bookings; overdue means the arrival date has passed.', visibility: allowed('operations.booking') ? scopeLabel : 'My bookings' }))
  for (const [kind, read, manage, route, title] of [['BOAT', 'guide', 'manageGuide', 'guide', 'Boat jobs'], ['VEHICLE', 'driver', 'manageDriver', 'driver', 'Vehicle jobs']]) {
   if (!allowed('operations.' + read)) continue
   // Department expansion must also be permitted by the existing job reader.
   const broad = allowed('operations.' + manage)
   const base = { kind, ...(scope.company && broad ? {} : { staff: { some: { userId: { in: broad ? ids : [actorId] } } } }) }
   tasks.push(countWidget({ id: route, title, href: `/operations/${route}`, model: 'dispatchRun', base, pending: { status: 'OPEN', slot: { startsAt: { lt: endTime } } }, overdue: { slot: { endsAt: { lt: now } } }, todayWhere: { slot: { startsAt: { lt: tomorrowTime }, endsAt: { gte: startTime } } }, detail: 'Open jobs through the next 14 days. Overdue jobs have ended but remain open.', visibility: broad ? scopeLabel : 'My assigned jobs' }))
   if (scope.company && broad) tasks.push(countWidget({ id: route + '-crew', title: kind === 'BOAT' ? 'Boat jobs missing captain or guide' : 'Vehicle jobs missing driver', href: `/operations/${route}`, model: 'dispatchRun', base: { kind }, pending: { status: 'OPEN', slot: { startsAt: { gte: startTime, lt: endTime } }, OR: (kind === 'BOAT' ? [['CAPTAIN', 'HEAD_CAPTAIN'], ['GUIDE', 'HEAD_GUIDE']] : [['DRIVER', 'HEAD_DRIVER']]).map(roles => ({ staff: { none: { role: { in: roles } } } })) }, detail: 'Upcoming jobs without a recorded lead crew role.' }))
  }
  if (allowed('operations.guide')) tasks.push(countWidget({ id: 'guide-assignments', title: 'Booking guide assignments', href: '/operations/guide-assignments', model: 'guideAssignment', base: { ...(scope.company && allowed('operations.manageGuide') ? {} : { guideId: { in: allowed('operations.manageGuide') ? ids : [actorId] } }), booking: { status: { in: ['CONFIRMED', 'COMPLETED'] } } }, pending: { status: 'PLANNED', startsAt: { lt: endTime } }, overdue: { endsAt: { lt: now } }, todayWhere: { startsAt: { lt: tomorrowTime }, endsAt: { gte: startTime } }, detail: 'Planned guide work; cancelled bookings are excluded.', visibility: allowed('operations.manageGuide') ? scopeLabel : 'My assigned jobs' }))
  // Allocation counts reuse the dispatch owner's remaining-passenger calculation.
  for (const [permission, read, categories, route, title] of [
   ['operations.manageGuide', 'operations.guide', ['TOUR_BOAT', 'LONGTAIL_BOAT'], 'guide', 'Bookings awaiting boat allocation'],
   ['operations.manageDriver', 'operations.driver', ['TRANSFER'], 'driver', 'Bookings awaiting vehicle allocation'],
  ]) {
   if (!scope.company || !allowed(permission) || !allowed(read)) continue
   if(pageManager){allocationWidgets.push({categories,route,title});continue}
   tasks.push((async () => {
    const lines = await tx.bookingComponent.findMany({ where: { selected: true, resource: { category: { in: categories } }, booking: { status: 'CONFIRMED', OR: [{ outboundDate: { gte: date, lt: dateOnly(end) } }, { returnStatus: 'OUR', returnDate: { gte: date, lt: dateOnly(end) } }] } },
     select: { quantity: true, dispatchDirection: true, resource: { select: { baseUnit: true } }, booking: { select: { id: true, adults: true, children: true, outboundDate: true, returnDate: true, returnStatus: true, attendance: { select: { direction: true, serviceDate: true, noShowAdults: true, noShowChildren: true } } } }, dispatchAssignments: { select: { status: true, adults: true, children: true, run: { select: { direction: true } } } } } })
    const pending = new Set(), dueToday = new Set()
    for (const line of lines) for (const direction of ['OUTBOUND', 'RETURN']) {
     const dateKey = dayKey(direction === 'OUTBOUND' ? line.booking.outboundDate : line.booking.returnStatus === 'OUR' ? line.booking.returnDate : null)
     if (!dateKey || dateKey < today || dateKey >= end || ![direction, 'BOTH'].includes(line.dispatchDirection)) continue
     if (pendingPassengers(line, direction).remainingPassengers > 0) { pending.add(line.booking.id); if (dateKey === today) dueToday.add(line.booking.id) }
    }
    widgets.push({ id: route + '-allocation', title, href: '/operations/' + route, pending: pending.size, today: dueToday.size, overdue: null, review: null, scope: 'Company', detail: 'Unique bookings with passengers still unallocated in the next 14 days, excluding recorded no-shows.' })
   })())
  }
  let duties=[]
  if(!pageManager&&allowed('inventory.request')&&effectiveAccess(actor,'operations.stock',{now}).source!=='User restriction'){
   const deputyWhere=await scalarArrayWhere(tx,'WarehouseResponsibility.deputyUserIds',actorId)
   duties=await tx.warehouseResponsibility.findMany({where:{OR:[{primaryUserId:actorId},deputyWhere]},select:{storeId:true}})
  }
  for (const [route, definition] of Object.entries(companyRoutes)) {
   if (!(definition.anyPermissions || [definition.permission]).some(allowed)) continue
   const { kind, title, finance } = definition
   if (finance) {
    const overdue=['WORK_ADVANCE','SALARY_ADVANCE'].includes(kind)
     ?{status:{in:['PAID','CLEARANCE_SUBMITTED']},...await jsonRangeWhere(tx,'FinancePersonnelRecord.payload.dueOn',{lt:today})}
     :null
    tasks.push(countWidget({ id: route, title, href: '/company/' + route, model: 'financePersonnelRecord', base: { kind }, pending: { status: { in: ['DRAFT', 'SUBMITTED', 'REJECTED', ...(definition.permission === 'personnel.view' ? [] : ['APPROVED']), ...(['WORK_ADVANCE', 'SALARY_ADVANCE'].includes(kind) ? ['PAID', 'CLEARANCE_SUBMITTED'] : [])] } }, overdue, detail: 'Records awaiting submission, review or the next workflow step.', visibility: 'Authorized ' + (definition.permission === 'payroll.view' ? 'payroll' : definition.permission === 'personnel.view' ? 'personnel' : 'accounts') + ' records' }))
   } else if (kind === 'RECEIVABLES') {
    tasks.push(countWidget({ id: route, title, href: '/company/' + route, model: 'agentBill', pending: { status: 'OPEN' }, overdue: { dueOn: { lt: date } }, todayWhere: { dueOn: date }, detail: 'Open agent bills, including partially paid bills.', visibility: 'Authorized accounts records' }))
   } else if (['JOB', 'STOCK_REQUEST', 'COUNT', 'MAINTENANCE'].includes(kind)) {
    let base = { kind }
    if (kind === 'JOB') {
     const cleaning = allowed('housekeeping.manage') || allowed('housekeeping.approve')
     base.OR = [{ assigneeId: actorId }, ...(cleaning ? [{ payload: { path: ['jobKind'], equals: 'CLEANING' }, ...owned('assigneeId') }] : []), ...(allowed('inventory.approve') ? [{ payload: { path: ['jobKind'], equals: 'COUNT' }, ...owned('assigneeId') }] : [])]
    } else if (!(scope.company && (allowed('inventory.approve') || allowed('operations.stock')))) {
     // Team membership alone does not authorize maintenance/request records.
     base.OR = [{ createdById: actorId }, { assigneeId: actorId }, { storeId: { in: duties.map(d => d.storeId) } }]
    }
    tasks.push(countWidget({ id: route, title, href: '/company/' + route, model: 'companyWorkRecord', base, pending: { status: { in: ['DRAFT', 'REJECTED', 'PENDING', 'SUBMITTED', 'APPROVED', 'ISSUED', 'DONE'] } }, overdue: { dueOn: { lt: date } }, todayWhere: { dueOn: date }, review: { status: 'DONE' }, detail: 'Unfinished records; review counts completed work awaiting acceptance.', visibility: kind === 'JOB' ? scopeLabel : scope.company && (allowed('inventory.approve') || allowed('operations.stock')) ? 'Company' : 'My work / appointed warehouses' }))
   } else if (kind === 'PURCHASE') tasks.push(countWidget({ id: route, title, href: '/company/' + route, model: 'purchaseOrder', pending: { status: { in: ['DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'PART_RECEIVED'] } }, detail: 'Purchases awaiting review or receiving.', visibility: 'Authorized purchasing records' }))
  }
  if (allowed('operations.stock')) tasks.push(countWidget({ id: 'damaged-stock', title: 'Stock awaiting repair or cleaning', href: '/operations/inventory', model: 'stockBalance', pending: { quantity: { gt: 0 }, condition: { in: ['DAMAGED', 'CLEANING'] } }, detail: 'Stock balance rows, not item quantities. Excludes ready stock.', visibility: 'Authorized inventory records' }))
  if(pageManager)tasks.push(managerWidgetCounts(tx,runWidgets,allocationWidgets,{today,end,now,startTime,endTime,tomorrowTime}).then(rows=>widgets.push(...rows)))
  const summaryTask = calendarAllowed ? managementSummary(tx, today, customerCalendar,{lean:pageMode}) : Promise.resolve(null)
  const [calendar, managementOverview] = await Promise.all([calendarTask, summaryTask, ...tasks])
  widgets.sort((a, b) => (b.overdue || 0) - (a.overdue || 0) || b.pending - a.pending || a.id.localeCompare(b.id))
  const workOverview = scope.company ? null : await workSummary(tx, actor, today, sources, now,{lean:pageMode})
  const cashOverview=pageManager?await cashSummary(tx,actor,today):null
  return { cashOverview, workOverview, today, through: addDays(today, 13), timezone: 'Asia/Bangkok', generatedAt: now.toISOString(), scope: scopeLabel, calendar, widgets, managementOverview }
 }, { isolationLevel: 'RepeatableRead', timeout: 15000 })
}
