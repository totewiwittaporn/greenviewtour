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
    : ({SELF_SIGNED_CERT_IN_CHAIN: 'DATABASE_TLS_FAILED: configure PGSSLROOTCERT with the Preview root certificate.', UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'DATABASE_TLS_FAILED: configure PGSSLROOTCERT with the Preview root certificate.', ENOENT: 'DATABASE_CA_FILE_MISSING: check PGSSLROOTCERT on this machine.', ENOTFOUND: 'DATABASE_DNS_FAILED: verify the network and pooler hostname.', '28P01': 'DATABASE_PASSWORD_REJECTED: verify PGPASSWORD in backend/.env.'}[error.code] || 'DATABASE_CONNECTION_FAILED: verify host, password, network access and trusted SSL certificate.'))
  process.exitCode = 1
} finally {
  if (pool) await pool.end()
}
