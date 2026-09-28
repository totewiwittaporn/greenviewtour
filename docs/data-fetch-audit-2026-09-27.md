# Data-fetch audit — 27 September 2026

## Acceptance status

Implementation complete on Local. Aggregate checks and rendered browser regressions passed. The running local services were restarted and probed after the changes. Hosted Preview and Production were not deployed or validated in this task.

Baseline: branch `mint/dashboard-redesign-2026-09-21`, HEAD `9af7fd7bc015a169ca529b25fc7693de57fee4f3`, including pre-existing uncommitted work. This audit changed 68 source/test files relative to the preserved pre-audit copy, not relative to Git HEAD. No commit, push, reset, migration, dependency upgrade, seed, real payment, approval, email or LINE delivery was performed.

The Prisma schema, root package files/lockfile, backend package file, AGENTS.md, DESIGN.md and UX-CONTRACT.md match their pre-audit hashes. Persistent DEMO data was preserved. Measurement and comparison queries ran under PostgreSQL READ ONLY transactions against the explicitly checked Preview project.

## Flow-by-flow decisions

| Area | Working screen | Additional data when needed |
|---|---|---|
| GM Dashboard | SQL aggregates for 30 days, today/tomorrow, six months and the reporting season; displayed operational counts only | Five Booking previews per day; report links do not require unused finance counts |
| Booking staff Dashboard | Company calendar aggregates and existing own/team work scope | Ten work previews; exact totals independent of preview limits |
| Programmer Dashboard | Fresh authorized identity and request metadata | No unused business datasets; monitoring sources remain explicitly unconnected |
| Staff Dashboard | Authorized assigned runs and inputs needed for preparation totals; grouped job counts | Ten job rows per date/queue and existing five-row finance previews |
| Booking | Twenty-five summary rows, travel dates, guests, ownership and actionable flags | Exact Booking detail by ID for editing, amendments, review and printing |
| Customer requests | Name, tour/date, amount, status and linked Booking status | Full review/consent/payment details by request ID; linked status shares the metadata query |
| Customer directory | Fields required by the existing directory/editor | No operational request or pricing graphs |
| Driver / Boat | Paged selectors, passenger totals and the selected run's assigned details | Complete authorized day manifests; all assigned groups remain accessible |
| Check-in | Complete service-leg totals computed in SQL; requested 25 rows | Required attendance details/versions; command-side no-show and closing checks unchanged |
| Readiness / capacity | All obligations and holds in the selected windows, with reduced relations/JSON | Whole groups, pinned boats, crew constraints and journey legs remain complete; no arbitrary take limit |
| Stock / Inventory | Bounded balances/movements, required unit conversions, SQL-counted outstanding issues | Complete selected-run preparation, eligible lots and safety instructions |
| Company work / Purchasing | Identity, state, dates, action eligibility and short summaries | Full checklists, quotations, lines, approvals, issue/return details before record actions |
| Personnel / Finance | Paged identity, exact amount/date summaries and permitted actions | Full evidence, payroll, employment, clearance and payment detail on demand |
| Agent receivables | Statement headings, due dates, totals and paid amounts | Full saved statement, signatures and payment history when opened |
| Master settings | Explicit list/options projections and grouped counts | Full record by ID for View/Edit, including fields absent from the table |
| Users / invitations | Directory identity/contact summary; company/department scope unchanged | Full user detail by ID; invitations first load on their first tab visit |
| Daily summaries | Saved snapshot headers and run counts | Complete immutable snapshot when opened; later rows remain paginated and accessible |
| Public web | Two home highlights; twelve lightweight tour cards per page | Full itinerary, terms, options, seasons and relevant promotion information on detail flows |
| Member | Twelve request summaries; capacity checked before showing payment information | Date-change consent data retained; document metadata loads only when opened, 25 per page, with no former first-50 truncation |
| Shared controls | Lazy reference options, debounced searches/quotes, keyed responses and cancellation | Current selected labels survive paging; page count derived from total when omitted by an endpoint |

## Integrity and data-contract rules

List DTOs are not editable records. `RecordLoader` obtains the exact authorized record before an editor/review opens. A missing or failed detail read displays a retry state rather than initializing a blank form. Optimistic versions, independent reviewers, own/team scope and current server-side permissions remain authoritative.

Do not cache capacity, stock balances, payment eligibility or permissions across requests/accounts. Reuse is request-local only. Quantity calculations retain complete relevant obligations, allocations and lots; a smaller payload must not create fabricated availability or lose unassigned demand. Full print documents and exact financial calculations remain complete even when a table shows only one page.

New callers should use an explicit list/options view or a purpose-built lookup. Compatibility detail modes remain available for existing consumers. Never fetch every page in the browser just to populate a list, never infer totals from a page, and never initialize an editable form from a reduced list DTO.

Correctness fixes alongside the audit: reference option paging works when an API provides total but no pages; selected option labels persist across pages; canceled allocations are excluded from passenger summaries; Member documents after the former first 50 are reachable; late responses cannot reopen a closed detail or replace another selected record.

## Validation evidence

- `npm run check`: 366 backend tests and 41 frontend tests passed, including 63 new data-fetch contract tests; lint and all three builds passed.
- `node scripts/smoke-browser-fixtures.js`: passed, including the new Backoffice and Public/Member lean-response regressions and the existing navigation, permissions, dashboard, capacity, document and localization suites.
- New rendered checks: English at 1440px and Thai at 390px; full fields after lazy loading, detail failure/retry, late-close cancellation, reference paging/selection, finance evidence, job checklists, guide briefing, 28 assigned groups, 28 snapshot runs, 31 public/member tours and 61 Member document records.
- Read-only before/after comparison: 100 planned cases, 95 passed, 0 failed, 5 skipped because no stored account had the target role. Eleven stored-role Dashboard cases were exercised. The five missing roles were Head Guide, Head Captain, Head Driver, Account and Sales; their rendered role/scoping behavior is covered by fixtures, not represented as real-account acceptance.
- The final joined Customer requests projection was subsequently rechecked against both customer-directory/request comparisons: 2 repeated cases passed. Do not add these repeats to the unique-case count.

- Eight stored preparation runs were compared, including four with nonempty material/service requirements (up to 44 material rows and 13 service rows). Daily Booking documents retained all 36 matching bookings, not only the first 25. The stored guide list was empty; its populated View/Edit briefing case was exercised with browser fixtures.
- Live local probes after restart: all three web roots HTTP 200, API health UP, public highlights returned two summary rows with detail graphs absent, and unauthenticated Backoffice/Member data requests returned 401.

## Measured payload/query examples

Measurements invoke the original and revised domain readers against the same Preview dataset/date. Payload bytes mean serialized UTF-8 JSON before HTTP compression, not total page weight. DB byte figures in private logs mean serialized query results, not wire-protocol bytes. Query counts exclude the surrounding read-only test transaction setup. Samples are diagnostic observations, not a production load test, percentile latency claim or guaranteed whole-system speedup.

| Flow | Before JSON bytes | After JSON bytes | Reduction | DB queries before / after |
|---|---:|---:|---:|---:|
| public-home | 14,251 | 883 | 93.8% | 7 / 2 |
| public-tours | 14,251 | 3,835 | 73.1% | 7 / 2 |
| public-promotions | 2,192 | 1,190 | 45.7% | 7 / 4 |
| bookings-list | 479,147 | 20,080 | 95.8% | 23 / 11 |
| resources-options | 15,719 | 5,849 | 62.8% | 9 / 7 |
| stock-balances | 36,057 | 19,826 | 45.0% | 13 / 13 |
| stock-movements | 24,362 | 21,112 | 13.3% | 8 / 8 |
| customer-requests | 43,164 | 2,551 | 94.1% | 8 / 8 |
| customer-directory | 2,013 | 1,461 | 27.4% | 7 / 7 |
| boat-runs | 57,776 | 10,754 | 81.4% | 23 / 16 |
| boat-options | 57,776 | 6,887 | 88.1% | 23 / 11 |
| gm-dashboard | 20,330 | 15,823 | 22.2% | 67 / 29 |
| check-in | 12,297 | 12,297 | 0.0% | 13 / 8 |
| readiness | 62 | 62 | 0.0% | 13 / 13 |
| receivables | 606 | 321 | 47.0% | 7 / 7 |
| settings-partners | 18,103 | 5,880 | 67.5% | 11 / 9 |
| settings-tours | 25,575 | 4,388 | 82.8% | 12 / 10 |
| settings-rates | 19,971 | 8,955 | 55.2% | 14 / 11 |
| settings-vehicles | 10,532 | 3,727 | 64.6% | 12 / 9 |
| settings-locations | 12,266 | 5,822 | 52.5% | 11 / 9 |
| agent-options | 13,916 | 2,029 | 85.4% | 11 / 7 |
| company-JOB | 38,798 | 11,190 | 71.2% | 9 / 8 |
| company-STOCK_REQUEST | 2,022 | 1,028 | 49.2% | 12 / 8 |
| company-PURCHASE | 1,542 | 634 | 58.9% | 10 / 7 |
| finance-EMPLOYMENT | 15,941 | 11,155 | 30.0% | 11 / 10 |
| finance-ATTENDANCE | 1,305 | 947 | 27.4% | 11 / 10 |
| finance-REIMBURSEMENT | 15,333 | 8,041 | 47.6% | 11 / 10 |
| finance-WORK_ADVANCE | 2,627 | 1,780 | 32.2% | 11 / 10 |
| finance-ALLOWANCE | 919 | 620 | 32.5% | 12 / 10 |
| public-detail | 1,652 | 1,652 | 0.0% | 6 / 6 |
| boat-document | 26,796 | 26,796 | 0.0% | 38 / 21 |
| boat-preparation | 2,572 | 2,572 | 0.0% | 20 / 20 |

Booking still lists 25 rows from 534 total records. Check-in still returns the same 25 visible rows and complete 53-leg totals. Full boat-document JSON remained 26,796 bytes while its database queries fell from 38 to 21. Smaller payloads are not achieved by deleting required document or financial data.

## Implementation owners

Reduced master/operational DTOs live in `modules/service-catalog/read-models.js` and `modules/operations/list-read-models.js`. Commerce and personnel-finance own their separate read models. Database JSON extraction is constrained by `platform/database/read-json.js`; table/column identifiers are internal allowlisted constants and IDs/paths are bound parameters.

Dashboard SQL read models live beside the existing overview owner (`management-page.js`, `booking-page.js`, `job-page.js`). Check-in and dispatch keep dedicated read modules. The existing domain services continue to own authorization, writes, invariants, optimistic versions and idempotency.

Backoffice Core owns `RecordLoader` and `ReferenceField`; Member owns its own pagination component. No application imports another application's UI. New browser acceptance scripts are `scripts/smoke-data-fetch.js` and `scripts/smoke-commerce-data-fetch.js`, invoked by the existing fixture runner.

## Coverage limits and retained warnings

Browser checks use isolated Playwright Chromium responses, not actual customer approvals/payments. Real database checks exercise authorized domain reads using stored profiles; they are not real sign-in sessions. No provider email or LINE message was sent. Populated guide-assignment review/edit is fixture-covered because the sampled stored list was empty.

Safari, physical printing, hosted Preview behavior, concurrent production-scale load and external payment/email/LINE delivery were not tested in this audit. This is not proof of a maximum possible speed or a production latency percentile. Preview connectivity remains part of Local response time.

The existing large JavaScript-bundle warning, stale baseline-browser-mapping warning and pg concurrent-query deprecation notice remain. Dependencies and database schema were deliberately not changed. They did not fail the acceptance checks; a future dependency or asset-bundling change needs its own validation.

## Evidence location and handoff

The pre-audit source copy, private raw response comparisons, source diffs, logs and screenshots are under the owner's Downloads folder: `Greenview-Data-Audit-20260927-171234`. Raw comparison files may contain customer/staff data and must not be committed or published. The sanitized metric table above contains no account credentials or individual customer data.

Canonical logs: `acceptance-check.log`, `acceptance-browser.log`, `final-read-comparison.log`, `acceptance-customer-comparison.log`, `acceptance-metrics.log`, `local-after-audit.log`. Working tree remains uncommitted on the original branch. Local service restart clears in-memory sessions, so the next visit may require signing in again.

Accepted source/test digest: `e0153052f70fee5f2e228e479d8c5b3455c69f82331911ad815bcaff2d0df7c0`. The accepted source manifest is stored with the private evidence.
