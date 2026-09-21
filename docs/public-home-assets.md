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

Owner requested removing the underwater swimmer photograph because permission from the person is uncertain. The Surin section now reuses the approved distant sea/island photograph; `surin-story.webp` is removed from shipped assets. Its source entry above is historical provenance, not an active website selection. A separate underwater scene without people can replace the interim landscape in a later selection.

## Approved replacement: NIC_8148.jpg

Owner selected the above/below-water coral photo from https://drive.google.com/file/d/1TV4H0SK5f6DQeGT1_LdtTlolyBwEbVgp/view. Original visually inspected: no people visible. Shipped as `images/home/surin-coral.webp`, resized to1400px wide and encoded WebP quality86 without generative alteration. It replaces the interim repeated landscape in the Surin introduction.

Google Maps source: owner saved https://maps.app.goo.gl/1ErL2zJHXys3hdPX6 resolves to Greenview Tour pier at9.2246226,98.3729295. Share/Embed output was read from Google Maps with a zoomed-out viewport (center9.2243647,98.0631732) to preserve real coastline/island proportions. No hand-drawn geographic outline remains. The provider owns map labels, tiles and attribution.

## Replacement palm artwork (owner correction)

`images/decoration/palm-frond.webp` replaces the rejected hand-drawn SVG leaflets in the shared Botanical component used by Home and Tour Programs. Created with built-in ImageGen, saved with transparent alpha and resized to640px WebP quality86. It is decorative botanical artwork, not destination photography. Original generated PNG remains outside the repository.

Prompt: "Production website decorative botanical asset, not a webpage mockup. One elegant natural coconut palm frond on a genuinely transparent background, isolated clean alpha cutout. Fine curved central rachis from upper left down toward lower right; many long narrow pointed leaflets sweep gracefully in flowing parallel curves, natural irregular lengths and spacing. Muted sage gray-green ink, subtle watercolor texture, full uncropped tips. No broad oval leaves, fern, stiff fish skeleton, crossed branches, text, frame or shadows."

Core Botanical owns this single asset. Page styles position it at quiet corners at reduced opacity; never behind functional controls. Original logo unchanged.
