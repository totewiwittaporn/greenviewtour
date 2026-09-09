# Job-order documents — 9 September 2026

Based on `mint/booking-guide-driver` at `bd6a006`. Shared boat, vehicle and Booking document layouts follow the owner's A4 landscape reference while retaining the current role-specific projections.

- Boat: vessel/crew masthead, direction, adult/child columns, trip arrival/departure, requests, planned totals, actual values and revision.
- Vehicle: run/driver masthead, agent contact, hotel/room, assigned pickup time, origin/destination, assistance and actual counts.
- Booking: fresh server read before printing, payment terms, selected services and boat/vehicle handoff. Partial and missing allocations are shown per service/direction. Check-in/handoff blanks are paper annotations, not new database state.
- Each dispatch document covers one run/direction. Outbound and return remain independent. There is no inferred combined-vessel daily manifest and no new infant, meal or accommodation field added solely to imitate the sample.
- No schema migration, scheduler, notification delivery or production deployment.

## Verification

- ESLint: pass.
- Backend: 68 tests passed, including trip dates, field projection and cancelled/zero-actual cases.
- Both Vite builds: pass; existing bundle-size warning remains.
- `smoke-dispatch-ui.js`: pass (assignment recovery, nested actions, actual count, own-job controls, narrow screen and multipage printing).
- `smoke-job-documents.js`: pass (three document types, independent return, incomplete allocations, driver assistance, 390px, failed refresh blocks print). All requests are intercepted; zero real database writes.
- PDF inspection: sample boat, return, vehicle and Booking each one landscape page; 35 long groups span eight pages, final group and totals present, headers repeated.
- Strict UI audit: zero findings. DESIGN.md lint: zero errors/warnings.

## New-machine setup

Dependencies are installed. Local backend/.env is ignored and contains the owner's locally entered values; it is not part of this change. The official Supabase root CA is now configured locally through PGSSLROOTCERT; a read-only SELECT 1 check passes with certificate verification enabled. `check-db.js` now reports safe failure categories without printing credentials. The Mac launcher now uses API port 5001 to avoid AirPlay on 5000. Startup reaches READY and the real login form loads through the Backoffice proxy. Authenticated document verification still requires the owner to sign in.
