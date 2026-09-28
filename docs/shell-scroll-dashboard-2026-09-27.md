# Backoffice independent scrolling and Dashboard latency — 27 September 2026

## Verified problem
The owner's Desktop recording (21.387 seconds, Chrome's 1376×1032 iPad viewport) shows Booking tabs/headings and the top of the Sidebar moving beneath the sticky Navbar. The document was still the outer scroll owner; the Sidebar additionally used a full viewport height below a separate header. A sticky Navbar alone did not implement independent regions.
The recording also shows Dashboard requests around 2.86–3.08 seconds. Read-only service profiling reproduced approximately 2.36–2.72 seconds and 29 database queries.

## Implementation
- Core Shell is a fixed viewport grid with an intrinsic-height Navbar and a remaining bounded row for Sidebar and Content. No hardcoded header offset. Only each region's contents scroll; Content owns its footer.
- Navigation resets Content only. Overscroll containment stops Sidebar boundaries from scrolling Content or the document. Mobile navigation stays below Navbar without pushing Content. Native modal stack locks both workspace scrollers until the final modal closes; print layout remains separate.
- GM's existing permission-admitted widget definitions are aggregated in one batched query; its calendar/daily/monthly/season report is read in a second batch. Existing fresh authorization and RepeatableRead snapshot remain unchanged.
- Dashboard effect cancels the initial development StrictMode setup before sending a redundant request. It does not disable StrictMode or introduce cross-user/time-based data caching.

## Evidence
- Same stored Preview Manager and two dates, three samples per date: median Dashboard service time **2464 ms → 578 ms**; **29 → 7** database queries. Includes the fresh stored authorization queries; excludes browser asset loading, login/provider overhead and network transit to the browser. Not a whole-page speed guarantee.
- Full Dashboard responses are identical for 2026-09-27 and 2026-10-20. Eight read-only before/after comparisons also passed, covering the stored Manager plus hypothetical deny/assigned-only permission scenarios; no stored permissions were altered.
- `npm run check`: PASS — **371 Backend tests, 41 Frontend tests, lint and all three builds**.
- `node scripts/smoke-browser-fixtures.js`: PASS after final code changes. New `smoke-shell-scroll.js` covers 1376×1032, 1440×900, 834×900, 390×844 and 320×640; wheel isolation, actual browser touch input on tablet/phone, scroll boundaries, visible scrollbars, stable modal geometry, nested-modal lock, content-only navigation and one Dashboard read per mount.
- Existing data-fetch, auth, navigation, all-role Dashboard, modal and Job Order regressions also pass. One invitation test was made to await its existing requestAnimationFrame focus transfer before asserting focus; the assertion and application behavior were retained.

## Boundaries
Browser checks use isolated Playwright Chromium fixtures, not the owner's live session. Database checks are read-only against Preview. Safari/physical touch hardware and Production load were not tested. Existing bundle-size/tooling warnings remain. No schema/dependency change, migration, seed, approval/payment, email/LINE send, commit, push or deployment was performed.
The current Local launcher is restarted to load the updated Backend; existing in-memory Local sessions require a fresh login. Public/Member scroll ownership was not changed. Earlier uncommitted work is preserved.
Private before/after source copies, recording frames, measurements and logs are under the owner's Downloads/Greenview-Shell-Dashboard-20260927-221455 and are not committed.
