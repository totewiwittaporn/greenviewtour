# Deployment boundary

Current Production update: the owner authorized employee onboarding deployment on 2026-10-03. See [the release record](employee-onboarding-production-2026-10-03.txt). The Local migration boundaries below describe the earlier checkpoint, not a claim that Production remains undeployed.

**No hosted environment is configured or deployed by the Local migration.** See [Local/Production workflow](local-production-workflow.md) for the current commands and separate future Production approval gate. There is no hosted Preview.

Builds run from the repository root: `npm run build:public`, `npm run build:backoffice`, `npm run build:member`. Outputs are `frontend/public-web/dist`, `frontend/backoffice/dist`, and `frontend/member/dist`. These commands do not publish. `npm run cloudflare:check` is a Local Worker dry-run only. The Production example has no bound database identifier and the Worker refuses hosted execution.

A future release must separately review the actual Cloudflare account/resources, DNS, origins/cookies, private server secrets, email/provider configuration, schema/data migration and rollback. No deployment command or provider key is added by this checkpoint. Existing source and Local backups remain preserved; do not delete a source because a build passed.

## Search crawler boundary

Only Public is intended for search indexing. Member and Backoffice retain noindex metadata, `robots.txt` disallow rules and static-host `X-Robots-Tag` headers. These are crawler directives, not authorization. Staff/member security remains in the server-side session, origin and fresh permission checks.

Earlier environment instructions are retained in [the historical deployment record](history/deployment-pre-local-cutover.md), not as an executable release plan.
