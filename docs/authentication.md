# Local authentication and identity

Current runtime: Better Auth on Local D1 with separate durable staff/member sessions. See [Auth/API acceptance](local-auth-api-acceptance-2026-09-30.md), [Local startup](local-development.md), and [Local/Production workflow](local-production-workflow.md).

Staff onboarding remains invitation-only; Member accounts are separate from staff roles. HttpOnly cookies, current role/status authorization, recovery grants and Local verification mail are tested through the real Local API and browser suite. No provider credentials or old session tokens are loaded.

The former PostgreSQL/Supabase connection and owner-bootstrap paths are retired. Historical design/evidence is preserved in [the original authentication record](history/authentication-pre-local-cutover.md); it is not a setup guide. Production registration/email/provider setup requires separate approval.


## Employee onboarding (owner-approved 2026-10-03)

The current Better Auth + D1 flow replaces the former manually copied staff invitation link. It does not use Supabase.

1. A permitted Manager creates an invitation with only Email, Role and Department. Server authority and role limits still apply. Sending/resending uses the existing mail adapter: LocalMail locally, the configured email adapter in Production. Admin responses never expose the raw invitation credential.
2. The employee opens `/onboarding#invitation=...` from the email. A single-use exchange confirms the email and creates an HttpOnly session restricted to onboarding. Existing manually copied staff links cannot confirm email; resend them through the new flow. Owner bootstrap remains separate.
3. The employee saves legal first name, legal last name, structured address and phone. Province, district, subdistrict and house number are required; postal code is derived server-side from the shared Thai-area dataset. Moo, village and Google Maps pin use the existing profile address controls. Names are individually stored, not derived from LINE display names. Phone is normalized. Unknown fields, empty/oversized values and control characters are rejected.
4. The employee sets and confirms a 12-128 character password. The server hashes it through the existing Better Auth password implementation. Passwords are never stored in browser persistence or audit events.
5. LINE Login uses `openid profile`, PKCE S256, server-held nonce and a session-bound single-use state expiring after 10 minutes. The server verifies the ID token issuer, audience, nonce, expiry and subject, then queries friendship status. Only `friendFlag=true` permits activation. Access tokens are ephemeral and revoked after use.
6. Activation atomically creates the ACTIVE staff profile, invited roles, LINE binding and completion marker, consumes the invitation and promotes the current session. Existing role-based dashboard authorization then applies. No staff profile or workspace access exists before this transaction.

`EmployeeOnboarding` persists email verification, profile, password and completion timestamps. Derived stages are INVITED, EMAIL_VERIFIED, PROFILE_COMPLETED, PASSWORD_SET and ACTIVE. LINE binding and ACTIVE commit together, so there is no partially committed LINE_CONNECTED state. Reload resumes the last saved step. After password setup, ordinary login returns an incomplete employee to onboarding. Before password setup, a lost session requires a Manager resend. A revoked/expired invitation or removed inviter authority blocks continuation; resend rotates its credential and invalidates outstanding LINE challenges. Unsaved form text is not durable.

### Local migration and recovery

Migration `0011_employee_onboarding.sql` adds EmployeeOnboarding and nullable UserProfile firstName/lastName. It does not rewrite existing employee names or business data. Generated D1 schema/atomic metadata include the additive models; the historical source schema is unchanged. The exact reviewed checkpoint transition preserves imported-data verification.

Before applying on an existing Local installation, stop its launcher, create a backup with `npm run local:backup -- --directory <absolute-private-backup-directory>`, then run `npm run local:db:migrate`. The import verification commands `local:data:verify`, `local:identity:verify` and `local:auth:verify` each require `-- --source <absolute-offline-export-directory>`. They compare against the historical import, so later legitimate Local edits can produce a mismatch; compare a fresh pre-migration backup to establish migration preservation. Do not apply this to Production as part of a Local handoff.

### LINE configuration boundary

Local intentionally disables live LINE Login and saves progress at PASSWORD_SET; it never inherits provider secrets. Unit/integration tests exercise activation using the real D1 transaction planner with fake LINE HTTP responses. Local Worker tests verify that the mandatory LINE gate cannot be skipped. No test-only activation endpoint is installed.

Before a separately authorized real-provider rollout, configure a LINE Login web channel under the existing Staff OA provider `2005588057`, link it to the Greenview Staff OA Messaging API channel `2011806264` (OA `@335bydey`), and register `https://<backoffice-host>/onboarding/line-callback`. Validate the linked OA in LINE Developers Console: friendship status refers to the OA linked to the Login channel, not an arbitrary supplied OA ID.

Required server settings are `LINE_STAFF_LOGIN_ENABLED=true`, `LINE_STAFF_LOGIN_PROVIDER_ID=2005588057`, `LINE_STAFF_LOGIN_CHANNEL_ID`, secret `LINE_STAFF_LOGIN_CHANNEL_SECRET`, and HTTPS `BACKOFFICE_ORIGIN`. Keep the secret in the approved secret store. The Login channel ID is distinct from the Messaging API channel ID. Existing Staff OA credentials and existing employees' LINE bindings are preserved. Real email delivery, real LINE consent/friendship and provider-to-provider user-ID consistency require a separately authorized acceptance run; they are not claimed by Local fixture tests.

References: [LINE Login web flow](https://developers.line.biz/en/docs/line-login/integrate-line-login/), [friendship status](https://developers.line.biz/en/reference/line-login/#get-friendship-status).


### Production activation, 2026-10-03

The owner explicitly authorized deployment after the Local handoff. Migration 0011 is now applied to Production. LINE Login channel 2011848467 under provider 2005588057 is Published, linked to Greenview Staff OA @335bydey, with callback https://backoffice.greenviewtour.com/onboarding/line-callback. The Login secret is installed only in the Cloudflare secret store; the ignored release config enables the channel. Local continues to disable live Login. See employee-onboarding-production-2026-10-03.txt for release evidence and live-test limits.


### Structured-address correction, 2026-10-03

EmployeeOnboardingPage reuses core AddressFields instead of a Full address textarea.
Migration 0012 adds nullable addressDetails JSON to EmployeeOnboarding; activation
copies its named fields into existing UserProfile address columns. The formatted
address remains available for older readers. Unknown hierarchies and unsafe map
URLs are rejected; the server recomputes postal code rather than trusting input.
Existing incomplete profiles with legacy free-text addresses return to the information
step and display the previous address. Saved passwords and invitation sessions
remain valid; saving structured fields resumes the next completed-state boundary.
Existing ACTIVE profiles are not modified. Refresh the existing onboarding page;
do not resend or reuse the consumed invitation email merely to load the new form.
