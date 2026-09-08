# UI contract

Business sources: docs/architecture.md, docs/identity-access.md, docs/local-development.md. Current owner authorization is a local read-only User page to verify DB connection; not a production authentication rollout.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Navigation | frontend/backoffice/src/core/ui/Shell.jsx | DESIGN.md | desktop / inline mobile navigation | desktop + narrow browser |
| Button | frontend/backoffice/src/core/ui/Button.jsx | DESIGN.md | normal / busy / disabled | browser refresh/paging |
| Search | frontend/backoffice/src/core/ui/SearchField.jsx | this contract | email | clear, debounce, IME, stale cancellation |
| Table | frontend/backoffice/src/core/ui/DataTable.jsx | this contract | read-only | loading, error, empty, populated, overflow |
| Scrollbar | frontend/backoffice/src/core/ui/styles.css | DESIGN.md | document / table region | computed style |
| Public baseline | frontend/public-web/src/core/ui/styles.css | DESIGN.md | Thai homepage | desktop + narrow browser |

## Users behavior

Read accounts from auth.users through Backend. Display only email, UUID, creation/sign-in timestamps and email verification; no password fields or user metadata. No business roles are inferred from email verification. Counts and timestamps come from DB-backed responses. There are currently no users; show honest empty state rather than fake rows.

Search debounces 300ms after composition ends. Clear immediately resets search/page and returns focus. Abort superseded requests and timeout after 15 seconds. Refresh retains committed filters. Email search is transient component state rather than URL/history because it may contain personal data. Page size is fixed at 25, bounded server-side; empty/out-of-range pages clamp to valid bounds. Previous/Next are disabled at boundaries and while loading. Retry is available after failure. Dates display en-GB with Asia/Bangkok timezone.

## Current scope

Read-only local owner access is restricted to loopback and a process-generated secret injected by the Backoffice development proxy. It is not Supabase Auth or Manager authorization. Do not expose or deploy this local handler. Account invitations, modifications, roles, permissions and audits require the separately planned authenticated implementation.

Public links go to the actual website or official Facebook page for information/inquiries; no booking is submitted locally. No modal, form submission, toast or destructive action exists in this preview. Public locale is Thai; Backoffice locale is English. All interactive elements require keyboard focus and accessible names.
