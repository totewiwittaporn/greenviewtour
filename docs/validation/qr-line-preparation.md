# QR and LINE preparation — 15 September 2026

## Implemented and verified
- Provider-neutral **offline simulation** payment state machine with integer THB amounts, references, expiry, event idempotency/conflicts, non-regressing successful states and late-success review.
- LINE account challenge preparation bound to account, audience and session, random state, hashed stored values and ten-minute expiry. Validation returns a consumed record; a future persistent callback must atomically consume it. No production account is linked by these functions.
- Recipient resolver separates CUSTOMER/STAFF and provider scope; rejects group IDs and unlinked bindings for personal delivery.
- Reuses the existing LINE simulator/transport. `backend/scripts/integration-demo.js` persists the demo evidence in `qr-line-demo.json` without network access.
- Public/member catalog sample restored and retained in Preview. `commerce-demo-manifest.json` records IDs; automated cleanup refuses retained records. This demo is visible in the member tour list and is not a real offer.

## Still required before activation
This is preparation, not a complete payment integration. No provider adapter, payment persistence table, payment HTTP endpoint, payable QR, live webhook, account-binding persistence/callback, individual notification outbox or automatic Booking fulfilment has been installed in this changeset. Existing manual-payment UI/backend remains unchanged. The simulation does not mark actual Bookings PAID.

After provider choice: implement its test adapter and authenticated webhook verification, persist payments/events with unique provider references, reconcile provider state and Booking atomically, and expose the member payment screen. Production stays disabled until merchant setup and live verification.

For LINE: create LINE Login and Messaging API channels under the intended provider, implement the verified callback and atomic unique account binding, add link/unlink UI for customer and employee profiles, and enqueue/deliver scoped notifications. Never interpret staff-editable Line ID text as proof of ownership. No Agent portal is currently present.

Resolve daily sellable capacity before accepting own-tour Bookings automatically. Partner availability and late-payment/refund handling require explicit policy. Preserve manual demo records for screenshots; distinguish them from transaction-rollback integration fixtures.

## Connected local demo checkout (follow-up)
Implemented `/api/member/demo-checkout` behind existing local host/token/origin and authenticated customer-session guards. Eligibility uses the exact owner-retained tour ID, resource and component from the manifest, not a user-supplied DEMO label. Production disables it. Ownership, promotion-hold expiry and component-version checks run in the same advisory-locked transaction as simulation success and Booking creation. Repeated success produces the same Booking.

Member Trips now exposes Prepare simulated payment and Simulate success for eligible retained requests. Success persists the payment state, a CONFIRMED operational Booking with DEMO code/name, and a customer-scoped LINE message preview. Backoffice Review shows the simulation warning. No real QR or delivery exists. Booking paymentTerms stays PREPAID, not real PAID; `programSnapshot.demoPaymentStatus` and the customer-facing panel record simulation success explicitly. No employee is impersonated: the initiating customer auth ID is recorded on the demo audit event.

`backend/scripts/check-demo-checkout.js` passed against Preview: other-customer denial, mismatched payment reference, exactly one Booking/audit event after repeated success, operational component creation, and scoped SIMULATED/accepted:false notification. That isolated integration transaction rolls back; the retained manual tour and user-created demo requests remain.

Full `npm run check` passed: 189 backend and 12 frontend tests, lint (one pre-existing LeaveGuard warning), all three builds. Both strict UI audits passed. Live browser acceptance for the new buttons awaits renewed customer login after loading the backend. Local services were restarted with the new endpoint.

Browser follow-up: customer authenticated in Chrome, selected 2026-11-02 (owner assisted with native date entry), and submitted the retained DEMO request for one adult at THB 1,000. The request appeared in Trips. Browser verification uncovered a missing tourId in the member request projection, hiding the DEMO panel. Fixed the projection and extended the actual-Preview rollback check to assert memberRequests exposes demoCheckoutEnabled. That check passes. Browser payment success still awaits login after this fix; do not claim full browser success yet.

## Owner browser test verified
Owner completed simulated payment in the member UI. Assistant inspected the existing Chrome Trips page and performed read-only Preview verification: Booking DEMO-a1c8a60c, service date 2026-11-02, one adult, THB 1,000. Payment simulation SUCCEEDED with one event; exactly one linked CONFIRMED Booking, one component and one demo checkout audit event. LINE preview is SIMULATED, accepted:false, and customerId matches the request owner. Booking remains tagged demo with PREPAID (no real funds recorded). All records retained. This verifies the connected local simulation; actual QR provider and LINE delivery remain untested and disconnected.
