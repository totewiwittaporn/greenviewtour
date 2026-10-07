// Offline release preparation only. Never imported by the application Worker.
import {randomBytes,randomUUID,createHash} from 'node:crypto'
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const quote=value=>"'"+String(value).replaceAll("'","''")+"'"
export function prepareOwnerBootstrap({email,displayName,origin,accountId,databaseId,databaseName,environment,now=new Date()}){
 if(environment!=='production'||!uuid.test(databaseId||'')||!/^([a-f0-9]{32})$/i.test(accountId||'')||!/^greenviewtour[-a-z0-9]*production[-a-z0-9]*$/.test(databaseName||''))throw new Error('EXPLICIT_PRODUCTION_TARGET_REQUIRED')
 if(typeof email!=='string'||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('OWNER_EMAIL_REQUIRED')
 if(typeof displayName!=='string'||!displayName.trim()||displayName.length>100||[...displayName].some(character=>character.charCodeAt(0)<32))throw new Error('OWNER_NAME_REQUIRED')
 let url
 try{url=new URL(origin)}catch{throw new Error('PRODUCTION_ORIGIN_REQUIRED')}
 if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('PRODUCTION_ORIGIN_REQUIRED')
 if(!(now instanceof Date)||!Number.isFinite(+now))throw new Error('VALID_TIMESTAMP_REQUIRED')
 email=email.toLowerCase();displayName=displayName.trim()
 const id=randomUUID(),code=randomBytes(32).toString('hex'),tokenHash=createHash('sha256').update(code).digest('hex')
 const createdAt=now.toISOString().replace('Z','+00:00'),expiresAt=new Date(+now+72*3600000).toISOString().replace('Z','+00:00')
 const trigger='ProductionOwnerBootstrap_'+id.replaceAll('-','')
 // The guard and dependent records share ONE INSERT statement's atomicity.
 // An importer that stops on an error may leave this harmless invitation-ID-scoped
 // trigger behind. Its DROP statement is safe to run even after a refused insert.
 const sql=`-- Private production owner bootstrap; review target before applying.
-- account_id: ${accountId}; database_id: ${databaseId}; database_name: ${databaseName}
-- No password, existing user changes, or temporary inviter account.
CREATE TRIGGER IF NOT EXISTS "${trigger}" AFTER INSERT ON "Invitation"
WHEN NEW.id=${quote(id)} BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM UserRole WHERE roleCode='ADMIN_MANAGER') THEN RAISE(ABORT,'OWNER_ALREADY_EXISTS') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM Invitation i JOIN InvitationRole r ON r.invitationId=i.id WHERE r.roleCode='ADMIN_MANAGER' AND i.consumedAt IS NULL AND i.revokedAt IS NULL AND julianday(i.expiresAt)>julianday('now')) THEN RAISE(ABORT,'OWNER_INVITATION_PENDING') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM AuthUser WHERE lower(email)=${quote(email)}) OR EXISTS(SELECT 1 FROM D1Identity WHERE lower(email)=${quote(email)}) OR EXISTS(SELECT 1 FROM Invitation WHERE lower(email)=${quote(email)} AND id<>NEW.id) THEN RAISE(ABORT,'OWNER_IDENTITY_ALREADY_EXISTS') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM Role WHERE code='ADMIN_MANAGER') THEN RAISE(ABORT,'OWNER_ROLE_REQUIRED') END;
 SELECT CASE WHEN julianday(NEW.expiresAt)<=julianday('now') THEN RAISE(ABORT,'OWNER_BOOTSTRAP_EXPIRED') END;
 INSERT INTO InvitationRole(invitationId,roleCode,scope) VALUES(NEW.id,'ADMIN_MANAGER','COMPANY');
 INSERT INTO AuditEvent(id,actorId,targetId,action,createdAt,details) VALUES(${quote(randomUUID())},NULL,NEW.id,'owner.bootstrap.prepared',NEW.createdAt,${quote(JSON.stringify({email,accountId,databaseId}))});
END;
INSERT INTO Invitation(id,email,tokenHash,displayName,department,createdById,createdAt,expiresAt) VALUES(${quote(id)},${quote(email)},${quote(tokenHash)},${quote(displayName)},'MANAGEMENT',NULL,${quote(createdAt)},${quote(expiresAt)});
DROP TRIGGER IF EXISTS "${trigger}";
`
 return {sql,onboardingLink:origin+'/accept-invitation#invitation='+code,metadata:{environment,accountId,databaseId,databaseName,origin,email,displayName,invitationId:id,createdAt,expiresAt,cleanupSql:`DROP TRIGGER IF EXISTS "${trigger}";`}}
}
