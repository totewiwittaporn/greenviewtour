import {managementPageSummary} from './management-page.js'
import { seasonSummary } from './season-summary.js'
import { dateOnly } from '../../../modules/operations/common.js'

const addDays = (day, n) => new Date(+dateOnly(day) + n * 86400000).toISOString().slice(0, 10)
const arrival = row => row.outboundDate || (row.returnStatus === 'OUR' ? row.returnDate : null)
const dayKey = value => value ? new Date(value).toISOString().slice(0, 10) : null
const confirmed = row => ['CONFIRMED', 'COMPLETED'].includes(row.status)
const pax = row => row.adults + row.children
const program = row => row.programSnapshot?.tourId || row.trip?.tourId ? row.programSnapshot?.name || row.trip?.name || 'Tour program' : 'Standalone services'

// Caller requires company scope and both existing booking read permissions.
// Reporting season is an owner-defined dashboard period, separate from program availability.
export async function managementSummary(tx, today, calendar, {lean=false}={}) {
 if(lean)return managementPageSummary(tx,today)
 const end = addDays(today, 30)
 const monthStart = new Date(today + 'T00:00:00Z')
 monthStart.setUTCDate(1); monthStart.setUTCMonth(monthStart.getUTCMonth() - 5)
 const fromMonth = monthStart.toISOString().slice(0, 10)
 const range = { gte: dateOnly(fromMonth), lt: dateOnly(end) }
 const rows = await tx.tourBooking.findMany({
  where: { status: { in: ['DRAFT', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] }, OR: [{ outboundDate: range }, { outboundDate: null, returnStatus: 'OUR', returnDate: range }] },
  select: { id: true, code: true, status: true, outboundDate: true, returnDate: true, returnStatus: true, adults: true, children: true, programSnapshot: true, trip: { select: { tourId: true, name: true } }, agent: { select: { id: true, name: true } } },
 })
 const unique = [...new Map(rows.map(row => [row.id, row])).values()]
 const calendar30 = calendar(unique, today, 30)
 const bookingDays = [today, addDays(today, 1)].map(date => {
  const daily = unique.filter(row => dayKey(arrival(row)) === date)
  return { date, total: daily.length, confirmed: daily.filter(row => row.status === 'CONFIRMED').length, draft: daily.filter(row => row.status === 'DRAFT').length, completed: daily.filter(row => row.status === 'COMPLETED').length, cancelled: daily.filter(row => row.status === 'CANCELLED').length,
   rows: daily.sort((a, b) => a.code.localeCompare(b.code, 'en')).slice(0, 5).map(row => ({ id: row.id, code: row.code, program: program(row), pax: pax(row), status: row.status })) }
 })
 const agents = new Map()
 let totalPax = 0
 for (const row of unique) {
  const date = dayKey(arrival(row))
  if (!confirmed(row) || !date || date < today || date >= end) continue
  totalPax += pax(row)
  const id = row.agent?.id || 'direct'
  const entry = agents.get(id) || { id, name: row.agent?.name || 'Direct / no agent', bookings: 0, pax: 0 }
  entry.bookings++; entry.pax += pax(row); agents.set(id, entry)
 }
 const monthlyRows = Array.from({ length: 6 }, (_, i) => {
  const month = new Date(+monthStart); month.setUTCMonth(month.getUTCMonth() + i)
  return { month: month.toISOString().slice(0, 7), bookings: 0, pax: 0 }
 })
 for (const row of unique) {
  const date = dayKey(arrival(row))
  if (!confirmed(row) || !date || date > today) continue
  const month = monthlyRows.find(item => item.month === date.slice(0, 7))
  if (month) { month.bookings++; month.pax += pax(row) }
 }
 const seasonAgents = await seasonSummary(tx, today)
 return { seasonAgents, from: today, through: addDays(today, 29), calendar30, bookingDays,
  topAgents: { from: today, through: addDays(today, 29), rows: [...agents.values()].sort((a, b) => b.pax - a.pax || a.name.localeCompare(b.name, 'en')).slice(0, 6).map(row => ({ ...row, share: totalPax ? Math.round(row.pax / totalPax * 1000) / 10 : 0 })) },
  monthly: { from: fromMonth, through: today, basis: 'last6Months', rows: monthlyRows },
  revenue: null, revenueUnavailableReason: 'NO_COMPANY_REVENUE_DEFINITION' }
}
