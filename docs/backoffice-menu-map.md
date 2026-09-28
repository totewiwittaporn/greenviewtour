# Backoffice menu and page map

Source: the owner-approved menu discussion on 2026-09-08. Scope: 12 menus and 34 page folders in Backoffice FE and BE. Public Web is out of scope.

## Folder convention

- Frontend: `frontend/backoffice/src/features/<menu>/<page>`.
- Backend: `backend/src/backoffice/<menu>/<page>`.
- Each menu has `shared` for menu-local support; it is not an extra page.
- FE page folders hold page components, modals, hooks and API adapters as needed. Repeated UI uses `frontend/backoffice/src/core/ui`.
- BE page folders hold transport adapters and response composition; `backend/src/modules` remains the canonical owner of business rules, state and writes. `backend/src/app` composes routes at runtime when implemented.
- No extra technical subfolders are required until real code needs them. README files retain the scaffold in Git and explain ownership.

## Exact map

Append the relative folder below to either root. Module names refer to `backend/src/modules`. They identify future integration boundaries, not implemented behavior or approved permissions.

| Menu | Page | Relative folder on both sides | Domain modules |
| --- | --- | --- | --- |
| Dashboard | Overview | `dashboard/overview` | `operations`, `bookings`, `finance` |
| Bookings | Reservations | `bookings/reservations` | `bookings` |
| Bookings | Reception | `bookings/reception` | `bookings`, `operations`, `finance` |
| Bookings | Insurance | `bookings/insurance` | `bookings` |
| Sales | Quotations | `sales/quotations` | `sales`, `service-catalog` |
| Sales | Sales Orders | `sales/sales-orders` | `sales`, `bookings`, `finance` |
| Tour Operations | Work Schedule | `tour-operations/work-schedule` | `operations` |
| Tour Operations | Trips | `tour-operations/trips` | `operations`, `bookings` |
| Tour Operations | Assignments | `tour-operations/assignments` | `operations`, `employees`, `fleet`, `assets` |
| Customers | Customers | `customers/customers` | `customers` |
| Services | Tours | `services/tours` | `service-catalog` |
| Services | Other Services | `services/other-services` | `service-catalog` |
| Services | Pricing | `services/pricing` | `service-catalog` |
| Employees | Employee Directory | `employees/employee-directory` | `employees` |
| Employees | Teams & Positions | `employees/teams-positions` | `organization` |
| Employees | Leave | `employees/leave` | `employees`, `operations` |
| Assets & Equipment | Asset Register | `assets-equipment/asset-register` | `assets` |
| Assets & Equipment | Supplies | `assets-equipment/supplies` | `assets` |
| Assets & Equipment | Issue & Return | `assets-equipment/issue-return` | `assets` |
| Fleet | Vehicles & Boats | `fleet/vehicles-boats` | `fleet` |
| Fleet | Maintenance | `fleet/maintenance` | `fleet` |
| Finance | Receivables | `finance/receivables` | `finance` |
| Finance | Billing | `finance/billing` | `finance` |
| Finance | Receipts | `finance/receipts` | `finance` |
| Finance | Tax Invoices | `finance/tax-invoices` | `finance` |
| Finance | Cash Handover | `finance/cash-handover` | `finance` |
| Finance | Expenses | `finance/expenses` | `finance` |
| Reports | Sales | `reports/sales` | `sales` |
| Reports | Operations | `reports/operations` | `operations` |
| Reports | Finance | `reports/finance` | `finance` |
| Settings | Company | `settings/company` | `organization` |
| Settings | Users | `settings/users` | `identity-access`, `employees` |
| Settings | Roles & Permissions | `settings/roles-permissions` | `identity-access` |
| Settings | Activity Log | `settings/activity-log` | `identity-access` |

The companion JSON is a development inventory only; it does not register navigation, routes, permissions or endpoints. Keep it and this table in sync when changing the page plan.

## Scope and policy boundaries

Screens, endpoints, authentication, migrations, billing rules, permissions and approvals are not implemented here. Dashboard and Reports will compose existing module services rather than own duplicate transaction data. Activity Log initially belongs to identity-access account administration; a company-wide audit expansion needs a separate contract. Leave ownership is reserved in employees, with scheduling integration through operations. Financial/legal workflows and exact scope checks require validated specifications before implementation.

## Implemented master-data settings extension

Owner approval dated 2026-09-08 adds `/settings/partners`, `/settings/tours`, `/settings/rates`, `/settings/locations`, `/settings/vehicles` and `/settings/channels`, and implements `/settings/company`. They share `features/settings/shared/CatalogPage.jsx` and the field contract in `packages/contracts/catalog.js`. See `docs/tour-settings.md` for scope. Existing reserved Services/Fleet folders are future operational pages, not duplicate active catalogue routes. The 34 folders above remain the original scaffold inventory.

## Booking intake and customer directory — owner override 27 September 2026

This supersedes the original top-level Customers placement, not the historical scaffold inventory above.

- Sales & Bookings → Booking (`/operations/bookings`) owns All bookings, Direct bookings, Agent bookings and Customer requests (`?tab=requests`). Direct bookings replaces the misleading Direct customers label; its existing DIRECT source filter is unchanged.
- Settings → Customers (`/settings/customers`) is one customer-profile dataset, without a redundant tab or customer-request panel. Employee Users remains separate. Existing Booking staff can still read the directory; only existing company-manager authority can edit customer profiles or read/review requests. Moving a page does not create new business permissions.
- The former `/customers` link replaces its own history entry with the old role-dependent destination: requests for company Managers, directory for Booking readers. Explicit `tab`/`kind=customers` targets the directory; explicit requests still undergo the target access check.
- Core Navigation/Tabs/TabPanel preserve the shell, keyboard activation, dirty navigation, browser history and independent per-tab search/page state. Customer profiles and customer requests now have independent data-fetch owners and cancellation, preventing one record shape from being rendered as the other.
- Accepted requests retain their history and offer Open booking to the existing operational Booking when the actor can read it. Opening this link does not create or confirm a second record. Request acceptance, capacity, payment/evidence checks and customer mutations keep the existing server endpoints and authorization.

No schema, persistent business records, role grants, Production or deployment changes are required for this navigation revision. `scripts/smoke-customers.js` covers the moved flow; the capacity UI regression now enters the requests tab directly.
