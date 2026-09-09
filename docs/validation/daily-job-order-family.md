# Daily Job Order family

Approved: owner-selected sage mockups, boat outbound/return, vehicle pickup/drop-off without drop-off times, daily Booking with service-day collection column.

## Implementation
- Shared DocumentCore reads the exact original logo from private DocumentAsset bytes; printing waits for fonts and image decode. Migration and idempotent Preview import script included. Source PNG is versioned for reproducible environment setup.
- Boat and vehicle documents collect every authorized run for the same vehicle and Thailand day. Existing per-run staff scope remains enforced. Boat/driver projections do not include booking prices.
- Booking daily report has no pagination limit and includes confirmed/completed trips overlapping the selected Bangkok date, once per booking. Draft/cancelled bookings are excluded and the scope is printed on the sheet.
- COUNTER prices use snapshotted adult/child amounts plus selected, non-included service lines using integer satang. Other terms show a dash. Unknown prices are explicit; no deposits or ledger settlement are inferred.
- Existing per-booking View remains available as details; Daily job order is the printable all-day entry point.

## Verification
- npm run check on ESC passed: ESLint, backend suite and both frontend builds. Existing bundle-size warning remains.
- Additional money, full-day scope (>25 rows), Booking role denial and byte-preserving logo tests pass.
- scripts/smoke-job-documents.js passed all three document workflows, 390px layout, zero actual values, daily ten-row report, print controls hidden, long content and failed refresh. Browser requests are intercepted: no database writes.
- PDF visual review: ordinary boat/vehicle samples each one A4 landscape page; 15 outbound + 5 return boat groups fit one page; daily 10-row Booking and summaries fit one page. The long-note 35-group vehicle fixture spans eight pages, not clipped.
- Preview read-only check: 9 Sep = 43 bookings; 10 Sep = 26; 11 Sep = 0 confirmed/completed bookings. COUNTER missing-price count 0 for each. No new customer fixture was seeded.
- Logo import verified 4,994 bytes, SHA-256 c61293866eed45c01b5e30e3a973b07bb3f1e38cc4f95bc9cc1b512f9589a6a3; private table RLS verified enabled.
- Premium strict static audit: zero findings.

## Deployment scope
Local ESC app using Preview database. No production deployment. Restarting local API invalidates in-memory sessions; users may need to sign in again.
