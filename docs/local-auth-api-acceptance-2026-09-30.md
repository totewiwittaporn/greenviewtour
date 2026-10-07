# Items 5–6: Local Auth/API acceptance — 30 September 2026

**Status: ACCEPTED for the authorized Local scope.** This checkpoint supersedes the remaining-check lists in `local-auth-api-2026-09-30.md` and the 08:46 private resume. Production is still disabled and no deployment or hosted Preview action was taken.

## Closed findings

1. **Source checkpoint verification.** The original fingerprint was reconstructed exactly from the verified inner export manifest, PostgreSQL schema and pre-Auth D1 schema. The current D1 schema is byte-for-byte the original plus the six Auth models. `local-import/checkpoint.js` admits only that reviewed, SHA-256-pinned schema transition; it recomputes the old fingerprint from the current source digests. Changed source, unreviewed schema, wrong metadata and invented markers remain rejected. The historical checkpoint was not rewritten. Full source row, money, file and Prisma verification passed.
2. **Imported Member recovery.** An actual bug was reproduced: a reset link reusing the already-open `/login` document changed only the fragment, so the module-level callback was never reinitialized. A lifecycle-managed hash listener now reloads callback bootstrap exactly once for a nonempty recovery/verification fragment on `/login`. Ordinary hashes do not reload and cleanup prevents duplicate StrictMode listeners. The original failing same-tab reset sequence now passes against a copied Local database using an imported Member account.
3. **Post-login navigation.** Normal Member login was verified to land on `/`, render My trips, use the correct title and survive reload. Login with a selected-tour `next` parameter still returns to that tour. Verification notices disappear after successful login. Both real-API browser tests and committed browser fixtures cover the relevant paths.

## Correction to the earlier customer finding

The supposedly missing customer Auth identity is a legitimate **non-member customer**: `authUserId` and email are null. `CustomerProfile.authUserId` is optional, and the staff `saveCustomer` flow creates this type of record intentionally. Source/legacy directory checks now separate null account links from broken non-null references. Current result: one customer without a member account, **zero missing staff Auth references and zero missing customer Auth references**. No customer was deleted, altered or linked to an invented account.

## Final verification

| Layer | Result |
| --- | --- |
| Backend tests | 480 passed; zero failed |
| Frontend tests | 56 passed; zero failed |
| Lint, three frontend builds, Worker bundle dry-run | Passed; no deployment |
| Existing and new browser fixtures | Passed, including normal login / selected-tour return / same-tab verification |
| Real imported-account browser checks | Member and Backoffice recovery/login, session/restart/replay/logout, real lists and Public navigation passed |
| Isolated real Auth/API suite | All 12 groups passed |
| Isolated D1 business suite | All 11 suites passed |
| Local infrastructure suite | All six groups passed |
| Source data verification | 68 tables, 9,315 rows, seven files, 30 monetary fields; Prisma/workerd proof passed |
| Active Local state preservation | All 86 compared tables unchanged; quick_check OK; zero foreign-key issues |

## Browser evidence and limits

The flow under test was imported Member `/login` → request reset → same-tab Local mail link → set password → login → `/` My trips; subsequent checks covered reload, Worker restart, role isolation, selected-tour return and consumed-link/session replay denial. Backoffice covered recovery/login, role Dashboard, Users/Tours/Bookings navigation and logout. Public covered Home, announcement dismissal, catalogue and tour details.

Browser: installed Playwright Chromium; Browser plugin not available. Viewports: 1440×1000 and 390×844 for real-site captures; the full fixture suite also covers other existing viewport cases. Page identity, meaningful loaded content, no framework overlay, horizontal fit and user interactions passed. The final capture helper waits until loading statuses finish. Runtime errors and API 5xx were zero; console entries were limited to expected 400/401 security-denial responses and deliberately blocked third-party resources. No Production requests were permitted by the browser context. Safari/WebKit and real Production providers were not part of this Local acceptance.

Private evidence: `~/GreenviewBackups/20260930T101417Z-items56-completion/`.

- `check.log` → `/tmp/greenview-check-2026-09-30T10-24-54-156Z.log`.
- `browser-fixtures.final.log`, `auth-api.final.log`, `business.final.log`, `runtime.final.log`.
- `data-verify.final.log` → repo `.local/data-import-mQ9Eux/verification.private.json`.
- `checkpoint-diagnosis.json` and `integrity.final.json`.
- `browser-acceptance.accepted.log` → `browser-real-hT9iaw/result.json` and screenshots.

Only copied databases received test password changes, sessions or other test writes. The original active database's Auth credentials and all other compared table contents remained unchanged. All original untracked files were retained, HEAD and the staged index remained unchanged, and no commit/push/reset was performed. Keep the private backup and browser database copies outside Git and never publish their credentials or links.

## Handoff

Use `npm run dev` for the only application development path: Local Worker 8787, Public 5173, Backoffice 5174 and Member 5175. `npm run db:check` checks only fixed loopback Worker/D1/R2 health. Local recovery/verification mail remains local; it does not send real email. A future D1 schema change requires its own reviewed provenance transition rather than weakening the source checkpoint guard.

No outstanding item remains in the three acceptance findings above. Production release/provider setup is deliberately outside this work and requires separate approval.
