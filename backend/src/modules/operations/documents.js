import { authorize, dateOnly } from './common.js'
import { parseStamp } from '../../../../packages/contracts/operations.js'
import { bookingAmount, dailyBookingSummary } from '../../../../packages/contracts/booking-document.js'

export async function documentBrand(prisma) {
 const asset = await prisma.documentAsset.findUnique({ where: { key: 'company-logo' } })
 if (!asset) return { logo: null }
 return { logo: `data:${asset.mimeType};base64,${Buffer.from(asset.content).toString('base64')}`, sha256: asset.sha256 }
}
export async function dailyBookingDocument(prisma, actorId, date) {
 await authorize(prisma, actorId, 'booking')
 dateOnly(date)
 const start = parseStamp(`${date} 00:00`), end = new Date(+start + 86400000)
 return prisma.$transaction(async tx => {
  // Service day includes overnight guests still on their trip, once per booking.
  const bookings = await tx.tourBooking.findMany({
   where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, trip: { startsAt: { lt: end }, endsAt: { gte: start } } },
   include: { trip: true, lines: { where: { selected: true }, include: { resource: true } } },
   orderBy: [{ code: 'asc' }, { id: 'asc' }],
  })
  const rows = bookings.map(b => ({
   id:b.id, code:b.code, version:b.version, name:b.name, agentName:b.agentName || 'Direct',
   programId:b.programSnapshot?.tourId || b.trip.tourId || 'standalone', programName:b.programSnapshot?.name || b.trip.name,
   adults:b.adults, children:b.children, paymentTerms:b.paymentTerms,
   collectAmount:b.paymentTerms==='COUNTER'?bookingAmount(b):null,
   hotel:b.hotel, room:b.room, notes:[b.allergies,b.assistance,b.requestNotes].filter(Boolean).join(' · '),
   transfers:[...new Set(b.lines.filter(l=>(l.snapshot?.category||l.resource.category)==='TRANSFER').flatMap(l=>l.dispatchDirection==='BOTH'?['OUTBOUND','RETURN']:[l.dispatchDirection]))],
  }))
  return { date, generatedAt:new Date().toISOString(), rows, summary:dailyBookingSummary(rows) }
 }, { isolationLevel:'RepeatableRead', timeout:15000 })
}
