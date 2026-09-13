# Van demonstration fixture (work in progress)

Run `node backend/scripts/seed-preview-van-demo.js --apply` only against the configured Preview project. Without `--apply` the script exits without loading credentials or connecting. It reuses existing DEMO-260909-VAN1 and VAN2 and adds a third owned van, one hired van/provider, ten fictional hotels, twelve bookings and eight direction-specific runs on 11 September 2026. Names and registrations are explicitly DEMO. It creates no users, grants no roles and sends no notifications.

The script uses domain APIs and skips existing codes/assignments on rerun. Existing booking details are not rewritten. Initial booking return drop-off is the hotel; per-assignment outbound drop-off is the sample pier. The return pickup meeting point is currently in assignment notes; the existing job-sheet pickup label still needs review for return journeys.

Driver account creation and allocation are pending separate authorization. This fixture is not yet a completed van-workflow acceptance test. The earlier local run was interrupted; its completion has not been verified. Exported fixture data stays under ignored screenshots.local. The two pre-existing DEMO vans and their available schedule are prerequisites. Do not run on production.

Validation for this upload: JavaScript syntax, ESLint and the no-apply guard only. No database writes were performed during the upload.
