# Dashboard workspace

Baseline: `mint/mac-work-checkpoint-2026-09-20`, `12e2bc65d2732ff8e7557778ac7efa4ce3aaa499`. Before edits, origin was fetched and both local and remote baseline refs matched, with a clean working tree. Implementation branch: `mint/role-aware-dashboard-2026-09-21`. No production action, schema migration, seed, staff grant or business write is part of this change.

## Audited owners and boundary

- Auth/session: `backend/src/app/http.js`, `platform/auth/sessions.js`, identity-access policy/public profile; frontend App, AuthPage, NavigationProvider, workspaceRoutes and Shell.
- Access: `packages/contracts/access.js` (effective ALLOW/DENY, activation/expiry and scopeId), operation-access, managementScope, company-routes. Read permission is required separately from management and action permissions.
- Booking/trips: operations catalog, booking models and `documents.js` arrival-day Reception query. Dispatch run/crew/component assignments and guide assignments own scheduled work. `pendingPassengers` is extracted from dispatchOptions and reused without changing its algorithm.
- Finance/personnel: personnel-finance service/contracts and FinancePersonnelRecord; receivables service and AgentBill. Manager is not an implicit payroll reader.
- Inventory/maintenance/housekeeping: company-work list/read predicates, CompanyWorkRecord lifecycle, WarehouseResponsibility, stock balance states. `DONE` awaits independent acceptance; `ACCEPTED`/`CLOSED` are finished.
- UI: existing Core Dialog, DataTable, RefreshButton, Button, Shell, navigation and runtime theme. The reserved dashboard folder becomes executable; no domain CRUD is duplicated.

## API and visibility

GET `/api/dashboard` requires the existing workspace session and an active stored profile. A repeatable-read transaction reloads current grants and composes counts from the authoritative models. No client-supplied role, user ID, department or scope is accepted. Responses are no-store and contain aggregate counts, dates, program identity and existing domain links, not guests, contact details, salaries or record payloads. Counts query full authorized sets, not the first 25 list rows. Frontend makes one dashboard request, with cancellation, timeout, loading, failure/retry and empty states. Refresh clears previous data and open summaries.

| Audience | Dashboard visibility |
| --- | --- |
| Admin / Manager with COMPANY management scope | 14-day calendar if both booking capabilities allow the existing booking destination; permitted operational, finance, personnel, purchasing, housekeeping and inventory queues |
| Head Booking | Draft bookings created by the matching department's users; excludes Manager/Admin profiles from department membership |
| Head Guide / Head Driver | Department roster/guide work only when the existing read and management capabilities also allow it; otherwise own assignments |
| Head Housekeeping | Assigned department cleaning jobs with manage/approve rights, plus own jobs and authorized count jobs |
| Guide / Assistant Guide / Captain / Assistant Captain / Driver | Own assigned jobs; guide-only assignments where readable; own return-booking drafts where islandBooking allows them |
| Booking | Own booking drafts pending confirmation |
| Housekeeping and other staff | Own jobs/requests/maintenance and appointed-warehouse work permitted by the owning reader |
| Account / special finance readers | Existing expenses/receivables work areas allowed by effective grants. Payroll and salary advances remain separately gated |

Per-user active DENY wins, expired overrides are ignored, and unrelated scopeId overrides do not grant company visibility. Department expansion requires a matching Head grant, supported grant scope, explicit department and directory-management scope. Role names alone do not unlock a widget. Department membership does not expand inventory/maintenance access. A stock DENY removes custodian-based expansion.

## Totals and actions

The calendar starts today in Asia/Bangkok and includes 14 dates. It follows Reception's current arrival definition: confirmed/completed bookings count once on outboundDate, or returnDate for return-only bookings using the company's return service. Adults + children are pax. It is not a count of transport legs, actual checked-in guests, or every overnight guest present on the island. Cancelled/draft bookings are excluded. Programs are grouped by snapshot tour ID with trip/standalone fallback, never by display name alone. Modal shows bookings and pax per program, with no guest list.

Attention queues distinguish pending, today, overdue and awaiting acceptance when those states exist. Overdue comes from a recorded due date or ended open/planned job. Financial approvals without a modeled due date have no invented overdue count. Allocation counts unique confirmed bookings with remaining passengers in either direction during the next 14 days, subtracting recorded no-shows and ignoring cancelled allocations through the dispatch owner. Crew attention counts open upcoming jobs missing a recorded lead captain/guide/driver role. Stock issues count positive damaged/legacy-cleaning balance rows, not quantities in incompatible units.

Links go to existing domain pages. Booking drafts preserve the supported status filter. Other links deliberately open the work area where the current route does not support a reliable record/date filter; the modal link says Open bookings and does not claim a selected-day filtered destination.

## Known gaps and limits

- No canonical supervisor/subordinate graph or universal TEAM/ASSIGNED scope implementation exists. The dashboard uses explicit department membership and domain assignment predicates. Head Captain's existing reader permits only own crew jobs without manageGuide; the dashboard does not invent broader team authority.
- Unassigned work has no department owner. Company managers see allocation gaps; Heads' summaries contain already department-assigned work. Assigning orphan work to a department needs a domain ownership model.
- Stock has no automatic reorder threshold. Damaged/cleaning balance counts and real request/count/maintenance queues are shown; no low-stock threshold is guessed. A per-boat preparation/shortfall aggregate is not yet added; the existing preparation workflow remains available from boat work.
- Guide-only bookings have no universal guide-required rule, so no generic missing-guide-assignment count is invented. Crew attention applies only to recorded dispatch runs.
- Personnel issues mean explicit unfinished personnel records. No assignment is never treated as absence, wage deduction or a leave violation.
- Calendar is an arrival count consistent with Reception. All-days-in-service occupancy and actual attendance remain distinct metrics.
- Existing finance readers authorize the whole corresponding work area; the system has no employee self-service finance/payroll scope. Dashboard does not introduce one.
- Live Preview queries cover roles with existing active profiles. Browser checks use intercepted fixtures; they are not real-account sign-in end-to-end checks. Missing Head/Booking/Housekeeping/Account profiles are not created for validation.
- Current aggregate latency on verified Preview was about 2.5–6.5 seconds for existing roles; no production load benchmark was performed. Database count queries are server-side; frontend does not fan out. Existing pg adapter emits a concurrent-query deprecation warning on interactive transactions.
- Only CI is configured in `.github/workflows/ci.yml`; deployment guidance defines no executable hosted Preview workflow. Local builds and read-only Preview DB checks do not deploy a hosted Preview.

## Verification

- `npm run check`: lint, backend/frontend tests and all three app builds. Existing Member LeaveGuard lint warning and Backoffice bundle-size warning remain.
- `node scripts/smoke-browser-fixtures.js`: repository browser suite plus dashboard scenarios. Dashboard checks root/login/authenticated-login/anonymous redirects, recovery preservation, 14 dates, desktop/tablet/mobile (1440/834/390), modal keyboard/focus restoration/scroll ownership, empty/error/retry/loading and overflow.
- `backend/test/dashboard.test.js`: aggregation boundaries, year rollover, deduplication, role/permission/scope restrictions, finance confidentiality, department and warehouse scope, and no-show/split-direction allocation calculations.
- `backend/test/auth.test.js` and frontend dashboard route test: protected GET route and canonical landing route regression.
- Read-only transactions against the repository-verified Preview connection passed for existing Admin Manager, Manager, Assistant Tour Guide, Captain and Driver profiles. No data was changed.
- Strict frontend premium static audit: zero findings. Rendered screenshots are in ignored `screenshots.local/dashboard-*.png`.
- Final review includes a separate self-review and an independent read-only Milk agent audit. Milk found a return-only draft today/overdue gap; its return-date fallback and regression test are included. No additional permission leakage or invalid destination was found within the reviewed scope.

CI initially stopped at clean install because the baseline lockfile omitted the already-declared Member workspace. A minimal 39-line lockfile addition restores the existing declared versions; no package manifest or dependency version was upgraded. Clean-install dry-run passed.
