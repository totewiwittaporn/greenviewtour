# Historical document — not current execution instructions

Use [the Local/Production workflow](../local-production-workflow.md). The original text below is retained as dated evidence only.

# Deployment integration

> Current policy: Local development/testing on the Mac and Production on Cloudflare only. No hosted Preview. Older Preview guidance below is historical; follow [the current migration checkpoint](../local-migration-2026-09-30.md). No Production deployment is currently authorized.

No hosting changes or deployment are performed by this foundation. Before connecting an existing host, inspect its current build settings and branch triggers.

Use repository root as install/build working directory and `npm ci` for the frontend applications. Public command: `npm run build:public`; output: `frontend/public-web/dist`. Backoffice command: `npm run build:backoffice`; output: `frontend/backoffice/dist`. The previous root `dist` path is no longer produced. Do not change a production build path without verifying it in preview first.

Member command: `npm run build:member`; output: `frontend/member/dist`. Build commands only produce local artifacts; they do not deploy.

Separate preview/production environment values and credentials. VITE_* variables are public browser values; secrets belong only in server environments. Do not commit .env files. API hosting readiness must be verified against the actual target. Prisma migration files and `db:migrate` exist; the command does not itself prove that the selected database is Preview. Verify the target before any authorized migration.

Rollback of the structural migration should revert its commit through review; then restore any changed hosting paths. This branch does not alter hosting settings.

## Search crawler boundary

Only the Public website is intended for search indexing. Member and Backoffice ship `meta robots` with `noindex, nofollow, noarchive, nosnippet`, a root `robots.txt` with `Disallow: /`, and a static-host `_headers` rule emitting the same `X-Robots-Tag`. Public Core keeps the owner-approved quiet Staff login entry centered in the footer bottom bar: Local points to Backoffice port 5174 and hosted Public renders it only when `VITE_STAFF_LOGIN_URL` is configured. Member Login/Register remains a customer-facing entry point but is excluded from indexing.

Crawler directives are not an authentication mechanism. Backoffice and Member security continues to depend on server-side sessions, authorization, origin checks and private `app_private` database grants. If Backoffice is hosted on a public network, a separate edge access policy such as Cloudflare Access may be added after the actual deployment target and staff access requirements are verified; do not treat URL secrecy or robots rules as that security boundary.
