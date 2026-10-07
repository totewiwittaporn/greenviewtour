export const programSummaryRoles = Object.freeze(['MANAGER','HEAD_BOOKING','BOOKING','HEAD_GUIDE','GUIDE','ASSISTANT_TOUR_GUIDE','HEAD_CAPTAIN','CAPTAIN','ASSISTANT_CAPTAIN','HEAD_HOUSEKEEPING','HOUSEKEEPING']);

export function programSummaryJobs(input) {
  const bookings = Array.isArray(input) ? input : [];
  const seen = new Set();
  const groups = new Map();

  for (const booking of bookings) {
    if (!booking || typeof booking.id !== 'string' || !booking.id || seen.has(booking.id)) continue;
    seen.add(booking.id);

    const snapshot = booking.programSnapshot || {};
    const trip = booking.trip || {};
    const tour = trip.tour || {};
    const name = snapshot.name || tour.name || trip.name || booking.name || 'Standalone service';
    const code = tour.printCode || snapshot.code || name;
    const groupKey = snapshot.tourId || trip.tourId || 'standalone:' + name;

    let row = groups.get(groupKey);
    if (!row) {
      row = { key: groupKey, code, name, adults: 0, children: 0 };
      groups.set(groupKey, row);
    }

    row.adults += Number(booking.adults) || 0;
    row.children += Number(booking.children) || 0;
  }

const rows = [...groups.values()].sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name) || a.key.localeCompare(b.key));

  return rows.map(row => {
    const label = row.code === row.name ? row.name : row.code + ' · ' + row.name;
    const text = label + ' · ' + 'ผู้ใหญ่ ' + row.adults + ' · ' + 'เด็ก ' + row.children + ' · ' + 'รวม ' + (row.adults + row.children);

    return {
      key: 'program:' + row.key,
      version: 1,
      role: 'Program',
      kind: 'Passenger summary',
      text
    };
  });
}
