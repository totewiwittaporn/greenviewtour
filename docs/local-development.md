# Local workspace

## Start and stop

From the repository root run `npm ci` once after pulling, then `npm run dev`. It launches Backend (5000), Public Web (5173) and Backoffice (5174). On Windows double-click `Start-Greenview-Local.cmd` to also open both sites. Keep that terminal open; Ctrl+C stops the services together. The launcher refuses occupied ports rather than killing unrelated work.

- Public: http://localhost:5173
- Users: http://localhost:5174/settings/users
- Backend liveness: http://localhost:5000/health/live

Use backend/.env with the previously verified Preview credentials and PGSSLROOTCERT. The launcher generates a temporary LOCAL_API_TOKEN; the Vite Backoffice proxy adds it server-side. It is never returned to browser JS, persisted in Git or put in a URL. Public Web has no API proxy. All services bind 127.0.0.1; this mode is deliberately local; authenticated account flows are enabled. Do not use LAN hosting, tunnels or production deployment for it. Existing dev:public can still run the public app alone; Users needs the complete launcher.

## Data and access

See [authentication](authentication.md) for identity models, first-owner bootstrap and Supabase email/redirect setup. The local launch token gates the proxy; it does not authenticate staff. Login creates an HttpOnly session cookie. Every directory request checks current account status, session validity and `users.read:COMPANY` against the database. The directory itself remains read-only.

Use `npm run db:migrate` after pulling a reviewed schema change. `npm ci` generates Prisma Client automatically. Stop the running local launcher before `npm ci` on Windows so Vite/esbuild files are not locked.

## Visual reference

The owner requested https://greenviewtour.com/ as Public reference and related Backoffice appearance. Actual logo and photography are loaded from that website; fonts use Google Fonts with fallbacks. Images require internet access and are not bundled offline. Public links were taken from the live website. Generic theme demo staff/testimonials are excluded.

## Verification

`npm run check` runs lint, Backend tests and both builds. `node scripts/smoke-local.js` tests a running workspace using Playwright; on Windows uses Edge. `node scripts/smoke-auth.js` checks anonymous route protection and auth UI states with intercepted provider results. `npm run db:identity-check --workspace @greenviewtour/api` checks real Prisma reads and a rolled-back invitation transaction. Email confirmation, first-owner sign-in and reset-email delivery must also be tested with the owner. No test fixture is inserted into the real database.
