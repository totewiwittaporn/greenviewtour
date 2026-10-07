# Agent delivery workflow

This is the cross-cutting delivery process. Greenview business rules live in [domain sources](agent-context.md); this document does not redefine them. Mint and Milk name responsibilities, not required models or separate sessions.

## Start: Mint inspects actual state

Record repository, branch, HEAD, tracked/untracked changes, and task acceptance criteria. When reconciling local and GitHub state, query current remote refs and compare ancestry; fetch missing commits without resetting or pulling over local work. Divergent histories require preserving both sides and resolving the intended base, not selecting by timestamp. If remote access fails, report that verification gap.

Inspect the affected implementation, callers, tests, and matching domain sections. Distinguish existing behavior, approved requirements, and historical implementation notes. Resolve material conflicts explicitly; do not silently discard an owner rule because code differs. The stage is complete when the change boundary and observable acceptance criteria are supported by actual files.

## Implement: Milk owns the change

Implement the authorized scope against the preserved base. Reuse existing owners and contracts. Add or adjust tests for changed behavior and meaningful regressions; a documentation-only edit needs link, instruction, and factual checks, not invented runtime tests.

Choose checks from current package scripts and affected tests. Run them, inspect every failure, fix task-caused failures, and rerun affected checks until they pass. A failure outside scope must be evidenced and reported with its effect on readiness; skipping or weakening a test is not a fix.

## Verify: Mint audits the result

Re-read the final diff against acceptance criteria and relevant domain rules, including authorization, state transitions, data ownership and regressions where affected. Examine actual check output rather than accepting an implementation summary. A single agent may perform this as a separate verification pass; report that accurately instead of claiming independent review.

For audit-only work, report findings with file/line evidence and impact, or no findings with coverage limits. Do not turn an audit-only request into edits without authorization. For fixes already authorized, close findings through the implement/check/fix/rerun loop.

## Definition of Done

- The requested behavior or documentation change is complete and its acceptance criteria have evidence.
- Affected checks pass after the final relevant change. For code, `npm run check` is the repository aggregate; CI also runs `node scripts/smoke-browser-fixtures.js`. Add focused checks when the aggregate does not cover the changed behavior.
- UI behavior changes have rendered checks for affected states and viewport/input modes. Fixture tests, unit tests, builds, and real account/DB checks are labeled separately.
- The final diff contains only intended changes; existing local work, domain rules and persistent demos are preserved. New files are included in review even before staging.
- The handoff identifies changed files, commands and results, failures or skipped coverage, Git status, and remaining risks. A blocked required check means verification is incomplete, not done.

## Local handoff

Use [Local/Production workflow](local-production-workflow.md). Report current code, commands/results, copied-data versus active-data checks, preserved work and any remaining finding. Use Local only; do not create a hosted Preview, bind Cloudflare resources, add provider credentials or deploy.

Read [deployment boundary](deployment.md) only for a separately approved Production plan. Local acceptance is not approval to publish, delete the source, seed real customer data or send provider messages. Preserve persistent DEMO records and all uncommitted work.
