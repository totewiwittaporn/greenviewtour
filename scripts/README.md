# Local workflow scripts

Use [Local/Production workflow](../docs/local-production-workflow.md) for startup, offline data initialization, tests, private backup and restore verification. `npm run local:workflow:check` audits the active configuration. `npm run local:check:browser` runs real Auth/API checks on private copied state; no Production traffic is allowed.

`retired-commands.json` lists disabled source/Preview paths and preserved original hashes. Former entrypoints remain explanatory tombstones; they do not load credentials or perform provider work. Dated source code is preserved in the private migration backup and Git history.
