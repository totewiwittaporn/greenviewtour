# Backend

Start through root `npm run dev`. The loopback BFF handles Supabase Auth sessions, invitation registration and password recovery. Current database grants protect the read-only User directory. Credentials remain server-side.

`src/platform/database` owns verified PostgreSQL and Prisma connections. `prisma/schema.prisma` and `prisma/migrations` own application models in app_private. Supabase owns auth.users and passwords.

See docs/authentication.md and docs/local-development.md. Department-scoped profile editing is implemented. Role assignment, account lifecycle administration and hosted production deployment remain future phases.
