import { loadEnvFile } from 'node:process'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
import { deliverPrepared, runNightlyTick } from '../src/modules/operations/notifications.js'

let pool, prisma
try {
  loadEnvFile(new URL('../.env', import.meta.url))
  const args = process.argv.slice(2)
  if (!args.includes('--once') || args.some(arg => !['--once','--send'].includes(arg))) throw new Error('Use --once, optionally --send')
  const actorId = process.env.OPERATIONS_JOB_ACTOR_ID
  if (!actorId) throw new Error('OPERATIONS_JOB_ACTOR_ID required')
  pool = createDatabasePool(); prisma = createPrisma(pool)
  const result = await runNightlyTick(prisma,actorId)
  // Explicit opt-in plus a second environment switch; never started by npm run dev.
  const delivery = []
  if (args.includes('--send') && result.schedule.summaryDue) {
    const date = new Date(result.schedule.serviceDate+'T00:00:00Z')
    const pending = await prisma.operationNotificationOutbox.findMany({where:{serviceDate:date},orderBy:{createdAt:'desc'},take:1})
    for (const item of pending.filter(row=>['PREPARED','FAILED','SENDING'].includes(row.status))) delivery.push(await deliverPrepared(prisma,actorId,item.id,{enabled:true}))
  }
  console.log(JSON.stringify({schedule:result.schedule,prepared:result.results.length,readiness:result.results.at(-1)?.readiness.status || 'BEFORE_CUTOFF',delivery}))
} catch {
  console.error('NIGHTLY_OPERATIONS_FAILED: verify arguments, manager actor and server configuration. No secrets are printed.')
  process.exitCode = 1
} finally {
  if (prisma) await prisma.$disconnect()
  if (pool) await pool.end()
}
