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

Read accounts from auth.users through Backend. Display only email, UUID, creation/sign-in timestamps and email verification; no password fields or user metadata. No business roles are inferred from email verification. Counts and timestamps come from DB-backed responses. There are currently no users; show honest empty state rather than fake rows.

Search debounces 300ms after composition ends. Clear immediately resets search/page and returns focus. Abort superseded requests and timeout after 15 seconds. Refresh retains committed filters. Email search is transient component state rather than URL/history because it may contain personal data. Page size is fixed at 25, bounded server-side; empty/out-of-range pages clamp to valid bounds. Previous/Next are disabled at boundaries and while loading. Retry is available after failure. Dates display en-GB with Asia/Bangkok timezone.

## Authentication and current scope

Business authority: docs/authentication.md and docs/identity-access.md. AuthLayout, FormField and Button under core/ui own all auth screens; core/auth/api.js owns JSON requests and session-expiry handling. AuthPage owns flow copy and validation. Inputs are labeled, errors are linked and focus the first invalid field; sensitive values are masked with explicit show/hide controls. Forms use noValidate, prevent duplicate submission and preserve dimensions while busy. Password fields are intentionally transient and never persisted across navigation.

Sign in returns to the workspace; users without company directory rights see their own welcome screen. Unauthorized API responses never leave the directory accessible. Register is invitation-only and asks users to confirm email before signing in. Reset completes with an explicit sign-in link; it does not silently open the workspace. Inline status/error messages remain in the form. All auth routes have an English document title, keyboard focus and narrow-screen layout. Browser sessions are HttpOnly cookies; no client token persistence.

The existing directory remains read-only behind actual authentication. Manager invitations, role changes and employee/team scope administration are the next phase. Public UI remains Thai; Backoffice remains English.
