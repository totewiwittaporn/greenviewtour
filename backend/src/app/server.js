import { createServer } from 'node:http'
import { loadEnvFile } from 'node:process'
import { createDatabasePool } from '../platform/database/pool.js'
import { createPrisma } from '../platform/database/prisma.js'
import { createAuthProvider } from '../platform/auth/provider.js'
import { createHandler } from './http.js'

let pool, prisma
try {
  if (process.env.NODE_ENV === 'production') throw new Error('LOCAL_ONLY')
  loadEnvFile(new URL('../../.env', import.meta.url))
  pool = createDatabasePool()
  prisma = createPrisma(pool)
  const provider = createAuthProvider()
  const port = Number(process.env.LOCAL_API_PORT || 5000)
  const server = createServer(createHandler({ pool, prisma, provider, port, token: process.env.LOCAL_API_TOKEN }))
  server.requestTimeout = 10000
  server.headersTimeout = 10000
  server.on('error', async () => { console.error('API_START_FAILED: check the local API port.'); await pool.end(); process.exitCode = 1 })
  server.listen(port, '127.0.0.1', () => console.log(`Greenview Tour API: http://127.0.0.1:${port}`))
  const stop = () => {
    server.close(async () => { await prisma.$disconnect(); await pool.end(); process.exit(0) })
    setTimeout(() => process.exit(1), 5000).unref()
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
} catch {
  console.error('API_CONFIG_FAILED: use npm run dev and check backend/.env. No credentials are printed.')
  if (pool) await pool.end()
  process.exitCode = 1
}
