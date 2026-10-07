import {isD1Client} from './d1-runtime.js'
import {isAtomicClient} from './atomic/executor.js'
// D1 serializes through revision CAS plus native batch, never a process mutex.
export async function acquireWriteLock(client,userId=null){
  if(isD1Client(client)){
    if(!isAtomicClient(client))throw new Error('D1_WRITE_UNIT_REQUIRED')
    return
  }
  if(userId)await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`
  else await client.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
}
