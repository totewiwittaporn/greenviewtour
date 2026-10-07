// Intentionally reads no environment, files, credentials or provider services.
console.error('LEGACY_SOURCE_COMMAND_RETIRED: Do not bootstrap or probe Supabase/Preview from this workspace. Start npm run dev; use Settings > Users for Local invitations, npm run db:check for Local health, and the documented local:auth:verify/local:auth:check commands for Auth verification.')
process.exitCode=1
