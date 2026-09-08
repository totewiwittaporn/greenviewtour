# Architecture and ownership

Source: owner discussion on 2026-09-08. Scope: a company operations system, not only tour sales.

## Decisions

Use one npm-workspaces repository and an initially modular, single backend. Keep the existing React/Vite stack. Public web and backoffice have separate UI cores inside their own source trees. Do not create packages/ui or import another application's UI. Reuse contracts, not business data copies.

Frontend `app` composes routes/providers, `features/<menu>/<page>` owns Backoffice screens/adapters, and `core/ui` owns that application's repeated presentation and interaction. Backoffice menu/page folders may be reserved before implementation; expose navigation only when the feature works. Public Web remains unchanged.

Backend `app` composes runtime; `platform` contains technical adapters; `modules/<capability>` owns business rules. Each module should expose services/contracts and retain ownership of its writes. API authorization is mandatory for every protected action, regardless of UI visibility.

## Module map

- **identity-access**: User accounts, authentication, roles, scoped grants and access audit events. See docs/identity-access.md.
- **organization**: Company structure, teams and positions.
- **employees**: Employee records, employment status, qualifications and employee-to-user linkage.
- **customers**: Customer records and contacts; keep booking passenger snapshots with bookings.
- **service-catalog**: Tours, other services, prices and selling conditions.
- **sales**: Quotations and sales records. Payment and financial document ownership belongs to finance.
- **bookings**: Central reservations across phone, online messages, website and walk-in channels; passengers and insurance submission tracking.
- **operations**: Trip/service schedules and assignment of employees, fleet and equipment, including non-tour jobs and time-conflict checks.
- **assets**: Equipment, tools, consumables, custody and issue/return records. Fleet owns vehicle-specific records.
- **fleet**: Boats, cars, vans and motorcycles, capacity, readiness, maintenance and vehicle documents. Operations owns job assignments.
- **finance**: Collections, payments, receivables, expenses and financial documents. Tax/accounting rules require a separate validated specification.

## Data boundaries

Employee and User are distinct; an employee may have no login. Position is separate from access role. Operations references employees, fleet and assets rather than duplicating their master records. Booking, payment and service-execution statuses are independent. One central booking model handles every sales channel. Scope remains paired with each permission grant; combining roles must not widen unrelated grants.

## Implementation order

1. This repository foundation and separate UI ownership.
2. Select backend/authentication/database infrastructure and specify identity-access acceptance criteria.
3. Implement User/Role/Scope and Manager delegation with server-side checks and audit.
4. Build remaining business modules from validated workflows.

## Baseline audit

Base main commit: 76633afed6ee8896d4593662e985e87dc9a45f32. Only a Vite/React starter existed; App.jsx was empty despite being imported as a default export. No AGENTS.md, API, database schema, hosting config or CI workflow existed. Main was the only branch and no open PR was found. This scaffold fixes the empty export with a null-rendering component, retains public template assets/styles, and adds no production integration.

Chalin Clothes is a conceptual reference supplied by the owner; this change does not claim a code-level audit or reuse of its repository.

## Folder naming

The owner requested frontend/backend naming aligned with Chalin Clothes. Frontend applications live in `frontend/public-web` and `frontend/backoffice`; the shared API lives in `backend`. The workspace package name `@greenviewtour/api` remains stable because its responsibility is still the API. UI cores remain separate.

## Backoffice page adapters

`backend/src/backoffice/<menu>/<page>` mirrors Backoffice features for discoverability and delegates business behavior to the existing domain modules. This layer owns request/response composition only. The exact 12-menu/34-page map is maintained in `docs/backoffice-menu-map.md` and its JSON inventory.

## Preview PostgreSQL adapter

`backend/src/platform/database` owns the connection pool and read-only connection probe. It uses pinned node-postgres, verified TLS and explicit Preview project checks. This is connectivity infrastructure; no ORM, business schema or authorization runtime is selected by this change. See `docs/database-connection.md`.
