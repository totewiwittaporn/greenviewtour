import { defineConfig } from 'prisma/config'
import { loadEnvFile } from 'node:process'
import { existsSync } from 'node:fs'
import { databaseConfig } from './src/platform/database/config.js'
if (existsSync(new URL('.env', import.meta.url))) loadEnvFile(new URL('.env', import.meta.url))
// Validation and generation do not require a database connection.
let url = 'postgresql://unused:unused@localhost:5432/postgres?schema=app_private'
if (process.env.PGPASSWORD && process.env.PGPASSWORD !== 'REPLACE_ME') {
  const config = databaseConfig(process.env)
  const connection = new URL('postgresql://localhost/postgres')
  connection.hostname = config.host
  connection.port = '5432'
  connection.username = config.user
  connection.password = config.password
  connection.searchParams.set('schema', 'app_private')
  connection.searchParams.set('sslmode', 'require')
  connection.searchParams.set('sslaccept', 'strict')
  if (process.env.PGSSLROOTCERT) connection.searchParams.set('sslcert', process.env.PGSSLROOTCERT)
  url = connection.toString()
}
export default defineConfig({ schema: 'prisma/schema.prisma', migrations: { path: 'prisma/migrations' }, datasource: { url } })
