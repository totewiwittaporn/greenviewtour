# Job-order documents — 9 September 2026

Based on `mint/booking-guide-driver` at `bd6a006`. Shared boat, vehicle and Booking document layouts follow the owner's A4 landscape reference while retaining the current role-specific projections.

- Boat: vessel/crew masthead, direction, adult/child columns, trip arrival/departure, requests, planned totals, actual values and revision.
- Vehicle: run/driver masthead, agent contact, hotel/room, assigned pickup time, origin/destination, assistance and actual counts.
- Booking: fresh server read before printing, payment terms, selected services and boat/vehicle handoff. Partial and missing allocations are shown per service/direction. Check-in/handoff blanks are paper annotations, not new database state.
- Boat documents now combine authorized runs for the same vessel and Thailand service day. Outbound and return assignments and actual counts stay independent; transfer documents retain one run. No new infant, meal or accommodation field is inferred from the sample.
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

## Compact vessel-day refinement

Owner requested a two-cell masthead and a combined 15 outbound / 5 return group copy. The live Preview DEMO fixture persists 20 bookings, with 35 outbound and 12 return passengers on a dedicated sample vessel. Crew remains unassigned. No auth users were fabricated. The rendered PDF is exactly one A4 landscape page at 8.5pt body text; all 20 booking references and both direction totals are present. The final page was visually inspected. Long notes are allowed to wrap/continue rather than being clipped.

The jobs endpoint collects the document within the same repeatable-read transaction and retains staff authorization on every included run. Unit coverage checks Thailand date boundaries, same-vessel selection and staff scope. The browser smoke now includes a 15+5 combined document, in addition to all prior sheet and failure cases.

## Package and crew summary refinement

Vessel-day sheets now group allocated adult/child/passenger counts by snapshotted program ID separately for each direction. The new Preview sample has 15 outbound groups (Day trip 30, 2D1N 10, boat ticket 4 = 44) and 5 return groups (the same Day trip bookings 30 plus previous-day 2D1N 10 = 40). Six explicitly authorized DEMO roster identities are assigned to each run: captain 1, assistant captains 2, guide 1, assistant guides 2. Their login is disabled, with no password or confirmed email; no invitations were sent. Customer totals exclude crew; aboard totals are 50 and 46. Existing crew forms allow a second assistant guide as a separate member, and validate total capacity.

The complete PDF with summaries and all six names was visually inspected and is one A4 landscape page. Table body remains 8.5pt; rows wrap for longer input. Summary calculation tests cover independent return counts and split allocations. Local seed scripts, exported data and generated PDFs are not committed.
