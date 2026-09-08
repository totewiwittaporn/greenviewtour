import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'
import { fileURLToPath } from 'node:url'
import { createDatabasePool, checkDatabase } from '../src/platform/database/pool.js'
import { DatabaseConfigError, PREVIEW_PROJECT_REF } from '../src/platform/database/config.js'

let pool
try {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url))
  if (existsSync(envPath)) loadEnvFile(envPath)
  pool = createDatabasePool()
  await checkDatabase(pool)
  console.log(JSON.stringify({ database: 'UP', environment: 'preview', projectRef: PREVIEW_PROJECT_REF }))
} catch (error) {
  console.error(error instanceof DatabaseConfigError
    ? error.message
    : 'DATABASE_CONNECTION_FAILED: verify host, password, network access and trusted SSL certificate.')
  process.exitCode = 1
} finally {
  if (pool) await pool.end()
}
