# Local authentication and identity

## Implemented phase

Prisma 7.10 uses the existing verified PostgreSQL pool through `@prisma/adapter-pg`. Application models live in `app_private`; Supabase exclusively owns `auth.users`, passwords, confirmation and provider sessions. The migration adds an application-profile foreign key to `auth.users` without managing Auth's tables in Prisma. Never run `db push`, `migrate reset`, or auto-generate a migration that drops Supabase-owned objects.

Models: UserProfile, Role, Permission, UserRole, RolePermission, Invitation, InvitationRole, AuditEvent. All application tables have RLS and no Data API grants. The backend accesses them through the private database connection. No browser client receives database credentials or a service-role key.

The 13 agreed roles and eight account-management permission definitions are seeded. A role grant has an explicit SELF or COMPANY scope. Undefined access is denied. Team/assigned-work scopes and Manager delegation UI need the later employee/team workflow; no team scope is silently treated as company scope. Only an owner invitation explicitly bootstrapped for a named email receives ADMIN_MANAGER/COMPANY. No first-signup promotion, hard-coded owner email, self-role changes or public role editor exists. Manager user-administration screens are the next phase.

## First owner

After the owner identifies their email and display name:

```powershell
npm run owner:invite -- "owner@example.com" "Owner name"
```

The command refuses if an owner already exists or an unexpired owner invitation is pending. It writes the one-time code to ignored `backend/bootstrap.local/owner-invitation.txt`; it does not create a password or send email. Open `/register`, enter the invited email, code and a private password. Confirm the Supabase email, then sign in. The login transaction consumes the invitation and creates the profile/grants atomically. Delete the local invitation file after activation. The code expires in 72 hours.

## Supabase setup

Backend requires `SUPABASE_URL=https://qplzgpyidszxbtbyknjc.supabase.co` and `SUPABASE_PUBLISHABLE_KEY` (the modern publishable key). No service-role key is needed in this phase.

In Authentication → URL Configuration, set the local Preview Site URL to `http://localhost:5174` and allow exactly:

- `http://localhost:5174/login`
- `http://localhost:5174/reset-password`

Keep email confirmation enabled. Confirm-signup and password-reset emails must retain Supabase's `{{ .ConfirmationURL }}` link. Sending to staff beyond the project's permitted recipients may require custom SMTP; delivery must be verified with the owner's actual mailbox before wider onboarding. No email was sent during automated tests.

## Sessions and routes

The BFF stores Supabase access/refresh tokens only in bounded server memory, never browser storage. The browser receives a random HttpOnly, SameSite=Strict cookie scoped to `/api` (eight-hour absolute lifetime). Backend restarts require signing in again. Secure cookies/HTTPS, distributed session storage and non-local deployment configuration must be implemented before hosted deployment; the server deliberately refuses production mode and remains loopback-only.

Every protected request validates the user with Supabase, verifies that the underlying Auth session still exists and is not expired/banned, reads current profile status and checks current database role/permission/scope grants. User metadata is never authorization input. Local proxy tokens alone do not grant staff access. POST routes require the same-origin browser Origin, JSON content and a bounded body; local auth requests have an aggregate rate limit.

- `/login`: email/password; uninvited and inactive accounts cannot enter.
- `/register`: invitation code + bound email, password and confirmation; email verification precedes account activation.
- `/forgot-password`: generic confirmation without revealing account existence.
- `/reset-password`: exchanges an email-link session into a restricted BFF recovery session; updates password, revokes provider refresh sessions and all local sessions for the user.
- `/`: own account workspace or Users for authorized administrators.
- `/settings/users`: requires `users.read:COMPANY` on the server.

Logout removes the local session immediately, then attempts provider-session revocation. No secret, password or reset link is logged. Auth pages have no analytics; URL fragments are removed before the page mounts. Password entry state is deliberately not persisted or restored after navigation.

## Migration ownership

`backend/prisma/migrations` is the only application migration ledger. Apply with `npm run db:migrate`; do not apply the same SQL through Supabase's separate migration ledger. Seeded capability definitions do not grant any actual account access until an explicit UserRole is created. Do not create business/financial rights merely because a role name exists.

## Audit notes

Supabase advisory review: the eight private tables intentionally have no client RLS policies (default deny). The pre-existing `public.rls_auto_enable()` function returns `event_trigger`, has a fixed pg_catalog search path and is not an ordinary callable RPC; its generic SECURITY DEFINER advisor warning is recorded rather than changing the platform's event trigger. No new SECURITY DEFINER function was introduced.

Dependency audit reports Prisma toolchain advisories in deepmerge-ts/mysql2. This PostgreSQL-only local service does not use the MySQL driver or merge untrusted Prisma configuration. npm's proposed fix downgrades Prisma to version 6; no automatic major downgrade was applied. Resolve the toolchain findings before a hosted production release.

## User Info and delegated profile editing (2026-09-08)

User Info owns the authenticated name, email, department, status, role grants, public-site link and Sign out. The toolbar exposes one User Info trigger. It never displays credential/token values.

Company-scoped ADMIN_MANAGER and MANAGER can edit display name/department for profiles of every role. HEAD_BOOKING, HEAD_GUIDE, HEAD_CAPTAIN and HEAD_DRIVER require an explicit matching department assignment; their directory, counts and search are restricted to that department. They can edit display names within that department, excluding Manager/Admin Manager profiles, and cannot change department. Department is a dedicated field, never inferred from user-editable Auth metadata. Unassigned/mismatched heads fail closed.

These actions edit profile data only. Role grants, account suspension/deactivation, email and password administration are separate security operations; the owner's intended delegation for those operations must be clarified before adding them. No role-edit control is presented by this phase. Current role definitions are preserved. Department changes require a review step explaining the access consequence. Row versions prevent stale overwrites; writes re-read actor/target authorization inside a transaction and record before/after profile values.

Transient Auth network/5xx/rate-limit failures preserve local sessions; invalid credentials on a protected token verification revoke the local session. A password-reset audit attempt is recorded before changing the provider password. Once the password changes, local sessions are always removed. Provider revocation failures are reported as follow-up warnings, not password-change failures; an audit-finalization outage leaves the durable attempt record for investigation.

## Manager-led staff invitations (2026-09-08)

The owner requested account and row Dropdowns, Add employee, invitation-only staff onboarding and self-chosen passwords. Manager with COMPANY users.invite may invite ordinary and Head roles. Admin Manager may also invite Manager. Admin Manager appointments remain reserved for the owner bootstrap; existing account role changes are not part of this form.

POST /api/invitations creates a 72-hour invitation. The raw random 256-bit code is returned once; only SHA-256 is stored. GET lists up to 100 recent invitations and never returns hashes or secrets. POST /api/invitations/:id/renew rotates the link; /revoke invalidates it. The BFF rechecks current manager grants during creation, renewal, acceptance and final activation. Heads must have a matching department; ordinary roles keep SELF scope. New profiles inherit the invited department. Revocation and membership activation serialize using the same database lock. Already activated accounts cannot use these invitation actions. Duplicate email invitations require explicit renewal.

The link is /accept-invitation#invitation=CODE. The frontend removes the fragment immediately, verifies the invitation and displays fixed email plus password/confirmation. POST /api/auth/accept-invitation is the only application registration path; /api/auth/register returns 410. Password submission marks acceptedAt only after a successful provider request and revalidation. Concurrent link submissions are rejected in this single-process local BFF. Failed provider registration can be retried. Verified-email login consumes the invitation exactly once and creates the profile. Provider signUp never grants workspace access by itself. The application gate does not change the project's Supabase signup configuration.

Supabase email confirmation remains required. If the provider returns no immediate session, employees must confirm the email before signing in. Email delivery requires a working Supabase email configuration; default SMTP restrictions and .local addresses can prevent delivery. Configure and test custom SMTP before inviting real external staff. These localhost links only work on the same computer; hosted HTTPS URLs, redirects, secure-cookie settings and multi-instance coordination are a separate deployment gate.

POST /api/me/profile lets every active user edit their own display name only. POST /api/users/:id/reset-password lets Manager request a reset email for lower-role staff; Admin Manager may additionally assist Manager. It never returns a password or recovery token, and logs only a reset request. No administrator can view stored passwords. All POST requests share the bounded local rate limiter. Tests use fixture auth responses and rolled-back database transactions; no unsolicited staff emails are sent.
