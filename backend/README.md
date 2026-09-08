# Backend API

The Preview PostgreSQL connection adapter is implemented in `src/platform/database`. Run `npm run db:check` from the repository root after supplying private environment configuration; see `docs/database-connection.md`.

There is no HTTP server, authentication flow or business endpoint yet. `src/backoffice/<menu>/<page>` reserves page adapters and `src/modules` owns future business rules.
