# Company workflows: approved requirements and implementation boundary

Authority: the owner's Greenview Tour discussion, confirmed for implementation on 2026-09-13. Use GitHub source; the owner's existing local checkout and data are not the implementation target. This document distinguishes requirements from executable functionality. It does not claim the complete company system is delivered.

## Work categories

| Category | Responsibilities | Executable in this branch |
| --- | --- | --- |
| Sales & Bookings | Bookings, agents, contracts, standard rates, negotiated exceptions, guest requirements and daily booking sheets | Existing bookings, partner/rate/agreement settings and documents; agreement HTTP route repaired |
| Tour Operations | Vehicle/boat assignment, drivers/crew, pickup, Job Orders, actual passengers and preparation | Existing dispatch, preparation and daily summaries |
| Housekeeping | Zones, scheduled cleaning, assignment, checklist/evidence and acceptance | Housekeeping roles and department only; workflow pending |
| Inventory, Equipment & Maintenance | Responsibility by warehouse, consumables, tools, spares, issues/returns, counts, repair jobs | Existing stock transactions and loans; company-wide delegated stock access added; scoped ownership and request/approval workflow pending |
| Purchasing | Purchase requests, quotations, approvals, purchase orders and receiving | Pending |
| Accounts & Finance | Receipts, agent receivables, supplier payables, expenses, reimbursements, advances, payroll and allowances | Per-user permission for recording/removing booking PAID status; accounting ledger and payment workflows pending |
| Company & Personnel | Company, employees, positions, seasonal employment, rosters/rest/leave, compensation and user access | Company and User profiles; multiple roles and per-user operational access added; separate employment/payroll records pending |
| Settings | Programs/services, pickup/hotels, fleet, channels, units, approval/integration configuration | Existing master-data screens |

Dashboard is an overview across these categories. Reports belong to their owning category. Navigation exposes implemented destinations only; there are no disabled future modules pretending to be usable pages. Existing URLs remain valid. Tour settings are grouped under Settings, company details and Users under Company & Personnel, and agent settings under Sales & Bookings.

## User access implemented here

One User can hold several Roles; a Role is a bundle of duties, not an employment position. New roles: SALES, HEAD_HOUSEKEEPING and HOUSEKEEPING. Head Housekeeping directory access is limited to the assigned HOUSEKEEPING department, like existing Heads. Employment records and compensation do not belong in the public User profile response.

Users → Actions → Configure permissions uses GET/POST `/api/users/:id/access`:

- An active COMPANY Manager or Admin Manager may configure another ordinary user. Only Admin Manager may configure or appoint a Manager. This editor cannot grant or edit Admin Manager, nor edit the caller's own access.
- Multiple role defaults combine. Individual ALLOW/DENY overrides optionally have UTC activation/expiry instants. An active DENY wins across all role grants and active ALLOW overrides. Inherit removes that override. Unknown permission codes are rejected.
- Current editable permissions are operational duties and `finance.receive` (record/change PAID booking status). The existing directory/invitation administration permission system is preserved; its grants are not offered as arbitrary overrides.
- Stock delegation currently means company-wide inventory access. Guide preparation remains restricted to the assigned boat or an authorized operational supervisor. A warehouse UUID in an incoming permission edit is rejected; warehouse-specific delegation is not implemented or silently promoted to company access.
- The API rereads current actor and target access. Changes run inside the same advisory transaction lock as operational writes and invitations. `accessVersion` rejects stale/duplicate edits before replacing grants. Rejected writes do not partially update roles.
- AuditEvent records actor, target, time, reason, prior roles/overrides and replacement roles/overrides. The dialog shows the most recent 20 changes. Passwords/tokens are never part of this payload.
- An unchanged PAID booking can still have ordinary guest details edited by Booking. Transitioning into or out of PAID requires `finance.receive`. This is a status authorization boundary, **not** a receipt, bank transfer or accounting posting.
- The browser uses server-confirmed saves, explicit review, retained values on failure, conflict recovery, duplicate-click prevention and unsaved-change protection. Already-open screens can retain their earlier visual state; the backend always rechecks access on requests.

## Agent pricing requirements still to implement

Existing per-Agent/program standard rates are usable without repeated Manager approval. Only a negotiated deviation requires a separate confirmation record. Sales records the baseline and proposed adult/child prices, reason and applicable booking/group/date range; Manager confirms the precise revision. An approver may not approve their own proposal even when holding both roles. Edited price or conditions invalidate the prior approval. Never overwrite standard rates to represent an exception. A draft may wait for approval; confirming a sale must fail unless its exceptional price has a valid matching approval. Preserve the final sale snapshot when master rates later change.

## Warehouse responsibility and purchasing requirements

Head Captain owns boat items; Head Driver owns vehicle items; Head Housekeeping owns cleaning supplies. Cross-department tools have a named knowledgeable custodian appointed as a special duty, not a forced departmental Role. A warehouse has one primary responsible person plus explicit deputies; all requests, approvals and physical transactions retain individual attribution. Do not appoint the owner's brother without a selected User identity.

Separate requester, approver, issuer and receiver. A request does not reduce physical stock. Reusable tools retain custodian, due date and condition; consumables distinguish use, return and waste. Spares/repair work link the actual boat/vehicle or other asset. Purchasing rights are separate from receiving, inventory adjustment and paying a supplier.

Counts support weekly, monthly or explicit custom schedules. A count records observed quantities; differences require reason and approval before a physical adjustment. The inherited COUNT command currently adjusts directly under inventory authority; converting it into this approval flow remains required. Expiry/condition inspection, counting and replenishment are distinct operations.

## Cleaning requirements

Define zones, active schedules, assigned employees, due dates and checklists. Support weekly, monthly and custom dates. Generate distinct pending jobs without duplicates; never mark a generated task completed. Workers report completion/evidence; supervisors review. Overdue work remains open and visible. Schedule revisions preserve historical completed jobs.

## Personnel and money requirements

Seasonal employment does not by itself erase paid or legally protected leave. No Job Order means no assignment, not automatically absence, unpaid leave or weekly rest. Keep employment/availability, rostered rest, actual assignments and attendance separate. Shift substitutions preserve each employee's history.

Base wage, trip allowances, reimbursements, work advances, salary advances and advance clearance are distinct records. Separate view, edit, approve and record-payment authority; being able to appoint special duties does not automatically reveal payroll data. Payroll periods, calculation basis and deduction policy remain unresolved. The conversational 10,000/30 example is not an approved automatic deduction rule. Do not implement guessed legal rates or mark drafts paid. No bank transfers, supplier messages or staff emails are authorized by this implementation.

## Release and remaining work

Source baseline: `mint/booking-operations-flow` at `2f67abbd197d3d48212d75f83b6b6ee26076b971`, not main. This branch includes that existing feature chain; it is not evidence those earlier changes have merged to main.

Apply the checked-in Prisma migration with the repository's normal migration runner to the selected database before starting the new API. Never use reset/db-push against Supabase. This task has not copied local secrets, updated the owner's checkout, or applied the new migration to an external database. Existing grants are preserved by the additive migration. Code rollback after migration can ignore the additional columns/table; do not drop access/audit data as a rollback shortcut.

Remaining implementation sequence: warehouse-scoped special assignments and purchasing permissions; negotiated-price approval bound to a revision; cleaning/count schedules and completion/approval; inventory request and maintenance lifecycle; employment/attendance and financial draft workflows; legal/policy-reviewed payroll calculations; end-to-end database migration and runtime verification. These are open requirements, not completed functionality.
