import { dateOnly } from '../../../modules/operations/common.js'

// Owner reporting rule: 15 October through 15 May, inclusive. Outside the
// operating season, show the upcoming season. This does not change tour dates.
export function reportingSeason(today) {
 const year = Number(today.slice(0, 4)), startYear = today.slice(5) <= '05-15' ? year - 1 : year
 return { from: `${startYear}-10-15`, through: `${startYear + 1}-05-15` }
}
export function rankSeasonAgents(rows, range) {
 const agents = new Map(), seen = new Set()
 let totalPax = 0
 for (const row of rows) {
  if (seen.has(row.id) || !['CONFIRMED', 'COMPLETED'].includes(row.status)) continue
  seen.add(row.id)
  const arrival = row.outboundDate || (row.returnStatus === 'OUR' ? row.returnDate : null)
  const day = arrival && new Date(arrival).toISOString().slice(0, 10)
  if (!day || day < range.from || day > range.through) continue
  const pax = row.adults + row.children
  totalPax += pax
  const id = row.agent?.id || 'direct'
  const agent = agents.get(id) || { id, name: row.agent?.name || 'Direct / no agent', bookings: 0, pax: 0 }
  agent.pax += pax; agent.bookings++; agents.set(id, agent)
 }
 return { ...range, totalPax, rows: [...agents.values()].sort((a, b) => b.pax - a.pax || a.name.localeCompare(b.name)).slice(0, 6).map(row => ({ ...row, share: totalPax ? Math.round(row.pax / totalPax * 1000) / 10 : 0 })) }
}
export async function seasonSummary(tx, today) {
 const season = reportingSeason(today)
 const range = { gte: dateOnly(season.from), lt: new Date(+dateOnly(season.through) + 86400000) }
 const rows = await tx.tourBooking.findMany({
  where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, OR: [{ outboundDate: range }, { outboundDate: null, returnStatus: 'OUR', returnDate: range }] },
  select: { id: true, status: true, outboundDate: true, returnDate: true, returnStatus: true, adults: true, children: true, agent: { select: { id: true, name: true } } },
 })
 return rankSeasonAgents(rows, season)
}
