---
version: alpha
colors:
  primary: '#087f8c'
  ink: '#113d48'
  text: '#153840'
  muted: '#61787e'
  canvas: '#f5f9f9'
  surface: '#ffffff'
  border: '#dce8e9'
typography:
  heading:
    fontFamily: 'Manrope, sans-serif'
  body:
    fontFamily: 'Inter, Segoe UI, sans-serif'
  thai:
    fontFamily: 'Noto Sans Thai, sans-serif'
rounded:
  panel: '14px'
  control: '8px'
spacing:
  page: '42px'
  compact: '16px'
---
# Greenview Tour

## Overview

Reference: owner-provided https://greenviewtour.com/ inspected 2026-09-08. Preserve the real Greenview logo, island photography, sea-green/cyan family and travel typography. Public is a Thai travel homepage; Backoffice is an English company workspace. The public signature is a broad island photograph with Thai headline and restrained handwritten travel accent. Backoffice uses the same brand family with quiet, compact data panels. No borrowed template testimonials, invented staff, prices or review scores.

## Colors

The frontend applications own independent `src/core/ui/styles.css` files. Backoffice tokens implement the frontmatter values. Public tokens independently adapt the same brand (#087f8c), deep ink (#113d48), white and pale sea surfaces. Do not import UI or styles across applications. Runtime CSS is the token source for application-specific extensions. Theme is light only for this first preview.

## Typography

Manrope headings, Inter Backoffice body, Noto Sans Thai Public body, Montez for the Public hero accent only. Use system fallbacks when Google Fonts is unavailable. Backoffice body controls are 11–13px, heading 32px; public Thai hero uses 40–66px and normal text 12–15px. No all-caps Thai. Body text wraps naturally; account UUIDs use secondary text.

## Layout

Public: full-width hero, three tour cards, island story and contact section; mobile stacks sections. Backoffice: 244px desktop navigation, 76px header, 42px content padding; below 760px use an inline expandable navigation area and 16px content padding. The navigation is not a modal. Page scrolling remains natural. Only wide tables scroll horizontally.

## Elevation & Depth

Use borders and pale surfaces for admin hierarchy. Avoid heavy shadows and decorative charts. Hero shading is for text contrast, not a dashboard motif.

## Shapes

Backoffice panels 14px, controls 8px. Public cards 16px with one asymmetric island-story image radius. Icons use a consistent stroke, never emoji for admin actions.

## Components

Backoffice canonical owners: Shell, Button, SearchField, DataTable and Icon under its core/ui. Feature code owns data fetching and domain-specific empty/error copy. No screen-local substitutes for recurring controls. Global scrollbars are tokenized, focus rings visible, reduced motion respected. Planned navigation is visibly inactive. No nonfunctional create/edit controls.

## Do's and Don'ts

Show real Preview data, including zero accounts. Authenticated identity comes from the backend. Never infer roles from email verification or user metadata. The application remains a local development environment.

Authentication extends the existing sea palette: one island-photo panel anchors the team identity, while a quiet form panel owns the task. On narrow screens the photograph becomes a compact masthead. AuthLayout and FormField join the canonical UI owners; they reuse the existing runtime color, typography and focus tokens. No separate login theme or copied form-control implementations.

Action menu items declare a semantic icon key rendered by Core Dropdown through Core Icon, alongside their visible English label. Icons use a fixed 18px slot and inherit item color, including destructive states.

User Info and row Actions use the shared anchored Dropdown, with a compact white surface, quiet divider and sea-green focus. View, Edit and invitation forms use the shared 520px Dialog with a header X and natural scrolling. Keep account summary in a definition list, profile fields in FormField, and row Actions as a three-dot trigger. These additions reuse Backoffice runtime tokens; no account-specific color theme is introduced.

Modal text fields and SelectField triggers use a compact 36px height and 12px control type. Auth screens keep 44px fields. Menu/listbox rows are clear by default; pointer hover or keyboard navigation adds the sea-tint background without an item outline. SelectField wraps Radix Select and shares the Dropdown surface/option tokens, with a same-width popup inside the owning dialog layer.

## Employee profile and directory tabs

The personal Edit profile destination is `/profile`, a full page accessible to every active employee through User Info. Use a compact identity summary beside personal/contact and password sections; stack on narrow screens. Account identity, department, roles and status are read-only here. Optional fields: address, primary phone, emergency phone, Line ID. Do not add personal social networks. Save profile details independently of password changes. Preserve entries on errors and warn before leaving unsaved changes. Current password is required for self-service changes; success clears local sessions and asks the user to sign in again.

User management uses Users and Invitations tabs above the page heading. Each tab owns its complete dataset, controls and summary; only authorized inviters see Invitations. Keep directory search and pagination when switching tabs. The search wrapper owns a single aligned focus border and subtle ring. Phone links use `tel:` and are labeled separately for primary and emergency numbers.

Tab datasets use the same summary, toolbar, table viewport and footer rhythm. Inactive panels remain in one CSS grid area solely to reserve height; `inert`, visibility and aria-hidden remove interaction and accessibility exposure. Keep the page scrollbar gutter stable. A short opacity/vertical transition and sliding tab indicator are disabled for reduced motion. Tables scroll internally within a shared responsive viewport, preventing a long invitation list from resizing the entire page.

The root scrollbar gutter owns width reservation. Radix body scroll locks must not add a second right margin when stable gutters are supported. Verify with visible classic scrollbars, since headless defaults hide them. Invitation activation errors distinguish local throttling, provider throttling, email quotas, recipient configuration and password policy; 429 pauses manual resubmission while preserving entries. No automatic retries.

## Tour settings

Company master-data pages extend the existing sea-green Backoffice, with the same page heading, bordered table, 36px dialog controls and three-dot actions. Search and status sit in a wrapping toolbar. Supplier and ownership fields appear only when relevant. All reference lookups use shared ReferenceField with an authored SelectField and explicit paged results. Natural document scrolling and the existing dialog scroll owner remain unchanged. Prices show THB and distinguish missing values from zero.

## Structured addresses and persistent navigation

Owner refinement 2026-09-08: Company is one full-page editing form, not a list of companies. Arrange its identity/contact fields in two columns and its address hierarchy in three columns, stacking on narrow screens. AddressFields owns province → district → subdistrict → house number → Moo → optional village, followed by a map-location section. Reuse the same fields in partner, pickup and employee forms. Muted placeholder examples are owned by Core fieldGuidance/FormField/TextAreaField; labels remain visible. Existing address strings remain available as Previous address, never guessed into administrative areas.

Core NavigationProvider keeps Shell and the authenticated profile mounted during internal page changes. Content routes change independently; unsaved link/back/forward transitions use the same app-owned discard decision. Normal external links and modified-click new tabs retain browser behavior. No font/color theme changes.

## Company quick-address refinement

Owner clarification 2026-09-08: Company uses the shared AddressFields quick variant: a compact address summary and Quick address button. AddressPicker opens the canonical Dialog, uses SelectField with dependent province/district/subdistrict options from a pinned, licensed local dataset, then enables optional house details. Changing a parent clears its child selections. Draft changes apply to the owning form only through Use this address; dirty dismissal requires a discard choice. Existing unrecognized text is retained until the user explicitly replaces it. New/changed company address hierarchies are checked server-side. Other forms can adopt this variant during their individual reviews.

MapLocationField is the shared link-only editor. Coordinate inputs are removed; existing coordinate values remain preserved in storage. FormattedField and contracts/contact.js own Company Tax ID and Phone presentation/normalization: format on blur, retain original digits and optional country prefix, allow empty values, validate on client and server. Admin Manager retains its existing full company-management access; other access is Manager only.

## Address entry clarification

Owner clarification 2026-09-08: Keep the individual editable address fields on Company. Quick address is an optional helper, not a replacement summary. Save address applies the modal draft back to the named page fields; Save company details persists it. Postal code follows the subdistrict and is read-only, automatically derived from the complete province/district/subdistrict match for both manual and quick entry. Unknown/partial matches clear the derived code instead of retaining a stale one. Core and server use the same pinned postal dataset. Postal code is stored as an optional five-character field across the existing address models; no existing data is bulk-rewritten.

## English-first bilingual entry

Owner refinement 2026-09-08: Backoffice headings remain English. Address choices show English · Thai and search both languages, ignoring spaces/hyphens; Phang-Nga is the display/canonical English alias for province 82. Recognized new area selections store English names, while free-text names and house details retain the language entered. Existing Thai areas remain recognized without bulk migration. Shared GeographyFields now supplies dependent dropdowns on the page and in Quick address, including employee/partner/pickup consumers of AddressFields. No unrestricted area text is newly entered.

SearchableSelectField is the canonical searchable variant, built on pinned Base UI Combobox 1.8.0 (input-inside-popup pattern). It reuses Core dropdown/control tokens; ordinary small selects retain Radix Select. Search supports English/Thai, clear, no matches, keyboard/IME and dialog portal focus. Parent selection clears child fields. The existing postal-code derivation still matches Thai or English names and handles known Moo exceptions.

Core Company phone entry converts complete local Thai numbers to +66 on blur and the server repeats that normalization. Display uses +66-81-234-5678 (mobile), with landline groupings supported. Supplied international prefixes remain unchanged; no country is inferred for non-Thai-shaped numbers. Tax ID preserves its existing grouping and leading zeros.

## Stacked modal scrolling

Owner refinement 2026-09-08: Core Dialog locks document scrolling until the final modal closes. Native top-layer modal semantics isolate background interaction; the Core stack enables only the frontmost dialog content scroller. Covered dialogs retain their scroll position and stable gutter. The header remains outside the content scroller. Dialog roots portal to body so nested dialogs remain independent. SearchableSelectField uses fixed positioning within its owning dialog portal, outside the scrolling body, with bounded option scrolling and no scroll chaining. Compact modal address sections and action groups use token-colored dividers with 12px spacing. Page form spacing remains owned by its existing layout.

Owner correction 2026-09-08: Section dividers also apply to page content. Shared address-section fieldsets separate Address and Map location with the Core border token and 12px margins. Company save actions use the same divider rhythm as modal actions. The address helper row uses compact spacing.

## Dataset Core and settings tabs

Owner approval 2026-09-08: Users is the visual reference for all dataset surfaces. DataTable owns semantic table markup, column headings, loading/error/empty states and an internally bounded scroll region. Pagination owns result ranges, page size, current/total pages and Previous/Next states. Unknown totals render a dash/status rather than zero. SummaryCards owns four cards: four columns on desktop, two columns at 1100px and below, including portrait tablet/mobile. Counts represent the complete authorized dataset before list filters. Keep Company a natural-height form with its existing dividers.

Core Tabs owns tablist keyboard semantics and the measured sliding indicator for any number of tabs. Core TabPanel owns active/inactive visibility, inert and aria-hidden semantics, content entrance animation and reduced-motion behavior. Users and all three settings groups must compose these same components; feature CSS only controls layout. TabPanel preserveLayout reserves inactive Users panel geometry; route-backed settings hide inactive panels. Arrow/Home/End explores labels; Enter/Space activates. Settings retain their existing deep-link routes and group into Company & Tours (Company, Tour programs), Partners & Sales (Business partners, Agent prices, Sales channels), and Transport & Pickup (Hotels & pickup points, Vehicles & boats). Each active dataset has one table. Internal tab navigation remembers filters/page in memory, respects unsaved-change guards and keeps the workspace mounted. Browser back/forward and direct links restore route parameters. Tables own bounded height; the surrounding tab and Company form never inherit a forced table height.

Tab motion correction: Tabs owns a measured sliding indicator for any tab label width or wrapped row. Users and all three settings groups share the 180ms content fade/5px slide; the indicator takes 200ms. Reduced motion disables both. Settings preserve native page/form height and existing dirty-navigation guards.

## Tour operations composition

Owner approval 2026-09-09: Services, Assets & Equipment, and Bookings & Trips extend the existing sea-green dataset system. Each route-backed tab has one primary dataset and reuses Core Tabs/TabPanel motion, summaries, tables, pagination and three-dot icon Actions. CatalogPage remains the canonical metadata-driven editor for both Settings and operational master data; API ownership follows the entity contract. No new visual theme or screen-local control geometry.

Services are separately sellable resources; programs compose services, reusable equipment and consumables. Equipment and consumables use distinct workflows: reusable returns record condition, while consumable use records consumption/waste. Units are explicit and conversions use each resource's configured bottle pack/case count. Dated services and trips use typed Thailand-time fields. Booking line editing is a domain-specific form using shared fields and preserves package selection rules and snapshot prices.

Core Dialog's table variant uses a 960px maximum width for multi-column preparation reports, with the existing mobile margins, focus/scroll ownership and responsive table overflow. Form dialogs retain their established width.

Navigation refinement 2026-09-09: shared Core workspace route metadata separates reusable Settings from daily work and covers every implemented workspace route in the same-document navigation provider. Booking, Guide operations, Driver operations and Stock operations precede Settings. Existing sea-green Shell, shared tab motion, table geometry and form controls remain canonical; no screen-local navigation handler is introduced.

Core Dropdown uses its owning Dialog as its portal host when opened from modal content, matching SelectField. It retains viewport anchoring, shared surface tokens and menu geometry; modal top-layer ownership is behavioral and does not introduce a new visual variant.

## Operational documents

JobSheets.jsx owns the shared Greenview document masthead and print tables for boat, transfer and Booking copies. The supplied May 2026 Job Order is the reference for ruled A4 landscape tables, a distinct direction band and passenger totals. Screen cards retain existing sea-green tokens; printed sheets use black borders and a pale green total band for economical printing. The date/run and revision repeat on continuation pages. Existing field permissions take precedence over the sample's payment/hotel columns. Each dispatch run has its own independent direction and actual counts; do not derive return passengers from the outbound list. Booking handoff exposes incomplete allocations per direction. No new Core control variant is introduced.


Owner refinement 2026-09-09: Boat print copies collect all authorized runs for the same vessel and Thailand service day, with independent outbound and return sections in one continuous table. The masthead has exactly two cells: vessel and four crew roles on the left, document reference and date on the right. Crew differences identify direction/time. The date/vessel document reference is derived, while source run codes and revisions remain visible. JobSheets.jsx/dispatch.css own the compact print variant; target 15 outbound + 5 return groups on one A4 landscape page at 8.5pt with normal-length notes. Long content wraps and continues to additional pages, never clips or silently drops groups. Management actions remain scoped to individual runs.


Owner refinement: vessel-day documents include per-program adult/child/passenger summaries for each direction, followed by a total of all programs. Group by snapshotted program ID, never infer the return list or count the same customer's two journeys as unique customers. Crew counts are separate from customer totals; four roster roles support multiple assistant captains/guides (typical 1 captain, 2 assistant captains, 1 guide, 1–2 assistant guides). Existing per-person crew selection remains canonical.

## Approved daily job-order family — 9 September 2026

Owner approved the latest sage document mockups. DocumentCore owns the exact database-backed PNG masthead and print readiness; JobSheets/DailyJobSheets own the business projections; dispatch.css owns document tokens: heading #29483e, column header #eaf0ec, section #dfe9e2, rule #b8c7be. Body remains white/charcoal. Keep source logo colors unmodified. Print A4 landscape with repeating table headings and natural continuation, never clip rows. Narrow screens scroll the paper preview inside Core Dialog.

Boat: same vessel/service day with independent ขาไป / ขากลับ sections. Vehicle: same vehicle/service day with รับ / ส่ง sections; no return time column. Daily Booking: all confirmed/completed bookings whose trip overlaps the Thailand service day, once per booking, regardless of list pagination/search. Include stored-price service-day collection only for COUNTER. Missing prices remain explicit, zero is valid. Summaries separate program and payment terms. Existing single-booking View remains a detail view, not the daily printable job order. No payment ledger or deposit allocation is inferred.

## Booking-led allocation workspace

Owner refinement 2026-09-10: Booking remains standalone intake. Operations has Driver, Boat and Stock children; reusable settings stay under Settings. Separate Inventory contains balances and immutable movement history, while schedules contain dated trip/run availability. Dispatch uses a vehicle/run selector beside booking candidates and assigned passengers; the existing sea-green token family and Core tables, search, pagination and three-dot actions remain canonical. Capacity progress represents actual planned passengers, never decoration. At narrow widths the selector stacks above the allocation content. Core DateField uses native date semantics and browser/OS calendar presentation; ISO values remain unchanged and filter controls share 38px height via Core styles.

## Company navigation and access editor · 2026-09-13

Retain the sea-green identity and existing Core typography, fields, dialog and table geometry. WorkspaceNavigation groups existing destinations by work category. UserAccess uses Core address-section fieldsets and a responsive checkbox grid (one column on narrow dialogs) for multiple duties. Each operational permission has the shared authored SelectField and an effective-access explanation; optional validity fields wrap below it. Review replaces editing within the same dialog. No new design tokens, theme or future-page placeholders are introduced.

## Company workflow forms · 2026-09-13

CompanyWorkPage and PersonnelFinancePage retain the existing Core dialog, fields, paged references, filterbar and DataTable owners. Approval review includes resolved employee, supplier, warehouse and item names before mutation. Summary cards explicitly identify page-only totals. Payroll is manually entered base plus itemized earnings less deductions with reasons; approval and payment recording are separate states. No new visual tokens or theme are introduced.


## Equipment returns · 15 September 2026

Owner decision: remove separate equipment-washing reporting. Ordinary intact equipment returns use RETURN_READY in one transaction. Damaged returns and loss remain explicit; consumables retain consumption. BoatStockPage, StockPage and CompanyWorkPage reuse the existing shared SelectField. New transactions cannot create CLEANING stock. Historical movements remain immutable; existing CLEANING balances can be reviewed and moved to READY or DAMAGED using the existing condition action, without a recurring washing task. Housekeeping zone jobs remain separate.


## Per-booking Agent price review · 15 September 2026

Owner authorized continuing the proposed independent Manager review workflow. BookingPriceReview reuses Dialog/FormField/TextAreaField/Button, loads the current Booking revision, and shows standard/proposed rates, total, services and request/review reasons. Only another Manager reviews pending requests. Pending/rejected requests block confirmation. Draft saves restore standard rates and clear the request; explicit UI guidance explains re-requesting. Shared backend booking-price owns actions and confirmation checks; immutable audit entries retain history. Commands are actor-bound, revision-checked and idempotent, and replay rechecks current authority. Confirmed bookings are read-only for negotiated rates. Unit coverage: backend/test/booking-price.test.js and booking-flow.test.js. Browser coverage is recorded in docs/validation/agent-price-review.md.

### Internal finance and company document evidence

Receivables reuse the company navigation, DataTable, Pagination, Dialog, FormField and DateField owners. `EvidenceAttachments` is the shared document list/upload workflow for Booking, finance records, internal statements and individual received payments. Company-issued receipts/tax invoices remain external artifacts. Internal statements are labeled explicitly; uploads never imply payment. Amounts are THB with two decimals. Attachments use file-picker selection with visible type/size limits and retained entries on failure; download-only original files, with parent authorization on each access.


## Table density and responsive dialogs · 15 September 2026

Owner requested UI review before further manual authoring. Shared DataTable distributes column widths, reserves compact Actions columns and limits descriptive text/header previews to two lines. Full text remains in the DOM and a title; evidence also offers a keyboard-accessible details dialog. Interactive controls must never be clipped by text truncation, including minified production builds.

Evidence download labels use at most eight Thai-safe grapheme clusters plus ellipsis; accessible names, details and downloaded filenames retain the original. Statement/payment/evidence row actions use the shared ellipsis dropdown. Shared spacing stays compact but separated (8px action gap, 12–14px table padding). Table dialogs may expand to 1040px within viewport gutters, superseding the narrow form-dialog width for table content. Phone dialogs use 8–12px gutters and readable fields; wide tables scroll inside the dialog only when the columns genuinely require more width. User manual revisions and final manual screenshots wait for owner UI approval.

Owner refinement: table body text, including Users names and roles, uses normal weight (400). Safari and Chrome are the primary browser verification targets.


## Document photos and billing signatures · 15 September 2026

Owner decision: system-only signatures for both company presenter and Agent recipient. Each signer reviews the bill on the staff device, enters their name and draws in a wide 1000:260 pad. Company signs first; Agent receipt is a separate state from payment. Native pointer input plus keyboard drawing, clear, explicit acknowledgement, pending lock and unsaved-discard protection use existing Core dialog/form/button owners. Authorised finance staff record the in-person signature; this is not an independently authenticated Agent login. Immutable private audit events retain strokes, server time, recorder, signed document snapshot and hash; retries use the existing actor-bound command ledger and transaction lock. Bill versions protect concurrent actions. Void history retains signatures; a new bill requires new signatures.

EvidenceAttachments remains the shared owner for Booking/finance/bill/payment documents. Booking already exposes Supporting documents under row actions. Added Agent ticket and Agent booking confirmation categories. Existing permissions remain unchanged. File selection supports a phone camera capture hint and normal device files; desktop camera capture is not promised. Photos are locally re-encoded without EXIF, limited to 2400px longest side, with a JPEG quality floor of 0.72; flat PNG documents use lossless encoding if smaller. This bounds compression to preserve readability rather than claiming an absolute minimum. Preview and before/after size are shown before attachment; PDFs remain unchanged. Uploads are at most 5 MB; input photos at most 25 MB. Original full-resolution photos are not uploaded or duplicated. Browser decoding failures retain an actionable JPEG conversion message. SVG signature strokes avoid storing large photo bitmaps.

Safari and Chrome are primary browser targets. Actual phone camera hardware remains a separate device verification step; desktop checks cannot prove iPhone camera behavior.

Document viewing refinement: every shared evidence list offers View document ↗ in the ellipsis menu, separately from metadata details and download. DocumentViewer fetches bytes with current parent authorization, validates PDF/JPEG/PNG type and magic bytes, uses a short-lived object URL and revokes it on close; no external viewer or public URL. Images support fit/zoom and PDFs use the browser's built-in viewer. Owner revised viewing to a separate browser tab at /documents/:id. Shared Dropdown uses a native target=_blank link with noreferrer. The standalone reader keeps the original workspace unchanged, displays the server-provided filename, and owns its loading/error/retry and image zoom states. View does not trigger a file download. Close the browser tab to return; no public link or third-party viewer is created.


## Core consistency audit and native PDF · 15 September 2026

Owner screenshots identified a Refresh without its icon, a status filter against the panel edge, and a three-dot action label wrapping onto two lines. These screens already used Core but lacked a consistent presentation contract. RefreshButton is now the canonical refresh owner for eleven feature consumers. Dropdown rowActions renders the Core more SVG (36px desktop/40px touch) instead of font-dependent text; seventeen action triggers migrated. Panel-first filterbars reserve 20px top padding (16px mobile). Existing SelectField remains the status-filter owner. Dispatch run selection uses Button with its business class; invitation-link output uses TextAreaField. Native semantic print tables remain owned by the document layouts; standard checkboxes retain native semantics.

PDF View now links directly to the authenticated evidence endpoint with view=inline, opening the browser's native reader in a new tab with the original filename. Authorization is unchanged and rechecked; only PDFs receive inline disposition, with no-store and nosniff. Downloads retain attachment disposition. The /documents/:id image reader remains; legacy PDF reader URLs redirect to the native endpoint. No custom PDF heading, iframe, or duplicated PDF controls are needed in the final native flow.

## Member commerce — September 2026

The member portal is a separate Thai customer surface. It uses the existing sea palette, Noto Sans Thai at a 16px body baseline, 44px controls, 14px panels, a 1120px content width, and a one-column layout below 760px. Runtime ownership is `frontend/member/src/core/styles.css`; shared member controls belong to `src/core/ui.jsx` and leave protection to `src/core/LeaveGuard.jsx`. No UI imports cross application boundaries. Member headers use medium weight; long catalog descriptions truncate only on listing cards with a detail link.

Public master-data catalog and promotion pages extend the existing Public card family. The homepage now reads published tour records rather than maintaining separate tour offers. Backoffice commerce, popup and independent guide forms reuse existing Core owners and density. Independent guide assignments appear beside Boat assignments; they do not require a fictitious vehicle.

## Member and staff authentication refinement · 15 September 2026
Owner request: member authentication adopts the existing island-photo/form composition; staff AuthLayout becomes a quiet centered card. This supersedes the earlier team photo-panel direction. Member core/AuthLayout owns the customer composition, core/ui owns password toggles and buttons; no cross-app UI imports. Anonymous member navigation contains only Tours and Sign in, with a separate public-home link in the footer. Personal trips/profile appear only for a signed-in customer. Authentication and role provisioning behavior remain owned by the existing APIs.

## Public login entry points
Owner prefers separate entry points: customer sign-in is the visible header action; staff access is a quiet, readable footer link, never a role picker. Public Core SiteNavigation owns the shared header/footer across home, catalog and promotions. Local links target member 5175 and staff 5174. Deployed staff destination requires VITE_STAFF_LOGIN_URL; no unapproved staff subdomain is invented. Placement does not replace server authorization. Customer sign-in stays visible on mobile.

## Local demo checkout
Member DemoCheckout composes Core Button/Notice in the existing quote panel. Only the server-allowlisted retained tour exposes the simulator. Copy explicitly says no money, no scannable QR, and LINE preview only. Success shows the created DEMO Booking and persisted customer-scoped message. Backoffice Review repeats the simulation label. No new visual theme or role-switch UI.

## Service check-in

Customer check-in is a distinct Tour Operations destination. Reuse Core DateField, FormField, SummaryCards, DataTable, Dropdown, Dialog, SelectField, Button and Pagination with the existing sea palette and normal table weight. The primary task is confirming arrivals, not editing the Booking. A no-show review uses the Core table dialog to show old/new passenger allocations before confirmation. Check-in is separate from next-day dispatch snapshots.

## Reference lookup spacing · 20 September 2026

Core ReferenceField uses the Backoffice stylesheet as its single spacing owner: an 8px grid gap separates search, labeled selection and paging/retry controls; its outer 20px separation remains. This applies in pages and all Dialog consumers, including Booking, dispatch, stock, company work, finance, guide assignments and catalog forms. Existing field label/control spacing and responsive control heights remain unchanged.

## Role-aware Dashboard · 21 September 2026

Dashboard is the authenticated landing workspace. Keep the Backoffice sea-green tokens, typography and natural document scrolling. Its signature is a 14-day arrival calendar (seven columns on desktop, four on tablet, two on phone) with semantic day buttons and the existing Core summary Dialog. Reusable attention widgets link to domain work rather than duplicate editors. Core Shell/Navigation, Button, RefreshButton and DataTable retain ownership; feature CSS controls only calendar/widget layout. See docs/dashboard.md for count definitions and access boundaries.

## Approved navigation and compact tables (2026-09-21)

Owner-approved preview: Public places the TH/EN dropdown followed by Login / Register in the shared top bar, leaving the primary navigation on one row at wide widths. Member keeps Tours, My trips and Profile separate from User Info. Authenticated Member and Backoffice User Info own language selection and sign out; unauthenticated screens retain a language dropdown. Mobile primary navigation uses a hamburger; dropdowns remain bounded by the viewport and support keyboard dismissal. Thai labels continue pairing Thai / English.

Backoffice Core table tokens use 12px data, 11px column headings and 8px vertical / 10px horizontal cell padding across page and dialog tables. Row action buttons are 28px on desktop with 16px icons; touch/narrow screens retain 40px targets. Existing table overflow and dialog scroll ownership are preserved.

## Contact details and public Thai copy (2026-09-21)

Owner-approved User Info shows self-editable contact details: employee display name, primary/alternate phone, LINE ID and structured address with a validated saved map link; Member shows name, phone and LINE ID. Locked account email, status and access details are omitted from these summaries. Edit profile remains the existing full-page form. Menus are viewport-bounded with internal scrolling and visible keyboard navigation. Language radio rows share the Core menu item geometry.

Public Thai mode now uses Thai-only owned headings/navigation/actions; English mode uses English. Brand names, TH/EN codes and authored CMS content remain unchanged. Member and Backoffice retain paired Thai/English labels. Customer LINE ID is an optional contact field (100 characters), editable only through the authenticated self-profile with the existing version check.

## Member typography and nicknames (2026-09-21)

Owner-approved Member Profile comparison sets main headings to 26px desktop / 24px mobile, section headings 20px / 18px, labels and content buttons 14px. Form values stay 16px with controls at least 44px tall. Content spacing is slightly tighter; User Info keeps its established type geometry.

Employee and customer self-profile forms expose optional Nickname (50 characters). The User Info identity/trigger prefers a trimmed nickname, falling back to the existing full display name. Full names remain in the detail summary and are never overwritten by a nickname. Clearing a nickname restores that fallback. Nicknames do not influence access or account linking.
