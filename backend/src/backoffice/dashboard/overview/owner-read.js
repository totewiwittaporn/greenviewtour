import {d1DatabaseFor} from '../../../platform/database/d1-runtime.js'
import {isAtomicClient} from '../../../platform/database/atomic/executor.js'
// Only the owner monitoring page has no permission-dependent business data.
export async function isD1OwnerPage(db,actorId){
 const database=d1DatabaseFor(db)
 if(!database||isAtomicClient(db))return false
 const connection=database.withSession?.('first-primary')||database
 const row=await connection.prepare(`SELECT EXISTS(SELECT 1 FROM UserProfile p WHERE p.id=? AND p.status='ACTIVE' AND EXISTS(SELECT 1 FROM UserRole r WHERE r.userId=p.id AND r.roleCode='ADMIN_MANAGER' AND r.scope='COMPANY')) AS allowed`).bind(actorId).first()
 return row?.allowed===1
}
