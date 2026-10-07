# Staff User ↔ LINE OA linking — 30 September 2026

## Scope and live boundary

This change implements staff-only account linking, status and unlinking. Customer LINE, QR Payment and automatic work-notification delivery remain paused. The verified OA metadata is Greenview Staff, `@335bydey`, Provider `2005588057`, Messaging API channel `2011806264`. These are public identifiers, not credentials.

Normal Local is deliberately NOT a live LINE connection: `/api/me/line` reports `available:false` / `LINE_LOCAL_ONLY` and the webhook refuses processing without enabled, reviewed configuration. No channel token was issued, no OA setting was changed, no tunnel or hosted Preview was opened, no Cloudflare resource was created/deployed and no actual LINE message was sent. A green test result is not evidence of a live employee pairing.

## User-facing flow

The Backoffice User menu → Edit profile page now has a Staff LINE connection card. Contact `Line ID` remains editable contact text and is never used as proof of identity. The card shows linked/unlinked, pending, blocked or suspended state, a verified display name when linked, refresh, instructions, cancellation and confirmed unlink. Unsaved profile/password fields disable conflicting actions.

Once a separately approved live endpoint and channel credentials are configured, an employee adds the OA and sends `LINK STAFF` (or the supported Thai command) in its private chat. The OA replies with an expiring link. The `/line/connect` page removes secrets from the fragment, authenticates the existing staff user, shows both accounts and requires current-password confirmation plus explicit consent. It then redirects only to LINE's account-link endpoint. Only the signed `accountLink` result with the matching LINE identity/nonce creates the mapping.

A callback is not a staff login and never creates an employee or grants roles. The completed mapping reads current roles/assignments from Greenview; it does not copy them into LINE. Employees can unlink from their profile or send `UNLINK STAFF` in the verified private LINE chat. Unlink clears the pairing and invalidates pending requests without deleting the staff account or work.

## Security and state

- Staff workspace sessions only; Member and recovery sessions cannot operate staff linking. Requests cannot supply another user's ID. Both the session and current account/role state are checked in transactional operations.
- Random 256-bit request/nonce values; only hashes are used for lookup. Temporary provider tickets are AES-256-GCM encrypted and expire after eight minutes. No raw token, nonce or LINE user ID is returned by the status API or written into audit details.
- Raw-body HMAC signature, configured bot destination, size/shape checks, direct-chat boundary, database-backed rate limiting and exact allowed provider endpoints. Failed external calls are not silently marked linked.
- Unique channel/user and channel/LINE mappings. Transactional nonce consumption, current session checks and duplicate-event handling prevent concurrent double linking, stale callbacks, canceled requests and consumed links from restoring an old pairing.
- Test mappings use a separate channel namespace and are visibly labelled as simulated. Ordinary runtime has no test-mode switch driven by an HTTP request or inherited environment credentials.

## Data and migrations

Migration `0008_staff_line_link.sql` adds only StaffLineBinding, StaffLineRequest and StaffLineEvent plus constraints/revision/suspension triggers. The three models are appended to the generated D1 schema; the canonical source PostgreSQL schema remains unchanged. Source verification now recognizes only the exact pinned additive 0007 → 0008 transition, with negative provenance tests. The historical source checkpoint is not rewritten.

## Verified Local results

| Layer | Result |
| --- | --- |
| Aggregate code checks | 498 backend + 56 frontend tests passed; lint, three builds and Worker dry-run passed |
| Staff linking API | Nine grouped real Local D1/HTTP checks passed, with signed simulated LINE events |
| Staff linking browser | Login, consent/password confirmation, completed mapping, Thai/English mobile/desktop, dirty guard, unlink/reload and old-link denial passed |
| Normal three-site browser | Public, Backoffice and Member regression passed; ordinary staff profile explicitly remains live-link disabled |
| Existing browser fixtures | Full suite passed; authorized profile fixtures explicitly mock the new status read |
| Auth/business/runtime regression | 12 Auth/API, 11 business and six Local runtime groups passed |
| Source data and Auth baseline | 68 tables / 9,315 rows / seven files / 30 monetary fields; 39 Auth identities / 32 original credential hashes verified |
| Preservation | No unexpected changes to pre-existing tables; active LINE tables are empty; original source marker, HEAD and staged index unchanged |

Browser evidence used installed Playwright Chromium, not a separate browser plugin. Screens were checked at 1440×1000 and 390×844; relevant Thai/English states were exercised. No application page errors or API 5xx occurred in accepted browser flows. Expected invalid-password/link/session responses and deliberately blocked external resources are recorded separately. Safari/WebKit and a real LINE provider session were not tested.

Private evidence root: `~/GreenviewBackups/20260930T135353Z-staff-line-link/`. Main logs are `check.accepted.log`, `staff-line-api.accepted.log`, `line-browser.final.log`, `browser-fixtures.final.log`, `three-sites.accepted.log`, `data-verify.final.log` and `integrity.final.json`. Linked-test screenshots/results are in `~/GreenviewBackups/browser-real-ZUMRWu/`; normal disabled-state screenshots/results are in `~/GreenviewBackups/browser-real-L4dNFv/`. These private test copies must not be published.

## Commands and next activation gate

`npm run local:line:check` uses a copied Local database and a signature-valid simulated LINE transport. `npm run local:line:browser` exercises the real Local forms/API/database with only LINE's external service simulated. Stop the normal launcher before these lock-protected commands. Their test Worker entry is never referenced by the ordinary launcher.

Before real linking can be accepted, a separately approved reachable HTTPS endpoint and private server configuration must exist: reviewed Backoffice origin, OA bot user ID, matching Provider/Channel IDs, channel secret and Messaging API access token. The hosted Worker remains disabled by the broader release gate. Only after deliberate configuration should the OA webhook be verified and a named employee complete a real pairing/unpairing test. Do not infer live readiness from simulation or enable Production/tunnels to bypass that gate.

No automatic work notifications are switched on by linking. Future notification delivery must obtain the verified active mapping, then independently re-check event/role/assignment relevance. QR/payment and customer-side code were not enabled or replaced by this work.

Implementation references: `backend/src/modules/identity-access/staff-line.js`, `backend/src/platform/line/staff-*.js`, `backend/src/cloudflare/staff-line.ts`, `frontend/backoffice/src/features/line-link/`.

Protocol references: https://developers.line.biz/en/docs/messaging-api/linking-accounts/ and https://developers.line.biz/en/docs/messaging-api/building-bot/.
