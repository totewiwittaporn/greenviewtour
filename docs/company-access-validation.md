# Company access change report · 2026-09-13

## Files Changed / Summary by File

Paths below are relative to the repository root. No public-web source, dependency lockfile, deployment configuration, local secrets or synced project sources changed.

| File | Change |
| --- | --- |
| `packages/contracts/access.js` | Role names and effective operational permission evaluation; explicit deny, validity windows and default-deny |
| `packages/contracts/operation-access.js` | Existing operational duties use the shared evaluator |
| `backend/prisma/schema.prisma` | User access revision and private permission override relation |
| `backend/prisma/migrations/20260913090000_user_access/migration.sql` | Additive schema, RLS/no browser grants, three roles and two departments |
| `backend/src/modules/identity-access/user-access.js` | Read/edit access, Manager hierarchy, no self escalation, conflict checking and audit transaction |
| `backend/src/modules/identity-access/policy.js` | Load overrides on authenticated profiles; publish paid-status capability; shared role catalog |
| `backend/src/modules/identity-access/user-management.js` | Sales/Housekeeping departments and scoped Head Housekeeping directory |
| `backend/src/modules/identity-access/invitations.js` | Require matching department for Head Housekeeping invitations |
| `backend/src/app/http.js` | Access endpoints, per-row authority and missing Agent agreements routing |
| `backend/src/modules/operations/common.js` | Explicit inventory/preparation/booking combined duties, preserving fresh authorization |
| `backend/src/modules/operations/catalog.js` | Inventory and material/store lookups accept delegated inventory access |
| `backend/src/modules/operations/stock.js` | Honor delegated stock rights, preserve assignment restrictions for preparation staff |
| `backend/src/modules/operations/bookings.js` | Require paid-status permission on transitions into/out of PAID |
| `backend/src/modules/operations/messages.js` | Actionable payment permission error |
| `frontend/backoffice/src/features/settings/users/UserAccess.jsx` | Multi-role and per-user default/allow/deny dialog; review, validity, history, retry/conflict and dirty protection |
| `frontend/backoffice/src/features/settings/users/UsersPage.jsx` | Server-authorized Configure permissions row action and save feedback |
| `frontend/backoffice/src/features/settings/users/UserActions.jsx` | New department choices |
| `frontend/backoffice/src/features/operations/BookingEditor.jsx` | Paid-state option/field eligibility and explanation |
| `frontend/backoffice/src/features/operations/BookingsPage.jsx` | Pass payment capability to create/amend forms and preserve existing paid state for restricted users |
| `frontend/backoffice/src/features/operations/operationGroups.js` | Inventory history eligibility follows the stock capability |
| `frontend/backoffice/src/features/settings/shared/settingsGroups.js` | Separate company from tour program settings |
| `frontend/backoffice/src/core/navigation/workspaceRoutes.js` | No unconditional Manager bypass of operational permission denials |
| `frontend/backoffice/src/core/ui/WorkspaceNavigation.jsx` | Working destinations grouped by company work category |
| `frontend/backoffice/src/core/ui/Shell.jsx` | Delegate menu rendering to the shared navigation owner |
| `frontend/backoffice/src/core/ui/styles.css` | Responsive permission/role layout using existing tokens |
| `backend/test/user-access.test.js` | Seven authorization, expiry, validation, conflict, audit and paid-state tests |
| `scripts/smoke-user-access.js` | Browser checks for failed loads, retry, role selection, denial, confirmation, conflict, discard, narrow layout and save |
| `scripts/smoke-browser-fixtures.js` | Include access checks; isolate frontend and API ports from running workspaces |
| `scripts/smoke-auth.js` | Configurable test origin for isolated fixture runner |
| `scripts/smoke-staff-invitations.js` | Configurable test origin for isolated fixture runner |
| `DESIGN.md` | Preserve existing visual language for access and navigation |
| `UX-CONTRACT.md` | Current access editor, interaction and canonical ownership contract |
| `docs/identity-access.md` | Current role and access extension |
| `docs/authentication.md` | Migration/API rollout boundary |
| `docs/company-workflows.md` | Full approved requirements, implemented behavior and remaining modules |
| `premium-audit.json` | Strict static design-contract audit evidence |
| `docs/company-access-validation.md` | This file and validation evidence |

## Validation Result

- `npm ci`: completed with existing lockfile; no package updates. npm reported 18 dependency vulnerabilities (1 low, 3 moderate, 14 high); remediation remains separate and has not been attempted with a force upgrade.
- `npm run lint`: passed.
- `node --test --test-reporter=dot backend/test/*.test.js`: all 115 tests passed, including seven new access tests.
- `npm run prisma:validate --workspace @greenviewtour/api`: passed.
- `npm run prisma:generate --workspace @greenviewtour/api`: passed.
- `npm run build`: public-web and backoffice passed outside the filesystem sandbox. Vite retains large-chunk warnings; no build error.
- `node scripts/smoke-browser-fixtures.js`: authentication, invitations/profile and user-access browser fixtures passed. No provider emails sent. Narrow-screen screenshot inspected; Core owns modal scrolling.
- `audit_project.py . --mode strict`: zero findings. This static check does not substitute for the browser/backend checks above.
- `git diff --check`: passed after removing trailing blank lines.

The first build attempt was blocked by sandbox parent-directory access; the approved run outside sandbox succeeded. Fixture checks use port 5274 plus an ephemeral API port because port 5000 was already in use. They do not connect to the running system or use real employee data.

## Remaining TODO

This is the access/navigation foundation, not completion of all eight business categories. Warehouse-scoped responsibilities, purchasing, cleaning/count scheduling, negotiated-price approval, employment/attendance, reimbursement/advance workflows and payroll remain open as detailed in company-workflows.md. No automatic payroll deduction policy has been invented.

The migration has **not** been applied to an external database. Database integration and migration verification against the selected target remain necessary before runtime rollout. The owner's existing local checkout/data and `main` have not been updated by this change. General inventory COUNT still uses the inherited direct-adjustment workflow until the new count approval lifecycle is implemented.
