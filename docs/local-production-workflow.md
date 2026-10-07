# Local / Production workflow

## Environment boundary

| Environment | Purpose | Runtime and data | Current gate |
| --- | --- | --- | --- |
| Local | Development and testing on the owner's Mac | Local workerd, D1/R2 in `.local/cloudflare`, private Local Auth secret | Enabled on loopback only |
| Production | Future real customer/staff use | Cloudflare resource provisioning requires a separate approved release | Unbound example only; Worker returns `PRODUCTION_NOT_ENABLED` |

There is no hosted Preview environment. No cloud resource creation, deletion, deployment, DNS change, provider delivery or billing action is part of the Local migration. An installed Wrangler package and a Local Worker are not a deployed Cloudflare service.

## Ordinary development

Use `npm ci`, then `npm run dev` from the repository root. On the owner Mac, `Start-Greenview-Local.command` starts the same launcher. Public, Backoffice and Member use 5173, 5174 and 5175; the Worker uses 8787. Ctrl+C stops the group. Existing occupied ports are rejected rather than silently replaced or killed.

The launcher generates the D1 client, verifies immutable migrations, and applies only reviewed Local migrations. It passes a temporary proxy token server-side; browser code does not receive that secret. The persistent Auth secret stays in `.local/auth.secret`. Never copy source/provider keys into `.env` or browser variables. The active Local workflow does not load dotenv files.

`npm run db:check` checks Local Worker/D1/R2 health. `npm run local:mail` lists Local verification/reset messages without printing links/tokens. `npm run local:mail -- --open <id>` opens one selected Local message. No real email is sent.

## Repeatable validation

Stop the Local launcher before lock-protected copy/backup/integration commands.

| Command | Proof |
| --- | --- |
| `npm run check:quiet` | Workflow audit, lint, unit tests, three builds and Worker dry-run |
| `node scripts/smoke-browser-fixtures.js` | Intercepted browser regression fixtures |
| `npm run local:check` | Fresh Local D1/R2 and restart/HTTP behavior |
| `npm run local:check:business` | Eleven business suites in copied state |
| `npm run local:auth:check` | Real Local Auth/API in copied state |
| `npm run local:check:browser` | All three real websites; imported staff/member Auth and navigation in a private Local copy |

Real-browser acceptance writes only to its copied database, uses installed Playwright Chromium and blocks external requests. Evidence is saved privately under `~/GreenviewBackups/browser-real-*`. Existing imported administrator/member identities and demonstration catalogue data are required; no active account passwords are reset. Fixture tests are not evidence of a live provider integration.

## Seed and initial data

The retained DEMO dataset is already in Local. Do not reseed it during routine startup. The old Preview seed scripts are retired; their original source is preserved in the migration backup/Git history. Changes to bookings, resources or profiles should use the Local application and its domain validations.

For a deliberately NEW empty Local database, use the verified offline export only. Run `local:setup`, then `local:data:plan -- --source /absolute/export/path` before importing. The explicit import sequence is `local:data:import`, `local:identity:import`, then `local:auth:import`, each with that same `--source` argument. These commands reject unexpected source data and do not overwrite populated tables. They do not contact Supabase. An existing database must never be reset just to make an importer succeed.

`local:data:verify` proves an exact original snapshot, not routine health after business edits. It must fail if original rows legitimately changed. Auth baseline verification likewise compares original password hashes and is not a general login health check after a legitimate password change. Null customer account links represent supported non-member customers; broken non-null references remain errors.

## Backup and restore verification

Stop the Local launcher, then run:

```sh
npm run local:backup -- --directory "$HOME/GreenviewBackups/NEW-UNIQUE-BACKUP"
npm run local:backup:verify -- --directory "$HOME/GreenviewBackups/NEW-UNIQUE-BACKUP"
```

The destination must be new and outside the repository. The private payload contains Local D1/R2 state plus the persistent Auth secret. Creation refuses an active database, existing destination or symlinked content. The manifest records file hashes, lengths and a real workerd restoration proof. Verification copies the payload to isolated scratch state and rechecks every application table and R2 object without overwriting the backup or active data.

Restore verification is NOT an automatic replacement of the active database. An actual recovery needs the launcher stopped, a separate current-state backup, a verified selected snapshot and an explicit decision to restore. Keep the original state until the recovered Local app is checked. No command restores into Production. Do not publish any payload, Auth secret, Local-mail links or copied database.

## Retired paths and retained references

`scripts/retired-commands.json` enumerates disabled source tools. Invoking any of them stops before reading credentials or contacting a provider, including `--apply`/`--send`. The legacy PostgreSQL/Auth connection factories are also non-operational. Former provider contract tests use injected fakes under `backend/test/helpers`; they contain no network-capable provider SDK.

PostgreSQL Prisma schema/migration text remains historical source/provenance and code-generation input. It is not an active database. Reference Prisma configuration never reads environment credentials and refuses database-changing CLI commands. D1 migrations and Local state remain authoritative for execution. `serve:build:*` commands are loopback-only static artifact viewers, not another environment or hosted Preview; they do not start the authenticated API.

## Future Production gate — not executed here

Only after separate owner approval may a release identify the Cloudflare account, create/bind Production D1/R2/Worker resources, configure domains and server-side secrets, and prepare approved data migration/rollback and real email/provider settings. Local fixture data is not automatically Production data. Enabling HTTPS cookies, trusted Production origins and external providers is a release task, not a reason to use Production for testing now.

The current `.example` configuration is deliberately unbound and the Worker still rejects hosted execution. CI validates code and fixtures; it has no cloud publication step or cloud deployment credentials. Completion of Local items 7–8 does not authorize provisioning or make a claim that real Production email/payments/LINE delivery has been exercised.

Dependency note: Supabase SDK and the direct PostgreSQL adapters/driver are removed from application dependencies. Better Auth still brings `pg` transitively through its own package; it is not an active Greenview connection path. The runtime uses its explicit D1 Prisma adapter, and the former connection factories are disabled. Do not report the transitive package as absent.

## Phase-one Member pause — 1 October 2026

Ordinary Local Member now displays a bilingual contact-team page rather than registration, login or checkout. Default Worker/API requests to `/api/member` and its subpaths return `503 MEMBER_PAUSED`. HTTP/query/header values cannot enable the retained Member flow. Staff Auth routes, company administration and existing business records remain separate.

The original Member code is retained. Browser fixtures use the explicit development-only `member-regression` mode. Isolated backend/browser acceptance uses its own regression entry and an internal Local-only argument; those test entries are not referenced by ordinary development or deployment configurations. A Production environment cannot enable Member with that argument. No payment provider has been selected or activated.

Public navigation now groups Home, Tours and Information. `/information` links to the existing five company/Surin/FAQ/contact pages without removing their URLs. The staff-login footer link remains in place.

This is not full contact-first release acceptance: the shared contact settings/social fields and enquiry-copy Modal still require implementation and verification. The existing contact record and tour/promotion links must be reviewed before publication. Navigation completion and the Member pause do not authorize deployment or close the other Production readiness gates.
