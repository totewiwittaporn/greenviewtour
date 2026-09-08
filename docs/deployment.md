# Deployment integration

No hosting changes or deployment are performed by this foundation. Before connecting an existing host, inspect its current build settings and branch triggers.

Use repository root as install/build working directory and `npm ci` for both applications. Public command: `npm run build:public`; output: `apps/public-web/dist`. Backoffice command: `npm run build:backoffice`; output: `apps/backoffice/dist`. The previous root `dist` path is no longer produced. Do not change a production build path without verifying it in preview first.

Separate preview/production environment values and credentials. VITE_* variables are public browser values; secrets belong only in server environments. Do not commit .env files. API deployment and database migrations are not available yet.

Rollback of the structural migration should revert its commit through review; then restore any changed hosting paths. This branch does not alter hosting settings.
