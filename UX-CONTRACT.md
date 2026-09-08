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
