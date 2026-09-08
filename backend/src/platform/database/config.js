export const PREVIEW_PROJECT_REF = 'qplzgpyidszxbtbyknjc'

export class DatabaseConfigError extends Error {}

export function databaseConfig(env) {
  const fail = (message) => { throw new DatabaseConfigError(message) }
  if (env.APP_ENV !== 'preview') fail('APP_ENV must be preview for this connection setup.')
  if (env.SUPABASE_PROJECT_REF !== PREVIEW_PROJECT_REF) fail('Supabase project does not match Greenview Tour Preview.')
  const host = env.PGHOST || ''
  const direct = host === `db.${PREVIEW_PROJECT_REF}.supabase.co`
  const pooler = /^aws-\d+-ap-southeast-1\.pooler\.supabase\.com$/.test(host)
  if (!direct && !pooler) fail('PGHOST must be the Preview direct host or Singapore session pooler from Connect.')
  if (env.PGPORT !== '5432') fail('PGPORT must be 5432 (direct or session pooler).')
  if (env.PGDATABASE !== 'postgres') fail('PGDATABASE must be postgres.')
  const user = direct ? 'postgres' : `postgres.${PREVIEW_PROJECT_REF}`
  if (env.PGUSER !== user) fail('PGUSER does not match the selected Preview connection method.')
  if (!env.PGPASSWORD || env.PGPASSWORD === 'REPLACE_ME') fail('Set PGPASSWORD privately in backend/.env or server environment.')
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') fail('TLS certificate verification must remain enabled.')
  return {
    host, port: 5432, database: 'postgres', user, password: env.PGPASSWORD,
    ssl: { rejectUnauthorized: true },
    max: 3, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
    statement_timeout: 5000, query_timeout: 6000,
    application_name: 'greenviewtour-preview-backend',
  }
}
