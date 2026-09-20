# Deployment integration

No hosting changes or deployment are performed by this foundation. Before connecting an existing host, inspect its current build settings and branch triggers.

Use repository root as install/build working directory and `npm ci` for the frontend applications. Public command: `npm run build:public`; output: `frontend/public-web/dist`. Backoffice command: `npm run build:backoffice`; output: `frontend/backoffice/dist`. The previous root `dist` path is no longer produced. Do not change a production build path without verifying it in preview first.

Member command: `npm run build:member`; output: `frontend/member/dist`. Build commands only produce local artifacts; they do not deploy.

Separate preview/production environment values and credentials. VITE_* variables are public browser values; secrets belong only in server environments. Do not commit .env files. API hosting readiness must be verified against the actual target. Prisma migration files and `db:migrate` exist; the command does not itself prove that the selected database is Preview. Verify the target before any authorized migration.

Rollback of the structural migration should revert its commit through review; then restore any changed hosting paths. This branch does not alter hosting settings.
