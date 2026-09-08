# Greenview Tour

Company-management monorepo with independent public-web and backoffice UI cores.

## Current status

Repository foundation only. Both React entry points render an intentionally empty shell. The API and business modules are documented ownership boundaries, not working services. Login, user management, bookings, accounting and deployment are not implemented.

## Development

Use Node >=22.12 and npm >=10.9 (CI uses Node 22). From the repository root:

```sh
npm ci
npm run dev:public
# In another terminal:
npm run dev:backoffice
```

Public web uses port 5173; backoffice uses 5174. Ports are strict to avoid silently opening the wrong app.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Public-web development alias |
| `npm run build` | Build both frontend applications |
| `npm run build:public` | Build public web only |
| `npm run build:backoffice` | Build backoffice only |
| `npm run preview` | Serve built public web on 4173 |
| `npm run preview:backoffice` | Serve built backoffice on 4174 |
| `npm run lint` | Repository ESLint checks |
| `npm run check` | Lint and build both frontends |

Outputs: `frontend/public-web/dist` and `frontend/backoffice/dist`. There is one root package-lock.json; do not generate application-local lockfiles.

## Project map

- `frontend/public-web`: customer website; independent `src/core/ui`.
- `frontend/backoffice`: company staff application; independent `src/core/ui`.
- `backend`: backend module boundaries and composition locations.
- `packages/contracts`: browser-safe API contracts only.
- `packages/config`: shared development tooling only.
- `database`: future schema/migrations/seeds.
- `infrastructure`: hosting/environment configuration.
- `scripts`: project utilities.
- `docs`: architecture, access plan and deployment guidance.

Read [architecture](docs/architecture.md), [identity and access](docs/identity-access.md), [deployment](docs/deployment.md), [design ownership](DESIGN.md) and [UI contract](UX-CONTRACT.md) before implementing features.

## Backoffice page structure

The [menu/page map](docs/backoffice-menu-map.md) reserves 12 menus and 34 pages under both `frontend/backoffice/src/features` and `backend/src/backoffice`. These are folder scaffolds, not working screens or API endpoints. Backend domain modules remain the owners of business rules.
