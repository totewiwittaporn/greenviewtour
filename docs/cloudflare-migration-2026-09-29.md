# Cloudflare migration audit and foundation — 29 September 2026

> Historical checkpoint. The 30 September Local/Production-only policy supersedes ALL Preview creation/deployment steps below. Do not execute them. See [the current checkpoint](local-migration-2026-09-30.md).

## Decision

Greenview Tour will use Cloudflare as the target runtime before hosted Preview is created. The end state removes Supabase/PostgreSQL from application runtime:

```text
GoDaddy registrar
  -> Cloudflare DNS
     -> Public / Member / Backoffice static assets
     -> API Worker
        -> D1 (relational data)
        -> R2 (images, PDFs, evidence, document assets)
        -> Cloudflare Email Service (verification, reset, invitation)
        -> LINE / payment provider webhooks
```

Greenview is the pilot. Chalin Clothes is not migrated in this branch.

No Production resource, DNS record, business row, payment, email or LINE message is changed by this foundation.

## Source audit

The current application is not a connection-string-only migration.

- Prisma/PostgreSQL schema: 68 models, 2 enums, 31 historical migrations.
- PostgreSQL native annotations: 168 UUID, 109 timestamptz, 35 date, 30 decimal, plus schema-qualified tables.
- Backend command code: 53 interactive Prisma transactions across 25 files.
- Raw database operations: 15 queryRaw reads and 26 executeRaw writes.
- PostgreSQL-specific behavior includes app_private/search_path, arrays and array predicates, GIN, JSONB operators, ILIKE-style Prisma case-insensitive filters, timezone casts and historical DO blocks.
- Three models store binary bytes in PostgreSQL: DocumentAsset, EvidenceAttachment and WebsiteImage.
- Auth currently depends on Supabase Auth and directly checks Supabase auth.sessions/auth.users. Runtime sessions are held in a process-local Map.
- The local API is a Node http server and intentionally refuses production mode.

Therefore the migration is implemented as a parallel Cloudflare path until D1 parity passes. The existing PostgreSQL path remains a reference baseline only during the transition.

## D1 representation

A generated D1 Prisma schema is derived from the canonical PostgreSQL schema by `backend/scripts/generate-d1-schema.js`.

| PostgreSQL source | Cloudflare/D1 representation |
| --- | --- |
| schema app_private | single D1 namespace |
| UUID native fields | TEXT UUID values |
| timestamptz/date | Prisma SQLite DateTime representation |
| decimal | Prisma SQLite decimal representation; money invariants remain covered by domain tests |
| enums | SQLite/Prisma scalar enum representation |
| Json | SQLite JSON value; local D1 probe verifies JSON extraction |
| scalar PostgreSQL arrays | transitional Json arrays; high-query array predicates must be ported before cutover |
| GIN index | removed; D1-specific lookup strategy required |
| Bytes | removed from D1; replaced by unique R2 objectKey |

Relation list fields remain relations and are not converted to Json.

The generated schema contains the same 68 business models. `prisma-d1/migrations/0001_baseline.sql` is generated from an empty SQLite database rather than attempting to replay PostgreSQL migration SQL.

## R2 boundary

D1 rows do not own large binary payloads. Cloudflare models store only file metadata, digest and a deterministic object key.

- `document-assets/<key>`
- `evidence/<id>`
- `website-images/<id>`

`platform/files/R2FileStore` owns R2 put/get/head/delete operations. This also avoids D1 row/value limits for the existing multi-megabyte upload flows.

## Transaction strategy

Prisma interactive transactions cannot be treated as equivalent on D1. Existing command semantics must be preserved deliberately.

1. Keep version fields, request hashes, unique constraints and actor-bound idempotency.
2. Port simple independent reads to Prisma D1.
3. Port atomic mutation groups to D1 batch / compare-and-set statements.
4. Rewrite PostgreSQL raw JSON projections to portable projections or D1 SQL.
5. Replace PostgreSQL scalar-array filters with normalized lookup tables or reviewed D1 JSON queries.
6. Run existing concurrency/finance/stock/capacity tests against the D1 implementation before removing PostgreSQL code.
7. Use a coordination primitive such as a Durable Object only where D1 batch + optimistic concurrency cannot preserve the existing invariant.

No financial/stock/booking command is considered migrated merely because it compiles with the D1 adapter.

## Auth target

Supabase Auth is temporary baseline code and will be removed after Cloudflare auth acceptance.

Target:
- Better Auth with D1-backed users/sessions/accounts/verification records.
- Existing UserProfile/UserRole/Permission remains the business authorization source.
- Staff registration remains invitation-only.
- Customer registration remains customer-facing.
- Password policy remains minimum 12 characters where currently required.
- Email verification, invitation and password reset use a Cloudflare Worker email transport after Cloudflare DNS/email configuration exists.
- No process-local session store in hosted runtime.

## Worker runtime

`backend/src/cloudflare/worker.ts` is the new Worker entry point.

Current proof endpoints:
- `GET /health/live`
- `GET /health/db` — verifies native D1 and Prisma D1 adapter
- `GET /health/storage` — verifies the R2 binding is readable

Wrangler is always invoked with the committed non-secret `backend/cloudflare.env`. This prevents the existing ignored Supabase/PostgreSQL `backend/.env` from being loaded into the Worker.

## Local proof completed

Using Wrangler 4.143.0 and Prisma 7.10.0:

- D1 Prisma schema validates.
- Cloudflare Prisma client generates successfully.
- D1 baseline applies locally: 179 SQL commands.
- Worker dry-run bundles successfully with only DB/R2/application bindings.
- `/health/live` returns UP.
- `/health/db` returns UP and Prisma can count Role rows.
- `/health/storage` returns UP through the local R2 binding.
- Direct local D1 JSON probe stored a nested JSON value as text and `json_extract()` returned the expected boolean/value.
- No Supabase/PG variables appear in Cloudflare generated environment types when using the isolated env file.

## Remote Preview gate

Wrangler currently reports **not authenticated**. No remote Cloudflare resource has been created.

After the owner creates/connects the Cloudflare account, create the Preview resources only:

```bash
npx wrangler login
npx wrangler d1 create greenviewtour-preview --location=apac
npx wrangler r2 bucket create greenviewtour-preview-files
```

Then replace the placeholder D1 database ID in `backend/wrangler.jsonc`, apply reviewed migrations with `--remote`, and deploy only Preview.

Do not create Production D1/R2 or change GoDaddy nameservers in this migration phase.

## Remaining port order

1. Portable reads/search/JSON projections.
2. Scalar-array lookup strategy.
3. R2-backed image/evidence/document flows.
4. Booking/capacity/stock command transactions.
5. Receivables/finance command transactions.
6. D1-backed auth/session/email.
7. Convert Node req/res router to Worker Request/Response API.
8. Run full unit + browser + D1 concurrency regression.
9. Create remote APAC Preview after Cloudflare login.
10. Configure hosted FE/API Preview.
11. Only after owner acceptance: Production resources and GoDaddy -> Cloudflare DNS cutover.


## Foundation checkpoint after portability pass

The first Cloudflare foundation checkpoint now includes:

- Cloudflare Worker entry point with isolated non-secret configuration and APAC D1 location hint.
- Deterministic D1 Prisma schema derived from the PostgreSQL source schema; 68 business models remain represented.
- Local D1 baseline plus generated scalar-array lookup tables/triggers and JSON projection triggers.
- R2 file boundary for document assets, evidence and website images; D1 stores object keys only.
- Portable JSON field readers replacing PostgreSQL jsonb projection SQL in list/read paths.
- D1 query compatibility for case-insensitive string search and SQLite JSONPath translation.
- PostgreSQL scalar-array business filters removed from service code; D1 uses indexed lookup tables while PostgreSQL baseline keeps native has/hasSome through the compatibility helper.
- D1 indexed JSON range projections for FinancePersonnelRecord.payload.dueOn, FinancePersonnelRecord.payment.paidOn and CustomerRequest.snapshot.payment.receivedOn.
- Indexed OperationDailySnapshot.runs.length so notification list views remain lean on D1 without loading the runs JSON payload.
- Job Order document reads ported from three PostgreSQL raw joins to bounded Prisma relation/select queries with explicit JSON allowlists.
- Raw reads reduced from 15 to 10 while preserving existing bounded aggregate/report SQL where replacing it would cause over-fetching.
- Business code contains no PostgreSQL scalar-array has/hasSome filters outside the compatibility helper.
- No PostgreSQL-only JSON range filter remains in business service code.

Checkpoint verification:
- Backend tests: 416 passed, 0 failed.
- Frontend tests: passed.
- ESLint: passed.
- Public / Backoffice / Member production builds: passed.
- Cloudflare Worker dry-run: passed.
- Local D1 migrations and D1/R2 runtime probes: passed.
- Wrangler remains unauthenticated, therefore no remote D1/R2/Worker resource exists yet.

The next migration gate is transaction semantics. Prisma's D1 adapter explicitly does not provide ACID transaction guarantees, so no multi-write business flow is considered migrated until it is rewritten around D1 atomic batch / compare-and-set semantics and passes the existing finance, stock, booking and concurrency regressions.


## Atomic write checkpoint

Two identity write flows now have explicit D1 atomic implementations while retaining the PostgreSQL reference path:

- Self profile edit: conditional audit + optimistic profile update in one D1 batch; stale timestamps and concurrent suspension fail closed.
- Manager profile edit: batch guards actor accessVersion/status and target accessVersion/updatedAt so permission revocation or target access changes cannot race the update.
- User access changes: roles, permission overrides, accessVersion/updatedAt and audit are written in one guarded D1 batch.
- User access batch statements are guarded by both actor and target accessVersion. A stale target produces ACCESS_CONFLICT; a revoked manager produces PERMISSION_DENIED.
- PostgreSQL implementations remain unchanged for parity testing.

Local D1 SQL probes confirmed:
- profile update + audit succeeds together;
- stale profile update creates no audit;
- manager profile guards compile and update correctly;
- multi-table access change updates accessVersion, roles, override and audit correctly.

Full `npm run check` passes after this checkpoint.

## Pause checkpoint — 29 September 2026 late evening

Work is intentionally paused here before continuing the Cloudflare Auth/Worker cutover.

Completed and committed on `feat/cloudflare-d1-foundation`:
- `1530dcc` — initial Cloudflare D1 foundation.
- `c11bf95` — atomic D1 identity/profile/access writes.
- `9e28d37` — hardened R2 conditional file writes and D1/R2 client bindings.
- `16a0c17` — `npm run check:quiet`; verbose validation writes to a temp log and prints only the summary/failure tail.
- `e0737f5` — D1-safe read transactions plus R2-backed document/image/evidence reads.
- `856e05d` — atomic D1 + R2 evidence writes, including customer payment-proof status transition and audit.

Latest validated checkpoint:
- Backend: 432 passed, 0 failed.
- Frontend: 53 passed, 0 failed.
- Public, Backoffice and Member production builds passed.
- Cloudflare Worker dry-run passed.
- D1/R2 targeted tests passed.
- Production has not been touched.

Current external state:
- Wrangler is not authenticated.
- No remote Greenview D1, R2 or Worker Preview resource exists yet.
- No Cloudflare Production resource or DNS cutover exists.
- The feature branch has not been pushed successfully to GitHub yet; an old hung push process was terminated.

Exact resume point:
- One uncommitted file remains: `backend/src/platform/auth/sessions.js`.
- That edit only started session abstraction work (`replace`, `logout`, async `deleteUser`); it is not an accepted checkpoint yet.
- Next gate is Cloudflare Auth/session: replace Supabase Auth + process-local `SessionStore.entries Map` with Better Auth/D1-backed persistent sessions.
- Then adapt the existing API handler to the Worker runtime, keeping business handlers rather than rewriting routing unnecessarily.
- Then port remaining write transactions in booking/capacity/stock, receivables/finance, invitations/settings/company work, with D1 batch/CAS semantics and concurrency regression.
- After local acceptance: authenticate Wrangler, create Preview-only APAC D1/R2, apply reviewed remote migrations, migrate Preview data/files, and deploy Preview.
- Production remains gated on owner acceptance.

Timeout prevention rule:
- Never broad-search `dist`, `node_modules`, generated clients or build artifacts.
- Verbose tests/builds/searches must write to `/tmp` logs and return only summary/error tails.
- The latest timeout was caused by a broad frontend auth grep reading minified `dist` bundles, not by a failed migration.
