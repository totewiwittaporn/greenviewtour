# Items 7–8: Local workflow cleanup and final acceptance

**Status: ACCEPTED for the authorized Local scope on 30 September 2026.** This completes the cleanup/final Local verification following the [items 5–6 acceptance](local-auth-api-acceptance-2026-09-30.md). It creates or deploys no Cloudflare resource and does not authorize Production/source deletion.

## Item 7 — completed cleanup

- Retired 35 source/Preview CLI paths, including direct seeds, remote integration scripts, provider delivery runners and the old source-backup entrypoint. Each now fails before reading environment credentials. Original source/hashes remain preserved in the private backup and Git history; existing user data is not deleted.
- Disabled legacy PostgreSQL/Auth factories and removed the application's direct Supabase SDK, PostgreSQL driver and Prisma PostgreSQL adapter dependencies. Historical contract tests remain as injected, network-disabled fakes. Better Auth still has a transitive `pg` dependency; no Greenview runtime connection path uses it.
- Removed dotenv loading from reference Prisma configuration. Both reference and D1 code-generation configuration reject direct database CLI commands; Local D1 migration scripts remain the reviewed route.
- Archived old private environment files and the unused old backend Wrangler local state outside the repository. The active persistent database remains `.local/cloudflare`; Auth secrets stay private.
- Replaced misleading npm `preview` names with loopback-only `serve:build:*` viewers. Added a Mac launcher and corrected the Windows launcher's retired argument, without claiming Windows runtime acceptance.
- Added reusable Local workflow auditing, real-browser acceptance and private backup/restore-verification commands. Current guides and agent handoffs use Local/Production only; original connection/deployment documents are marked as historical.

## Item 8 — completed verification

| Layer | Result |
| --- | --- |
| Clean dependency installation | `npm ci --offline` and postinstall code generation passed, without the old environment files |
| Backend/frontend tests | 492 backend + 56 frontend passed; zero failed |
| Lint, three frontend builds, Worker dry-run | Passed; no publishing |
| Browser fixtures | Full suite passed |
| Real Local browser acceptance | Public, Backoffice and imported Member account flows passed at desktop/mobile sizes |
| Auth/API | Twelve isolated real Worker/D1 groups passed |
| Business transactions | Eleven isolated D1 suites passed |
| Infrastructure | Six fresh Local D1/R2/HTTP/restart groups passed |
| Source snapshot | 68 tables, 9,315 rows, seven files and 30 monetary fields passed |
| Auth and identity baselines | 39 Auth/identity rows and 32 credentials verified; zero broken identity references |
| Backup/restore verification | Checksummed private backup restored to isolated workerd state; all 86 application/Auth tables and seven R2 objects matched |
| Negative safety cases | All 35 retired CLIs, remote/Production flags, reference DB commands, corrupted backup and overwrite of an existing backup were rejected |
| Active-data preservation | All 86 application/Auth tables unchanged; original source checkpoint, HEAD, staged index and original untracked paths preserved |

The older identity verifier expected the source provider label even after successful Auth migration. A targeted correction allows `better-auth` only where an AuthUser with the same ID and email exists, while keeping all original identity fields strict. No user row, password or original checkpoint was modified to obtain a pass. A nullable customer Auth link is still a supported non-member customer, not a missing identity.

The preservation report separately records a change to the runtime-owned `_cf_METADATA` table. It is not application/customer/Auth data and is not claimed unchanged. SQLite quick_check is OK and foreign-key violations are zero.

## Evidence on the owner Mac

Private root: `~/GreenviewBackups/20260930T105126Z-items78-local-only/`.

- `clean-install.log`, `local-setup.log`, `check.accepted.log`, `browser-fixtures.log`.
- `browser-real.final.log` points to `~/GreenviewBackups/browser-real-RbLFcd/` for the final screenshot/result set.
- `auth-api.log`, `business.log`, `runtime.log`, `data-verify.log`, `auth-baseline-verify.log`, `identity-baseline.final.log`.
- `local-snapshot-final/manifest.json`, `backup-create.final.log`, `backup-verify.accepted.log`.
- `backup-corruption-rejected.log`, `backup-overwrite-rejected.log`, `integrity.final.json`.
- Original source/private configuration backups and the final source diff/archive are retained separately from Git.

Real-browser flows cover imported Member password reset/login, normal My trips landing, selected-tour return, profile reads, Worker restart, revoked-session/link replay rejection and staff isolation; Backoffice covers recovery/login, Dashboard, Users/Tours/Bookings and logout; Public covers Home, announcement dismissal, catalogue and detail navigation. Chromium viewports were 1440×1000 and 390×844. Meaningful loaded content, page identity, no error overlay/overflow and interactions passed. Runtime errors and API 5xx were zero; only expected security-denial and deliberately blocked external-resource console messages remained.

## Boundary and handoff

Use [Local/Production workflow](local-production-workflow.md) and `npm run dev`. The added `local:check:browser` and backup verification work on private copies, not the active data. Never publish those copies, credentials or mail links.

No Production resource provisioning, remote database access, DNS change, deployment, real provider delivery, source deletion, commit, push or reset was performed. Safari/WebKit, Windows and real Production providers are outside this Local acceptance. Local completion does not claim that future Production hosting is configured or ready to switch on without its own approved release.
