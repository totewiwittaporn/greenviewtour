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
