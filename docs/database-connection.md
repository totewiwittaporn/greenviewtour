# Preview database connection

## Verified project

- Project: Preview-Greenview-Tour
- Ref: qplzgpyidszxbtbyknjc
- Region: ap-southeast-1 (Singapore)
- API URL: https://qplzgpyidszxbtbyknjc.supabase.co
- Direct DB host: db.qplzgpyidszxbtbyknjc.supabase.co
- Management connection confirmed ACTIVE_HEALTHY and PostgreSQL 17.6 with a read-only query.

## Server setup

1. Copy `backend/.env.example` to `backend/.env` (ignored by Git).
2. Obtain PostgreSQL parameters from this project's Dashboard > Connect. Direct port 5432 requires IPv6. For IPv4, select Session pooler port 5432 and copy its exact host and `postgres.qplzgpyidszxbtbyknjc` username. The pooler host is not inferred from the region.
3. Enter the existing database password as PGPASSWORD privately. Quote environment values containing # or whitespace. Do not paste passwords into chat, commit them, or put them in VITE_* variables.
4. If the endpoint requires a custom trusted CA, download its certificate from Supabase and set PGSSLROOTCERT to that file path. Certificate verification remains mandatory.
5. Run `npm run db:check` from the repository root. It loads backend/.env, executes SELECT 1 and closes the pool. Success prints only UP, Preview and the project ref; failure exits nonzero without raw database errors or credentials.

The Supabase API publishable/secret keys are not PostgreSQL passwords. The connected management tool's SQL access does not supply application connection credentials. No database password was available to this change, so the application's live PostgreSQL connection is pending environment entry and a successful db:check.

The postgres login is for this initial connection diagnostic. Business endpoints must establish an appropriately restricted runtime role and server-side authorization before use; postgres access must not be mistaken for user-scoped RLS enforcement. No HTTP server, schema changes, user accounts, grants or database password resets are included.

## Runtime contract

The adapter accepts only the verified Preview ref, direct host or Singapore session pooler with the matching project username, postgres database and port 5432. It fails closed for another environment/project. TLS verifies certificates; connection and query timeouts are bounded; pool size is 3. Deployments must close the pool during shutdown. Production support needs a separately reviewed environment configuration.

## Verification

- Management-tool live query: successful; not a Backend connection test.
- Backend configuration tests: direct/pooler accepted; wrong projects, unsafe TLS, invalid credentials/configuration rejected; DB probe success/failure covered with test doubles.
- Application live connection: blocked until private PostgreSQL credentials are configured.

Sources: https://supabase.com/docs/guides/database/connecting-to-postgres and https://node-postgres.com/features/ssl.

## Session pooler recovery — 2026-09-09

The owner supplied the exact Preview session-pooler endpoint `aws-0-ap-southeast-1.pooler.supabase.com:5432`, database `postgres`, user `postgres.qplzgpyidszxbtbyknjc`. The ignored server environment now uses these values with the existing private password and verified TLS. This supersedes the initial pending-credentials status above. The workstation direct IPv6 route was unavailable (ENETUNREACH); session-pooler `db:check` returned UP for the verified Preview ref. All three pending dispatch/resource/daily-summary migrations were applied with Prisma, bringing the applied count to 12. Dispatch integration passed 23 real-database checks and removed its isolated fixtures.
