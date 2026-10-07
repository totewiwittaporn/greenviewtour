import {d1DatabaseFor} from '../database/d1-runtime.js'
import {isAtomicClient} from '../database/atomic/executor.js'
import {assertAuthUser} from '../auth/cloudflare/runtime.js'
import {AccessError} from '../../modules/identity-access/membership.js'
export async function staffReadSnapshot(db,userId,channelKey,{latest=false}={}){
 const database=d1DatabaseFor(db)
 if(!database||isAtomicClient(db))return null
 const connection=database.withSession?.('first-primary')||database
 const row=await connection.prepare(`SELECT p.status AS profileStatus,
 EXISTS(SELECT 1 FROM UserRole r WHERE r.userId=p.id) AS hasRoles,
 EXISTS(SELECT 1 FROM UserRole r WHERE r.userId=p.id AND r.roleCode='ADMIN_MANAGER') AS isOwner,
 u.id AS authId,u.emailVerified,u.disabled,u.bannedUntil,
 b.id,b.lineUserId,b.displayName,b.status,b.version,b.linkedAt
 ${latest?',q.status AS latestStatus,q.expiresAt AS latestExpiresAt':''}
 FROM UserProfile p LEFT JOIN AuthUser u ON u.id=p.id
 LEFT JOIN StaffLineBinding b ON b.userId=p.id AND b.channelKey=?
 ${latest?'LEFT JOIN StaffLineRequest q ON q.id=(SELECT id FROM StaffLineRequest WHERE userId=p.id AND channelKey=? ORDER BY createdAt DESC LIMIT 1)':''}
 WHERE p.id=?`).bind(...(latest?[channelKey,channelKey,userId]:[channelKey,userId])).first()
 return {profileStatus:row?.profileStatus,hasRoles:Boolean(row?.hasRoles),isOwner:Boolean(row?.isOwner),auth:row?.authId?{disabled:Boolean(row.disabled),emailVerified:Boolean(row.emailVerified),bannedUntil:row.bannedUntil==null?null:new Date(row.bannedUntil)}:null,binding:row?.id?{id:row.id,lineUserId:row.lineUserId,displayName:row.displayName,status:row.status,version:row.version,linkedAt:row.linkedAt==null?null:new Date(row.linkedAt)}:null,latest:row?.latestStatus?{status:row.latestStatus,expiresAt:new Date(row.latestExpiresAt)}:null}
}
export function assertStaffSnapshot(snapshot){
 if(snapshot.profileStatus!=='ACTIVE'||!snapshot.hasRoles)throw new AccessError('ACCOUNT_UNAVAILABLE',403)
 const auth=assertAuthUser(snapshot.auth)
 if(!auth.emailVerified)throw new AccessError('ACCOUNT_UNAVAILABLE',403)
}
