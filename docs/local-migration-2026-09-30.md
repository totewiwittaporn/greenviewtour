# Local / Production migration — 30 September 2026

## Approved policy

Local on the owner's Mac is the ONLY development/test target. Production on Cloudflare is for real use only. There is no hosted Preview. No remote resource creation, removal, DNS change or Production deployment is authorized by this checkpoint.

This policy supersedes the Remote Preview sections of `cloudflare-migration-2026-09-29.md` and older environment instructions. Do not execute historical Preview creation/deployment commands.

## Completed scope

1. Preserve code and source data before migration.
2. Establish guarded, persistent, Cloudflare-compatible local Worker/D1/R2 infrastructure.

Data conversion/import, Auth/session replacement, Worker business routes, PostgreSQL transaction portability and frontend cutover are NOT complete. Infrastructure readiness does not mean application readiness.

## Private backups on the owner's Mac

Directory: `~/GreenviewBackups/20260930T024829Z` (outside Git).

- `repository.bundle`: all Git refs, verified with `git bundle verify`.
- `working-tree.private.tar.gz`: working copy and private configuration; reconstructible dependencies/builds excluded.
- `working-tree.patch`, `index.patch`, `git-status.txt`: original working/index changes.
- `sqlite-snapshots/`: consistent backup-API copies of the old local SQLite state.
- `source-database.private.dump`: pg_dump custom archive for app_private/auth/storage/public.
- `migration-export.private/`: JSONL exports from the SAME repeatable-read, read-only snapshot as pg_dump. Decimal/bigint JSON text is not converted through JS Number.
- `SHA256SUMS` and manifests: integrity evidence.

Verified: 68 business tables, 39 Auth users; 104 tables and 10,262 exported rows across the four schemas. Seven embedded files passed SHA-256 checks; the six rows with stored sizes also matched byte lengths. Storage objects were zero. The archive was fully read with pg_restore; an actual PostgreSQL restore has NOT been performed. Supabase service configuration and platform-managed infrastructure are not recreated by this SQL backup.

Backups contain sensitive configuration/Auth data. Keep the directory private (0700; new files 0600), never commit or attach it to an issue, and do not reuse source session tokens in the new Auth system. Source deletion requires successful migration verification and separate removal approval.

`npm run backup:source -- --source-ref <verified Greenview source ref> --directory <NEW private directory outside this repo>` is a read-only backup utility, not another development environment. It refuses existing backup outputs. Homebrew libpq client utilities were installed; no local PostgreSQL server was created.

## Local configuration and commands

Active config: `backend/wrangler.jsonc`, APP_ENV=local. DB and FILES bind only to local D1/R2. The dummy database ID is NOT a provisioned Cloudflare resource ID. State is `.local/cloudflare/v3`; old `backend/.wrangler/state` remains preserved separately.

| Command | Meaning |
| --- | --- |
| `npm run local:setup` | Verify policy/history, generate client/types, apply D1 migrations locally |
| `npm run local:dev` | Start the LOCAL WORKER ONLY at 127.0.0.1:8787; Auth/business routes are pending |
| `npm run local:db:migrate` | Apply reviewed migrations to Local only |
| `npm run local:check` | Real local D1/R2/restart/HTTP regression in isolated scratch state |
| `npm run cloudflare:check` | Worker bundle dry-run, never deploys |

**The existing `npm run dev` still starts the legacy Node/Supabase reference path. It is NOT the new local-only application and must NOT be used for new development/testing under this policy.** It remains in source until a full cutover can preserve business/security behavior. Do not claim the app is migrated by pointing frontends at a health-only Worker.

The local runner uses installed tools, explicit --local/--persist-to, a fixed reviewed config, an empty non-secret env file, disabled dotenv/process-env injection, and an OS-only child environment. Extra CLI flags, Production context, remote bindings and unreviewed secret files are rejected. Review the local secret contract during Auth implementation instead of bypassing it.

`backend/wrangler.production.jsonc.example` is an unbound template, NOT an enabled deployment. Production execution currently fails closed in the Worker. Both workers.dev and preview_urls are disabled. No real resource identifiers or enabled deployment command have been added.

## Migration history

The original three SQL files retain their content/checksums. The generator verifies historical trigger SQL instead of rewriting it. Changes require NEW reviewed migrations. PostgreSQL remains the temporary schema source until model/data parity is accepted; changing only the provider string is insufficient.

## Verification at this checkpoint

- Backend: 438 passed, 0 failed; Frontend: 53 passed, 0 failed.
- ESLint and Public/Backoffice/Member builds passed.
- Full isolated browser fixture suite passed: zero runtime errors / zero real business writes. Evidence: `.local/browser-fixtures-20260930.log`.
- Actual CLI rejection checks passed for remote dev flags, Production context and overwriting an existing source backup.
- Worker dry-run passed. Log: `/tmp/greenview-check-2026-09-30T03-10-24-900Z.log`.
- Real local runtime: fresh migrations/FKs, D1 batch rollback, JSON round-trip, R2 conditional write/read, D1/R2 restart persistence, actual Worker HTTP/Prisma D1/R2 health all passed.
- Local runtime evidence: `.local/runtime-check-FYYsIH/result.json`; scratch data is separate from `.local/cloudflare`.
- The prior uncommitted `backend/src/platform/auth/sessions.js` edit is preserved byte-for-byte, not silently accepted or committed with this work.

Business API endpoints intentionally remain unavailable in the new Worker. These checks do NOT prove that booking, financial, stock, Auth or business concurrency flows have migrated. No source/Production business rows were changed by these tests.

## Resume order

Review schema/value conversion and import the private snapshot into Local D1/R2 with count/hash/financial reconciliation. Then migrate Auth and API transport, port business transactions, wire all three frontends, and replace legacy npm/dev/seed/integration scripts. Only after Local acceptance may a separately approved Production release be prepared. Remove remaining active Preview/Supabase dependencies after replacement behavior is verified. Historical documents remain evidence, not executable instructions.
