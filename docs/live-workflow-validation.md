# Live workflow corrections · 13 September 2026

Test target: the owner's authenticated Chrome at localhost:5174, using only demonstration records. No real booking, payment, email or invitation was submitted.

## Files changed and purpose

| File | Result |
| --- | --- |
| backend/src/platform/auth/provider.js | Coalesce simultaneous identity checks; retry temporary provider failures once; preserve fail-closed session checks. |
| backend/src/app/http.js | Categorized server failure log excluding error messages, SQL, request bodies, query strings and credentials. |
| frontend/backoffice/src/core/auth/api.js | Preserve cancellation plus timeout, handle non-JSON proxy errors, retry GET 503 once without replaying mutations. |
| frontend/backoffice/src/core/navigation/operationContext.js | Shared service-day navigation and Supplies/Loans boat selection. |
| frontend/backoffice/src/core/navigation/Navigation.jsx | Apply operational context through the existing navigation owner. |
| frontend/backoffice/src/features/operations/DispatchPage.jsx | Persist and restore date, direction, page and job-order selection. |
| backend/src/modules/operations/catalog.js | Search movement snapshot fields including transaction notes. |
| frontend/backoffice/src/features/operations/StockPage.jsx | Accurate empty search feedback. |
| backend/scripts/seed-demo-driver.js | Guarded, repeatable non-login driver fixture; default rollback and explicit --apply. |
| backend/test/auth.test.js; backend/test/live-workflow.test.js | Failure-log privacy, transient verification, concurrency and fail-closed tests. |
| frontend/backoffice/test/api.test.js; frontend/backoffice/test/operationContext.test.js | Read retry, no write replay, malformed responses, cancellation and navigation tests. |
| package.json; UX-CONTRACT.md | Include frontend tests in CI and record the interaction contract. |

## Verified live data

- Booking BK-2026-000011: DEMO UI, 20 September 2026, 2 adults and 1 child. Existing price remains THB 7,250 and unpaid.
- Added DEMO FLOW · คนขับรถ ก. The fixture has no credentials, identity, confirmation or invitation, and its auth row is banned permanently. It is selectable as dispatch staff, not a usable login.
- Assigned this driver through Edit run to DEMO-FLOW-260913-ROAD-OUT and ROAD-BACK. Both are revision 4. The job order displays the driver and both directions, each with 6 planned passengers including the existing demo group.
- Driver → Boat → Stock preserved 2026-09-20. Supplies → Loans preserved the selected SEA-OUT run. Reload retained date and boat selection.
- Movement search BK-2026-000011 returned exactly five existing issues: water 6, masks 3, adult lifejackets 2, child lifejacket 1, towels 3. Lowercase note search also returned five; unrelated text returned zero. This verification created no additional stock movements.
- After the owner restarted the server and signed in, company, housekeeping, purchasing, personnel and finance menus became visible.

## Network findings and limits

Canceled ERR_ABORTED requests occurred during replacement/unmount and are distinct from server failures. Connection-refused failures were observed while the owner restarted the server. A real HTTP 503 SERVICE_UNAVAILABLE occurred once while opening the combined vehicle-day job order; retry and a read-only domain query succeeded. Its original server exception was not logged, so the underlying cause is not established. The new bounded read retry improves recovery; categorized server logging makes subsequent failures diagnosable. Neither change guarantees external services will never fail.

The provider change was active after the owner's restart. The additional server logging takes effect on the next normal server restart. Frontend changes loaded during the live test.

## Validation

`npm run check`: lint, 142 backend tests, 5 frontend tests, public and backoffice builds passed. Strict premium audit: zero findings. The existing build warning about chunks above 500 kB remains.

Driver seed: rollback validation, apply, and second apply returning ALREADY_PRESENT passed. Read-only database checks validated movement filtering against the persisted demonstration data. Live browser inspection confirmed the job order and filtered movement rows.

## Remaining work

This demonstration booking still has outstanding issued supplies/equipment. Returning equipment, recording consumption and completing the trip were not part of these corrections. The source of the intermittent 503 requires its categorized server log if it recurs. Full accounting, negotiated Agent price exceptions and statutory payroll remain outside this patch.
