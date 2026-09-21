# UI contract

Business sources: docs/architecture.md, docs/identity-access.md, docs/local-development.md. Current owner authorization adds local Login, invitation Register, password recovery and database-backed role checks; hosted deployment remains out of scope.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Navigation | frontend/backoffice/src/core/ui/Shell.jsx | DESIGN.md | desktop / inline mobile navigation | desktop + narrow browser |
| Button | frontend/backoffice/src/core/ui/Button.jsx | DESIGN.md | normal / busy / disabled | browser refresh/paging |
| Search | frontend/backoffice/src/core/ui/SearchField.jsx | this contract | email | clear, debounce, IME, stale cancellation |
| Table | frontend/backoffice/src/core/ui/DataTable.jsx | this contract | read-only | loading, error, empty, populated, overflow |
| Scrollbar | frontend/backoffice/src/core/ui/styles.css | DESIGN.md | document / table region | computed style |
| Forms | frontend/backoffice/src/core/ui/FormField.jsx | docs/authentication.md | email / password / invitation | validation, focus, show/hide |
| Auth layout | frontend/backoffice/src/core/ui/AuthLayout.jsx | DESIGN.md | login / register / recovery | desktop + narrow browser |
| Public baseline | frontend/public-web/src/core/ui/styles.css | DESIGN.md | Thai homepage | desktop + narrow browser |

## Users behavior

Read accounts from auth.users through Backend. Display only email, UUID, creation/sign-in timestamps and email verification; no password fields or user metadata. No business roles are inferred from email verification. Counts and timestamps come from DB-backed responses. Show honest empty states rather than fake rows.

Search debounces 300ms after composition ends. Clear immediately resets search/page and returns focus. Abort superseded requests and timeout after 15 seconds. Refresh retains committed filters. Email search is transient component state rather than URL/history because it may contain personal data. Page size is fixed at 25, bounded server-side; empty/out-of-range pages clamp to valid bounds. Previous/Next are disabled at boundaries and while loading. Retry is available after failure. Dates display en-GB with Asia/Bangkok timezone.

## Authentication and current scope

Business authority: docs/authentication.md and docs/identity-access.md. AuthLayout, FormField and Button under core/ui own all auth screens; core/auth/api.js owns JSON requests and session-expiry handling. AuthPage owns flow copy and validation. Inputs are labeled, errors are linked and focus the first invalid field; sensitive values are masked with explicit show/hide controls. Forms use noValidate, prevent duplicate submission and preserve dimensions while busy. Password fields are intentionally transient and never persisted across navigation.

Sign in returns to the workspace; users without company directory rights see their own welcome screen. Unauthorized API responses never leave the directory accessible. Register is invitation-only and asks users to confirm email before signing in. Reset completes with an explicit sign-in link; it does not silently open the workspace. Inline status/error messages remain in the form. All auth routes have an English document title, keyboard focus and narrow-screen layout. Browser sessions are HttpOnly cookies; no client token persistence.

The directory supports scoped profile edits, Manager-led invitations and the per-user access editor documented below. Public UI remains Thai; Backoffice remains English.

## User Info and profile Actions

Shared Dialog owns modal top-layer placement, focus containment/restoration, Escape and header X. Dropdown owns anchored portal positioning outside table overflow, viewport collision, arrow/Home/End navigation, Escape, outside-click dismissal and focus restoration. UserInfo uses Dropdown for Open website, Edit profile and Sign out. Users row Actions always use a three-dot Dropdown; selecting View or Edit opens its dedicated Dialog state. UserActions owns domain field validation, pending state, stale conflict recovery and before/after department confirmation. SelectField wraps Radix Select with an authored same-width, collision-aware popup. It shares Dropdown surface and item tokens, and portals into the owning native Dialog so the popup remains in its interactive layer. Dirty edits require an app-owned discard choice. Successful edits close the dialog, refresh the same list filter/page and refresh the signed-in profile without remounting the whole page. Email search remains transient.

Capability owners: Dialog → core/ui/Dialog.jsx; User Info → core/ui/UserInfo.jsx; profile fields → core/ui/FormField.jsx; role/department authority → docs/authentication.md and backend modules/identity-access/user-management.js. Server `canEdit` determines whether the Edit action exists. Head list counts and results must never include another department.

## Invitation and self-profile flows

Business authority: owner request dated 2026-09-08 and docs/authentication.md. All visible copy is English. Add employee creates a private invitation link without sending an email. StaffInvitations owns creation, recent 100 records, new-link generation and revocation. FormField and authored SelectField own fields; Dropdown owns row actions. A successfully created link is shown once with Copy and manual selection fallback. Closing loses the raw link; create a new link to replace it. Regeneration invalidates the old link and is explicitly confirmed; revocation is confirmed. Invitation secrets remain transient and are removed from the URL fragment before assets load. Registration is unavailable without a valid invitation; the email is fixed and only passwords are entered. Existing email verification remains required. Failure preserves entered values; password fields are never persisted.

Edit profile in User Info edits the signed-in user's display name only, with optimistic version checking. Send password reset is an explicit, confirmed request for a lower-role user; passwords are never visible. All permission checks are enforced in the BFF. Local links are local-machine-only until hosting is configured.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Dropdown | frontend/backoffice/src/core/ui/Dropdown.jsx | this contract | account / row actions | keyboard, outside click, narrow collision |
| Select/Listbox | frontend/backoffice/src/core/ui/SelectField.jsx | this contract | authored / Radix Select | validation, keyboard, popup |

Owner refinement 2026-09-08: clear menu items on pointer opening; sea-tint hover only, plus a background keyboard focus cue without an item border. Modal inputs/selects are 36px high. Radix owns listbox keyboard navigation, typeahead, selected/disabled states and focus return. Escape closes the listbox before its Dialog. Account and action menus keep action semantics; selection controls keep combobox/listbox semantics while sharing presentation.

### Profile and user datasets
- `/profile`: self-service full-page identity, optional employee contacts, separate current-password-confirmed password change. FormField and core-textarea are canonical controls. Version conflict requires explicit reload; failed requests retain values. Browser leave protection covers dirty fields and password entries.
- User directory: core-tabs switch the whole dataset, keyboard Left/Right/Home/End supported, tabpanel labels connected. Search wrapper owns focus; inner input never adds an offset ring. Both phone numbers dial through sanitized `tel:` links.
- Contact edits retain existing department permissions and optimistic version checks. Audit stores changed field names, never contact values or passwords.

- Dataset tab transitions reserve both panels' geometry, with inactive panels inert and aria-hidden. Use aligned summary/toolbar/table/footer sizes, stable page scrollbar gutter, 180–200ms motion and reduced-motion opt-out. Both datasets have a bounded responsive table scroll region.

- Select scroll lock: stable root gutter is the width owner; suppress duplicate body margin compensation only when supported. Popup open/close must preserve page and dialog geometry with visible scrollbars.
- Auth throttling: preserve safe provider error categories, send Retry-After for the known local window, and show a countdown before manual retry. An unknown provider limit uses a conservative UI delay without claiming the provider quota has reset. `.local` invitation addresses are rejected before creating a link or submitting a password; existing bootstrap account login remains available.

## Company master-data settings

Business authority: docs/tour-settings.md and owner approval dated 2026-09-08. `CatalogPage` under settings/shared owns recurring create/view/edit behavior; shared contracts/catalog.js owns field definitions and validation. Core ReferenceField owns bounded lookup interaction, delegates domain fetching, and reuses SearchField and SelectField. SearchField now accepts a label/placeholder and unique ID; Users retains its existing defaults. DataTable, Dropdown, Dialog, FormField and TextAreaField remain canonical.

Search/status/page restore from URL; remote requests debounce 300ms, defer during IME and cancel superseded work. Lookups are active-role filtered and page through 25 results. Success closes the form and refreshes the current list with inline status. Failed saves preserve values; stale conflicts require closing and refreshing before editing again. Unsaved closes require an app-owned discard choice; page unload uses beforeunload. Availability/role changes require explicit confirmation. No hard delete is exposed. View dialogs contain no mutations. Prices remain decimal strings across the API; empty fields are not coerced to zero. Local Backoffice only; no Public publishing control is shown.

## Settings refinement: address, company and navigation

Authority: owner message dated 2026-09-08 approving GitHub publication and requesting shared form/navigation improvements. Business details are recorded in docs/tour-settings.md.

AddressFields (core/ui) owns ordered, optional structured address inputs and safe Google Maps links, backed by packages/contracts/address.js on both client and server. Company now uses the quick-address variant specified below; sibling forms retain typed inputs until their individual review. Legacy address remains preserved separately. Company is a singleton full-page form with Save company details and conflict reload recovery; there is no Add company button, company table or hard delete.

FormField and TextAreaField use Core fieldGuidance for placeholders; an explicit field placeholder overrides the default. Placeholders complement permanent labels, disappear natively while typing and reappear when cleared. Map links open in a separate tab. The shared Maps editor shows a saved link only; legacy coordinate storage remains intact.

NavigationProvider (core/navigation) owns same-document navigation, route location, popstate and shared unsaved-change guards. It intercepts ordinary internal workspace links, preserving Shell/profile, browser back/forward and modified clicks. Catalog query replacement preserves navigation history metadata. Link changes, history moves and sign-out requests consult registered drafts; document unload retains browser protection. Profile reload uses the shared Dialog rather than window.confirm. Successful profile saves still explicitly refresh account data.

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

## Canonical dataset surfaces

Owner approval 2026-09-08 supersedes the earlier 3-card and most-recent-100 invitation presentation. DataTable, Pagination, SummaryCards and Tabs in core/ui own all Users, Invitations and catalog presentation. Pagination uses 25 rows per page, honest zero/unknown ranges, disabled boundary/loading controls, and server-clamped pages. Invitations now supports complete server-paginated, scoped name/email search; employee PII search remains transient, never persisted in URL/storage. Summaries count all authorized records, independently of search/status/page, within a consistent read transaction. No permissions, mutation behavior or database schema change.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Pagination | core/ui/Pagination.jsx | this contract | Users / Invitations / catalog | range, zero, unknown, boundaries, page clamp |
| Summary | core/ui/SummaryCards.jsx | DESIGN.md | four meaningful per-dataset metrics | authorized totals, desktop four, portrait two columns |
| Tabs and TabPanel | core/ui/Tabs.jsx + core/ui/TabPanel.jsx | this contract | Users and all three route-backed settings groups | shared indicator/content motion, reduced motion, inactive inert/aria-hidden, optional layout reservation, keyboard, direct links, history, dirty leave protection |
| Table states | core/ui/DataTable.jsx | this contract | loading / error / empty / populated | retry, overflow, stable geometry |

Company remains a form. Company & Tours contains Company and Tour programs. Partners & Sales contains Business partners, Agent prices and Sales channels. Transport & Pickup contains Hotels & pickup points and Vehicles & boats. These are navigation groups only; domain tables and permissions remain independently owned. A tab reveals one dataset immediately, remembers its own committed filters/page for the session, and does not expose inactive content to keyboard or accessibility navigation. Switching from a dirty Company form opens the existing discard decision before navigation.

Tab motion correction: Tabs owns a measured sliding indicator for any tab label width or wrapped row. Users and all three settings groups share the 180ms content fade/5px slide; the indicator takes 200ms. Reduced motion disables both. Settings preserve native page/form height and existing dirty-navigation guards.

## Tour operations

Owner authorization 2026-09-09 adds local company-manager operational master data, dated service availability/trips, booking snapshots and stock movements. Services / Assets & Equipment / Bookings & Trips navigation is authorized using the existing company-management permission; backend authorization is authoritative.

CatalogPage owns recurring metadata CRUD for operationCatalog, while BookingsPage and StockPage own domain commands through Core forms, Dialog, ReferenceField, SelectField, Dropdown, DataTable, SummaryCards and Pagination. Date-time entry is typed `YYYY-MM-DD HH:mm`, interpreted by shared contracts in Asia/Bangkok. Date-only stock fields retain `YYYY-MM-DD` semantics. List filters/paging follow the Settings route-memory convention. Unsaved edits and in-flight commands participate in the navigation guard; errors preserve fields and duplicate submits are locked. Server human-readable errors are exposed separately from error codes in core/auth/api.js.

Booking components show whether included, required, optional or excluded; included amounts are not charged again. Confirmation/cancellation/completion use explicit app-owned confirmation and versioned commands. Stock receiving, transferring, issuing, counting and condition/settlement commands retain entered units. Count corrections require a reason. Pack/case choices appear only when configured for that bottled resource. Reusable returns distinguish ready, cleaning and damaged; consumables distinguish consumed, wasted and intact returns. Sending stock to a boat/island changes custody/location, not implied consumption. No invented prices, capacities, pack sizes or stock opening quantities.

Trip preparation uses the shared Dialog table variant; Required, Issued, To issue and To settle have distinct operational meanings. To settle counts issued units still awaiting return or consumption/waste recording, while To issue is required minus issued.

Owner refinement 2026-09-09 separates Booking intake from Guide boat assignment and Driver vehicle assignment. Reusable services, program components, equipment, consumables and stock locations live under Settings; dated trips, service slots, bookings, dispatch and stock transactions remain work navigation above Settings. Core `workspaceRoutes.js` is the shared route ownership and canonical-path source for App, Shell and NavigationProvider. Legacy operational-master URLs resolve to their Settings paths with query state preserved. Ordinary owned links update only content; the workspace/profile DOM and authentication fetch remain mounted. Unowned, external, hash, download and modified-click links keep browser semantics. Role capability projections come from the server; hiding navigation never replaces backend authorization. Legacy service slots remain manager-only.

Core Dropdown layer correction 2026-09-09: action menus portal into their trigger's nearest native Dialog, falling back to document.body outside dialogs, matching SelectField ownership. Fixed viewport anchoring remains outside scrollable dialog content; the dialog has no transformed containing block. Escape consumes the menu key, closes only the menu and restores its trigger before a subsequent Escape can close the dialog. The dispatch browser regression verifies portal ownership, Escape/focus and clicking a menu action inside a job dialog.

Filterbar field errors remain visible through Core FormField; ordinary empty helper slots may collapse. Shared job sheets preserve readable mobile groups and use a compact, repeating-header table for A4 landscape print, including run identity and revision on continuation pages. See docs/tour-dispatch-workflow.md for operational ownership and role projections.

## Job-order documents

`features/operations/JobSheets.jsx` is the shared document owner inside Core Dialog's table variant. Boat and vehicle jobs use responsive labeled group cards on screen and full repeating-header tables for A4 landscape print. Booking uses the same masthead, payment-term labels and a handoff table; incomplete transport allocation remains explicit per selected service and direction. See `docs/tour-dispatch-workflow.md` for server projections. Actual zero passengers remains distinct from unrecorded counts. Check-in/handoff blanks are handwritten fields, not persisted check-in controls. Printing does not change any booking, run or revision. A failed dispatch refresh does not expose the stale job's Print control.


Owner refinement 2026-09-09: Boat print copies collect all authorized runs for the same vessel and Thailand service day, with independent outbound and return sections in one continuous table. The masthead has exactly two cells: vessel and four crew roles on the left, document reference and date on the right. Crew differences identify direction/time. The date/vessel document reference is derived, while source run codes and revisions remain visible. JobSheets.jsx/dispatch.css own the compact print variant; target 15 outbound + 5 return groups on one A4 landscape page at 8.5pt with normal-length notes. Long content wraps and continues to additional pages, never clips or silently drops groups. Management actions remain scoped to individual runs.


Owner refinement: vessel-day documents include per-program adult/child/passenger summaries for each direction, followed by a total of all programs. Group by snapshotted program ID, never infer the return list or count the same customer's two journeys as unique customers. Crew counts are separate from customer totals; four roster roles support multiple assistant captains/guides (typical 1 captain, 2 assistant captains, 1 guide, 1–2 assistant guides). Existing per-person crew selection remains canonical.

## Daily operational document contract

Owner-approved sage document family uses DocumentCore for exact database PNG loading, image decode/font readiness and print action; existing Core Dialog, Button and FormField remain canonical. DocumentPreview shows errors/retry instead of printing a missing logo. GET booking-document requires existing Booking authorization; Guide/Driver projections contain no payment amounts. DocumentAsset is private, RLS enabled, no anon/authenticated table grants; backend serves only fixed company-logo as PNG data URL to workspace sessions. The bounded 5 KB original is stored as BYTEA with SHA-256 rather than duplicated/recolored per document.

Daily report scope is explicit in the sheet: confirmed/completed trips overlapping selected Thailand day. Counts exclude drafts/cancellations. All rows render with repeating print table headers; no list pagination limit. COUNTER amount uses stored adult/child prices plus selected non-included service lines in integer satang; missing prices block a definitive collection total. Prices are not refreshed from current catalog rates. No deposit/receipt ledger exists in this scope.

## Booking-led operations navigation and selection

Owner instruction 2026-09-10 is the business source for Booking → Boat/Driver → Stock. workspaceRoutes, operationGroups and Shell own route groups; historical `/operations/guide`, stock and issues links remain compatible. Single-dataset destinations do not expose redundant tabs. Stock supplies and loans derive from an authorized selected boat run; separate Inventory balances/history remains company-manager only. BoatStockPage uses backend preparation shares, available balances and versioned stock commands; it never invents requirements or opening quantities.

DispatchPage owns shared Boat/Driver layout with selected run at left and paged pending Booking services at right. Choosing a booking copies remaining adult/child counts into AssignmentEditor; partial allocation is explicit. Capacity preview prevents oversized submissions; server version and capacity validation remain authoritative and preserve edits on conflict. Return vehicle jobs do not require a pickup time.

DateField extends Core FormField with native `date` input. Browser/OS owns calendar locale and popup geometry; EN-first application labels and Thai content remain supported. Stored dates use ISO `YYYY-MM-DD`, with no UTC conversion. Native keyboard/calendar operation remains available. Core filterbar input/Select/Button height is 38px; Dialog and authentication density variants remain unchanged.

Core DataTable allocation and allocation-selector layouts use content-height tables capped at 360px, with a 112px state reservation, because Boat/Driver compose run selection, pending bookings and assigned bookings in one workspace. Selector tables have no dataset minimum width; multi-column allocation tables retain 460px horizontal-scroll width. Standard dataset tables retain their existing geometry. Core SearchField defaults to neutral Search copy; domain-specific consumers can supply a label/placeholder.


Owner refinement 2026-09-09: Booking owns service dates independently of record creation and fleet schedules. Fixed programs calculate return; open-return has explicit pending/our/other, and return-only never invents outbound. Program/agent/date quote is authoritative, saved price and removal-credit snapshots remain stable on same-sale edits. Existing source policies are recorded in docs/booking-operations-audit.md. Booking readiness does not require staff to choose inventory source or ordinary service slots. Physical availability is checked at scoped issue/allocation. Reception print omits hotel/transfer, uses arrival or return-only service day, and CSS print margin boxes provide page current/total on supported Chromium/Edge printers. Core DataTable allocation variants reserve bounded content height without inheriting directory minimum widths.

## Company duties and per-user access · 2026-09-13

Authority and implementation limits: docs/company-workflows.md. WorkspaceNavigation owns grouping of working destinations by business category, preserves existing URLs and delegates all eligibility to the shared route permission policy. Company and Users belong to Company & Personnel; agent settings belong to Sales & Bookings. Unimplemented modules do not appear as disabled navigation.

Users row Configure permissions is offered only by the server's canConfigureAccess result. UserAccess reuses Dialog, Button, FormField, SelectField, address-section fieldsets and Navigation's dirty guard. Native checkboxes select multiple duties. Default/inherit, allow and deny remain visibly distinct; effective access explains its source. Optional datetime-local fields explicitly collect UTC instants (native platform calendar is acceptable, same policy as existing DateField). Manager authority is enforced again in the transaction. Only Admin Manager appoints Managers; this UI never edits self or Admin Manager grants.

Permission mutation is pessimistic: Review changes → Confirm permissions. There is no autosave or automatic retry. Failure retains edits; a 409 requires closing/reopening to inspect the latest saved version. Closing a dirty form asks Keep editing / Discard changes. The modal scroll owner, keyboard focus and narrow layout remain Core-owned. History is read-only. Bookings show a help message when paid-status changes are unavailable, while preserving unrelated edits.

Validation owners: backend/test/user-access.test.js and scripts/smoke-user-access.js. The fixture runner uses a separate frontend port and ephemeral API port to avoid disturbing a running local workspace. Fixtures do not send emails or use business data.

## Company workflow and manual payroll contract · 2026-09-13

Business authority: the owner's instruction to complete the missing company workflows and the explicit payroll decision, "กรอกยอดฐาน/เพิ่ม/หักพร้อมเหตุผล แล้วอนุมัติเป็นรายงวดก่อน". Executable scope and boundaries are maintained in docs/company-workflows.md and docs/company-workflow-guide.md. Negotiated Agent price exceptions and a full accounting ledger remain outside the implemented scope.

CompanyWorkPage owns zones, schedules/jobs, custody, stock requests/counts, maintenance and purchasing. PersonnelFinancePage owns employment/attendance and financial drafts. They reuse Core DataTable/Pagination, SummaryCards, SearchField, ReferenceField, Dialog, Dropdown, SelectField, DateField and FormField. Tables use the canonical panel table-panel/filterbar composition; filtering and action controls retain Core sizing. Reference choices are paged and cancel superseded requests. Reference display names, not opaque identifiers, must make record review understandable.

View and action review show the same persisted revision: supplier/source/destination, assigned employee, items, quantities, count before/after values and monetary totals as applicable. Approving a record requires reviewing its actual details; a generic confirmation without those details is insufficient. Partial receipt/issue/return remains explicit. Generating scheduled jobs does not imply completion, and repeat generation does not duplicate a schedule/date. The assigned worker reports completion and a separate authorized reviewer accepts or reopens work.

Forms use noValidate with inline validation and focus on the first invalid field. Save/action pending guards prevent duplicate clicks. Failure preserves entered data; revision conflict requires inspecting the current saved record. Dirty close/navigation offers Keep editing or Discard. Sensitive list-fetch failures clear stale rows, permissions and summaries. Financial save retries are idempotent by record/revision/actor, and command replay still requires current view and action authority.

Payroll requires an explicit period, base wage and its basis/reason, plus additions/deductions with a reason on every line. Net payable is the manually entered base plus additions minus deductions, using integer cents. No attendance-derived deduction formula is inferred. The author submits; a different authorized non-beneficiary reviews each period. Rejected drafts can be revised with prior approval cleared. Payroll view is separate from personnel and Manager appointment authority. Monetary beneficiaries cannot approve or record their own payment; supplier-payment responsible officers are not personal beneficiaries.

Payment UI says Record payment and explicitly describes an already completed external payment with a date/reference. It must not imply bank execution. Advance clearance requires evidenced amounts plus returned cash to balance exactly and independent acceptance. Persisted demonstration financial records remain drafts; browser fixtures and rollback tests do not become real payment history.

Validation: backend/test/personnel-finance.test.js, the company-work backend tests and domain-service seed verification. scripts/smoke-company-workflows.js intercepts compiled assets and fixture API responses at a test origin in Edge, with no HTTP/Vite server and no real credentials. It verifies base/reason entry, required-field validation, conflict retention, successful save/edit, dirty discard, search reset, navigation, purchase approval details, mobile keyboard selection and document overflow. Evidence screenshots live in screenshots.local and are not product data.

## Live workflow corrections · 2026-09-13

Driver, Boat, Supplies, Loans and Daily summaries carry the current service date through Core navigation. Dispatch date/direction/page are stored in the URL; Supplies and Loans also share the selected boat run. A changed date clears stale run selection. Vehicle run identifiers never become boat run identifiers. Back/forward and reload keep the stored URL context.

Movement search covers action, item name/code, lot, locations, custodian and transaction note. An empty filtered result asks the user to clear or change the search. It does not claim that no movements exist. The existing Core table and filterbar remain the UI owners.

Requests retain caller cancellation and a 15-second overall timeout. Only GET responses with explicit HTTP 503 retry once; mutations are never automatically replayed. Persistent failure stays visible and existing draft/conflict safeguards remain. Concurrent identity verification is coalesced only while in flight; completed identity checks are never cached. Invalid sessions and rate limits do not retry.


## Equipment returns · 15 September 2026

Owner decision: remove separate equipment-washing reporting. Ordinary intact equipment returns use RETURN_READY in one transaction. Damaged returns and loss remain explicit; consumables retain consumption. BoatStockPage, StockPage and CompanyWorkPage reuse the existing shared SelectField. New transactions cannot create CLEANING stock. Historical movements remain immutable; existing CLEANING balances can be reviewed and moved to READY or DAMAGED using the existing condition action, without a recurring washing task. Housekeeping zone jobs remain separate.


## Per-booking Agent price review · 15 September 2026

Owner authorized continuing the proposed independent Manager review workflow. BookingPriceReview reuses Dialog/FormField/TextAreaField/Button, loads the current Booking revision, and shows standard/proposed rates, total, services and request/review reasons. Only another Manager reviews pending requests. Pending/rejected requests block confirmation. Draft saves restore standard rates and clear the request; explicit UI guidance explains re-requesting. Shared backend booking-price owns actions and confirmation checks; immutable audit entries retain history. Commands are actor-bound, revision-checked and idempotent, and replay rechecks current authority. Confirmed bookings are read-only for negotiated rates. Unit coverage: backend/test/booking-price.test.js and booking-flow.test.js. Browser coverage is recorded in docs/validation/agent-price-review.md.

Price-review refinement: pending/rejected price requests show a disabled Confirm · price approval required action. Server confirmation validation remains authoritative if a client is stale.

## Receivables and evidence

Internal statement selection is bounded to 50 completed Agent-credit bookings from one Agent and preserved across server pages. Selection is transient (sensitive records, consistent with company forms). Mutations lock while pending, preserve input on failure and use idempotent IDs. Changing submitted input starts a new command ID. Payment commands require exact displayed revision; refresh/reopen on conflict. Uploaded files have immutable identity and parent-scoped authorization. Dirty upload/create/payment dialogs use existing navigation protection and discard dialogs. Payroll export applies current filters across all pages, with 5,000-row cap and a record count in success feedback.


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

## Member commerce and independent guide assignments

Business source: `docs/member-commerce-plan.md`, owner scope approval and full-transfer decision dated 2026-09-15. Public offers are loaded from published master records; promotions are filtered before pagination. The server snapshots selected services and prices and rechecks the quote during submission. The customer sees a request, then an explicit amount awaiting payment, then evidence review, then verified payment. Staff can return evidence with a customer-visible correction message. Internal review notes otherwise remain private. Expired promotion requests display Expired; cancelled operational Bookings do not show payment controls. Customers can cancel only their own unaccepted requests.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Member controls | frontend/member/src/core/ui.jsx | DESIGN.md | Button / Field / Select / Notice | lint, build; Chrome/Safari runtime pending |
| Member date/select | frontend/member/src/core/ui.jsx | this contract | native OS popup; Thai surrounding labels, date-only server format | runtime pending on both supported browsers |
| Member API | frontend/member/src/core/api.js | backend commerce contracts | GET / explicit POST, timeout, no automatic mutation retry | backend ownership tests |
| Member leave protection | frontend/member/src/core/LeaveGuard.jsx | this contract | app-owned dialog for links; beforeunload for browser close | runtime pending |
| Public overlays | frontend/public-web/src/core/ui/Controls.jsx | DESIGN.md | native modal with close / Escape | runtime pending |
| Customer/guide tables | frontend/backoffice/src/core/ui/DataTable.jsx | existing Core contract | paginated customer requests and independent guide work | backend tests, build; runtime pending |

Customer session cookies and routes are separate from workspace sessions. A member 401 clears only the member cookie. Public/member proxies cannot call workspace endpoints. A customer can read only evidence whose request belongs to the exact authenticated customer identity. Customer registration never grants staff roles or matches existing records by email. Customer search is transient because it can contain personal information, consistent with Users search.

Popup records start inactive; managers preview the image before activation. Draft image previews require manager authentication. Published tour/active popup references alone make website images publicly readable. Promotion rights hold duration is configured by staff for limited campaigns, with no invented default.

Independent guide assignments reuse the existing Guide read/manage capabilities. Assistant guides see only assigned jobs. Staff overlap checks apply in both directions between guide-only work and boat/vehicle rosters. Instructions and travel data use the existing Guide projection, excluding booking/supplier amounts. Status changes require review; completed/cancelled assignments are retained and cannot be edited. Cancelling a Booking makes its guide assignment display cancelled and frees its scheduling interval.

Member recovery uses its own customer-recovery session. Email links return to the member login route; URL tokens are removed on entry and the recovery exchange is shared across StrictMode effects. A recovery session cannot use customer requests or staff APIs. Password reset records an audit event, revokes local customer/staff sessions for the same identity and returns to login. Real email delivery and the user-entered reset flow still require runtime validation.

## Member and staff authentication refinement · 15 September 2026
Owner request: member authentication adopts the existing island-photo/form composition; staff AuthLayout becomes a quiet centered card. This supersedes the earlier team photo-panel direction. Member core/AuthLayout owns the customer composition, core/ui owns password toggles and buttons; no cross-app UI imports. Anonymous member navigation contains only Tours and Sign in, with a separate public-home link in the footer. Personal trips/profile appear only for a signed-in customer. Authentication and role provisioning behavior remain owned by the existing APIs.

## Service attendance and no-show review

- `/operations/check-in` is a separate employee destination. Booking permission permits lookup and arrivals; company managers confirm no-shows and close/reopen days. Finance decisions require `finance.receive` on the server.
- Scan/enter a Booking code then review the guest, date and outbound/return leg. A keyboard scanner is supported as text input; camera decoding and customer ticket generation are separate outstanding work.
- Arrival commands add adults/children only within the unreviewed remainder, are version checked and replay safe. Thailand service date is enforced except clearly tagged DEMO fixtures.
- No-show confirmation requires a server-generated allocation preview and a reason. Only unserved allocations change; original amounts, recorded actual service and financial totals remain intact. Cancelled allocations remain visible with the reason.
- Every remaining guest must be accounted for before closing the service day. A manager can reopen with a reason. This is separate from the next-day operational snapshot.
- No-show creates a financial hold. Bills cannot newly include affected bookings until the recorded decision retains charges. Adjustment/refund decisions remain a hold requiring separate processing; they never automatically move money.
- Keep DEMO examples for manuals. Temporary transactional verification rolls back only its own fixtures.

## Dashboard landing and summaries · 21 September 2026

Successful staff login goes to `/dashboard`. Root canonicalizes to Dashboard; an already authenticated user visiting `/login` returns there. Invitation and password recovery routes preserve their existing independent flows. Workspace Navigation remains the canonical in-app/history owner; Dashboard is a working menu destination for every active account.

Dashboard uses one authenticated aggregate read. Server-owned permissions and scope determine each widget, including sensitive finance gating. Loading and failed refresh remove prior data; errors offer Retry and zero is reserved for successful empty counts. Core Dialog owns focus trap/restoration, Escape and scroll locking for day summaries. Core DataTable owns the program summary; navigation links open supported domain destinations. English copy and Thailand service dates follow Backoffice conventions. No domain writes or duplicate CRUD are added. Definitions, limitations and validation coverage are maintained in docs/dashboard.md.

## Persistent shell navigation

Owner instruction (2026-09-21): Public/Member retain Navbar/Footer; Backoffice retains Sidebar/Navbar during internal menu changes. Public core useNavigation owns same-origin known-route links, history and post-mount anchors; App owns header/footer. Member core MemberNavigation owns route state and LeaveGuard registrations, with app-owned discard confirmation for internal links/history and native unload protection for external exits. Backoffice core NavigationProvider remains its canonical owner. Shell identity, no extra document/session reload, history, cancelled dirty navigation and native link exceptions require browser evidence. Route-specific forms/datasets reset only when their content route changes; shell/session ownership remains stable.

## Dashboard overview refinement

Business authority: docs/dashboard.md and the approved21September2026 mockup. Dashboard remains one authenticated aggregate request with existing permissions, cancellation, timeout and refresh behavior. Calendar summaries use Core Dialog; attention uses Core DataTable(content layout) and Core SelectField. The finite server-defined queue set is displayed without pagination. Scope/status filters are transient overview presentation state and reset on explicit refresh, avoiding stored links to scopes that may disappear with permission changes. Null metrics are distinct from zero; overlapping queue categories are not summed. The real work-area destination owns record-level filters/CRUD.

Shell chrome is shared across routes, while feature restyling is limited to Dashboard. The question-mark help uses Core Dialog focus/escape semantics. Complete illustrated User Guide remains a separate future delivery.
