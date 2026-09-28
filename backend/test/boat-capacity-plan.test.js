import test from 'node:test'
import assert from 'node:assert/strict'
import {planBoatGroups} from '../src/modules/operations/boat-capacity-plan.js'
const input = (pax, capacities, extra = {}) => ({bookings: pax.map((pax, i) => ({id: `g${i}`, pax})), boats: capacities.map((capacity, i) => ({id: `b${i}`, capacity})), ...extra})
function verify(data, result) {
 if (result.status !== 'FEASIBLE') return
 const groups = new Map(data.bookings.map(g => [g.id, g.pax])), seen = []
 for (const boat of result.assignments) {
  assert.equal(boat.capacity, data.boats.find(b => b.id === boat.boatId).capacity)
  assert.equal(boat.pax, boat.bookingIds.reduce((n, id) => n + groups.get(id), 0))
  assert.ok(boat.pax <= boat.capacity)
  seen.push(...boat.bookingIds)
 }
 assert.deepEqual(seen.sort(), [...groups.keys()].sort())
 assert.equal(new Set(result.assignments.map(b => b.boatId)).size, result.boatCount)
 assert.equal(result.totalCapacity, result.assignments.reduce((n, b) => n + b.capacity, 0))
 assert.equal(result.spareSeats, result.totalCapacity - result.passengers)
}
test('owner examples choose 30+45 for groups 30/40, 65 for 65, and 45+65 for 35/35', () => {
 for (const [groups, expected] of [[[30, 40], [30, 45]], [[65], [65]], [[35, 35], [45, 65]]]) {
  const data = input(groups, [30, 45, 65]), result = planBoatGroups(data)
  assert.equal(result.status, 'FEASIBLE'); assert.equal(result.optimal, true)
  assert.deepEqual(result.assignments.map(b => b.capacity), expected); verify(data, result)
 }
})
test('total seats are not enough evidence: indivisible groups must all fit', () => {
 for (const [groups, boats, reason] of [[[2], [1], 'TOTAL_CAPACITY'], [[5], [3, 2], 'GROUP_TOO_LARGE'], [[6, 6, 6], [10, 10], 'GROUPS_DO_NOT_FIT'], [[70], [30, 45, 65], 'GROUP_TOO_LARGE']]) {
  const result = planBoatGroups(input(groups, boats))
  assert.equal(result.status, 'INSUFFICIENT_CAPACITY'); assert.equal(result.reason, reason)
  assert.deepEqual(result.assignments, [])
 }
})
test('backtracking finds a plan that first-fit alone misses', () => {
 const data = input([6, 5, 3, 2, 2, 2], [10, 10]), result = planBoatGroups(data)
 assert.equal(result.status, 'FEASIBLE'); assert.equal(result.boatCount, 2); verify(data, result)
})
test('fewest boats takes precedence over fewer unused seats', () => {
 const result = planBoatGroups(input([5, 5], [5, 5, 12]))
 assert.equal(result.boatCount, 1); assert.equal(result.totalCapacity, 12)
})
test('search exhaustion requires review; a found plan must not claim unproved optimality', () => {
 assert.equal(planBoatGroups(input([2, 2], [3, 5], {maxNodes: 1})).status, 'REVIEW_REQUIRED')
 const data = input([2, 2], [3, 5], {maxNodes: 3}), result = planBoatGroups(data)
 assert.equal(result.status, 'FEASIBLE'); assert.equal(result.optimal, false); verify(data, result)
 assert.equal(planBoatGroups({...data, maxNodes: 1000}).boatCount, 1)
 assert.equal(planBoatGroups(input(Array(257).fill(1), [300])).reason, 'INPUT_LIMIT')
})
test('empty demand requires no boats; demand with no boats is not confirmable', () => {
 assert.equal(planBoatGroups(input([], [])).boatCount, 0)
 assert.equal(planBoatGroups(input([1], [])).status, 'INSUFFICIENT_CAPACITY')
})
test('invalid IDs, passenger counts, capacities and unsafe totals are rejected', () => {
 for (const n of [0, -1, 1.2, NaN, Infinity, '5', null]) {
  assert.throws(() => planBoatGroups(input([n], [10])), RangeError)
  assert.throws(() => planBoatGroups(input([1], [n])), RangeError)
 }
 assert.throws(() => planBoatGroups({bookings: [{id: 'g', pax: 1}, {id: 'g', pax: 1}], boats: []}), TypeError)
 assert.throws(() => planBoatGroups({bookings: [], boats: [{id: 'b', capacity: 1}, {id: 'b', capacity: 1}]}), TypeError)
 assert.throws(() => planBoatGroups({bookings: [{id: ' ', pax: 1}], boats: []}), TypeError)
 assert.throws(() => planBoatGroups({bookings: null, boats: []}), TypeError)
 assert.throws(() => planBoatGroups(input([Number.MAX_SAFE_INTEGER, 1], [10])), RangeError)
 for (const maxNodes of [0, -1, 1.5, 1000001]) assert.throws(() => planBoatGroups(input([], [], {maxNodes})), RangeError)
})
test('planning is deterministic and does not mutate or reserve input records', () => {
 const data = input([5, 3, 3, 2], [8, 7, 8]), before = structuredClone(data)
 const result = planBoatGroups(data)
 assert.deepEqual(data, before); assert.equal(result.provisional, true)
 assert.deepEqual(planBoatGroups({bookings: [...data.bookings].reverse(), boats: [...data.boats].reverse()}), result)
 verify(data, result)
})
// Independent exhaustive oracle: no pruning, symmetry removal or group sorting.
function oracle(data) {
 const loads = data.boats.map(() => 0); let best = null
 function walk(i) {
  if (i === data.bookings.length) {
   const chosen = data.boats.filter((_, n) => loads[n] > 0), count = chosen.length, capacity = chosen.reduce((n, b) => n + b.capacity, 0)
   if (!best || count < best.count || count === best.count && capacity < best.capacity) best = {count, capacity}
   return
  }
  for (let j = 0; j < loads.length; j++) {
   const pax = data.bookings[i].pax
   if (loads[j] + pax > data.boats[j].capacity) continue
   loads[j] += pax; walk(i + 1); loads[j] -= pax
  }
 }
 walk(0); return best
}
test('200 deterministic small fleets match exhaustive feasibility and optimum', () => {
 let seed = 20260925
 const random = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max }
 for (let i = 0; i < 200; i++) {
  const data = input(Array.from({length: 1 + random(6)}, () => 1 + random(10)), Array.from({length: 1 + random(4)}, () => 1 + random(16)))
  const expected = oracle(data), result = planBoatGroups(data)
  assert.equal(result.status, expected ? 'FEASIBLE' : 'INSUFFICIENT_CAPACITY', JSON.stringify(data))
  if (expected) {
   assert.equal(result.optimal, true); assert.equal(result.boatCount, expected.count)
   assert.equal(result.totalCapacity, expected.capacity); verify(data, result)
  }
 }
})
