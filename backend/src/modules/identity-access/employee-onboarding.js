import {addressValues,formatAddress} from '../../../../packages/contracts/address.js'
import thaiAreas from '../../../../packages/contracts/data/thai-areas.js'
import {randomBytes,randomUUID} from 'node:crypto'
import {AccessError,hashToken,normalizeEmail} from './membership.js'
import {lookupInvitation,assertInvitationAuthority} from './invitations.js'
import {passwordHash,assertAuthUser,publicAuthUser,authSettings,sessionSeconds} from '../../platform/auth/cloudflare/runtime.js'
import {createAuthMail,authMailTransaction} from '../../platform/auth/cloudflare/mail.js'
import {validateEmployeeInformation} from '../../../../packages/contracts/employee-onboarding.js'
const fail=(code,status=403)=>{throw new AccessError(code,status)}
export const employeeStage=row=>row.completedAt?'ACTIVE':row.profileCompletedAt&&!row.addressDetails?'EMAIL_VERIFIED':row.passwordSetAt?'PASSWORD_SET':row.profileCompletedAt?'PROFILE_COMPLETED':row.emailVerifiedAt?'EMAIL_VERIFIED':'INVITED'
const view=(row,invitation)=>({state:employeeStage(row),email:invitation.email,department:invitation.department,roles:invitation.roles.map(r=>r.roleCode),previousAddress:row.addressDetails?null:row.address,profile:{...addressValues(row.addressDetails),firstName:row.firstName||'',lastName:row.lastName||'',primaryPhone:row.primaryPhone||''}})
export async function pendingEmployee(tx,user){
 if(!user?.email_confirmed_at||!user.email)fail('EMAIL_CONFIRMATION_REQUIRED')
 assertAuthUser(await tx.authUser.findUnique({where:{id:user.id}}))
 if(await tx.userProfile.findUnique({where:{id:user.id}}))fail('ACCOUNT_ALREADY_EXISTS',409)
 const invitation=await tx.invitation.findUnique({where:{email:normalizeEmail(user.email)},include:{roles:true}})
 if(!invitation?.createdById||invitation.revokedAt||invitation.consumedAt||invitation.expiresAt<=new Date())fail('INVITATION_INVALID')
 await assertInvitationAuthority(tx,invitation)
 const row=await tx.employeeOnboarding.findUnique({where:{invitationId:invitation.id}})
 if(!row||row.userId!==user.id||!row.emailVerifiedAt||row.completedAt)fail('EMAIL_CONFIRMATION_REQUIRED')
 return {row,invitation}
}
// Internal raw code never leaves the email adapter. Old manually copied links do
// not have an EmployeeOnboarding row and cannot be treated as email verification.
export async function sendEmployeeInvitation(db,env,result){
 try{
  await authMailTransaction(db,env,async(tx,mailEnv)=>{
   const invitation=await lookupInvitation(tx,result.invitationCode)
   if(!invitation.createdById)fail('INVITATION_INVALID')
   await tx.employeeOnboarding.upsert({where:{invitationId:invitation.id},create:{invitationId:invitation.id,emailSentAt:new Date()},update:{emailSentAt:new Date()}})
   await createAuthMail(tx,mailEnv,authSettings(env),'workspace')('invite',{email:invitation.email},result.invitationCode)
   await tx.auditEvent.create({data:{targetId:invitation.id,action:'invitation.email.requested',details:{local:env.APP_ENV==='local'}}})
  })
  return {invitation:result.invitation,delivery:env.APP_ENV==='local'?'LOCAL_MAIL':'SUBMITTED'}
 }catch(error){
  if(!['AUTH_EMAIL_DELIVERY_UNAVAILABLE','PRODUCTION_EMAIL_NOT_CONFIGURED','AUTH_EMAIL_INVALID'].includes(error.code))throw error
  return {invitation:result.invitation,delivery:'FAILED',deliveryError:error.code}
 }
}
export async function exchangeEmployeeInvite(db,code){
 return db.$transaction(async tx=>{
  const invitation=await lookupInvitation(tx,code)
  const row=await tx.employeeOnboarding.findUnique({where:{invitationId:invitation.id}})
  if(!invitation.createdById||!row?.emailSentAt)fail('INVITATION_EMAIL_REQUIRED',400)
  let user=await tx.authUser.findUnique({where:{email:invitation.email}})
  if(user){
   assertAuthUser(user)
   if(await tx.userProfile.findUnique({where:{id:user.id}}))fail('ACCOUNT_ALREADY_EXISTS',409)
   if(row.userId&&row.userId!==user.id)fail('INVITATION_INVALID')
   user=await tx.authUser.update({where:{id:user.id},data:{emailVerified:true}})
  }else user=await tx.authUser.create({data:{id:randomUUID(),email:invitation.email,name:invitation.email,emailVerified:true}})
  const updated=await tx.employeeOnboarding.update({where:{invitationId:invitation.id},data:{userId:user.id,emailVerifiedAt:row.emailVerifiedAt||new Date()}})
  // Consume the email credential atomically with the restricted Auth session.
  await tx.invitation.update({where:{id:invitation.id},data:{tokenHash:hashToken(randomBytes(32).toString('hex'))}})
  const session=await tx.authSession.create({data:{id:randomUUID(),token:randomBytes(32).toString('hex'),userId:user.id,expiresAt:new Date(Date.now()+sessionSeconds*1000)}})
  await tx.auditEvent.create({data:{actorId:user.id,targetId:invitation.id,action:'onboarding.email.verified',details:{}}})
  return {onboarding:view(updated,invitation),session:{id:session.id,user:publicAuthUser(user)}}
 })
}
export async function readEmployeeOnboarding(db,user){
 return db.$transaction(async tx=>{const {row,invitation}=await pendingEmployee(tx,user);return view(row,invitation)},{readOnly:true})
}
export async function saveEmployeeInformation(db,user,input){
 const {data,errors}=validateEmployeeInformation(input,thaiAreas)
 if(Object.keys(errors).length)throw Object.assign(new AccessError('INVALID_EMPLOYEE_INFORMATION',400),{errors})
 return db.$transaction(async tx=>{
  const {row,invitation}=await pendingEmployee(tx,user)
  if(row.passwordSetAt&&row.addressDetails)fail('ONBOARDING_STEP_CONFLICT',409)
  const updated=await tx.employeeOnboarding.update({where:{invitationId:invitation.id},data:{firstName:data.firstName,lastName:data.lastName,primaryPhone:data.primaryPhone,address:formatAddress(data),addressDetails:addressValues(data),profileCompletedAt:new Date()}})
  await tx.auditEvent.create({data:{actorId:user.id,targetId:invitation.id,action:'onboarding.profile.completed',details:{}}})
  return view(updated,invitation)
 })
}
export async function saveEmployeePassword(db,user,input){
 if(!input||Object.keys(input).some(k=>!['password','confirmPassword'].includes(k))||typeof input.password!=='string'||input.password.length<12||input.password.length>128)fail('INVALID_PASSWORD',400)
 if(input.password!==input.confirmPassword)fail('PASSWORD_MISMATCH',400)
 const hash=await passwordHash(input.password)
 return db.$transaction(async tx=>{
  const {row,invitation}=await pendingEmployee(tx,user)
  if(!row.profileCompletedAt||!row.addressDetails)fail('ONBOARDING_STEP_CONFLICT',409)
  if(row.passwordSetAt)return view(row,invitation)
  const credential=await tx.authAccount.findFirst({where:{userId:user.id,providerId:'credential'}})
  if(credential)await tx.authAccount.update({where:{id:credential.id},data:{password:hash}})
  else await tx.authAccount.create({data:{id:randomUUID(),accountId:user.id,userId:user.id,providerId:'credential',password:hash}})
  const updated=await tx.employeeOnboarding.update({where:{invitationId:invitation.id},data:{passwordSetAt:new Date()}})
  await tx.invitation.update({where:{id:invitation.id},data:{acceptedAt:new Date()}})
  await tx.auditEvent.create({data:{actorId:user.id,targetId:invitation.id,action:'onboarding.password.set',details:{}}})
  return view(updated,invitation)
 })
}
export async function completeEmployeeOnboarding(db,user,proof,line,webSessionId){
 if(!line||line.friendFlag!==true||!/^U[0-9a-f]{32}$/.test(line.userId||'')||!line.channelKey)fail('LINE_FRIEND_REQUIRED',409)
 return db.$transaction(async tx=>{
  const {row,invitation}=await pendingEmployee(tx,user)
  if(!row.passwordSetAt||!row.profileCompletedAt||proof.invitationId!==invitation.id||proof.invitationTokenHash!==invitation.tokenHash)fail('ONBOARDING_STEP_CONFLICT',409)
  const web=await tx.webSession.findUnique({where:{id:webSessionId},include:{authSession:true}})
  if(web?.purpose!=='onboarding'||web.userId!==user.id||web.expiresAt<=new Date()||!web.authSession||web.authSession.expiresAt<=new Date())fail('SESSION_EXPIRED',401)
  if(Object.keys(validateEmployeeInformation({firstName:row.firstName,lastName:row.lastName,...addressValues(row.addressDetails),primaryPhone:row.primaryPhone},thaiAreas).errors).length)fail('INVALID_EMPLOYEE_INFORMATION',409)
  const occupied=await tx.staffLineBinding.findUnique({where:{channelKey_lineUserId:{channelKey:line.channelKey,lineUserId:line.userId}}})
  if(occupied)fail('LINE_LINK_CONFLICT',409)
  const now=new Date()
  await tx.userProfile.create({data:{id:user.id,status:'ACTIVE',displayName:row.firstName+' '+row.lastName,firstName:row.firstName,lastName:row.lastName,address:row.address,...addressValues(row.addressDetails),primaryPhone:row.primaryPhone,department:invitation.department,roles:{create:invitation.roles.map(r=>({roleCode:r.roleCode,scope:r.scope}))}}})
  await tx.staffLineBinding.create({data:{id:randomUUID(),channelKey:line.channelKey,userId:user.id,lineUserId:line.userId,displayName:line.displayName,status:'LINKED',linkedAt:now,sourceEventAt:now}})
  await tx.employeeOnboarding.update({where:{invitationId:invitation.id},data:{completedAt:now}})
  await tx.invitation.update({where:{id:invitation.id},data:{consumedAt:now,displayName:row.firstName+' '+row.lastName}})
  await tx.auditEvent.create({data:{actorId:user.id,targetId:user.id,action:'account.activated',details:{invitationId:invitation.id,source:'LINE_LOGIN',friendVerified:true}}})
  // Promotion happens only after the profile and binding exist in the same atomic batch.
  await tx.webSession.update({where:{id:webSessionId},data:{purpose:'workspace'}})
  return {state:'ACTIVE',redirect:'/dashboard'}
 })
}
