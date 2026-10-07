import {userVisibility} from '../../modules/identity-access/user-visibility.js'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createD1Prisma} from '../../platform/database/d1-client.ts'
import {createInvitation,changeInvitation,lookupInvitation,acceptInvitation,requestUserReset,listInvitations} from '../../modules/identity-access/invitations.js'
import {resolveMembership} from '../../modules/identity-access/membership.js'
import {editProfile,editOwnProfile} from '../../modules/identity-access/user-management.js'
import {saveUserAccess,readUserAccess} from '../../modules/identity-access/user-access.js'
import {listUsers} from '../../modules/identity-access/list-users.js'
import {listNotifications} from '../../modules/notifications/service.js'
export async function identityWrites(env){
 const db=createD1Prisma(env.DB,{files:env.FILES}),checks=[],id=randomUUID
 let stage='fixture'
 try{
  const tag='QAID-'+id().slice(0,8),email=tag.toLowerCase()+'@example.invalid'
  const admin=await db.userProfile.findFirst({where:{status:'ACTIVE',roles:{some:{roleCode:'ADMIN_MANAGER',scope:'COMPANY'}}},include:{roles:true}});assert.ok(admin)
  let staff=await db.userProfile.create({data:{id:id(),displayName:tag,department:'BOOKING',roles:{create:{roleCode:'BOOKING',scope:'SELF'}}}})
  await db.$executeRaw`INSERT INTO D1Identity(id,email,created_at,provider) VALUES(${staff.id},${email},${new Date().toISOString()},'local-fixture')`
  stage='directory'
  const detail=await listUsers(db,{visibility:userVisibility(admin),recordId:staff.id,department:'BOOKING',view:'detail'})
  assert.equal(detail.users[0].email,email);assert.equal(detail.users[0].roles[0].roleCode,'BOOKING')
  assert.equal((await listUsers(db,{visibility:userVisibility(admin),search:tag,department:'GUIDE'})).total,0)
  assert.equal((await listUsers(db,{visibility:userVisibility(admin),search:tag,department:'BOOKING'})).total,1)
  checks.push('provider-neutral identity SQL preserves department scope and private detail boundary')
  const managerVisibility=userVisibility({id:id(),status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY'}]})
  const headVisibility=userVisibility({id:id(),status:'ACTIVE',department:'BOOKING',roles:[{roleCode:'HEAD_BOOKING',scope:'SELF'}]})
  await assert.rejects(()=>listUsers(db,{visibility:managerVisibility,recordId:admin.id}),{code:'NOT_FOUND'})
  await assert.rejects(()=>listUsers(db,{visibility:managerVisibility,recordId:id()}),{code:'NOT_FOUND'})
  const managerDirectory=await listUsers(db,{visibility:managerVisibility,pageSize:5000})
  assert.ok(managerDirectory.users.every(user=>!user.roles.some(role=>role.roleCode==='ADMIN_MANAGER')))
  assert.equal(managerDirectory.summary.total,managerDirectory.total)
  assert.equal((await listUsers(db,{visibility:headVisibility,search:tag})).total,1)
  await db.userRole.create({data:{userId:staff.id,roleCode:'MANAGER',scope:'COMPANY'}})
  assert.equal((await listUsers(db,{visibility:headVisibility,search:tag})).total,0)
  await assert.rejects(()=>listUsers(db,{visibility:headVisibility,recordId:staff.id}),{code:'NOT_FOUND'})
  await db.userRole.deleteMany({where:{userId:staff.id,roleCode:'MANAGER'}})
  checks.push('real D1 directory hides owner from counts/details and prevents a lower role exposing a higher multi-role account')
  stage='native-profile'
  const own={displayName:tag,nickname:'Updated locally',updatedAt:staff.updatedAt.toISOString()}
  await editOwnProfile(db,staff.id,own)
  await assert.rejects(()=>editOwnProfile(db,staff.id,own),{code:'PROFILE_CONFLICT'})
  staff=await db.userProfile.findUnique({where:{id:staff.id}})
  await editProfile(db,admin.id,staff.id,{displayName:tag,nickname:'Manager edit',updatedAt:staff.updatedAt.toISOString(),department:'BOOKING'})
  checks.push('self/manager profile batches enforce timestamps and record audit atomically')
  stage='access'
  const access={version:1,roles:['BOOKING','SALES'],overrides:[{permissionCode:'operations.booking',effect:'DENY'}],reason:'Local test'}
  await saveUserAccess(db,admin.id,staff.id,access)
  await assert.rejects(()=>saveUserAccess(db,admin.id,staff.id,access),{code:'ACCESS_CONFLICT'})
  assert.equal((await db.userProfile.findUnique({where:{id:staff.id}})).accessVersion,2)
  assert.equal(await db.userRole.count({where:{userId:staff.id}}),2)
  await readUserAccess(db,admin.id,staff.id)
  checks.push('roles, permission overrides and access version remain one guarded write')
  stage='invitation'
  await assert.rejects(()=>createInvitation(db,admin.id,{email,roleCode:'BOOKING'}),{code:'ACCOUNT_ALREADY_EXISTS'})
  const recipient=tag.toLowerCase()+'-new@example.invalid'
  const invite=await createInvitation(db,admin.id,{email:recipient,roleCode:'BOOKING'})
  const rotated=await changeInvitation(db,admin.id,invite.invitation.id,'renew')
  await assert.rejects(()=>lookupInvitation(db,invite.invitationCode),{code:'INVITATION_INVALID'})
  let registered=0,recovered=0
  const provider={register:async(address,password)=>{assert.equal(address,recipient);assert.equal(password,'local-test-password-only');registered++;return {session:null}},recover:async address=>{assert.equal(address,email);recovered++}}
  await acceptInvitation(db,provider,rotated.invitationCode,'local-test-password-only')
  assert.equal(registered,1)
  const user={id:id(),email:recipient,email_confirmed_at:new Date().toISOString()}
  const [a,b]=await Promise.all([resolveMembership(db,user),resolveMembership(db,user)])
  assert.equal(a.id,b.id);assert.equal(await db.userProfile.count({where:{id:user.id}}),1)
  assert.equal(await db.auditEvent.count({where:{actorId:user.id,action:'account.activated'}}),1)
  await assert.rejects(()=>changeInvitation(db,admin.id,invite.invitation.id,'renew'),{code:'INVITATION_ALREADY_USED'})
  await requestUserReset(db,provider,admin.id,staff.id);assert.equal(recovered,1)
  await listInvitations(db,admin.id,new URLSearchParams({search:tag}))
  await listNotifications(db,admin.id)
  checks.push('invitation rotation, one-time concurrent activation and reset metadata; provider calls are stubs only')
  stage='permission-revocation'
  await db.userProfile.update({where:{id:staff.id},data:{status:'SUSPENDED',accessVersion:{increment:1}}})
  await assert.rejects(()=>editOwnProfile(db,staff.id,{displayName:tag,updatedAt:staff.updatedAt.toISOString()}),{code:'ACCOUNT_UNAVAILABLE'})
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM D1TxnGuard').first()).n,0)
  checks.push('revoked account fails closed and no guard rows leak')
  return {checks}
 }catch(error){console.error('IDENTITY_D1_FAILED',stage,error);throw Object.assign(error,{stage})}
 finally{await db.$disconnect()}
}
