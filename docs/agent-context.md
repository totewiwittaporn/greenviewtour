# Greenview context routes

Choose only rows touched by the task. Read matching sections and implementation/tests; do not load the whole table's targets. This index routes to existing authority rather than copying business rules.

| Task touches | Read | Inspect implementation |
| --- | --- | --- |
| Module ownership, shared code, app boundaries | [Architecture](architecture.md) | `backend/src/modules`, `packages/contracts`, affected app |
| Staff login, roles, scopes, user administration | [Identity/access](identity-access.md), [authentication](authentication.md) | `backend/src/modules/identity-access`, `packages/contracts/access.js` |
| Tour catalog, Agent prices, company setup | [Tour settings](tour-settings.md) | `backend/src/modules/service-catalog` |
| Booking, capacity, equipment/consumables | [Tour operations](tour-operations.md) | `backend/src/modules/operations`, matching contracts/tests |
| Boat/vehicle/guide allocation, job documents | [Dispatch](tour-dispatch-workflow.md); for daily snapshots/LINE, [nightly summary](operations-nightly-summary.md) | `dispatch.js`, `guide-assignments.js`, `documents.js`, `notifications.js` in operations |
| Service-day attendance, no-show decisions | “Service attendance and no-show review” in [UI contract](../UX-CONTRACT.md) | operations `check-in.js`, `service-day.js`, `backend/test/check-in.test.js` |
| Purchasing, housekeeping, inventory approvals | [Company workflows](company-workflows.md) | `backend/src/modules/company-work` |
| Payroll, expenses, advances, financial approval | [Personnel/finance](personnel-finance.md) | `backend/src/modules/personnel-finance`, `receivables`, `evidence` |
| Public/member commerce, customer ownership, QR payments, retained demos | [Member commerce](member-commerce-plan.md), especially updated owner direction | `backend/src/modules/commerce`, `frontend/member`, `frontend/public-web` |
| UI components or interaction | Relevant component/feature sections in [DESIGN](../DESIGN.md) and [UX contract](../UX-CONTRACT.md) | affected app's own `core`; no cross-app UI imports |
| Navigation/page placement | [Menu map](backoffice-menu-map.md) | actual frontend routes and backend HTTP composition; reserved folders do not prove functionality |
| Local startup | [Local development](local-development.md) | `scripts/dev.js`, package scripts, Vite config |
| Schema/connection changes | [Database connection](database-connection.md) | `backend/prisma`, `backend/src/platform/database`; inspect migration commands before use |
| Hosting or Preview rollout | [Deployment](deployment.md) | actual host settings and branch triggers |

Current code has public-web, backoffice, and member applications. Some older documents describe the initial two-app scaffold. Dated sections are evidence of their original change, not proof of current completeness. Preserve approved domain constraints and consult later explicit owner decisions for supersession. For example, the latest QR-payment requirement is not fulfilled merely because manual payment review or local demo checkout exists.

For Thai/English interface changes, read [localization](localization.md) for locale ownership, persisted-value boundaries, validation and bilingual-content gaps.
