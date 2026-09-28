import {loadEnvFile} from 'node:process'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {deliverPersonalNotification} from '../src/modules/notifications/line.js'
// Explicit one-event runner, suitable for a separately configured scheduler.
// Never called by local startup; defaults to simulation and makes no provider call.
let pool,prisma
try{
 loadEnvFile(new URL('../.env',import.meta.url))
 const [eventId,userId,mode='simulation',send]=process.argv.slice(2)
 if(!eventId||!userId||!['simulation','test','live'].includes(mode)||send&&send!=='--send')throw new Error('INVALID_ARGUMENTS')
 pool=createDatabasePool();prisma=createPrisma(pool)
 const result=await deliverPersonalNotification(prisma,{eventId,userId,mode,enabled:send==='--send'})
 console.log(JSON.stringify({status:result.status}))
}catch{console.error('PERSONAL_NOTIFICATION_FAILED: verify event, recipient, permissions and explicit delivery gates.');process.exitCode=1}
finally{if(prisma)await prisma.$disconnect();if(pool)await pool.end()}
