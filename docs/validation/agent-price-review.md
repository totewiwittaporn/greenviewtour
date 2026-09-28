# Agent negotiated-price review · 15 September 2026

## Scope

Per-booking adult/child rates for Agent draft bookings. Standard Agent agreements remain unchanged. Another Manager must approve the saved proposal before Booking confirmation. Request, reject, approve, withdraw and draft-edit invalidation retain audit evidence. Confirmed bookings cannot change rates through this workflow.

The existing programSnapshot JSON stores the current proposal and original standard rates; existing auditEvent and operationCommand store history and actor-bound idempotency. No schema, RLS, credentials or permission grants changed. Current Supabase JSON documentation and changelog were reviewed; this change does not introduce a Supabase platform API.

## Automated verification

- npm run check: lint, 149 backend tests, 5 frontend tests, both builds passed.
- New service tests cover independent approval, self-review denial, role denial, version conflicts, pending/rejected confirmation guards, new request invalidation, withdrawal, decimal equivalence, invalid/negative totals, lifecycle locks and authorized idempotent replay.
- Booking-plan regression verifies that draft editing restores snapshotted standard prices instead of preserving an approved exception as standard.
- Premium strict static audit: zero findings.
- Existing build chunk-size warnings remain.

## Chrome verification

Using the owner's existing Chrome tab and authenticated session. Created a separate draft `BK-2026-000012`, named `DEMO PRICE · ทดสอบอนุมัติราคาต่อรอง 150926`, with DEMO FLOW Agent 1 and the one-day demo program. Standard adult/child rates: 2100/1200 THB, one adult, no children. Proposal: 2000/1100 THB with an explicit simulation note.

Browser results are recorded below as they are verified. No real booking, payment, invitation or account permission is changed. The owner subsequently signed in with the verified Manager account; live two-account approval results are recorded below.

- Created DEMO draft through Chrome, revision 1.
- Entered proposed adult/child rates 2000/1100; displayed proposed total 2000 THB.
- Request persisted, revision 2 and Price: PENDING appeared.
- Confirm booking returned: "This negotiated price needs approval before confirming the booking." Draft remained unconfirmed.
- Reopened price review showed standard/current total 2100 and proposed total 2000, request reason and requester Admin Manager.
- Requesting Admin Manager saw no Approve/Reject controls, only Request and Use standard price with an independent-review message.
- Withdrew the request through Chrome with a simulation reason; pending label disappeared and the booking remained Draft. No service reservations or payment records were created.

## Final acceptance preparation

- Added a disabled Confirm · price approval required menu action for pending/rejected requests; backend guard remains in place.
- Final lint/backoffice build and strict UI audit passed after this UI refinement.
- Reopened DEMO BK-2026-000012 and submitted a fresh 2000/1100 request from Admin Manager (revision 4, Pending), explicitly labeled for two-account acceptance testing.
- User directory confirms the owner's separate Manager account is verified. No account permissions were modified.
- Restarted Local to load the final UI. Owner signed in as the separate Manager; see completed acceptance evidence below.
- UAT procedure: docs/user-acceptance-test-th.md.

## Completed live two-account acceptance

- Owner signed in as Wutcharapong Wiwittaporn (Manager), distinct from the requesting Admin Manager account.
- Pending request showed disabled Confirm · price approval required.
- Price dialog showed the saved request from Admin Manager and offered Approve/Reject to this different Manager.
- Approved the explicitly simulated 2000/1100 rates with a review note. Booking reached price APPROVED, revision 5; current total became 2000 THB and the saved reviewer name matched the signed-in Manager. Confirm became available.
- Opened Edit: warning explained loss of price approval; loaded quote restored standard 2100/1200. Changed the DEMO note and saved. Booking remained Draft and the Approved label disappeared.
- No real sales, payments, role grants or invitations were changed. All live mutations used the owner's existing Chrome tab.
