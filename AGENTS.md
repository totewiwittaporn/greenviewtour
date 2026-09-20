# Greenview Tour

Work only in the authorized Greenview repository. Preserve uncommitted work and local commits; compare Git ancestry and current remote refs before choosing a base, rather than assuming main or the newest timestamp is canonical.

Production changes and deployment are outside this workflow. Keep secrets server-side and persistent DEMO records intact.

For implementation, fixes, audits, or Preview handoffs, use [greenview-workflow](.agents/skills/greenview-workflow/SKILL.md). For a small documentation edit, inspect its target and linked references without loading the full workflow.

Choose business and architecture context from [the domain routes](docs/agent-context.md) only when the task touches that area. Existing domain documents retain their rules; historical validation reports describe evidence at a point in time, not current acceptance.
