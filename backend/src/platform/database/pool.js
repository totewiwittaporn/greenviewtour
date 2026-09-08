import { readFileSync } from 'node:fs'
import pg from 'pg'
import { databaseConfig, DatabaseConfigError } from './config.js'

export function createDatabasePool(env = process.env) {
  const config = databaseConfig(env)
  if (env.PGSSLROOTCERT) {
    try {
      config.ssl.ca = readFileSync(env.PGSSLROOTCERT, 'utf8')
    } catch {
      throw new DatabaseConfigError('Cannot read PGSSLROOTCERT. Use the certificate downloaded from Supabase.')
    }
  }
  const pool = new pg.Pool(config)
  // Do not expose connection strings, passwords or server error details in logs.
  pool.on('error', () => console.error('DATABASE_IDLE_CONNECTION_ERROR'))
  return pool
}

export async function checkDatabase(pool) {
  const result = await pool.query('SELECT 1::int AS connected')
  if (result.rows[0]?.connected !== 1) throw new Error('DATABASE_CHECK_FAILED')
  return { status: 'UP' }
}
