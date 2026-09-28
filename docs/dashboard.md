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

## 21 September 2026 visual refinement

Replaced attention cards with one scoped, filterable Core DataTable. The two-row calendar retains all14arrival dates, day selection and program summary. Today and weekend treatments are visual only; no count definitions or server authorization changed. Head/staff headings derive from the aggregate scope. The approved mockup's individual task/assignee rows and universal team totals are not fabricated: current endpoint exposes authorized queue counts only, so record work remains at its existing deep link. Scope and status filters affect only received rows, including a distinct no-results/reset state.

Shared Navbar/Sidebar use the original Public logo and the approved dark-teal/white design. A help dialog is available before UserInfo; comprehensive screenshot documentation is still pending. Browser fixtures cover manager/head/staff payloads, permission-safe absent calendar, null measures, filters, keyboard scroll, TH/EN and retained auth/modal/loading behavior. Real profile grants and business data were not modified for validation.


## 22 September 2026 GM / Programmer reference implementation

The owner confirmed ADMIN_MANAGER = Programmer / System Administrator and MANAGER = GM (active COMPANY grants). Both use original-logo full-width navbar with permission-safe navigation search, bell, help and UserInfo; the help dialog opens the served Thai guide. There is no new RBAC role or permission grant. Existing Head/Staff screens and aggregate permission enforcement remain.

An optional managementOverview is provided only when calendarAllowed (company + both booking capabilities). It contains 30 arrival dates, two booking-day summaries with real DRAFT/CONFIRMED/COMPLETED/CANCELLED states and max 5 rows, max 6 agents ranked by arriving pax across the next 30 days, and last 6 calendar months through today. Current total bookings includes all four statuses; the Completed count is labeled below its table. Agent share uses all arriving pax including direct bookings, and no PII or monetary fields are returned. A company-wide season is not assumed because seasons belong to tour programs. Revenue stays null with NO_COMPANY_REVENUE_DEFINITION.

Programmer monitoring/error/warning/API-count/uptime/resource/deployment/job panels show explicit unconnected sources. System performance measures only the last successful browser dashboard request. Quick tools link existing workspaces; transient notes are cleared on page departure/refresh. No fake deploy, database console or cache-clear action is provided. The bell has no notification feed or unread count yet. Revenue and expense breakdown panels also remain unconnected. These are functional gaps, not healthy/zero values.

The new panels completely replace the old dashboard. Legacy calendar14 and generic attention-table components and their CSS are removed for all roles. Roles awaiting a new design show a clean placeholder and do not request the old dashboard aggregate; their existing domain navigation remains available. Data queries are date-bounded to 6 months through next 30 days and compute complete counts rather than row-capping the source. Database-scale performance of the new extension is not yet measured. No DB writes, migrations, seeds, notifications or deployments belong to this visual change.


## Owner correction — remove legacy dashboards and scope manuals (22 September 2026)

This supersedes earlier dashboard layout descriptions above. Remove the old calendar14 and generic work-attention table from every role, not merely below the new content. GM and Programmer show only the new reference layout; all other roles show a clean redesign-pending page and keep domain navigation. This changes the presentation, not persisted business records or domain permissions. The server may retain backward-compatible aggregate fields used by existing domain tests; the retired panels are not mounted.

Manuals are served through authenticated role-aware routes and an API, not a combined public document. ACTIVE COMPANY Admin Manager may select every role manual. Other users may open only manuals for their assigned roles, including multiple roles; direct URLs are checked server-side. The previous public manual URL redirects to the authenticated manual index without containing any manual body. GM and Programmer manuals explain their own new panels; pending-role manuals explain current navigation and redesign status without resurrecting old widgets.


## Booking responsibility and commission — owner update 22 September 2026

Existing role codes remain stable: HEAD_BOOKING is Booking Manager and BOOKING is Booking Assistant. Both roles with effective booking access read all bookings and the customer directory. Customer account edits, customer-request fulfillment and finance approvals retain existing separate permissions. Assistant mutations require the effective responsible person (assigneeId, falling back to immutable createdById for legacy rows); Booking Manager may manage and assign all Booking work. Every mutation, including status, details, return amendments, price requests and evidence writes, rechecks ownership on the server. Assignment is versioned and audited. It changes responsibility without changing creator or recorded commission beneficiary.

Agent and Tour Program each explicitly enable Booking staff commission; either disabled takes precedence. Defaults are disabled, including previously unconfigured catalog records. Direct bookings have no Agent condition and use the program condition; standalone services without a program have no Booking commission. Program adult/child rates are independently configured in THB per passenger, separate from supplier commission. Missing rates are unconfigured, not zero. No rates are seeded.

New Booking saves capture eligibility, catalog versions, rates and beneficiary in commissionSnapshot. Ordinary edits preserve those conditions and update the passenger-based estimate; changing Agent or program captures the new conditions while retaining an existing beneficiary. Legacy bookings with no snapshot do not gain inferred historical commission. Reassignments do not transfer commission. This is an estimate, not a payroll posting, approval or payment.

Booking dashboards share the reference sky header and dark rail. Both see confirmed/completed arrivals for today through day29 (Thailand dates), with30 selectable daily bars. Booking Manager sees the whole team’s work; Assistant sees only responsible work counts and rows, while the Bookings list still shows all records with server-derived edit actions. Work tables show up to10 active bookings; domain lists retain pagination. Other non-GM/non-Programmer roles remain redesign-pending. Per-role manuals describe this workflow.

Shared UserInfo owns its name and role subtitle inside the button, with the account group aligned right. Navbar uses natural grid height and separate mobile rows to avoid overlapping content. Hero date text is white with a contrasting backing.

## 26 September 2026 — real-account role dashboards

This section supersedes the earlier redesign-pending and next-30-days agent-ranking descriptions. Work continues on the existing dirty `mint/dashboard-redesign-2026-09-21` checkout; its baseline hashes and source copies were preserved before editing. No checkout, reset, migration, seed, business command, employee permission change, push or deployment was performed.

All 16 staff roles now select a named reference-layout dashboard. Programmer, GM and Booking retain their existing dedicated views. Other roles use the shared `RoleDashboard` and the optional `workOverview` response, not the retired calendar14 or generic attention table.

- `work-summary.js` receives only sources already authorized by the overview owner and reuses their exact row predicates. Head Captain remains assigned-run-only; a captain is not permanently attached to one boat.
- Today/tomorrow uses Bangkok service dates. Boat and vehicle passenger totals exclude cancelled allocations and cancelled/draft bookings, and never count crew as guests. Complete counts and capped 10-row previews are separate.
- Crew and recorded vehicle stops contain no invented GPS or pickup times. Run links open the existing job order; preparation and loan links preserve the selected run/date.
- Preparation groups combine only identical item, size, unit and kind. Pending/unsettled metrics count item groups, not quantities across incompatible units. Cancelled allocation links are now excluded in the canonical preparation owner as well.
- The preparation navigation group accepts `prepareStock` OR `stock`. This fixes Guide/Assistant Guide access to supplies/loans without granting inventory balances/movements. Backend assignment and command checks remain unchanged.
- Housekeeping keeps submitted completion (`DONE`) distinct from accepted work. Queue links continue at the existing authorized workspace; no dashboard approval or self-acceptance action was added.
- Finance previews select only permitted work identity/status, plus existing bill balances. Payroll remains separately gated. Sales request ownership is not configured and is explicitly unavailable rather than fabricated.
- GM agent rankings now use `seasonAgents`: 15 October through 15 May inclusive. During the off-season the upcoming season is selected. This reporting period does not modify program availability. The original 30-day calendar and monthly series are retained.
- Shared Thai/English copy, keyboard tabs, responsive tables, refresh/error states and role manuals are updated. The existing company logo is also the Backoffice favicon.

Validation uses local Backoffice with the verified Preview database, not Production. The retained DEMO dataset has 29 working logins (26 staff across 9 roles and 3 customer accounts). Real browser coverage uses one staff account per available role: Captain, Guide, Assistant Tour Guide, Assistant Captain, Driver, Booking Manager, Booking Assistant, Head Housekeeping and Housekeeping. No separate DEMO login was added for Programmer, GM, Head Guide, Head Captain, Head Driver, Account or Sales; their browser coverage remains explicitly intercepted fixtures, not real-account end-to-end proof.

`npm run check` passes 287 backend and 32 frontend tests, lint and all three builds. Regression tests cover all 16 personas, preparation navigation without inventory rights, explicit denial, full-set counts, unit separation, cancelled allocations, and season boundaries. Evidence and before/after screenshots are in the operator's private Downloads/Greenview-Dashboard-QA-2026-09-26 directory, outside Git. Login credentials and session cookies remain private and are not included in reports or source.

Remaining limits: Programmer monitoring/deployments/background jobs and company revenue/expense summaries are still explicitly unconnected. Company-wide unallocated bookings have no department owner. No production performance/load benchmark or hosted Preview deployment is claimed. Real-flow UI validation is read-only: it does not confirm bookings, issue/return stock, accept jobs or record payments.
