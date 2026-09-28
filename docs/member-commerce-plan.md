# Member commerce implementation — 15 September 2026

Owner authorized the full member/customer scope in this conversation. Work is local/Preview; deployment, DNS, real LINE sending and live payment-provider activation are separate actions.

## Accepted scope
- member.greenviewtour.com: own dashboard, service dates, tour selection, booking history, profile.
- Existing Backoffice: customer directory and direct/Agent booking views, not a second admin application.
- One operational TourBooking per accepted customer request; existing component-based boat/vehicle/guide operations continue.
- Tour content: descriptions, itinerary, type, images, meals, fees, inclusions/exclusions, extras, restrictions, service and online sale seasons.
- Promotions are separate campaigns referencing master tours, with final adult/child prices, booking dates, service dates and seat/booking quota. Master prices remain unchanged; sold terms are snapshotted.
- Public tour and promotion listing/detail pages use published content only. Popup campaigns link to tour/promotion pages, with schedules, frequency and images.
- Isolated customer authentication/ownership; registration does not grant workspace roles. No automatic linkage by display name or email to existing bookings.
- Public/customer DTOs must never expose supplier cost, internal notes, Agent prices or staff PII.

## Implementation order
1. Additive private schema and shared validation/quoting rules.
2. Manager-owned content/promotions/popups and customer request management.
3. Public catalog and member application with isolated authentication and owned requests.
4. Accepted requests convert to the existing Booking workflow with immutable price attribution.
5. Payment proof/review after owner confirms the initial payment rules.
6. Regression, access control, quota concurrency and Chrome/Safari verification.

## Previous payment workflow (superseded; current implementation)
Owner previously confirmed: request → staff confirms availability and full amount → customer bank transfer in full and evidence upload → staff verifies received funds. Company bank details must be configured by the owner; never infer them. No card gateway, automatic refund, deposit or automatic receipt/tax invoice issuance. Company-issued documents may be attached and viewed in the system.

## Operational and release notes
- An accepted customer request produces exactly one existing TourBooking. Selected boat/transfer components use the existing dispatch workflow.
- Independent guide jobs link directly to a confirmed Booking and support partner tours without creating a boat or vehicle. Existing Guide access controls and cross-roster overlap checks apply. No automatic payroll rule is inferred from these assignments.
- Limited promotions require a staff-configured hold duration (hours). Expired unaccepted requests release quota. Accepted requests keep quota; rejection, customer cancellation before acceptance, and cancelled Bookings release it. No automatic cancellation/refund of accepted or paid bookings.
- Customer cancellation after acceptance and refunds remain staff-handled; no financial transaction is executed by this application.
- Company receiving-bank details need real owner-provided values. Until configured, members are told to contact the company before transferring.
- Supabase must allow the member registration redirect `http://localhost:5175/login`; the deployed member domain and email delivery configuration need verification before launch. No live email/LINE message has been sent for testing.
- Hosting/DNS, production deployment and payment gateway integration are not activated by this local implementation.

After owner approval, the three exact local redirects listed in `docs/validation/member-commerce.md` were verified saved after reloading the Preview dashboard. Member password recovery uses the member login destination as well. Production destinations remain deferred until deployment.

## Updated owner direction — QR payments and retained demos
Owner now requests provider-confirmed QR payments instead of routine slip upload and staff payment approval. Provider selection is pending cost comparison (Omise vs Stripe); do not activate a provider or treat the old manual flow as acceptance of this new requirement. Current code still implements manual payment review.

Required implementation: per-order amount/currency/payment reference, server-created payment intent, independently verified provider result, idempotent event handling, payment/booking reconciliation, expiry and late-payment handling, explicit test/live isolation, persistent audit trail and separate gross amount/provider fees/net settlement. Browser success messages and uploaded slips alone cannot confirm payment. Availability confirmation is separate from payment confirmation; own-tour daily capacity and partner confirmation policy must be resolved before automatic Booking acceptance. No automatic refunds until approved rules exist.

Owner requests visible DEMO records remain for repeat testing and manual screenshots. Never automatically clean up that persistent dataset. Transaction-rollback unit/integration fixtures remain separate from manual-demo records. Real transfers and financial records must not be fabricated. A retained provider-sandbox sample is not evidence of live payment readiness.
