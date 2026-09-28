// Presentation metadata only: never infer services from a tour abbreviation.
const selectedLines = booking => (booking.lines || []).filter(line => line.selected === true)
const meta = (line, field) => line.snapshot?.[field] ?? line.resource?.[field] ?? null
const mealCode = { BREAKFAST: 'B', LUNCH: 'L', DINNER: 'D' }
export const serviceFlagCodes = { VEGAN: 'VGN', VEGETARIAN: 'VEG', OWN_TENT: 'CT', OWN_BUNGALOW: 'B-OWN', NO_MEALS: 'SELF', NO_PARK_FEE: 'NO-PARK', NO_TRANSFER: 'NO-TRF', OTHER: 'NOTE' }
export function bookingPrintDetails(booking) {
 const flags = booking.specialRequirements || [], lines = selectedLines(booking)
 const accommodation = []
 if (flags.includes('OWN_TENT')) accommodation.push('CT')
 if (flags.includes('OWN_BUNGALOW')) accommodation.push('B-OWN')
 for (const line of lines.filter(l => meta(l, 'category') === 'ACCOMMODATION')) {
  const type = meta(line, 'accommodationType'), owner = meta(line, 'ownership')
  if (['STANDARD_TENT','AC_TENT'].includes(type)) accommodation.push(owner === 'GREENVIEW' ? 'GV' : owner === 'PARK' ? 'NP' : 'T-EXT')
  else if (type === 'BUNGALOW') accommodation.push('BUN')
  else accommodation.push('STAY?')
 }
 const meals = [...new Set(lines.filter(l => meta(l, 'category') === 'MEAL').map(l => {
  const period = mealCode[meta(l, 'mealPeriod')] || '?'
  return `${l.snapshot?.day ? `${l.snapshot.day}:` : ''}${period}`
 }))]
 const known = Array.isArray(booking.lines)
 return { accommodation: [...new Set(accommodation)].join(' + ') || (known ? '-' : '?'),
  meals: flags.includes('NO_MEALS') ? 'SELF' : meals.join(' / ') || (known ? '-' : '?'),
  flags: flags.filter(f => !['OWN_TENT','OWN_BUNGALOW','NO_MEALS'].includes(f)).map(f => serviceFlagCodes[f] || f),
 }
}
export function compactGroupName(value, limit = 44) {
 const text = String(value || '')
 const segments = [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map(s => s.segment)
 return segments.length > limit ? segments.slice(0, limit - 1).join('') + '…' : text
}
const demoNotice = 'DEMO ONLY — synthetic Booking, passenger identities, prices and dates. No real reservation or payment.'
export function printRemarks(assignment) {
 const booking = assignment.booking, notes = []
 if (booking.allergies) notes.push(`ALLERGY: ${booking.allergies}`)
 else if (booking.allergyStatus !== 'NONE') notes.push('ALLERGY: not checked')
 if (booking.printServices?.flags?.length) notes.push(booking.printServices.flags.join(' / '))
 if (booking.assistance) notes.push(`ASSIST: ${booking.assistance}`)
 let request = booking.requestNotes || ''
 if (booking.demoDataset === 'greenview-demo45-20260925') request = request.replace(demoNotice, '').trim()
 notes.push(request, assignment.notes, assignment.changeReason)
 return [...new Set(notes.filter(Boolean))].join(' · ')
}
// Unconfigured or ambiguous aliases print the real name, never an unexplained P1.
export function manifestPrograms(runs) {
 const map = new Map()
 for (const run of runs) for (const { booking } of run.assignments) {
  const key = booking.programId || booking.programName || 'standalone'
  if (!map.has(key)) map.set(key, { key, name: booking.programName || 'Standalone service', alias: booking.programPrintCode?.trim() || null })
 }
 const counts = new Map()
 for (const p of map.values()) if (p.alias) counts.set(p.alias, (counts.get(p.alias) || 0) + 1)
 return [...map.values()].map(p => ({ key:p.key, name:p.name, code:p.alias && counts.get(p.alias) === 1 ? p.alias : p.name }))
}
export function documentRows(assignments, limit = 500) {
 if (!Number.isInteger(limit)||limit<1) throw Error('INVALID_DOCUMENT_FRAGMENT_SIZE')
 return [...assignments].sort((a,b) => String(a.booking.code).localeCompare(String(b.booking.code), 'en', {numeric:true})).flatMap((row, index) => {
  const text = printRemarks(row), parts = []
  const graphemes = [...new Intl.Segmenter('th', {granularity:'grapheme'}).segment(text)].map(x => x.segment)
  for (let offset = 0; offset < graphemes.length; offset += limit) parts.push(graphemes.slice(offset, offset + limit).join(''))
  if (!parts.length) parts.push('')
  return parts.map((remarks, fragment) => ({...row, printKey:`${row.id}:${fragment}`, number:index+1, remarks, continued:fragment>0, continues:fragment<parts.length-1}))
 })
}
