# Service check-in — 2026-09-15

## Approved behavior

Tee approved review before no-show: managers verify the remaining guests, enter a reason, and adjust only unserved boat/vehicle allocations. Existing actual-service records remain intact. Financial decisions remain separate; no automatic money movement or repricing.

## Implemented

- Separate `/operations/check-in` destination in Tour Operations, using Core controls.
- Booking-code/name lookup, keyboard-scanner text input, partial adult/child arrivals, distinct outbound/return attendance.
- Actor-bound command replay protection, version checks, Thailand service dates, and explicitly marked DEMO exception for arrival testing.
- Server-generated no-show allocation preview with exact before/after counts. Cancelled zero-passenger assignments are retained with a reason; already served assignments are preserved.
- Daily attendance closure rejects unresolved guests. Manager reopening requires a reason. This is separate from next-day dispatch snapshots.
- No-show financial review states: pending, retain charges, adjustment required, refund review required. New Agent billing excludes unresolved holds. Financial decisions do not change prices, bills, received money or refund money.
- Original Booking headcount and prices remain unchanged. Check-in details preserve allocation changes and reasons.
- New Prisma migration `20260915220000_service_checkin` applied to Preview through the existing verified-TLS migration ledger. New private tables have RLS enabled and no anonymous/authenticated direct access.

## Verification

- Backend: 194 tests pass, including allocation split, actual-service preservation, Thailand dates, partial attendance and Agent billing hold.
- Frontend: 12 tests pass.
- Backoffice build passes; lint has no errors (existing member LeaveGuard warning remains).
- Strict Core audit: zero findings.
- `backend/scripts/check-service-attendance.js`: Preview transaction verified replay, stale versions, reason requirement, partial allocation adjustment, unchanged money/headcount, close/reopen guards. Only temporary fixtures rolled back.
- Chrome UI: 2 adults / 1 child checked in out of 4 / 2; close rejected while unresolved; empty no-show reason rejected; confirmed no-show of remaining 2 / 1; allocation reduced to 2 / 1; outstanding finance review retained.
- Chrome boat page and job order show the reduced 3 passengers and revision 2; allocation table shows the no-show reason.
- Safari UI: read the same 3 present / 3 no-show, then closed the service day successfully while financial review remained pending.
- Chrome narrow viewport (390): no document-level horizontal overflow; action menu, finance select and Escape behavior checked. Viewport restored.

## Retained example

`checkin-demo-manifest.json` identifies DEMO-CHECKIN-2026-09-15. Six originally booked; three arrived; three reviewed as no-show. Day closed; finance pending. This example and its simulated boat remain for the manual. No real funds or LINE messages were sent.

## Boundaries

Camera barcode decoding and customer e-ticket generation are not implemented by this change. Keyboard scanner input is a normal Booking-code lookup, not cryptographic ticket validation. Adjustment/refund-required decisions remain outstanding for separate financial processing; they do not create credit notes or bank refunds. Live gateway and LINE connection remain deferred.

Final follow-up: corrected dispatch pending headcounts to subtract reviewed no-shows; the Preview transaction also verifies zero remaining passengers for the reduced allocation. Latest backend loaded successfully. Local sessions expire on this restart; UI success evidence above was captured before this final pending-count correction. `git diff --check` passes.
