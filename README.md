# Greenview Tour

> Current environment/workflow acceptance: [items 7–8 — Local cleanup and final verification](docs/local-workflow-acceptance-2026-09-30.md). No Cloudflare provisioning or Production deployment is enabled.

Company-management monorepo with independent public-web, backoffice, and member UI cores.

## Current status

The repository contains three frontend applications, a shared backend, staff/member authentication, scoped access administration, bookings, dispatch, company workflows and member commerce. Feature presence does not establish live-service readiness; consult the affected domain source via [context routes](docs/agent-context.md). See [Local development](docs/local-development.md) for startup and access boundaries.

## Development

Use Node >=22.12 and npm >=10.9 (CI uses Node 22). From the repository root:

```sh
npm ci
npm run dev
```

The Local Cloudflare Worker uses port 8787; Public web uses 5173; backoffice uses 5174; member uses 5175. Ports are strict to avoid silently opening the wrong app.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Local Worker/D1/R2, Public, Backoffice and Member together |
| `npm run build` | Build all three frontend applications |
| `npm run build:public` | Build public web only |
| `npm run build:backoffice` | Build backoffice only |
| `npm run serve:build:public` | View built Public files on loopback 4173; no API or deployment |
| `npm run serve:build:backoffice` | View built Backoffice files on loopback 4174; no API or deployment |
| `npm run lint` | Repository ESLint checks |
| `npm run db:migrate` | Apply reviewed migrations to Local D1 only |
| `npm run local:mail` | List Local verification/reset mail without printing tokens |
| `npm run db:check` | Check running Local Worker, D1 and R2 health |
| `npm run test:backend` | Backend unit tests |
| `npm run check` | Lint, backend/frontend unit tests and all three frontend builds |

Outputs: `frontend/public-web/dist`, `frontend/backoffice/dist`, and `frontend/member/dist`. There is one root package-lock.json; do not generate application-local lockfiles.

## Project map

- `frontend/public-web`: customer website; independent `src/core/ui`.
- `frontend/backoffice`: company staff application; independent `src/core/ui`.
- `frontend/member`: customer application with its own UI core and customer session boundary.
- `backend`: backend module boundaries and composition locations.
- `packages/contracts`: browser-safe API contracts only.
- `packages/config`: shared development tooling only.
- `backend/prisma`: preserved source schema/migrations for provenance and reference generation; executable Local migrations are in `backend/prisma-d1`.
- `database`: database architecture/reference placeholders; no duplicate migration ledger.
- `infrastructure`: hosting/environment configuration.
- `scripts`: project utilities.
- `docs`: architecture, access plan and deployment guidance.

For agent implementation/audit work, use [the delivery workflow](docs/agent-workflow.md). Load only task-relevant documents through [context routes](docs/agent-context.md).

## Backoffice page structure

The [menu/page map](docs/backoffice-menu-map.md) reserves 12 menus and 34 pages under both `frontend/backoffice/src/features` and `backend/src/backoffice`. The map includes reserved scaffold folders; inspect current routes and implementations to determine which pages work. Backend domain modules remain the owners of business rules.

See [Local Auth/API cutover](docs/local-auth-api-acceptance-2026-09-30.md) for the current implementation, evidence and explicit acceptance limits. Preview/Supabase connection notes are historical, not current startup instructions.
