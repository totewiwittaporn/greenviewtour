# Local database connection

The executable database is Local D1 through the Worker binding `DB`; files use the Local `FILES` R2 binding. Persistent state is `.local/cloudflare`. Start with `npm run dev` and check with `npm run db:check`. No database URL, hosted Preview, Supabase connection or backend dotenv file is used.

Use [Local/Production workflow](local-production-workflow.md) for migrations, offline imports, backup and isolated restore verification. The PostgreSQL schema remains reference/code-generation input only; its CLI refuses database operations.

The [original source-connection record](history/database-connection-pre-local-cutover.md) is historical. Source backup archives remain private and the original remote source has not been deleted. Do not execute historical commands.
