# Local Auth/API and three-site cutover — 2026-09-30

> **Latest: items 5–6 accepted on Local.** See [final Auth/API acceptance](local-auth-api-acceptance-2026-09-30.md). The earlier pending-check and missing-customer-Auth statements below are historical and superseded by that verified checkpoint.

> Final acceptance remains open: two UI assertions were blocked by tool safety, and the legacy `local:data:verify` command stops at `SOURCE_CHECKPOINT_MISMATCH` after the Auth schema addition. Do not mark these as passed or overwrite the original checkpoint.

## Status and scope

The main development path now uses the Local Cloudflare Worker, Local D1/R2 and all three Vite websites. It does not start the old PostgreSQL/Supabase API. Production remains fail-closed and no Production/Preview resource, DNS, source record or deployment was changed. See [Local startup](local-development.md).

This is not a blanket all-case UI sign-off. The imported Member password-reset browser sequence was rejected by tool safety and was not bypassed. A separate, newly created synthetic Member account successfully exercised registration, verification, login, trips, profile persistence and logout against a real Local Worker copy. A later additional default-login-redirect browser fixture command was also rejected; that new assertion was not executed. The redirect source patch was compiled and the existing return-to-tour fixture remains covered. These limits must remain visible in handoff reports.

## Implementation

Better Auth is backed by D1 with separate durable staff/member WebSessions, opaque HttpOnly cookies, database-backed throttling, bounded JSON inputs, current account/role checks and one-use verification/recovery grants. Test-only memory sessions remain in test helpers. The existing domain API executes through the Worker/D1 adapter; direct proxy access is not a staff authorization grant.

The seventh reviewed migration adds Auth/session/Local-mail tables and the required atomic revision/revocation triggers without rewriting migrations 0001–0006. The operator mailbox is read-only by default and omits tokens from its listing. Opening a selected message only permits reviewed loopback website links. No actual email is sent.

The Vite launchers use API 8787 and server-side proxy tokens. `npm run db:check` now reads fixed loopback Worker/D1/R2 health. Legacy provider owner-bootstrap and identity-probe commands stop without accessing source configuration. Member verification success uses a status notice rather than an error; normal login navigates to My trips while the return-to-tour branch is retained. The Member Auth image is a bundled Local asset rather than an automatic request to the old Production website.

## Imported Local state

A verified offline source export supplied 39 Auth identities and 32 bcrypt credential hashes. Existing hashes were preserved; source sessions were not imported. Seven unverified/permanently banned records remain disabled. PostgreSQL `banned_until = infinity` is preserved as a permanent disabled state, not treated as an empty ban. Seven missing source creation dates remain missing rather than being fabricated.

The before/after comparison matched all 75 compared pre-existing business/lookup tables. `quick_check` returned `ok` and foreign-key issues were zero. Existing counts stayed at 534 bookings, 32 programs, 25 partners, 35 staff profiles and six customer profiles. One pre-existing ACTIVE customer lacks a matching source Auth identity; it is preserved, not linked to an invented account or silently enabled.

No original untracked file was removed. HEAD and the staged index were unchanged; all source changes remain uncommitted. Private state, source archives, credentials and browser evidence are outside version control.

## Evidence and verification boundaries

Private evidence root on the owner Mac: `~/GreenviewBackups/20260930T084623Z-auth-api-resume/`. Do not attach its database copies, source archive, runtime configuration or logs to a public issue.

| Layer | Evidence |
| --- | --- |
| Aggregate code checks | `check.final-code.log`; includes the underlying full-check log path |
| Browser fixtures | `browser-fixtures.accepted.log`; requests are intercepted, not real accounts |
| Real Auth/API protocol | `auth-api.log`; 12 groups passed against isolated workerd/D1 |
| Business transactions | `business.log`; all 11 suites passed |
| Fresh infrastructure | `local-runtime.accepted.log`; all six infrastructure checks passed |
| Original-data comparison | `data-preservation.after-auth.json`; all 75 compared tables matched |
| Real Backoffice/Public browser | `browser-real-cwirtK/result.json` and screenshots |
| Real synthetic Member browser | `browser-real-9ebXNp/result.json` and screenshots |

The Backoffice browser checks covered imported-staff recovery/login, correct Dashboard, Users/Tours/Bookings navigation, real Worker restart and sign-out. Public covered Home, announcement dismissal, catalogue and detail navigation. The synthetic Member checks covered actual registration/verification/login, real trip reads, profile save/reload, staff denial and sign-out. Desktop and mobile screenshots were inspected. No application HTTP 5xx occurred in these browser checks. An initial sandbox-localStorage error came from the QA initialization script; a clean-context rerun with guarded initialization had no errors. Third-party fonts/maps and the old image origin were blocked rather than contacted.

The explicit limitations in the status section are not counted as passed. The existing customer/Auth identity gap also needs a separate owner-approved data decision; it must not be repaired by guessing an identity. No commit, push, remote deployment or source deletion belongs to this checkpoint.

## Final verification checkpoint

The final aggregate run passed 471 backend and 53 frontend tests (524 total), lint, all frontend builds and Local Worker bundling. The normal launcher subsequently returned Worker/D1/R2 health UP and HTTP 200 for all three Local websites. Anonymous staff/member API requests remained denied with 401.

The final legacy source-data verification did NOT pass: it stopped at `SOURCE_CHECKPOINT_MISMATCH`. Its source fingerprint includes the complete D1 Prisma schema, so the added Auth models are a plausible provenance cause, but that explanation has not been fully proved against the original import marker. The corrected diagnostic command was rejected by tool safety. The original marker and verifier were not modified, and the guard was not bypassed. Full source row/file/money/Prisma verification must be completed after a reviewed provenance-compatible resolution.

The independent 75-table before/after match and final SQLite integrity checks remain valid evidence of preserved Local records; they are not being substituted for the failed source-verifier command. The subsequent chained final Auth baseline verification did not execute; its earlier apply/verify run passed.

Latest private handoff: `~/GreenviewBackups/20260930T084623Z-auth-api-resume/RESUME.md`. It records the accepted tests, exact remaining checks, backups and current Local process information. Read it before resuming and preserve all uncommitted work.
