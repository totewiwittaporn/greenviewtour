# Company workflows: implemented scope and remaining boundaries

Authority: the owner's Greenview Tour decisions confirmed on 2026-09-13, including manual per-period payroll: enter the base wage, additions and deductions with reasons, then obtain approval. This document describes executable code in the current company-workflows change. It does not equate the new workflows with a complete accounting or HR system.

## Work categories

| Category | Executable workflow | Remaining boundary |
| --- | --- | --- |
| Sales & Bookings | Bookings, Agent/program standard prices, agreements, guest requirements and documents | Negotiated price exceptions bound to a separately approved revision are not implemented |
| Tour Operations | Vehicle/boat assignment, crew, Job Orders, passenger actuals, preparation and daily summaries | No new dispatch automation is implied |
| Housekeeping | Zones, weekly/monthly/custom schedules, assigned pending jobs, checklists, completion/evidence and independent acceptance | Evidence uses an HTTPS reference; no attachment upload service |
| Inventory, Equipment & Maintenance | Warehouse primary/deputy appointments; requests, independent approval, partial issue/return; approved count adjustments; asset-linked maintenance and acceptance | No automatic reorder policy or full asset depreciation ledger |
| Purchasing | Draft purchase orders, supplier/quotation reference, independent approval, partial receiving into real stock lots | Supplier payment is a separate finance request; no automatic transfer or supplier message |
| Accounts & Finance | Reimbursements, work/salary advances and reviewed clearance, trip allowances, manually itemized payroll, received-purchase payment requests, approval and external payment recording | No general ledger, tax filing, automatic statutory payroll calculation, bank integration or complete Agent receivables ledger |
| Company & Personnel | Company/User profiles, multiple roles, special permissions, seasonal employment, separate attendance/rest/leave/availability and substitution records | No Job Order does not automatically create an absence or deduction; no employee self-service payslip module |
| Settings | Programs/services, pickup locations, fleet, channels and other existing master data | Existing standard prices are not an approved negotiated exception |

Working destinations are grouped by their business category. Existing Booking, settings and operations URLs remain valid. `packages/contracts/company-routes.js` owns the new `/company/*` destinations. Navigation reflects server-confirmed capability projections; the API remains the authorization boundary.

## Roles, special permissions and confidentiality

A User can hold several Roles; roles describe duties rather than a single employment position. The User action Configure permissions preserves role defaults, ALLOW/DENY overrides and their activation/expiry. Active DENY takes precedence. Manager/Admin appointment authority does not itself disclose salary data: payroll and salary advances require payroll-specific view/edit/approve/pay permissions. Admin Manager has the explicit payroll default; an ordinary Manager needs the relevant special grant.

The existing invitation/directory administration rules remain in place: no self-access editing, no Admin Manager editing through this dialog, and only Admin Manager appoints Managers. All sensitive requests reload the stored actor and applicable permissions. Access mutations and company/financial writes use the shared transaction lock and revision checks.

Warehouse responsibility is a separate record with one primary custodian and an optional deputy. It scopes the new request/count/issue workflow to the appointed warehouse; it does not turn an arbitrary warehouse UUID in the generic permission editor into company-wide stock authority. Existing company-wide stock grants and assigned-boat preparation remain separate capabilities. No real employee or family member is appointed merely by reference to their relationship with the owner.

## Inventory and purchasing

A stock request changes no physical quantity. A different authorized person reviews the requested resource, source/destination, quantity, due date and reason. Issuing uses a selected matching lot, reduces its available stock and records custody. Partial issues cannot exceed the approved quantity. Returns preserve ready/cleaning/damaged condition; consumables may be consumed or wasted. Outstanding reusable stock remains visible until settled.

Counts capture the observed quantity and the precise stock revision. Submitting a count does not adjust stock. Independent approval applies the difference only if that revision is still current; otherwise a recount is required. Direct unapproved COUNT commands are rejected. Count jobs and cleaning jobs share recurrence machinery but use their own inventory/housekeeping authorization. Expiry inspection, physical counting and purchasing remain separate operations.

A purchase order stores supplier, receiving location, reason, quotation reference and item quantities/unit costs. A different person approves it. Each receipt is bounded by remaining ordered quantity and creates a stock lot through the existing stock service. Receipt replay creates no duplicate stock. Supplier payment requests are bounded by received value less other approved/paid requests; approval does not pay a supplier.

Maintenance links a vehicle/boat and/or an equipment resource to an assigned employee and due date. It follows proposal, approval, reported completion and independent acceptance/reopen, with history retained.

## Housekeeping and scheduled counts

Schedules support weekly, monthly and explicit custom dates within a bounded date range. Monthly dates clamp to the last day of shorter months and return to the original day in later months. Generation creates pending jobs and does not complete them; generating the same schedule/date again creates no duplicate. Existing generated job history is preserved. To change recurrence after jobs exist, create a new schedule and deactivate the old one.

Assigned workers report checked items, a completion note and optional evidence reference. A different authorized reviewer accepts the work or returns it. Count jobs require an approved linked count before completion. Overdue pending work remains visible.

## Personnel and money

Employment stores seasonal dates and position separately from compensation. Attendance can explicitly record present, rest, paid leave, unpaid leave, absence or availability without a Job Order. Seasonal work does not imply that leave rights disappear. Substitution records name an active different employee.

The approved payroll policy is manual and per period: **base wage + additions − deductions**, with a base-wage basis and a reason on every adjustment. The system sums fixed decimal amounts in integer cents. It does not infer a daily divisor, absence deduction, tax or legally required rate from attendance. Each submitted period requires independent approval.

Only the author edits, submits or cancels a draft. Rejected records may be revised, clearing prior approval. Monetary beneficiaries cannot approve their own request, record their own payment or accept their own advance clearance. Supplier-payment employee references identify a responsible officer, not a personal beneficiary. View, edit, approval and payment duties are separate.

An approved financial record is not paid. Record payment requires the date/reference of an externally completed payment and initiates no transfer. Paid advances accept evidenced expense/repayment lines plus returned cash equal to the advance, followed by independent clearance review. Work advances, salary advances, reimbursements, trip allowances and payroll remain distinct records; no automatic payroll deduction is created.

Private financial command history supports identical-request replay, including uncertain create retries. Changed bodies/revisions conflict; current view/action permission is still required. General audit entries identify action/actor/revision without copying payroll amounts into the ordinary User response or general audit feed.

## Migration, verification and demo

The additive migration is `20260913090001_company_workflows`. Use the repository's Prisma migration runner; never reset or db-push this database. New tables are in `app_private`, with RLS and public-role access revoked. Existing role grants and operational records are preserved. Deployment/commit status belongs in the release result rather than being inferred from this document.

`backend/scripts/seed-company-workflows.js` extends the existing `DEMO FLOW` catalog through domain services. The persisted initial example contains 14 cleaning/count jobs, 9 personnel/finance drafts, a purchase of 24 units with 12 received, and one tool still outstanding. These counts describe the seeded starting point; user edits may subsequently change them. The script's marker prevents reruns from overwriting edits or duplicating receipts. Only the existing fictitious DEMO worker receives the demonstration cleaning duty/custodian appointment; no actual staff compensation or duties are changed.

See [Thai workflow guide](company-workflow-guide.md), [tour demo](demo-flow.md) and [personnel/finance contract](personnel-finance.md). Validation includes backend permission/lifecycle/idempotency tests, real database rollback verification and persisted seed checks, plus `scripts/smoke-company-workflows.js` using intercepted compiled assets with no HTTP/Vite server and no live API writes.

Remaining work is explicit: negotiated Agent exception approval, a full accounting ledger/receivables system, statutory payroll/tax calculation policy, bank/export integrations and evidence uploads. None is represented by the sample drafts as already completed.

Verified integration evidence, 2026-09-13: `npm run check` passed with 138 backend tests and both frontend builds; baseline browser fixtures and the new intercepted-asset company browser suite passed. The persisted seed reported 14 jobs and 9 drafts; rerun returned `ALREADY_PRESENT`. Live checks confirmed RLS on all six new tables and no anon/authenticated SELECT. The strict premium audit reported zero findings in `screenshots.local/company-premium-audit.json`. These results validate the implemented scope, not the deferred negotiated pricing or full accounting system.
