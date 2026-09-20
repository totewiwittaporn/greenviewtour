# Greenview Tour

Company-management monorepo with independent public-web, backoffice, and member UI cores.

## Current status

The repository contains three frontend applications, a shared backend, staff/member authentication, scoped access administration, bookings, dispatch, company workflows and member commerce. Feature presence does not establish live-service readiness; consult the affected domain source via [context routes](docs/agent-context.md). See [Local development](docs/local-development.md) for startup and access boundaries.

## Development

Use Node >=22.12 and npm >=10.9 (CI uses Node 22). From the repository root:

```sh
npm ci
npm run dev
```

Public web uses port 5173; backoffice uses 5174; member uses 5175. Ports are strict to avoid silently opening the wrong app.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Backend, Public, Backoffice and Member together |
| `npm run build` | Build all three frontend applications |
| `npm run build:public` | Build public web only |
| `npm run build:backoffice` | Build backoffice only |
| `npm run preview` | Serve built public web on 4173 |
| `npm run preview:backoffice` | Serve built backoffice on 4174 |
| `npm run lint` | Repository ESLint checks |
| `npm run db:migrate` | Apply reviewed Prisma migrations to the explicitly verified Preview target |
| `npm run owner:invite -- "email" "name"` | Prepare the explicitly identified first owner invitation |
| `npm run db:check` | Verify Preview DB using private Backend environment |
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
- `backend/prisma`: canonical identity schema and Prisma migrations.
- `database`: database architecture/reference placeholders; no duplicate migration ledger.
- `infrastructure`: hosting/environment configuration.
- `scripts`: project utilities.
- `docs`: architecture, access plan and deployment guidance.

For agent implementation/audit work, use [the delivery workflow](docs/agent-workflow.md). Load only task-relevant documents through [context routes](docs/agent-context.md).

## Backoffice page structure

The [menu/page map](docs/backoffice-menu-map.md) reserves 12 menus and 34 pages under both `frontend/backoffice/src/features` and `backend/src/backoffice`. The map includes reserved scaffold folders; inspect current routes and implementations to determine which pages work. Backend domain modules remain the owners of business rules.

See [Preview DB connection](docs/database-connection.md) for server environment setup and current verification limits.
