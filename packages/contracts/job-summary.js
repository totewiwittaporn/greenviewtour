// Count allocated seats per direction. A returning guest is a second journey,
// never an additional unique customer in a combined total.
export function programSummary(runs, direction) {
 const groups = new Map()
 for (const run of runs.filter(r => r.direction === direction)) for (const item of [...run.assignments].sort((a,b)=>(a.booking.code||'').localeCompare(b.booking.code||''))) {
  const name = item.booking.programName || 'Standalone service'
  const key = item.booking.programId || name
  if (!groups.has(key)) groups.set(key, { key, name, adults: 0, children: 0 })
  const group = groups.get(key)
  group.adults += item.adults
  group.children += item.children
 }
 return [...groups.values()].map(group => ({ ...group, passengers: group.adults + group.children }))
}
