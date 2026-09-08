# Local workspace

## Start and stop

From the repository root run `npm ci` once after pulling, then `npm run dev`. It launches Backend (5000), Public Web (5173) and Backoffice (5174). On Windows double-click `Start-Greenview-Local.cmd` to also open both sites. Keep that terminal open; Ctrl+C stops the services together. The launcher refuses occupied ports rather than killing unrelated work.

- Public: http://localhost:5173
- Users: http://localhost:5174/settings/users
- Backend liveness: http://localhost:5000/health/live

Use backend/.env with the previously verified Preview credentials and PGSSLROOTCERT. The launcher generates a temporary LOCAL_API_TOKEN; the Vite Backoffice proxy adds it server-side. It is never returned to browser JS, persisted in Git or put in a URL. Public Web has no API proxy. All services bind 127.0.0.1; this initial mode is deliberately local and read-only. Do not use LAN hosting, tunnels or production deployment for it. Existing dev:public can still run the public app alone; Users needs the complete launcher.

## Data and access

User directory runs a read-only transaction against auth.users, selecting only id, email, email_confirmed_at, created_at and last_sign_in_at. No schema/data changes, invitation emails or account creation occur. No new application role policy is invented. The existing postgres connection is used only for this owner's local read-only prototype. Production app access, least-privilege DB roles and staff authentication remain prerequisites for deploying the Backoffice.

Backend validates local Host, development token, browser Origin and GET-only requests. Proxy declines cross-site requests. User search is parameterized; page size bounded; DB errors are redacted. There is no user impersonation or artificial ADMIN_MANAGER session. Build artifacts have no live development proxy.

## Visual reference

The owner requested https://greenviewtour.com/ as Public reference and related Backoffice appearance. Actual logo and photography are loaded from that website; fonts use Google Fonts with fallbacks. Images require internet access and are not bundled offline. Public links were taken from the live website. Generic theme demo staff/testimonials are excluded.

## Verification

`npm run check` runs lint, Backend tests and both builds. `node scripts/smoke-local.js` tests a running workspace using Playwright; on Windows uses Edge. Live data is checked separately from explicitly intercepted test fixtures. No test fixture is inserted into the real database.
