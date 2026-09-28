# Backoffice requirements #24

Source: https://github.com/totewiwittaporn/greenviewtour/issues/24 and the owner's subsequent authorization to offset Agent-held margin against existing receivables before refunding a remainder. That later decision supersedes the issue's earlier prohibition on automatic offsets.

## Financial records

Agent master terms distinguish immediate settlement from billing, day/week/calendar-month cycles, the original cycle anchor, credit duration/unit and credit anchor. Missing terms do not create inferred dates. Month arithmetic clamps to month end without turning a month into thirty days. Statements snapshot the policy, supplied anchors, calculated date and an override reason. Existing statements do not change when Agent settings change.

A reschedule request is history only. A confirmed promise changes the forecast date but preserves contractual overdue history. An approved extension changes the effective due date while retaining the original date and every transition. Confirmation/extension requires existing `expenses.approve` in addition to receivable access; Booking Manager receives no new financial approval. Version and command replay checks apply, including current access on replay. Paid/void statements cannot be rescheduled.

Booking collections record already-received external money. Source and Agent identity remain on the Booking; payer and net/full basis are independent receipt fields. The current collection flow requires the remaining Greenview net to be received in full; it does not invent an allocation for ambiguous partial collections. Billed collections reduce the existing statement without creating a second cash payment. A multi-booking statement with historical unallocated partial payments requires reconciliation before a booking-specific collection; the system refuses to guess that allocation. Old `PAID` labels are not converted into fabricated receipts.

A full Agent collection creates one cash receipt split into Greenview net and held Agent margin. Under the shared finance transaction lock, margin offsets open Agent bills in due-date order and then completed unbilled Agent-credit bookings in creation order. Offsets are non-cash records. Remaining debt persists; remaining margin is refundable, unscheduled and not transferred automatically. Billing subtracts already-settled unbilled amounts. No booking source or agreed net price is overwritten.

Booking commissions use the existing independent expenses review/payment workflow in a separate `BOOKING_COMMISSION` kind and route, with explicit payout-period dates. An immutable unique claim prevents two records from claiming the same Booking. Completed trip, eligible immutable beneficiary/rate snapshot and verified complete payment are required on save, submit, approval and payment. Merely setting payment terms to PAID does not qualify. A fully settled Agent statement qualifies; partial statements do not release a commission without evidence of complete settlement. Cancellation releases an unpaid draft claim. Payroll is untouched.

Outgoing plans reuse personnel-finance payloads with an optional planned payment date, separate from advance clearance due dates. Submitted and approved obligations are separate. Paid advances remain a single cash movement after clearance. No automatic payroll deductions or provider payments are introduced.

## Dashboards and responsibilities

Programmer shows only Error/Bug and API status. Error history is sanitized, bounded to the last 100 errors of the current API process and explicitly resets on restart. It is not a durable cross-process incident tracker. Provider health is not fabricated or probed.

GM actuals use current-month received/paid evidence dates. Held Agent money is a separate category. Forecast spans today through day 29, with overdue, unscheduled and later items separately visible. Already-billed bookings are excluded from unbilled estimates, and recorded settlements reduce the remaining net. Forecast is not profit or an available-bank-balance assertion. Payroll is omitted when the viewer lacks existing payroll permission.

Booking Manager can maintain customers and partners and process customer requests from the existing channel flows. Booking Assistant retains read-only customer access. No new Sales role, provider chat aggregation or financial approval is granted. Other catalog entities retain company-manager authorization.

## Notification event catalogue and recipients

The bell reads the existing immutable audit feed for the last thirty days, using the current stored profile and current record responsibility on every read. It never returns audit details, compensation values, contact data or original exception messages. Pagination scans batches of 100 events and retains an older-page control even when a batch has no applicable event.

| Family | Recipients | Destination |
| --- | --- | --- |
| Booking changes | Responsible Booking staff; Booking/company managers with booking access | Booking |
| Customer requests and customer changes | Booking/company managers with booking access | Requests |
| Agent collections, billing and reschedules | Existing receivable permission | Agent receivables |
| Personnel/finance lifecycle | Existing kind-specific read permission plus author, beneficiary, approver or payer responsibility | Kind-specific finance workspace |
| Purchasing | Existing purchasing readers | Purchasing |
| Company work | Author/assignee or company manager with existing work access | Existing work workspace |
| Dispatch/run changes | Authorized assigned crew or existing dispatch managers | Job Order |

Personal LINE uses the same recipient projection. Routine save/edit/sign events remain in the bell and are not selected for personal LINE. The group summary implementation is retained. The personal runner is explicit and is not wired into startup or automatically scheduled.

## External configuration and rollout

No Production deployment, database migration application, provider activation, real LINE delivery or real payment was performed by this code change. Apply the additive migration and generate the client in an authorized target before using these routes. Existing business and DEMO rows are not rewritten or seeded.

For personal LINE, separately configure verified staff UUID → LINE U-ID mappings in protected `PERSONAL_LINE_VERIFIED_RECIPIENTS` JSON. Do not use the editable contact `lineId` as verified identity. Configure `OPERATIONS_PUBLIC_BASE_URL`, `LINE_CHANNEL_ACCESS_TOKEN`, a dedicated `PERSONAL_LINE_TEST_RECIPIENT`, and the selected `PERSONAL_LINE_MODE`. Real transport additionally requires `PERSONAL_LINE_DELIVERY_ENABLED=true` and explicit `--send`; defaults stay disabled. Test mode can address only the configured test recipient. The durable event/user/mode delivery key prevents duplicate accepted sends and refuses unsafe retries after 23 hours. Configure a runner/scheduler separately only after endpoint verification and test approval. Acceptance by LINE does not prove delivery or reading.

Agent refunds reuse the independent expenses review/payment workflow under AGENT_REFUND. A receipt claim prevents duplicate refunds; the exact remaining held margin is revalidated before submission, approval and recording payment. Planned refunds replace the unscheduled receipt obligation in forecast; paid refunds reduce held money and appear once as pass-through cash outflow. Transfer method, payout date and external execution remain manual decisions; the system records an externally completed refund and never initiates one. Existing group LINE configuration and delivery gates are unchanged.
