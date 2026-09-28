# Nightly operations summaries

## Current availability

The Daily close page captures immutable, versioned reference snapshots; it does **not** lock bookings or stop morning amendments. CLOSE and SUMMARY snapshots are separate. Repeating a capture with unchanged normalized run data reuses its revision. A changed capture creates the next revision; earlier evidence stays readable. Snapshots contain allocated runs only, not a guarantee that every booking has been allocated.

Local startup never schedules or sends LINE. The current Local installation has no LINE credentials/group configuration or hosted HTTPS job URL. Its status must remain **Not configured**, with snapshot preparation available. Actual scheduled delivery requires a hosted authenticated application and the configuration below. No group has been messaged by this implementation.

## Server-only configuration

- `OPERATIONS_PUBLIC_BASE_URL`: hosted HTTPS origin for the backoffice (no path, credentials, query or fragment; localhost/IP origins rejected). Job links require normal application sign-in and role authorization.
- `LINE_CHANNEL_ACCESS_TOKEN`: secret Messaging API channel access token. Never return to browser or log.
- `LINE_GROUP_ID`: target LINE group identifier. The bot must be configured for and admitted to this group.
- `OPERATIONS_JOB_ACTOR_ID`: active company manager profile used to authorize captures and delivery. Deactivating or removing this manager's authority blocks the runner.
- `OPERATIONS_LINE_DELIVERY_ENABLED=true`: additional explicit opt-in for delivery. It does not start a scheduler.

Prepare one due tick with `node backend/scripts/nightly-operations.js --once`. An external scheduler can invoke this command at 22:00 and 22:30 Asia/Bangkok after deployment; no such scheduler is installed by this change. The runner computes **tomorrow's service date in Bangkok**, captures CLOSE at or after 22:00, and SUMMARY at or after 22:30. Before those cutoffs it performs no captures. Missed-day backfill is a deliberate manager capture, not an automatic rollover guess.

To deliver after configuration and operational review, invoke the runner with `--once --send`. Both the flag and environment switch are required. Only the latest pending summary for that date is considered. This is a development-ready entrypoint, not evidence of a working deployed automation.

## Delivery and privacy

A prepared outbox persists the destination, exact messages and UUID `X-Line-Retry-Key`. Retries reuse them unchanged, stop after five attempts or 24 hours from the first attempt, and serialize claims. A stale in-flight claim can retry after two minutes, using the same key. HTTP 409 is accepted only when `x-line-accepted-request-id` is present. Other responses and network failures remain failed for bounded retry. No new retry key is minted to bypass an uncertain result.

The LINE body allowlists service date, run name, passenger total and authenticated job URL. It omits guests, agents, contacts, hotels, payment data and special requests. Long summaries split at whole-run boundaries within LINE's five-message limit; overflow fails visibly rather than dropping runs. Guide and Driver links open the specific job in their operational pages.

API: `GET /api/operations/daily-summary?date=YYYY-MM-DD&page=1`; `POST /api/operations/daily-summary` with `{ "serviceDate": "YYYY-MM-DD", "kind": "CLOSE" }` or `SUMMARY`. Access is manager-only. Snapshot history is paginated 25 records. Database tables are private, RLS-enabled and inaccessible to anonymous/authenticated Data API roles.

## LINE OA preparation — 15 September 2026

The shared server adapter is `backend/src/platform/line/messaging.js`. Existing durable group-summary delivery now uses this adapter. Its default is simulation; live mode requires a token, and the operations runner retains its two explicit delivery gates. The adapter accepts bounded text messages only, validates recipient/retry identifiers, forbids HTTP redirects and never returns provider errors or secrets. It reports API acceptance, not confirmed delivery/read status. The legacy outbox SENT status means API acceptance.

Run `node backend/scripts/line-simulation.js` for a synthetic one-page console preview. This command accepts no arguments, reads no environment file, connects to no database and makes no network requests. It uses an example.com placeholder link and cannot become a live send by adding credentials. Tests inject fake LINE responses, including duplicate acceptance, failures and invalid input. Configuration placeholders are in `backend/.env.line.example`; leave delivery disabled until the real destination and message content are reviewed.

A raw-body HMAC-SHA256 verifier is ready for future webhook integration. No public webhook route or account linking is installed yet; verification alone does not authorize a LINE user as company staff. The existing group-summary runner does not require a webhook when a verified group ID is configured manually.

When the test OA is available:
1. Enable Messaging API and supply the server-side access token; keep channel secret reserved for webhook setup.
2. Configure the intended test group and allow the OA bot into that group.
3. Supply the hosted HTTPS backoffice origin and authorized manager runner identity.
4. Review the group-summary content/destination, then deliberately enable and test one real send.
5. Configure scheduling only after that test. Individual staff/Agent linking and booking/approval event notifications remain separate business work; this foundation does not turn them on automatically.

The existing outbox bounds retries to five attempts/24 hours. It currently records provider failures uniformly as FAILED; the adapter additionally classifies retryability for a future scheduler. There is no automatic retry loop installed.

Protocol references: [LINE request retries](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/) and [raw-body signature verification](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/).
