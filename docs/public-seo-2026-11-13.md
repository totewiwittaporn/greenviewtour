# Greenview public SEO release — 13 November 2026

Authorized scope: Greenview Tour / Surin Islands, Thai and English. No partner-tour promotion, booking/payment changes, database writes or historical business-record edits.

## Source and preservation
Source: GitHub main 81cd6bc74a4c6fc295c139982ea649c2e2adb199, worked on ESC. Existing CLC workspaces untouched.
Rollback baseline: public Worker 9a5cb956-3728-49cd-9a91-ad247af1f9f3, created 10 October and restored 14 October.
Candidate uploaded: ac1604bd-fdd5-4e8a-99f5-7074c0c9a298. Production verification is recorded separately after traffic deployment.

Main was missing the pricing functionality already running in production. Restored the exact live behavior before SEO publication: departure zone and visitor group selection, all four price-table rows, minimum starting prices, quote parameters and inquiry text. Existing business prices were not changed.
Pricing-only build: 399,278-byte JS, matching the live byte count; CSS index-4-VPgnnT.css identical. All string literals match and the whole normalized JavaScript AST matches after identifier renaming and literal-object ordering normalization (114,230 tokens). This is semantic evidence, not a claim of binary-identical JavaScript. Live JS SHA256: CFAF1ABC07A7DC3FECD135390FC00DE58AA996A2D6F6AE9D186945B3A3222399.

Live public Worker byte-for-byte export was unavailable through supported native export workflows. Runtime bindings, production origins, API service and compatibility date were compared. Existing route/domain configuration is preserved by version deployment rather than trigger replacement. Public Worker only; API service and database untouched.
The live asset fallback was single-page-application, contradicting the intended 404 routing. The release corrects this to none with run_worker_first true. Previous version remains the rollback point.
No credential export was completed.

## Implemented
- Three permanent direct redirects, slash/no-slash, GET/HEAD, canonical host and www alias, retaining query parameters:
  - /how-to-get-to-surin-island/ → /surin-islands/getting-there
  - /koh-surin-accommodation/ → /surin-islands/accommodation
  - /sustainable-travel-to-surin-island/ → /surin-islands/responsible-travel
- Historical content checked:
  - https://web.archive.org/web/20260808074754id_/https://greenviewtour.com/how-to-get-to-surin-island/
  - https://web.archive.org/web/20260516082242id_/https://greenviewtour.com/koh-surin-accommodation/
  - https://web.archive.org/web/20260808065055id_/https://greenviewtour.com/sustainable-travel-to-surin-island/
- API, method and origin guards remain before redirects; no blanket homepage redirect.
- Thai titles aligned with keyword intent. Separate guide/travel/accommodation H1s, natural English retained.
- Added practical bilingual mainland connections and accommodation reservation/checklist information, without copying obsolete schedules, prices or availability.
- Improved hub internal links to accommodation, season, snorkeling and Moken information.
- Home/editorial metadata has one cleanup-owned canonical and description. Catalog canonical/query behavior retained. LocalStorage locale remains unchanged; no invented language URLs/hreflang.
- Sitemap retains current editorial routes and published catalog, not legacy URLs.

## Deferred, not guessed
Food, snorkeling spots, alternate travel slug, Moken, park overview, weather/season, comparisons, categories and package URLs need additional historic-content matching, destination expansion or current-offer checks. No redirect based only on similar names/durations.

## Verification
- Public build, lint and workflow audit passed.
- Focused public Worker and redirect tests: 35/35.
- Frontend tests: 65/65 before addition of pricing regression test.
- Pricing pure-function/inquiry comparison against shipped implementation: 108 assertions passed.
- Browser fixture SEO: 24 Thai/English desktop/tablet/mobile content/home states (1440/834/390), one H1/description/canonical, no horizontal overflow.
- Browser pricing: six locale/viewport states, all four matrix rows, selector gating, updated/cleared totals, quote parameters and inquiry. No business mutations or runtime errors.
- Existing real Worker adapter checks cover unknown404, valid/unknown/unavailable tours, deep links, Back/navigation, assets and crawler files.
- Aggregate local check incomplete: backend 687 passed, 1 failed and 1 skipped out of 689. Unchanged staff-line-worker-client real-workerd test fails write EOF on ESC even in isolation. This is not a full-system pass.
- No booking submission or payment performed. Production verification is read-only and aborts non-GET/HEAD/OPTIONS browser requests.

## Reproduction
Build: npm run build:public
Tests: npm run test:frontend; node --test backend/test/public-legacy-redirects.test.js
Browser: node scripts/smoke-public-seo.mjs; node scripts/smoke-public-price-parity.mjs
Use GREENVIEW_CHROMIUM_EXECUTABLE for the installed Chrome on ESC.

## Production result
Deployed public version ac1604bd-fdd5-4e8a-99f5-7074c0c9a298 at 100% through native Wrangler versions deploy. Existing routes/custom domains untouched.
Read-only production verification PASS: 12 GET/HEAD canonical/www redirect checks, 11 page/API/crawler status checks, 24 content states and six live pricing-selector states across Thai/English at 1440/834/390 widths. Canonicals/descriptions/H1 and responsive overflow checks passed. Unknown URLs now return404. All five public tour records are byte-for-data equal to the pre-release JSON baseline.
Quote for20November2026 returns409 ONLINE_DATE_UNAVAILABLE, identical to pre-release; actual online booking success is not asserted. Production browser saw zero runtime errors and zero attempted business writes; 30 Cloudflare analytics beacons were blocked. Initial test classified those blocked analytics beacons as writes; after separating analytics from business mutations the rerun passed.
Existing content regression:23pages×fourviewports×twolanguages=184cases passed, plus locale/CMS/history/error fixtures.
GitHub commit and CI status are checked separately after publication; do not interpret local checks as CI success.
