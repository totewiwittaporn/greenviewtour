# Greenview Tour backend

## Current architecture

Verified 2026-11-13. Production uses Cloudflare Workers, Cloudflare D1 and R2. It is not the former Supabase/PostgreSQL BFF deployment.

- Worker entry: `src/cloudflare/worker.ts`.
- Records: D1 binding `DB`, accessed through `src/platform/database/d1-client.ts` and the Prisma D1 adapter.
- Files: R2 binding `FILES`.
- Public Worker: `src/cloudflare/public-worker.js` serves the public frontend via Workers Static Assets and uses the `API` service binding.
- API/backoffice release configuration includes backoffice static assets.
- Authentication and access checks run through the current Worker and domain implementations. The earlier statement that Supabase owns current production authentication is obsolete.

See the [root overview](../README.md), `wrangler.production.jsonc.example`, and `wrangler.public.production.jsonc.example`. Example configurations intentionally contain disabled values/placeholders; use the verified release configuration for deployment status.

## Development and historical sources

Start the Local Worker through root `npm run dev`; executable D1 schema/migrations are under `prisma-d1`. Root scripts define Local-only migration and health checks.

`prisma/schema.prisma`, older PostgreSQL/Supabase platform code and historical authentication notes remain as reference/migration history. Their presence is not evidence of a current Supabase production connection. Audit dependencies and call sites before cleanup; do not delete legacy files as part of a documentation correction.

Production health paths may deliberately return 404 under the runtime policy. That behavior alone does not mean the Worker is down.
