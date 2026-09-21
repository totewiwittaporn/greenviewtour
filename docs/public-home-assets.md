# Public Home photo sources — 21 September 2026

The owner supplied three Drive folders and authorized photo selection, enhancement and use on the Public Home. Drive originals and folder organization were not changed. Only selected WebP derivatives are shipped; private Drive download URLs/credentials are not committed.

## Selected assets

| Website asset | Original | Source file | Processing |
| --- | --- | --- | --- |
| `frontend/public-web/public/images/home/surin-hero.webp` | `DJI_0402.JPG` (2022 collection), 8000×6000 | https://drive.google.com/file/d/1Aq4RIeDi_bciY-Aslkec0_7vjyE2GZ5v/view | Resized input for tool compatibility; imagegen photographic enhancement with instructions to retain scene/boat/coastline. WebP 1448×1086, quality85, 309226bytes. |
| `frontend/public-web/public/images/home/surin-story.webp` | `GOPR9408.jpg`, 4000×3000 | https://drive.google.com/file/d/13Avk9x0M-7xm-X6IZc1UYLWlENraHJz2/view | Imagegen restrained exposure/color treatment with instructions to retain swimmer/equipment/coral. WebP1200×900, quality83,335740bytes. |

Both derivatives were visually checked against source photographs. Generative retouching is not pixel-identical archival restoration; originals remain the source of record. No watermark removal was needed on the selected two photos. No synthetic destination photograph from the design mockups is used on Home. Browser crops use object-fit rather than modifying source composition; no EXIF is included in WebP output.

## Collection review

- Drone folder `1glgnu3xXhBiyAz8qp88IRmurHWl7hJWN`: 47 entries listed (44 JPEG,3 video). Suitable for boat/sea selections. Samples DJI_0351 and DJI_0402 inspected full-size.
- Organized folder `1Nwk3KxdEAyaGEC6s66f-jFxtTUJPwvOZ`: island2024, boats, park accommodation, tents and snorkel categories listed; island subcategories include atmosphere, freediving and Moken. Samples DSC_3817 and GOPR9408 inspected full-size. DSC_3817 has ARMIBLUE credit and was not selected for removal.
- Third resource-key folder titled “รูปของอาร์ม”: connector could not resolve it; the exact shared link opened successfully in the browser.15 filenames and beach/underwater/night thumbnails were visible. Retained as future content candidates; no files modified or used this round.

This is a Home selection, not an exhaustive full-resolution review of every file. Later Company/Surin article migration should preserve a source-to-destination content inventory. Confirm current trip/vessel/service details from Backoffice rather than treating archived photography as a current availability claim.

## Validation and handoff

- `npm run check`: lint,230 backend tests,26 frontend tests and all three builds passed.
- `node scripts/smoke-browser-fixtures.js`: all suites passed, including actual Home image decode, TH/EN320–1440px, company/map safety and retry/empty, ownership filtering, navigation/history and existing Member/Backoffice regressions.
- Strict UI audit: zero findings. In-app browser inspected actual local desktop/mobile Home and hamburger-to-Surin navigation against real API data.
- Current company has a saved Maps link but no coordinate pair; Home displays the real external map action and embeds only when valid coordinates are configured. No geocoding guess is persisted.
- Current local catalog exposes the existing labeled DEMO tour and no partner offers. No seed, publication status or production data was modified. Missing offers remain explicit empty states.
- New Home API is running locally. No hosted Preview deployment or Production deployment was performed this round.

## Original brand logo

The owner supplied `484293511_1146584594144725_4598489206089200479_n.jpg` and explicitly requested retaining the GREENVIEW TOUR lettering for consistency with Facebook. `frontend/public-web/public/images/brand/greenview-mark.png` is a 480×480 PNG resized from that original, retaining its white background, colors and lettering. Generated alternatives were not used. Shared Navbar/Footer reuse this asset without a duplicate wordmark.

Latest owner-supplied `codex-clipboard-c9617f78-5800-43f3-8334-693c397fc827.png` is copied unchanged to `images/brand/greenview-logo.png` for shared Public chrome. The prior white-background `greenview-mark.png` remains the Public favicon. No generative image processing was used for this replacement.
