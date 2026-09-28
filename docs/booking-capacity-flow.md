# Booking capacity and whole-group dispatch

Owner-approved scope: 25 September 2026. Applies to Public/Member requests, staff Bookings, readiness planning, boat dispatch and preliminary van estimates. No Production rollout or payment-provider activation is included.

## Operational setup

Open **Tour Operations → Vehicle & boat readiness**. Existing Booking readers can inspect plans; only the existing boat/driver planning permissions can edit the matching readiness type. No new role grants are created.

For each actual service date/direction/window, record the compatible service resources, start/end times, ready vehicles, usable passenger capacities and the explicitly agreed temporary hold duration. Services in one pool must have compatible category/origin/destination. Use a shared pool for services using the same physical fleet; do not create independent quotas per tour program.

READY means the vehicle is secured and available for that window. PROPOSED rentals and UNAVAILABLE vehicles do not count. Active fleet master data alone is not readiness. Crew/total-person limits, actual runs and overlapping commitments constrain usable capacity. The same physical vehicle cannot be pledged to overlapping pools. Date/window/service changes are blocked while the pool has reservations; a genuine breakdown can reduce readiness, but retains existing customer obligations and reports team review.

No company readiness rows were invented or backfilled by this implementation. Before confirming real bookings, the authorized team must configure actual windows. Missing setup is **unknown / waiting for team**, never zero demand or guaranteed availability.

## Shared demand and confirmation

`capacity-core.js` derives committed occupancy from CONFIRMED/COMPLETED TourBookings on each actual service date and selected direction. A Booking counts once per compatible pool even when multiple selected components refer to it. Only selected services count. Known no-shows are excluded in the corresponding service leg. Unknown open-return dates are not silently reserved.

`CapacityHold` stores temporary customer-request seat holds only. Confirmed Bookings do not have a duplicate capacity ledger. Active unconverted request holds consume seats; cancellation, expiry, successful conversion or an accepted date change releases/replaces them. Promotion quota and seat holds are separate, with the shortest applicable expiry used for a seat hold.

Booking writes, customer requests, readiness edits and dispatch changes share the existing PostgreSQL advisory transaction lock `7082027`. Confirming rechecks all affected legs and persists the reservation in the same transaction. Command IDs, current authorization and optimistic versions retain their existing roles. The browser's displayed number is informational, not a reservation.

A staff CONFIRM that cannot fit keeps the Booking DRAFT with `programSnapshot.capacityReview.status=WAITING_TEAM`, increments its version and returns an explicit non-success result. Customer ACCEPT preflights before creating an operational Booking; a shortage keeps the request WAITING_TEAM without a half-created Booking. A new member request that lost availability requires explicit waiting-list consent; otherwise it returns CAPACITY_CHANGED. Nothing closes the sales date automatically.

## Public and Member behavior

Tour details and the existing Member request form show remaining seats plus whether the entire selected group fits. Remaining aggregate seats alone never authorize a larger group to split over boats. Service-window choices, changes, loading/error/retry and stale-response handling use the existing app controls. Public availability includes no customer names, Agent prices, booking identifiers or staff contacts.

REQUESTED and WAITING_TEAM are both unconfirmed. No payment prompt appears for an unready request. Member history displays temporary hold expiry. For accepted unpaid Bookings, payment instructions are shown only when a current capacity check succeeds. Existing transfer-evidence review remains separate from real payment-provider execution; this change does not activate live QR/card payments or automatic refunds.

## Team decision and date changes

The team can secure another boat for the specific window, mark it READY, then deliberately retry acceptance. Proposed hires are never counted as confirmed supply.

Staff can propose a different service date for an unconverted request. The old date remains unchanged under DATE_PROPOSED. The customer must accept the displayed new date, price and terms; server-side quote and whole-group capacity checks run again under the same lock. Declining restores the previous pending workflow. A failed acceptance rolls back without losing the old date or its valid hold.

Confirmed legacy Bookings without a recorded window can be reconciled through the readiness row action with a mandatory reason. This only records a missing window for an already-confirmed obligation; it cannot overwrite an existing selection, change a date or confirm a new Booking. Ambiguous legacy windows remain review-required until explicitly reconciled.

## Preliminary plan versus real dispatch

`planBoatGroups` proves indivisible-group feasibility with bounded search. It minimizes boat count first, then used capacity; it does not claim fuel-cost optimization. Real pinned assignments, exclusive charters and eligible-boat restrictions are preserved. A search limit returns REVIEW_REQUIRED or a witnessed FEASIBLE plan with `optimal:false`, never a guessed sold-out result.

Examples for 30/45/65-seat boats: groups 30+40 use 30+45; groups 35+35 use 45+65; one 65-person group uses the 65-seat boat. Availability is not calculated by merely dividing total passengers by capacity.

Boat ASSIGN accepts the whole Booking only and blocks a second split assignment in the same service leg/category. Real assignments must remain inside the reserved service window and must leave every existing group feasible. **Move whole Booking** removes and adds the complete assignment atomically; invalid target, version conflict, stock-preparation or actual-attendance restrictions roll back to the original assignment. The proposed plan never moves customers or chooses captains automatically.

Vans keep actual passenger counts separate from configurable luggage units (default overnight factor 1.2). Estimates pack whole passengers within actual per-vehicle seats and luggage units, then explicitly label extra unconfirmed vehicles using the stated reference size. This is a preliminary, non-optimal vehicle estimate, not an automatic route plan. Pickup geography, travel time, physical luggage, group preferences and driver availability still require the normal dispatch decision. Existing partial van allocation is retained; the owner's no-split rule applies to boats.

Head Captain remains tied to assigned vessel/runs for visibility, never all vessels or a permanent captain-to-boat mapping. No Sales permissions were added. Other-role Dashboard design remains a subsequent task using the current actual UI.

## Validation and release boundary

New unit coverage extends the original solver oracle, fixed/charter eligibility, real dates, crew capacity, group quantities, service-window conflicts, van units and permissions. `scripts/smoke-capacity-ui.js` verifies the actual three frontends with isolated HTTP fixtures; it makes no business writes and captures desktop/mobile screenshots in `/tmp/greenview-booking-full-20260925/screenshots`.

`backend/scripts/check-booking-capacity.js` uses the exact verified Preview adapter and a single transaction rollback for its synthetic workflow. `check-capacity-concurrency.js` uses uniquely identified disposable Preview fixtures for a real simultaneous web/staff last-seat race and deletes only those fixture IDs. Neither script sends messages, runs real payments, changes Auth accounts or alters retained DEMO data. These scripts are explicit opt-in, not part of ordinary startup/CI.

The additive migration is `20260925103000_booking_capacity`, with private RLS-enabled tables and no anon/authenticated grants. Local source is validated separately from hosted deployment. Real business readiness configuration, provider activation and Production launch are not inferred from passing tests. See the dated handoff for the exact final validation evidence and Git status.
