# Greenview instruction audit — 2026-09-20

## Scope and preserved baseline

Local repository: `/Users/tootee/Documents/Projects/greenviewtour`; origin: `https://github.com/totewiwittaporn/greenviewtour.git`.

Starting branch: `mint/mac-work-checkpoint-2026-09-20`, HEAD `b5e77e5260b36e1cbc68287bc5b43db006e910c5`. Working tree was clean. A live `git ls-remote origin HEAD refs/heads/main refs/heads/mint/mac-work-checkpoint-2026-09-20` confirmed the checkpoint matches GitHub and main is `874e63c69db1c5f5b0a29a99859a4624be162fcd`. Ancestry comparison `origin/main...HEAD` returned `0 2`: the checkpoint contains two additional commits, including Mac work. It was retained without pull, reset, checkout, rebase, commit, push or deployment.

The initial clone-discovery filename search also returned a sibling project's AGENTS path. Its contents and repository were not opened or modified. Subsequent repository inspection was confined to Greenview. ChatGPT mirror `sources/` and global/personal skills were not modified.

## Inspection inventory and limits

- Enumerated repository paths (including hidden instruction paths, excluding Git internals/dependencies) and searched tracked and untracked AGENTS/SKILL/CLAUDE/prompt names. None existed in this clone at baseline. Checked applicable ancestor AGENTS locations; none were present. The ChatGPT mirror's AGENTS applies to the mirror, not this clone.
- Read root `README.md`, `package.json`, `.gitignore`, `.github/workflows/ci.yml`; `docs/architecture.md`, `docs/local-development.md`, `docs/deployment.md`; `backend/package.json` and `scripts/README.md`.
- Read domain documents `docs/tour-operations.md`, `docs/tour-dispatch-workflow.md`, `docs/member-commerce-plan.md`, `docs/personnel-finance.md`, and `docs/company-workflows.md`. Inspected headings and relevant excerpts of `DESIGN.md`, `UX-CONTRACT.md`, `docs/identity-access.md`, and `docs/tour-settings.md`; these were not rewritten.
- Inspected ownership/status text in `backend/src/backoffice/README.md`, `frontend/backoffice/src/features/README.md`, `frontend/backoffice/README.md`, `packages/contracts/README.md`, `backend/src/modules/operations/README.md`, `backend/src/modules/identity-access/README.md`, and both settings/users page READMEs. A repository Markdown search identified repeated scaffold-era rules/status text; this was not a line-by-line audit of every domain README.
- Checked actual runtime evidence in `scripts/dev.js`, `scripts/smoke-browser-fixtures.js`, public/member Vite configurations, and excerpts of `backend/test/local-http.test.js`, identity-access `policy.js`, and operations `check-in.js`. Searched test files for environment/connection/network usage. This is an instruction audit with targeted code grounding, not a full security or business-logic audit.
- Read installed `writing-for-agents` plus its skill mechanics, OpenAI Docs, and `skill-creator` guidance. Their global files remain unchanged; no unrelated plugin skills were rewritten.

## Findings and exact changes

1. There was no repository agent entrypoint or Mint/Milk completion contract. Added `AGENTS.md` (113 words) and `.agents/skills/greenview-workflow/SKILL.md` (126 words including frontmatter). The skill has a scoped description, conditional routes, and no mandatory model/delegation requirement.
2. README required architecture, identity, deployment, design and UI-contract reading before every feature. Replaced that stack with task-conditioned routing in `docs/agent-context.md`; existing domain sources remain authoritative. No business rules were deleted or copied into generic global instructions.
3. Added `docs/agent-workflow.md` as the single delivery/Definition-of-Done source: actual-state audit → Milk implementation → affected checks → inspect/fix/rerun → Mint diff verification → evidence-qualified Preview handoff. Audit-only mode preserves read-only intent. One agent can perform the roles; this audit used one agent and does not claim independent review.
4. Added `docs/agent-prompts.md` for implementation, audit and Preview briefs. Templates reference the workflow instead of duplicating it. Loading templates is conditional on preparing a brief/handoff.
5. Updated `README.md` for three applications, actual check/build composition, existing access features and reserved-versus-implemented folders. Updated `docs/local-development.md` for the member app, macOS port, public/member proxies, separate user mutations and fixture effects. Migration text now requires verifying the authorized Preview target.
6. Updated `docs/architecture.md` to preserve original foundation decisions as historical, acknowledge member commerce and current Prisma/auth runtime, and retain UI/data/domain ownership rules. Updated `docs/deployment.md` with member build output and the distinction between existing migrations and actual hosted readiness.
7. Kept detailed UI and domain rules in place: Booking/Guide/Driver responsibilities, permission scopes, role projections, separate booking/payment/service state, exact financial arithmetic/independent approval, customer isolation, pending QR-provider direction and retained persistent DEMO data.

Design basis: [OpenAI — Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), accessed 2026-09-20. Applied concise triggers, conditional context pointers and progressive disclosure without prescribing a model or copying a broad workflow into every entrypoint.

## Validation

- `npm run check`: exit 0; ESLint has zero errors and one existing `react-hooks/exhaustive-deps` warning in `frontend/member/src/core/LeaveGuard.jsx:6`; backend 197/197 and frontend 12/12 tests pass, zero skipped; all three frontend builds pass. Backoffice retains the existing >500 kB chunk-size warning. Run began before documentation edits; application code and package/config/test inputs were unchanged throughout.
- Skill validator initially lacked PyYAML. Installed it under `/tmp/greenview-workflow-python`, then reran the bundled `quick_validate.py`: PASS. No repository or global dependency changes.
- Local Markdown targets: 35 links across the nine instruction/documentation files resolved; no trailing whitespace. Final diff and new files reviewed separately; `git diff --check` passes.
- Isolated browser runner initially could not find the required Chromium. Installed headless Chromium under `/tmp/greenview-workflow-browsers` and reran with that `PLAYWRIGHT_BROWSERS_PATH`. Final result is recorded below.
- Manual routing review: a typo edit stays in its document; a dispatch fix loads dispatch/affected ownership sources; QR-payment work reaches the updated member requirement; audit-only work does not imply edits; Preview handoff loads deployment guidance without authorizing deployment. This is a manual instruction review, not an independent model benchmark.

## Remaining risks and readiness

Documentation changes are ready for review; application Preview readiness is blocked by the reproduced browser failure below. Existing React/chunk warnings remain outside this documentation-only change. Older module/page READMEs still contain scaffold-era status claims and repeated local authorization/ownership rules; the router explicitly requires actual route/module evidence. Mass-editing those historical files was avoided to preserve domain context; their status should be reconciled when the corresponding module changes.

The skill's frontmatter and links were validated, but automatic discovery in a future task has not been empirically tested. A task opened in the ChatGPT mirror does not automatically inherit another clone's AGENTS; open/use the actual repository for future work.

No live Preview database, provider email, payment, LINE, hosted application or Production action was performed. Unit/fixture/build success does not establish live Preview acceptance. QR provider-confirmation and other pre-existing live integration gaps remain explicit in their domain sources. No whole-repository runtime completeness claim is made.

Final change set: four existing Markdown files modified; six new Markdown files (five instruction/router documents plus this report). No application code, schema, tests, dependencies, lockfile, global instructions or credentials changed. Changes remain uncommitted on the preserved checkpoint branch for review.

## Final browser and Git result

With temporary Chromium installed, the aggregate browser suite failed twice at `scripts/smoke-staff-invitations.js:80`: after pressing End, the test expected the Head Driver option to be `document.activeElement` and received false. `smoke-auth.js` passed in both runs; the runner stopped at invitations, so `smoke-user-access.js` did not execute. Runtime/test files have no diff from HEAD, establishing this is present on the preserved baseline and not caused by these Markdown edits. The underlying browser timing/component issue was not diagnosed or changed in this instruction-only task. Browser coverage is incomplete and the application is not declared Preview-ready. A baseline-browser-mapping age notice was also emitted; dependencies were not upgraded.

Final local checks: 10 Markdown-only changed/new files, 35 local Markdown links resolved, no trailing whitespace, bundled skill validator passed, and `git diff --check` passed. Tracked diff: 29 insertions / 25 deletions in four files; six new Markdown files are untracked and must be included when committing. HEAD and branch are unchanged, with no ahead/behind difference from the verified checkpoint remote. Build artifacts and browser screenshots are ignored local outputs.

Check logs for this session: `/tmp/greenview-workflow-check.log`, `/tmp/greenview-workflow-browser.log`, `/tmp/greenview-workflow-browser-rerun.log`. These temporary logs are not committed and may expire.
