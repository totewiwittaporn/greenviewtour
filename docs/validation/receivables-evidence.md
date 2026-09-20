# Agent receivables, company documents and payroll export

## User decisions

- Company issues receipts and tax invoices externally, possibly handwritten. The system stores photographs, document numbers and links to received payments.
- Internal Agent statements, partial/full receipts of external payments, outstanding balances.
- Payroll uses company-entered base/adjustments with reasons, CSV export. Statutory formulas and bank transfers remain excluded.
- LINE remains excluded.

## Implementation

- `/company/receivables`: completed AGENT_CREDIT bookings for one Agent; up to 50 per immutable statement snapshot. An unpaid statement can be voided with a reason and its bookings released. Payments use exact satang, per-command idempotency and version checks; overpayments rejected. Existing finance.receive permissions reused.
- Private attachments on booking, personnel/finance, bill or individual payment. Type/signature/size checks; max 5 MiB JPEG/PNG/PDF; paginated metadata; authenticated attachment downloads with no-store/nosniff. No public file URLs. DB bytea storage keeps documents with the existing verified Preview database and backups; capacity should be monitored before large-volume use.
- Payroll export respects payroll.view, existing filters, 5,000-row limit, UTF-8 BOM and CSV formula escaping. No new user permissions granted.
- No deletion/replacement of evidence or reversal of recorded payments in this version. Payment correction is an outstanding workflow limitation; do not treat test coverage as accounting sign-off.

## Validation

- Automated cases cover unauthorized reads/replays, missing parent, malformed/oversize files, duplicate uploads, duplicate billing, partial/full exact amounts, stale revisions, overpayments, void/rebill and CSV escaping.
- Full lint, backend/frontend tests and both builds pass before the migration fallback change. Final verification and Chrome runtime results recorded below as performed.
- Mac Prisma schema engine reports P1011 certificate not trusted despite the app's Node pg connection successfully verifying its configured CA. Standard strict TLS remains unchanged. `backend/scripts/migrate-verified.js` checks the existing Prisma ledger and checksums (including Windows CRLF equivalents), serializes migrations and applies SQL + ledger atomically using the app's verified connection. Defaults to read/check; `--apply` is explicit. No global certificate trust or TLS bypass was introduced.

## Current handoff status — 15 September 2026

- `npm run check`: 155 backend + 5 frontend tests passed; lint and both builds passed. Existing large-chunk build advisory remains.
- Premium strict audit: zero findings.
- Both additive migrations applied atomically; subsequent check reports no pending migrations.
- Read-only database verification: all four new tables have RLS enabled and SELECT is denied to anon/authenticated. Eligible booking query executes successfully (one eligible booking currently).
- Local server running at localhost:5174. Restart invalidated in-memory sessions. User's original Chrome tab is at login; requested Admin Manager login for runtime verification including confidential payroll export. New UI upload/payment/export end-to-end tests are **pending**, not claimed passed.

## Chrome execution — 15 September, Admin Manager

- Created `DEMO FINANCE · ทดสอบลูกหนี้ 150926`, bill `bad67393-a7f0-4dad-9d1d-bf07b5b3c644`, for existing completed DEMO BK-2026-000010 / Agent 2, total THB 5,850.00; due 2026-09-30.
- Tried THB 6,000: server rejected with PAYMENT_EXCEEDS_BALANCE (409), form retained input, no payment created.
- Received DEMO THB 2,000 with reference DEMO-ONLY-PARTIAL-150926: outstanding THB 3,850. Received remaining THB 3,850 with DEMO-ONLY-FINAL-150926: PAID and outstanding THB 0. Both records visible. No real money transfer.
- Reopened create statement: already billed booking absent, eligible count zero.
- Attached synthetic PNG `greenview-demo-evidence.png` (550 bytes) as DEMO-RECEIPT-150926 to the partial payment `fb2519cd-2c63-4ede-9635-e8abf37d09ca`; attachment `7bb55896-d67f-478f-8d20-fec946281a51`. Note explicitly identifies it as test-only, not a real receipt. Native Mac picker worked when extension filechooser API was denied. No extension security settings changed.
- Payroll filter DEMO FLOW exported one record. Actual `/Users/tootee/Downloads/greenview-payroll.csv` parsed successfully: one DEMO row, net THB 9,900.00.
- Direct attachment download was blocked in Chrome. Fixed UI to fetch authenticated bytes and save via shared blob download helper, with pending/error states, avoiding document navigation. Response retains no-store/nosniff and sandbox, now explicitly permits downloads. [MDN CSP sandbox documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox) documents allow-downloads for both download links and navigation downloads.
- Added HTTP regression for download headers and revoked access, and frontend regression for byte preservation/filename and refusal to save authorization error bodies.
- Enabled Vite file polling on macOS after observing served modules stayed stale following filesystem writes; restarted Local. Download fix is deployed locally; final Chrome retest awaits the requested login. Receipt creation/payment/CSV results above were observed before restart.
- Final UI attempt was blocked because the Mac is locked; computer-use tool explicitly requires the user to unlock it. No automatic unlock/bypass was attempted. Final post-fix download comparison remains pending.

## Final Chrome verification — 15 September, after user unlocked and signed in

- Existing user Chrome tab, Admin Manager, latest Download button loaded correctly.
- Downloaded attachment 7bb55896-d67f-478f-8d20-fec946281a51 through the actual UI; status says Download started and the real Chrome Network entry returned HTTP 200.
- `/Users/tootee/Downloads/greenview-demo-evidence.png` exists, 550 bytes. SHA-256 comparison with the uploaded `/tmp/greenview-demo-evidence.png` matches exactly.
- Post-fix download retest is now PASS; the earlier login/locked-Mac blocker is resolved. The demonstrated Agent statement/payment/attachment/CSV workflow is ready for user acceptance testing.
- Latest complete automated run: 156 backend + 6 frontend tests passed, lint passed, both builds passed. Existing large-chunk build advisory remains. No LINE actions or real money transfers performed.
