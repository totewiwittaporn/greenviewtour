# Local workspace

> Current environment/workflow acceptance: [items 7–8 — Local cleanup and final verification](local-workflow-acceptance-2026-09-30.md). No Cloudflare provisioning or Production deployment is enabled.

## Start and stop

Use the owner's Mac, the root lockfile, and the installed Node 22 toolchain. Run `npm ci` after an intentional dependency update, then `npm run dev` from the repository root. The launcher starts the Local Cloudflare Worker (8787), Public (5173), Backoffice (5174), and Member (5175). Ctrl+C stops the services together. Occupied ports are rejected; unrelated processes are never killed.

All services bind to loopback. The active database and R2 files are in `.local/cloudflare`. There is no hosted Preview. The launcher does not use the legacy PostgreSQL/Supabase server or its `.env` credentials. Do not enable LAN hosting, tunnels, remote bindings or Production for testing.

| Command | Local purpose |
| --- | --- |
| `npm run dev` / `npm run local:dev` | Start Worker and all three websites |
| `npm run local:worker` | Start only the Worker |
| `npm run local:setup` | Generate the D1 client/types and apply reviewed Local migrations |
| `npm run db:migrate` | Apply reviewed Local D1 migrations only |
| `npm run db:check` | Read running Worker/D1/R2 health on 127.0.0.1:8787 |
| `npm run local:mail` | Read the Local verification/reset mailbox; list output excludes tokens |
| `npm run local:mail -- --open <id>` | Open that explicitly selected Local message on the Mac |

Staff sign in at `http://localhost:5174/login`; customers use `http://localhost:5175/login`; Public is `http://localhost:5173`. Separate server-side proxy tokens and HttpOnly staff/member cookies do not grant each other's permissions. Fresh status and role checks remain in the domain services.

## Auth and data

Read [Local Auth/API cutover](local-auth-api-acceptance-2026-09-30.md) for the current implementation and acceptance limits. Keep `.local/auth.secret` private with the Local state; runtime proxy tokens/configuration must never enter Git, browser environment variables or URLs. Do not substitute provider/source keys.

Local mail is stored in D1; no real email is sent. Verification/reset links are consumed through their matching Local website. Existing Local managers issue staff invitations through Settings > Users. Public staff sign-up and the legacy source-owner bootstrap are disabled. The old `owner:invite` and backend `db:identity-check` commands now stop without reading credentials or contacting a provider.

Business data and Auth imports are separate reviewed operations against a verified offline export. Stop the launcher before import or copy-based integration suites. Never reset the state, overwrite a populated Auth table, invent missing account links, or import old provider sessions. Auth baseline verification compares the original hashes; it is not a health check to run after legitimate password changes.

## Verification

`npm run check:quiet` runs lint, backend/frontend tests, three frontend builds and a Local Worker bundle dry-run; it does not deploy. `node scripts/smoke-browser-fixtures.js` exercises isolated UI fixtures, not live accounts. `npm run local:check` verifies fresh workerd/D1/R2 infrastructure. `npm run local:check:business` and `npm run local:auth:check` operate on isolated copies while the active launcher is stopped. Keep API, fixture and real-browser results separate.

The Member authentication artwork is bundled locally. Public reference photographs used by the local Home are also present in the repository. Fonts and optional map embeds can still request their public providers; these were blocked during the strict Local-only browser audit. No old Production authentication image is needed.

Production remains an unbound, fail-closed target requiring separate approval and release work. Historical Preview/PostgreSQL documents are records, not executable setup instructions.

## Staff LINE linking

The staff-only connection card is on Backoffice → Edit profile. See [Staff LINE linking](staff-line-link-2026-09-30.md) for the verified Local flow and the separate live activation gate. `npm run local:line:check` and `npm run local:line:browser` use private copied state and a simulated LINE provider; normal Local never sends real LINE messages or creates live bindings. Stop the ordinary launcher before these suites.
