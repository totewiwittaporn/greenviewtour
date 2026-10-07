# Item 3 accepted: D1 schema, Prisma, SQL and business transactions

Date: 30 September 2026. Target: Local on the owner's Mac only.

## Acceptance boundary

Item 3 is complete for the Greenview business data layer: schema/native-value compatibility, Prisma reads/writes, the repository's callback transaction patterns, PostgreSQL-specific business queries, and reviewed D1 migrations. Item 4's imported data/files remain verified.

This is NOT an Auth/API/frontend cutover or Production release. Supabase login/session replacement is item 5; Worker application routing and frontend connection are item 6. The old Node/Supabase reference path and its dependencies are retained until those replacements pass; do not use `npm run dev` for new tests. No hosted Preview or Production resource was created, deployed or removed.

## Implementation

| Boundary | Owner |
| --- | --- |
| Prisma D1 client and callback units | `backend/src/platform/database/d1-client.ts` |
| Deferred writes, overlay reads, snapshot validation, commit/retry | `backend/src/platform/database/atomic/` |
| Portable business/report SQL | `sql-dialect.js`, `write-lock.js`, `identity-directory.js` |
| User directory | `modules/identity-access/list-users-d1.js`, Local `D1Identity` projection |
| Historical explicit D1 batches | `d1-atomic.js`; direct affected-row counts remain correct with revision triggers |
| Metadata build validation | `backend/scripts/generate-d1-atomic-metadata.mjs` |
| Complete isolated business regression | `npm run local:check:business` |

Prisma Client, the D1 adapter and its directly imported driver utilities are pinned to the tested 7.10.0 version. The lockfile was synchronized offline without changing installed dependency versions.

The local client no longer merely rejects the business transactions that were pending in item 3. Supported operations plan writes without mutating the database, provide read-your-writes, and commit a native D1 batch only after a revision compare-and-set succeeds. Root writes and nested relation operations share this mechanism.

Revision triggers cover all 76 admitted business/helper/directory tables (228 insert/update/delete triggers). A failed statement rolls back the batch. A concurrent change invalidates the snapshot and retries the whole callback with a bounded budget; exhausted conflicts fail closed. Reads also validate their snapshot rather than silently returning mixed data.

Money updates use decimal arithmetic with precision/scale validation. UUIDs, enum values, dates, lengths and JSON values retain the reviewed native constraints; literal JSON null is not SQL NULL. Long search patterns and large parameter lists preserve tested query semantics without interpolating user input.

The planner is a reviewed compatibility boundary for THIS repository, not a universal PostgreSQL emulator. Unknown SQL, unsupported mutation shapes and exceeded limits fail explicitly. Callback units must not send email/LINE/payments or perform external object writes: retryable work is database-only. The R2 boundary rejects object writes inside a retried callback. R2 and D1 are not one cross-service transaction; existing conditional upload/idempotency/reconciliation rules still apply.

Current per-unit ceilings: 2,500 staged rows, 800 staged statements, a 950-query budget, 1.8 MB bound context and 99 KB SQL; at most four attempts. Global revision contention can produce a retry/conflict under heavy unrelated writes. These budgets target Workers Paid's D1 query allowance; free-plan throughput or Production-scale performance is not asserted by Local acceptance. Schema additions must supply revision triggers and migration checksums before generation/preflight succeeds.

## Active Local migrations

The active database now has all SIX migrations:

1. `0001_baseline.sql`
2. `0002_scalar_array_lookups.sql`
3. `0003_json_range_projections.sql`
4. `0004_atomic_unit_of_work.sql`
5. `0005_json_projection_null_values.sql`
6. `0006_identity_optional_created_at.sql`

The first three historical migration files were not rewritten. All six have checked-in SHA-256 checksums. Local and future Production use the same `backend/prisma-d1/migrations` directory; no remote application is authorized here.

Migration 6 preserves missing source identity creation dates as NULL, keeps existing directory rows, recreates uniqueness/revision triggers, and avoids inventing timestamps. Explicit null ordering matches the prior directory SQL. Seven source identities have no creation date.

## Active data and identity projection

All 68 business tables / 9,315 rows retain their pre-migration table hashes. `local:data:verify` additionally reconfirms row values, all 30 decimal fields, seven R2 files, derived lookup/projection data, and all 68 business Prisma models through the real Worker runtime.

The Local directory contains 39 source identity metadata records. Passwords, refresh tokens and sessions were NOT imported. All 35 staff profiles have a directory match. The previously identified one customer profile without a source Auth identity remains unchanged and must be resolved in item 5; no fake identity was created. Directory projection is not a replacement login service.

## Final verification

- `npm run check:quiet`: 462 backend and 53 frontend tests passed, ESLint passed, all three frontend builds passed, Worker dry-run passed.
- Aggregate log: `/tmp/greenview-check-2026-09-30T07-52-28-281Z.log`.
- Final complete browser fixtures passed with zero runtime errors and zero real business writes; log `.local/item3-final-browser.log`.
- `npm run local:check`: fresh six-migration DB, native D1 batch rollback, R2 conditional writes, restart persistence and Worker health passed; log `.local/item3-final-runtime.log`.
- `npm run local:check:business`: all 11 groups passed together against one final code revision on a disposable copy, not the active business database. Evidence `.local/item3-tests-cwhVgq/result.json` and `.local/item3-final-business.log`.
- Groups: core, capacity, operations, dispatch, reports, finance, identity, member, catalog, attendance and demo.
- Added adversarial checks: native-writer interference during reads, phantom insertion and permission revocation before commit; all passed.
- Finance includes 3500 received / 2300 net / 1200 old-debt offset with retry and no duplicate cash movement. Capacity includes a staff confirmation and web hold competing for the last seat without overselling.
- Auth providers, live payment and LINE transports are stubs/disabled in these service tests; this is data-layer verification, not real login or real external delivery.
- `local:identity:import` and `local:identity:verify`: 39 metadata records verified against the private backup; zero password/session fields imported.
- `local:data:verify` after migration: PASS, evidence `.local/data-import-2xpS1E/verification.private.json` (private), with current atomic-read and zero-leaked-guard checks through workerd.

The post-import verification contract now tests working atomic reads and an empty guard table. The old item-4 proof of deliberately BLOCKED transactions is retired; its mismatch was fixed and regression-tested rather than accepting an obsolete condition.

## Reproducible Local commands

Run `npm run local:check:business` for the complete 11-group service regression. Run `npm run local:check` for infrastructure checks. `local:data:verify` and `local:identity:verify` take `-- --source` followed by the original private snapshot directory. All runners refuse Production/remote targets. Do not run tests against Production or restore source session tokens.

Before-mutation code/state backup: `~/GreenviewBackups/20260930T073352Z-item3-resume/`. Its all-table hash snapshot is the pre-migration reference. Final code/state backup and commit identifiers are recorded in the handoff; the unrelated pre-existing `sessions.js` edit stays uncommitted and unchanged.

References checked: Cloudflare D1 native `batch()` transaction/rollback contract and D1 platform query/size limits in the official documentation. Prisma's unmodified D1 interactive-transaction behavior is NOT treated as the atomicity implementation.

Final accepted Local state backup: `~/GreenviewBackups/20260930T075357Z-item3-accepted/` (verified SQLite snapshots and private state archive; final code bundle added after commit).
