import {d1DatabaseFor} from '../database/d1-runtime.js'
import {isAtomicClient} from '../database/atomic/executor.js'
// One SQL statement is one consistent snapshot. No permission/session cache and
// no credential/token columns are loaded. Existing multi-query units retain their planner.
export async function readD1Session(db,id){
 const database=d1DatabaseFor(db)
 if(!database||isAtomicClient(db))return null
 const connection=database.withSession?.('first-primary')||database
 const value=await connection.prepare(`SELECT w.id,w.userId,w.authSessionId,w.verificationId,w.purpose,w.expiresAt,
 u.id AS uid,u.email,u.emailVerified,u.disabled,u.bannedUntil,u.createdAt,u.updatedAt,u.sourceCreatedAt,
 s.id AS sid,s.expiresAt AS sessionExpiresAt,v.id AS vid,v.expiresAt AS verificationExpiresAt,p.status AS profileStatus
 FROM WebSession w LEFT JOIN AuthUser u ON u.id=w.userId
 LEFT JOIN AuthSession s ON s.id=w.authSessionId AND s.userId=w.userId
 LEFT JOIN AuthVerification v ON v.id=w.verificationId AND v.value=w.userId
 LEFT JOIN UserProfile p ON p.id=w.userId WHERE w.id=?`).bind(id).first()
 if(!value)return {row:null,profile:null}
 const date=value=>value==null?null:new Date(value)
 return {profile:{status:value.profileStatus},row:{id:value.id,userId:value.userId,authSessionId:value.authSessionId,verificationId:value.verificationId,purpose:value.purpose,expiresAt:date(value.expiresAt),user:value.uid?{id:value.uid,email:value.email,emailVerified:Boolean(value.emailVerified),disabled:Boolean(value.disabled),bannedUntil:date(value.bannedUntil),createdAt:date(value.createdAt),updatedAt:date(value.updatedAt),sourceCreatedAt:date(value.sourceCreatedAt)}:null,authSession:value.sid?{expiresAt:date(value.sessionExpiresAt)}:null,verification:value.vid?{expiresAt:date(value.verificationExpiresAt)}:null}}
}
