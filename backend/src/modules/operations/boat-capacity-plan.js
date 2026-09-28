// Pure bounded planning. The caller owns verified readiness, dates and reservations.
const compareId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0
function entries(rows, field, name) {
  if (!Array.isArray(rows)) throw new TypeError(`${name} must be an array`)
  const ids = new Set()
  return rows.map(row => {
    if (!row || typeof row.id !== 'string' || !row.id.trim() || row.id !== row.id.trim() || ids.has(row.id)) throw new TypeError(`${name} require unique, nonempty IDs`)
    if (!Number.isSafeInteger(row[field]) || row[field] <= 0) throw new RangeError(`${name}.${field} must be a positive safe integer`)
    ids.add(row.id)
    return {id: row.id, [field]: row[field], ...(name === 'bookings' ? {
      fixedBoatId: row.fixedBoatId ?? null, exclusive: Boolean(row.exclusive),
      eligibleBoatIds: row.eligibleBoatIds == null ? null : [...row.eligibleBoatIds],
    } : {})}
  })
}
function sum(rows, field) {
  const n = rows.reduce((total, row) => total + row[field], 0)
  if (!Number.isSafeInteger(n)) throw new RangeError('Capacity totals exceed safe integer precision')
  return n
}
/** Prove indivisible group feasibility. Minimize boat count, then used capacity.
 * fixedBoatId preserves real dispatch. exclusive prevents charter mixing.
 * A search limit never means sold out; FEASIBLE always includes an actual witness.
 */
export function planBoatGroups({bookings, boats, maxNodes = 100000}) {
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 1000000) throw new RangeError('maxNodes must be between 1 and 1000000')
  const groups = entries(bookings, 'pax', 'bookings').sort((a, b) => Number(Boolean(b.fixedBoatId)) - Number(Boolean(a.fixedBoatId)) || b.pax - a.pax || compareId(a, b))
  const fleet = entries(boats, 'capacity', 'boats').sort((a, b) => a.capacity - b.capacity || compareId(a, b))
  for (const g of groups) {
    if (g.fixedBoatId !== null && (typeof g.fixedBoatId !== 'string' || !g.fixedBoatId.trim())) throw new TypeError('Invalid fixedBoatId')
    if (g.eligibleBoatIds !== null && (!Array.isArray(bookings.find(b => b.id === g.id).eligibleBoatIds) || g.eligibleBoatIds.some(id => typeof id !== 'string'))) throw new TypeError('Invalid eligibleBoatIds')
  }
  const passengers = sum(groups, 'pax'), availableCapacity = sum(fleet, 'capacity')
  const base = {passengers, availableCapacity, provisional: true}
  const noPlan = (status, reason, nodesVisited = 0) => ({...base, status, reason, optimal: false, assignments: [], nodesVisited})
  if (!groups.length) return {...base, status: 'FEASIBLE', optimal: true, boatCount: 0, totalCapacity: 0, spareSeats: 0, assignments: [], nodesVisited: 0}
  if (groups.length > 256 || fleet.length > 64) return noPlan('REVIEW_REQUIRED', 'INPUT_LIMIT')
  if (groups.some(g => g.fixedBoatId && !fleet.some(b => b.id === g.fixedBoatId))) return noPlan('REVIEW_REQUIRED', 'FIXED_BOAT_UNAVAILABLE')
  if (passengers > availableCapacity) return noPlan('INSUFFICIENT_CAPACITY', 'TOTAL_CAPACITY')
  if (groups.some(g => g.pax > (fleet.at(-1)?.capacity || 0))) return noPlan('INSUFFICIENT_CAPACITY', 'GROUP_TOO_LARGE')
  const compatible = (g, b) => (!g.fixedBoatId || g.fixedBoatId === b.id) && (!g.eligibleBoatIds || g.eligibleBoatIds.includes(b.id))
  const signatures = fleet.map(b => groups.map(g => compatible(g, b) ? '1' : '0').join(''))
  const remaining = fleet.map(b => b.capacity), assigned = fleet.map(() => []), exclusive = fleet.map(() => false)
  let best = null, nodesVisited = 0, limited = false
  const visited = new Set()
  function visit(index, usedCount, usedCapacity) {
    if (limited) return
    if (nodesVisited >= maxNodes) { limited = true; return }
    nodesVisited++
    if (best && (usedCount > best.boatCount || usedCount === best.boatCount && usedCapacity >= best.totalCapacity)) return
    if (index === groups.length) {
      best = {boatCount: usedCount, totalCapacity: usedCapacity, spareSeats: usedCapacity - passengers,
        assignments: fleet.flatMap((b, i) => assigned[i].length ? [{boatId: b.id, capacity: b.capacity, pax: b.capacity - remaining[i], exclusive: exclusive[i], bookingIds: [...assigned[i]]}] : [])}
      return
    }
    const state = `${index}|${remaining.map((r, i) => `${r}:${Number(exclusive[i])}`).join(',')}`
    if (visited.has(state)) return
    visited.add(state)
    const group = groups[index], seen = new Set()
    const choices = fleet.map((_, i) => i).filter(i => remaining[i] >= group.pax && !exclusive[i] && (!group.exclusive || !assigned[i].length) && compatible(group, fleet[i]))
      .sort((a, b) => Number(assigned[b].length > 0) - Number(assigned[a].length > 0) || remaining[a] - remaining[b] || compareId(fleet[a], fleet[b]))
    for (const i of choices) {
      const used = assigned[i].length > 0, key = `${used}:${remaining[i]}:${signatures[i]}`
      if (seen.has(key)) continue
      seen.add(key)
      remaining[i] -= group.pax; assigned[i].push(group.id); exclusive[i] = group.exclusive
      visit(index + 1, usedCount + Number(!used), usedCapacity + (used ? 0 : fleet[i].capacity))
      assigned[i].pop(); remaining[i] += group.pax; exclusive[i] = false
      if (limited) break
    }
  }
  visit(0, 0, 0)
  if (best) return {...base, ...best, status: 'FEASIBLE', optimal: !limited, nodesVisited}
  return noPlan(limited ? 'REVIEW_REQUIRED' : 'INSUFFICIENT_CAPACITY', limited ? 'SEARCH_LIMIT' : 'GROUPS_DO_NOT_FIT', nodesVisited)
}
