# Local data migration checkpoint — 30 September 2026

> Current status: Item 3 is accepted. See [D1 data-layer acceptance](d1-data-layer-acceptance-2026-09-30.md) for the completed SQL/transaction work, SIX applied Local migrations, identity metadata and final tests. Earlier pending data-layer notes below are historical; application cutover remains separate.

## Result and boundary

The backed-up Greenview business data and embedded files have been imported, reconciled and promoted into the active Local D1/R2 state on the owner's Mac. No remote database/API was used during this migration, no source rows or Cloudflare resources were changed, and no Production deployment was performed.

Two target environments only: Local for all development/testing, Production for real use. No hosted Preview. A private snapshot is a migration source, not a third running environment.

**Completed:** source schema/value validation, local importer, exact data reconciliation, R2 conversion, guarded promotion, restart verification and rollback preservation.

**Not completed:** remaining PostgreSQL-specific business SQL and transaction ports, Auth/login replacement, Worker business routes, or frontend cutover. The new D1 adapter rejects unported Prisma transactions instead of allowing partial writes. It does not implement those business transactions. The existing `npm run dev` is still the legacy Node/Supabase path and must not be used for new development/testing.

## Source and destination

Source snapshot: `~/GreenviewBackups/20260930T024829Z/migration-export.private/`, completed `2026-09-30T02:53:29.562Z` (09:53 Bangkok). The original dump and checksum manifest remain unchanged. This is a point-in-time snapshot, not a live synchronization.

Active Local state: `.local/cloudflare/v3`, using the existing Local Worker DB/FILES bindings.

| Evidence | Verified result |
| --- | --- |
| Business tables / rows | 68 / 9,315 |
| TourBooking / TourProgram / BusinessPartner | 534 / 32 / 25 |
| UserProfile / CustomerProfile | 35 / 6 |
| Embedded files moved to Local R2 | 7 (1 DocumentAsset, 3 EvidenceAttachment, 3 WebsiteImage) |
| Decimal fields reconciled | 30 (22 populated) |
| Timestamp / date-only values | 7,225 / 1,529 |
| Declared foreign-key entries / violations | 59 / 0 |
| Models read via Prisma in real workerd | 68 |

## Conversion and integrity

The three existing D1 SQL migrations were not rewritten. Runtime table columns and primary keys are checked against both source and target Prisma schemas; inserts follow the declared FK dependency order. Binary fields become deterministic R2 object keys using the existing file-store contract.

Raw numeric JSON tokens are preserved through Node's JSON.parse source context and Decimal, not first coerced through JS Number. Decimal scale/precision and every migrated value/column total are checked. This proves snapshot preservation, not exact future SQLite floating-point arithmetic; financial mutation code still needs its separate port and regression gate.

Date-only fields retain their calendar dates; timestamps retain their instants in canonical UTC form. Submillisecond source timestamps are rejected rather than silently truncated. This snapshot contains none. Scalar enums, UUIDs, string bounds, nullability, booleans and integers are validated. JSON values and arrays are compared structurally, including numeric values.

Because row_to_json alone conflates SQL NULL and JSON null, the importer extracts COPY data from the matching local pg_dump archive and maps SQL-null flags by primary key. The dump and exports are checksum-verified. All seven R2 files are checked by key, MIME type, byte count, stored digest and recalculated SHA-256. All six array lookup tables and JSON range projections are independently reconciled against source records.

Native D1/R2 verification checks every migrated row/field. Prisma verification runs in a separate loopback-only, token-protected workerd entry point (not in Node, whose WASM loading differs): counts and scalar decoding of samples across all 68 models are tested against native D1. No business records are returned to the caller or printed in logs. That entry point is not the application Worker.

## Known source identity issue — preserved, not repaired silently

All 35 staff profiles have a matching Auth user in the snapshot. One of the six CustomerProfile rows is ACTIVE but its authUserId has no matching Auth user in that same snapshot. The business row was preserved unchanged. No account was invented, reactivated or deleted.

The 39 source Auth accounts/passwords/session tokens remain in the private backup, not imported into D1. Login migration is a separate step. Missing identity details are stored only in `source-identity-issues.private.json`. Auth cutover remains blocked pending an explicit resolution based on source evidence and intended ownership.

## Promotion and safeguards

Import runs under the same exclusive Local-state lock as managed dev/migration commands. It refuses Production context, arbitrary flags, remote bindings, unreviewed secret files, state symlinks, open active-state handles and a populated target. Source data is loaded into a fresh isolated state; failed runs are retained separately, never promoted.

Only after native D1/R2, real Worker Prisma and restart reconciliation pass is the prior state renamed to a retained backup and the candidate promoted. A pending-promotion journal blocks startup after an interrupted promotion. Do not delete a lock or journal without inspecting its owner PID and actual paths; they are safety gates, not temporary clutter.

The successful promotion retained the old empty state at `.local/data-import-2MZx95/previous-local-state/`. Earlier trial states were not promoted. Re-import into the populated active target was tested and refused without overwriting data.

## Evidence and commands

Primary evidence: `.local/data-import-2MZx95/reconciliation.private.json`, `independent-verification.json`, `promotion.json`, and Prisma proof files. A subsequent full verification of the promoted active state passed at `.local/data-import-qSK18e/verification.private.json`.

An additional, independently implemented Python Decimal/read-only SQLite comparison verified all 9,315 rows and 125,175 non-binary scalar cells against checksum-verified source JSONL, with zero mismatches and zero foreign-key violations. Binary content is checked separately against R2. The source contains no JSON-literal-null cells; the dedicated conversion regression covers that distinction synthetically.

| Command (from repository root) | Behavior |
| --- | --- |
| `npm run local:data:plan -- --source <absolute snapshot directory>` | Validate source/schema and produce a plan; no active business writes |
| `npm run local:data:import -- --source <absolute snapshot directory>` | Import and promote only into an empty Local target |
| `npm run local:data:verify -- --source <absolute snapshot directory>` | Compare active data with this source snapshot; refuses another source fingerprint |
| `npm run local:dev` | Local health-only Worker, NOT a completed application cutover |

The verify command deliberately fails after intentional changes to test data because it is snapshot reconciliation, not a generic application health check. Do not use import to reset a populated database; it intentionally refuses. Plan a separate, explicit Local reset/seed workflow later.

All data exports, temporary audit tokens and detailed reports remain under private ignored `.local` directories or owner-only backup directories outside Git. Do not commit these files or attach them to a public issue. No new Production resource IDs or deployment workflows were added.

## Regression checkpoint

- Backend: 448 passed / 0 failed; Frontend: 53 passed / 0 failed.
- ESLint and all three frontend builds passed.
- Worker dry-run passed; `/tmp/greenview-check-2026-09-30T04-32-54-220Z.log`.
- Isolated Local runtime regression passed: `.local/runtime-check-GrP5IP/result.json`.
- Full active-data verification, duplicate-import refusal and independent SQLite reconciliation passed.
- Full browser fixture suite passed with zero runtime errors and zero real business writes: `.local/browser-fixtures-data-import-20260930.log`.

## Next work

Resolve the source customer/Auth orphan from evidence, migrate Auth and persistent sessions, adapt API transport to Worker, and port remaining domain SQL/mutations with D1 atomicity and real concurrency regressions. Then connect Public, Backoffice and Member to the local stack and replace legacy dev/seed scripts. No Production deployment or source/resource deletion is authorized by this data checkpoint.

## Private recovery copy

After promotion, the active Local state was archived and fully read back, and eight SQLite databases received independent backup-API snapshots passing quick_check. Recovery copy: `~/GreenviewBackups/20260930T043333Z-local-data-import/`. Both prior Local state and original Supabase snapshot remain preserved. This is recovery material, not a new environment.
