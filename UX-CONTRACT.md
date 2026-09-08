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

The directory supports scoped profile edits and Manager-led invitations. Role changes for existing accounts remain outside this change. Public UI remains Thai; Backoffice remains English.

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
| Tabs | core/ui/Tabs.jsx | this contract | local datasets / route-backed settings | keyboard, direct links, history, dirty leave protection |
| Table states | core/ui/DataTable.jsx | this contract | loading / error / empty / populated | retry, overflow, stable geometry |

Company remains a form. Company & Tours contains Company and Tour programs. Partners & Sales contains Business partners, Agent prices and Sales channels. Transport & Pickup contains Hotels & pickup points and Vehicles & boats. These are navigation groups only; domain tables and permissions remain independently owned. A tab reveals one dataset immediately, remembers its own committed filters/page for the session, and does not expose inactive content to keyboard or accessibility navigation. Switching from a dirty Company form opens the existing discard decision before navigation.

Tab motion correction: Tabs owns a measured sliding indicator for any tab label width or wrapped row. Users and all three settings groups share the 180ms content fade/5px slide; the indicator takes 200ms. Reduced motion disables both. Settings preserve native page/form height and existing dirty-navigation guards.
