# Public editorial content — 28 September 2026

Owner authorized preserving the Mac work in GitHub and continuing company/Surin content. Baseline work is retained in local checkpoint `144b434aa0f9edfecff7c5bcf2c20294ac104dbc`, branch `mint/checkpoint-2026-09-28`. This is a content phase on the approved Public design, not a new design or production release.

## Implemented scope

Five versioned editorial pages: `/about`, `/surin-islands`, `/surin-islands/travel-guide`, `/faq`, `/contact-us`. TH and EN copy follows the existing locale selector. FAQ has eight native disclosure answers, supports keyboard interaction and opens a directly linked question. Shared routing accepts trailing slashes and keeps the actual Navbar/Footer mounted. Home introduction anchors remain supported; navigation and Home now link to the full pages.

`core/publicRoutes.js` owns editorial paths/titles/descriptions. `features/content` owns structured text and the reusable article surface. Paragraphs render as text, never untrusted HTML. CompanyLocation was extracted intact from Home into `features/company` and reused for contact information; no second contact reader, hardcoded old contacts or business writes were introduced. Original logo, approved island/coral photographs and existing Public tokens remain unchanged. Metadata is applied in the browser for these routes.

## Sources and boundaries

- Company positioning and pier background: https://greenviewtour.com/ (retrievable indexed HTML; crawl shown as three months old).
- Geographic/nature background only: Tourism Authority of Thailand, 9 January 2020, https://www.tourismthailand.org/Articles/mu-koh-surin-the-tropical-paradise-in-andaman . The article is not a current operating notice. Its source/date is visible on the Surin page.
- Existing FAQ/contact route evidence: https://greenviewtour.com/faq/ and https://greenviewtour.com/contact-us/ . Their old copy/contact details are not adopted as current.
- Existing Surin article inventory: https://greenviewtour.com/category/อุทยานหมู่เกาะสุรินทร์/ (retrievable indexed category page, not a fresh complete crawl).
- Current request/whole-group/return rules: `booking-capacity-flow.md` and actual request/capacity implementation in this checkpoint. Editorial copy never confirms availability, initiates payment or creates a Booking.
- Photographs and owner consent: `public-home-assets.md`. No new photography, people, invented reviews, staff profiles, company history, certificates or service guarantees.

GSC Wizard returned `payment_required`; no search-performance data was read. Direct read-only requests to robots.txt, sitemap_index.xml, wp-sitemap.xml and WordPress page/post REST endpoints returned HTTP 500. Indexed HTML remains usable for a preliminary inventory, but not proof of a complete current URL list. No content removal or redirect decision is based on assumed traffic.

## Preliminary inventory — not an active redirect map

| Existing subject | Disposition |
| --- | --- |
| Company/pier introduction | New `/about`; retain live company-owned contact/map reader. |
| FAQ and contact | Same legacy path stems, fresh bilingual copy, no stale copied contact values. |
| เกาะสุรินทร์ / อุทยานแห่งชาติหมู่เกาะสุรินทร์ | New overview at `/surin-islands`; original article URLs/content still await full migration review. |
| วิธีเดินทางไปเกาะสุรินทร์ | New preparation guide; old article transport details/times not copied. |
| เที่ยววันเดียวคุ้มไหม / รีวิวแพ็คเกจทัวร์เกาะสุรินทร์ | Retain as review candidates; factual comparisons need actual published programme inclusions and prices. |
| จุดดำน้ำสวยๆ ที่ห้ามพลาด / หาดไม้งาม | Keep for dedicated article research and current access review; not migrated by the overview. |
| หมู่บ้านมอแกน / หมู่บ้านมอแกนและวัฒนธรรมชาวเล | Review overlap, respectful language and photo consent before consolidation. |
| เที่ยวเกาะสุรินทร์ อย่างยั่งยืน / เต่ากระ / บ่าง | Retain relevant topics for authoritative fact checking; do not promise sightings. |
| ที่พักอุทยานแห่งชาติหมู่เกาะสุรินทร์บนฝั่ง | Distinguish mainland accommodation from island stays; verify current facilities before publication. |
| Generic province-wide restaurants/hotels/attractions | Outside this phase's company/Surin scope; no deletion/redirect action taken. |
| Theme demo staff/testimonials/destination links | Excluded from new content; not treated as genuine Greenview people/reviews. |

## Validation and release limits

`npm run check` passed after implementation: 371 backend tests, 45 frontend tests, lint and all three builds. `scripts/smoke-public-content.js` passed all five pages in TH/EN at 1440, 834, 390 and 320 px: title/description/single h1, decoded photographs, no page overflow/overlay, persistent shell, FAQ keyboard/hash/locale state, safe contact empty/error/retry and mobile menu. One deliberate HTTP 503 was expected; no unexplained runtime errors or business writes. Browser plugin not available in this session; validation uses the existing Playwright Chromium installation. Desktop About and mobile Surin screenshots were visually inspected. Private screenshots/logs are outside Git in Downloads/Greenview-GitHub-Public-20260928.

The existing Public navigation regression now reaches Home anchors through genuine article links, retaining its original focus, viewport and shell assertions. The full aggregate browser suite includes the new content checks; see final handoff status before assuming a complete run.

These are versioned source-authored pages, not editable Backoffice CMS articles. Existing single-language TourProgram/Promotion fields are untouched. No locale-specific URLs/hreflang, HTML prerendering, sitemap, HTTP status policy or old-article redirects are claimed. Full legacy inventory/GSC review and an explicit hosting/SEO release plan are still required before replacing WordPress. No customer form, newsletter, payment provider or live availability guarantee was invented.

Only local development services were started. No migration, seed, business record, permission, outbound message, payment, hosted Preview or Production change belongs to this phase. Terminal Git push remains unauthenticated; GitHub Desktop requires the owner's Publish branch action because UI assistive access is unavailable. No credential values were accessed or stored. A local commit is not evidence of GitHub publication.

## Final verification

The complete `node scripts/smoke-browser-fixtures.js` run passed after all application changes (exit 0), including existing Backoffice/Member regressions and the new Public content suite. A separate actual read through Local Public `/api/public/company` returned HTTP 200 with Greenview Tour and configured phone/email/map; no values were written. Local Public/Backoffice/Member/API are running through the existing launcher. Safari, physical phones and hosted deployments were not tested. Review was a self-review of the source/diff and rendered evidence, not an independent agent review.
