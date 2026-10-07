# Staff LINE live-test checkpoint — 1 October 2026

## Requirement and boundary
The owner requires automatic next-day, role/assignment-specific staff notifications in Production. Manual sending is for testing or deliberate operational actions, not the daily mechanism. Test on Local first, initially to the owner only. Do not deploy, create hosted Preview resources, or message employees/customers.

## Actual repository state inspected
Local branch: `feat/cloudflare-d1-foundation`; HEAD: `486742dcc4d56869d2f2731fc23c097efdff6248`. `git ls-remote` reported main at `fef53de7a2039b450797a9a6f58147a94cfa59f3`; the local feature ref was not returned. The GitHub connector could not find local HEAD. Existing working-tree changes were preserved; no application source edits, commit, push, or deployment occurred in this attempt.

## Findings
- `backend/src/cloudflare/worker.ts` has a fetch handler but no scheduled handler; Production is still explicitly disabled.
- `backend/scripts/personal-notifications.js` and `backend/scripts/nightly-operations.js` are retired entrypoints, not running automation.
- `backend/src/modules/notifications/line.js` sends relevant audit-event notifications using a server-configured recipient map. It does not consume the new StaffLineBinding mapping and is not a complete per-role next-day digest.
- `backend/src/platform/line/staff-config.js` deliberately disables live LINE for ordinary Local. Preserve that safeguard; do not pretend Production is Local or silently remove the gate.
- Existing operations cutoff logic is 22:00 CLOSE / 22:30 SUMMARY, Asia/Bangkok. This is a group-summary implementation, not proof of a scheduled individual digest or a newly approved notification time.

## Checks actually run in this attempt
`node --test backend/test/line-messaging.test.js backend/test/operations-notifications.test.js backend/test/staff-line.test.js`
Result: 18 tests, 18 passed, 0 failed, 0 skipped. Tests use simulated provider responses; they do not prove live delivery, live account linking, or automatic execution.

## Provider attempt and blocker
Opened the authenticated LINE Developers Messaging API page for Greenview Staff, OA `@335bydey`, channel `2011806264`. The page initially showed no token and an Issue button. Clicked Issue once. Subsequent credential-reading/storage request was blocked by the tool; token issuance was not verified, no token was retrieved/stored/used by this attempt, and no LINE message was sent. Do not retry the blocked credential extraction through another route. The owner must handle any required credential setup privately; never paste credentials into this document or chat.

## Outstanding acceptance
Implement/review the next-day role/assignment projection, verified-binding recipient resolution, and automatic runner with durable deduplication/retries. Establish a deliberately scoped Local live-test configuration and a verified owner-only recipient without weakening ordinary Local or Production gates. Then verify real LINE receipt and scheduled execution separately. This checkpoint is BLOCKED for end-to-end live testing, not completion or release approval.

## Additional checks in this attempt
Actual Local HTTP: `/health/live` returned 200, UP/local; the staff webhook returned 503 `LINE_LOCAL_ONLY`, confirming ordinary Local was not activated. Pure clock-function probes at 21:59, 22:00, 22:29:59 and 22:30 Bangkok on 1 October all selected service date 2 October 2026 with the expected cutoff flags. No system clock was changed. These probes did not start a scheduler or send a message.
