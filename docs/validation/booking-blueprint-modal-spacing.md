# Booking blueprint and modal spacing — 20 September 2026

## Fix and regression evidence

The local API logged GET /api/operations/blueprint failing with ReferenceError. getBlueprint used tx and input outside their scope when checking closed service days. It now uses the supplied prisma client and serviceDate from URLSearchParams; the closed-day guard remains active.

Three regression tests failed before the fix and pass after it: direct pricing and service-date lookup, both overnight dates with closed-day rejection, and return-only journeys. npm run check passes: 197 backend tests, 12 frontend tests, all three application builds. Lint has zero errors and the pre-existing member LeaveGuard warning. Strict Core audit has zero findings; git diff --check passes.

## Modal audit scope

Static review covered all 25 JSX Dialog consumer files and the eight ReferenceField feature consumers: BookingEditor, DispatchPage, BoatStockPage, StockPage, CompanyWorkPage, PersonnelFinancePage, GuideAssignmentsPage and CatalogPage. Their wrappers reuse Core ReferenceField; no local replacement was introduced. Dialog content padding, section legend padding and field helper spacing already exist. The missing spacing was between ReferenceField search and its labeled selection.

Shared CSS now uses an 8px grid gap between search, labeled selection and pagination/retry, preserving 20px separation after each lookup. DESIGN.md records the owner. The prior September 15 audit sampled document dialogs and fixed page filterbar spacing; it did not exhaustively verify every modal form.

## Browser verification

Authenticated owner Chrome, no saved business mutations:
- Booking: Tour program, Agent, Hotel and Sales channel each measured 8px between search and labeled selection.
- Salary advance: Employee measured 8px.
- Stock request: Source stock location, Destination / custody location, Item and Boat or vehicle each measured 8px.
- Booking at 390 x 844: all four gaps remain 8px; no document horizontal overflow; section padding remains 10px; screenshot checked. Temporary viewport override reset.
- Tour dropdown opened and selected through keyboard. Escape/discard flow closed the agent-created Booking draft without saving.
- After restarting local and owner login, the configured DEMO tour loaded its boat service, dates, adult price 1,000 THB, child price 500 THB and total 1,000 THB for one adult. Save draft became available; no booking was saved.
- Day Trip returned PROGRAM DURATION REQUIRED, an existing incomplete program configuration, not SERVICE_UNAVAILABLE. No duration was invented or written.

Static shared-component coverage is not an exhaustive live verification of every modal, record state, browser or role. Complete payment/LINE/customer lifecycle testing remains outside this fix.
