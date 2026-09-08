# Identity and access plan

Source: owner discussion on 2026-09-08. This is the agreed company-wide plan. The local identity/authentication subset is implemented as documented in authentication.md; future management operations and team scopes remain planned.

## Model

- Employee: person, team, position, employment status, supervisor and qualifications.
- User: personal login optionally provisioned for an employee; no shared staff accounts.
- Role: named capability bundle. One user may have multiple roles.
- Scope: own, assigned work, team or company, attached to each grant.
- Audit: actor, time, action and before/after changes for account administration. Never log passwords/tokens.

## Roles

ADMIN_MANAGER (owner), MANAGER, BOOKING, ACCOUNT, GUIDE, ASSISTANT_TOUR_GUIDE, CAPTAIN, ASSISTANT_CAPTAIN, DRIVER. Add HEAD_BOOKING, HEAD_GUIDE, HEAD_CAPTAIN and HEAD_DRIVER as team-lead capability bundles. Job titles and assistant positions do not automatically determine access.

## User administration

| Action | ADMIN_MANAGER | MANAGER |
| --- | --- | --- |
| Invite/edit ordinary staff and team leads | Yes | Within delegated scope |
| Suspend/deactivate ordinary staff and revoke sessions | Yes | Within delegated scope |
| Resend invitation/password reset process | Yes | Within delegated scope |
| Assign ordinary/lead roles and scopes | Yes | Only explicitly delegable roles/scopes |
| Change Manager accounts or appoint Managers | Yes | No |
| Grant ADMIN_MANAGER or change role definitions | Yes | No |
| Review account-administration audit | Company | Delegated scope |

Managers cannot change their own grants or elevate accounts through another endpoint. Server-side permission checks must preserve each action/scope pair. Default deny for undefined permissions. Position changes must show proposed access changes explicitly. Password reset allows the account owner to set a password; managers never view passwords.

Account states: Invited, Active, Suspended, Deactivated. Suspension/deactivation must invalidate existing access, preserve historical attribution, and support reassignment of pending work. Final-admin protection, bootstrap identity, authentication provider, scope membership and session-revocation mechanism must be specified before runtime implementation.

Finance/approval rights, insurance submission authorization, sensitive passenger access and exact team-lead scheduling authority still require workflow definition. Do not infer them from the role hierarchy. No accounting or legal policy is implemented by this document.
