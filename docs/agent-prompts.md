# Task and handoff prompts

Use only the template needed. Fill in the concrete scope and acceptance criteria; reference existing instructions instead of pasting them into every task. These briefs carry no deployment authorization.

## Implementation brief (Mint → Milk)

Work in Greenview Tour at [repository/branch/revision]. Outcome: [observable change]. Acceptance: [specific successful and rejected cases]. Verified starting state: [local changes and remote comparison]. Relevant evidence: [affected files and domain sections]. Follow the implementation and verification stages in [agent-workflow.md](agent-workflow.md). Preserve [identified local work]. Authorized environment/actions: [scope]. Return the diff, check results and remaining gaps for Mint verification.

## Audit brief (Mint)

Audit Greenview Tour changes against [base revision] for [acceptance criteria]. Inspect actual implementation and [relevant domain sources], then apply the audit-only stage in [agent-workflow.md](agent-workflow.md). Report actionable findings with file/line evidence, checks performed and coverage limits. Implementation claims and historical reports are inputs to verify, not proof. Editing authority: [audit only / fixes authorized].

## Preview handoff

Greenview Tour revision: [revision plus uncommitted diff, if any]. Outcome: [what changed]. Verification: [commands/results and environment]. Mint review: [findings resolved or remaining]. Preview target and allowed next action: [target/scope]. Apply the Preview criteria in [agent-workflow.md](agent-workflow.md); report local and live Preview evidence separately. Outstanding blockers: [specific items or none]. Production is outside this handoff.
