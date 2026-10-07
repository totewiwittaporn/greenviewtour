export function headGuideJobs(input) {
  const bookings = Array.isArray(input) ? input : []
  const seen = new Set()
  const groups = new Map()
  for (const booking of bookings) {
    if (!booking || typeof booking.id !== 'string' || !booking.id || seen.has(booking.id)) continue
    seen.add(booking.id)
    const snapshot = booking.programSnapshot || {}
    const trip = booking.trip || {}
    const tour = trip.tour || {}
    const name = snapshot.name || tour.name || trip.name || booking.name || 'Standalone service'
    const code = tour.printCode || snapshot.code || name
    const key = snapshot.tourId || trip.tourId || 'standalone:' + name
    let row = groups.get(key)
    if (!row) {
      row = {
        key, code, name, adults:0, children:0,
        parkFeeQty:0, noParkFeePax:0, parkRecorded:false,
        meals:{BREAKFAST:0,LUNCH:0,DINNER:0,UNKNOWN:0}, mealsRecorded:false,
        accommodation:new Map(), accommodationRecorded:false,
        veganPax:0, vegetarianPax:0, noMealsPax:0, ownTentPax:0, ownBungalowPax:0,
        allergyPax:0, unknownAllergyPax:0, allergyDetails:[], servicesUnknown:false
      }
      groups.set(key, row)
    }
    const adults = Number(booking.adults) || 0
    const children = Number(booking.children) || 0
    const pax = adults + children
    row.adults += adults
    row.children += children
    const flags = Array.isArray(booking.specialRequirements) ? booking.specialRequirements : []
    if (flags.includes('VEGAN')) row.veganPax += pax
    if (flags.includes('VEGETARIAN')) row.vegetarianPax += pax
    if (flags.includes('NO_MEALS')) { row.noMealsPax += pax; row.mealsRecorded = true }
    if (flags.includes('OWN_TENT')) { row.ownTentPax += pax; row.accommodationRecorded = true }
    if (flags.includes('OWN_BUNGALOW')) { row.ownBungalowPax += pax; row.accommodationRecorded = true }
    if (flags.includes('NO_PARK_FEE')) { row.noParkFeePax += pax; row.parkRecorded = true }
    const allergyText = typeof booking.allergies === 'string' ? booking.allergies.trim() : ''
    if (allergyText) {
      row.allergyPax += pax
      const detail = (booking.code || 'Booking') + ': ' + allergyText
      if (!row.allergyDetails.includes(detail)) row.allergyDetails.push(detail)
    } else if ((booking.allergyStatus || 'UNKNOWN') !== 'NONE') {
      row.unknownAllergyPax += pax
    }
    if (!Array.isArray(booking.lines)) {
      row.servicesUnknown = true
      continue
    }
    for (const line of booking.lines) {
      if (!line || line.selected !== true) continue
      const meta = field => line.snapshot?.[field] ?? line.resource?.[field] ?? null
      const quantity = Number(line.quantity) || 0
      const category = meta('category')
      if (category === 'PARK_FEE') {
        row.parkFeeQty += quantity
        row.parkRecorded = true
      } else if (category === 'MEAL') {
        const value = meta('mealPeriod')
        const period = ['BREAKFAST','LUNCH','DINNER'].includes(value) ? value : 'UNKNOWN'
        row.meals[period] += quantity
        row.mealsRecorded = true
      } else if (category === 'ACCOMMODATION') {
        const owner = meta('ownership') || 'UNKNOWN'
        const type = meta('accommodationType') || 'UNKNOWN'
        const accommodationKey = owner + ':' + type
        row.accommodation.set(accommodationKey, (row.accommodation.get(accommodationKey) || 0) + quantity)
        row.accommodationRecorded = true
      }
    }
  }
  return [...groups.values()]
    .sort((a,b)=>a.code.localeCompare(b.code)||a.name.localeCompare(b.name)||a.key.localeCompare(b.key))
    .map(row=>{
      const label = row.code === row.name ? row.name : row.code + ' · ' + row.name
      const total = row.adults + row.children
      const park = row.parkRecorded
        ? 'Park fee: ' + row.parkFeeQty + ' · Excluded pax: ' + row.noParkFeePax
        : 'Park fee: unconfirmed'
      const mealParts = ['BREAKFAST','LUNCH','DINNER','UNKNOWN'].filter(key=>row.meals[key] > 0).map(key=>key + ' ' + row.meals[key])
      const meals = row.mealsRecorded
        ? 'Meals: ' + (mealParts.length ? mealParts.join(' · ') : 'NO_MEALS ' + row.noMealsPax)
        : 'Meals: unconfirmed'
      const accommodationParts = [...row.accommodation.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,quantity])=>key + ' ' + quantity)
      const accommodation = row.accommodationRecorded
        ? 'Accommodation: ' + (accommodationParts.length ? accommodationParts.join(' · ') : 'guest-provided') + ' · Own tent pax: ' + row.ownTentPax + ' · Own bungalow pax: ' + row.ownBungalowPax
        : 'Accommodation: unconfirmed'
      const food = 'Food requirements: Vegetarian pax ' + row.vegetarianPax + ' · Vegan pax ' + row.veganPax + ' · No meals pax ' + row.noMealsPax
      const allergy = 'Allergy: reported pax ' + row.allergyPax + ' · Unknown/unconfirmed pax ' + row.unknownAllergyPax + (row.allergyDetails.length ? ' · ' + row.allergyDetails.sort().join(' | ') : '')
      const source = row.servicesUnknown ? 'Services: unconfirmed source data' : null
      return {
        key:'head-guide:' + row.key,
        version:1,
        role:'Head Guide',
        kind:'Island preparation',
        text:[label + ' · Adults ' + row.adults + ' · Children ' + row.children + ' · Total ' + total, park, meals, accommodation, food, allergy, source].filter(Boolean).join('\n')
      }
    })
}