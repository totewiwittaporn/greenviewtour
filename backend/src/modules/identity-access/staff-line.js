import {staffReadSnapshot,assertStaffSnapshot} from '../../platform/line/staff-read-snapshot.js'
import {randomUUID} from 'node:crypto'
import {AccessError} from './membership.js'
import {assertAuthUser} from '../../platform/auth/cloudflare/runtime.js'
import {lineHash,lineSecret,isLinkSecret} from '../../platform/line/staff-crypto.js'
const fail=(code,status=400)=>{throw new AccessError(code,status)}
export async function activeStaff(tx,userId){
 const profile=await tx.userProfile.findUnique({where:{id:userId},include:{roles:true}})
 if(profile?.status!=='ACTIVE'||!profile.roles.length)fail('ACCOUNT_UNAVAILABLE',403)
 const auth=assertAuthUser(await tx.authUser.findUnique({where:{id:userId}}))
 if(!auth.emailVerified)fail('ACCOUNT_UNAVAILABLE',403)
 return profile
}
export async function linkingSession(tx,userId,sessionId,now=new Date()){
 await activeStaff(tx,userId)
 const session=await tx.webSession.findUnique({where:{id:sessionId},include:{authSession:true}})
 if(!session||session.userId!==userId||session.purpose!=='workspace'||session.expiresAt<=now||!session.authSession||session.authSession.expiresAt<=now)fail('SESSION_EXPIRED',401)
}
const ownWhere=(config,userId)=>({channelKey_userId:{channelKey:config.channelKey,userId}})
export async function staffLineStatus(db,userId,config){
 const snapshot=await staffReadSnapshot(db,userId,config.channelKey,{latest:true})
 if(snapshot){assertStaffSnapshot(snapshot);return projectStaffLineStatus(snapshot.binding,snapshot.latest,config)}
 return db.$transaction(async tx=>{
  await activeStaff(tx,userId)
  const binding=await tx.staffLineBinding.findUnique({where:ownWhere(config,userId)})
  const latest=await tx.staffLineRequest.findFirst({where:{channelKey:config.channelKey,userId},orderBy:{createdAt:'desc'},select:{expiresAt:true,status:true}})
  return projectStaffLineStatus(binding,latest,config)
 },{readOnly:true})
}
function projectStaffLineStatus(binding,latest,config){
  const lastAttempt=latest&&['ISSUED','PENDING'].includes(latest.status)&&latest.expiresAt<=new Date()?'EXPIRED':latest?.status||null
  const pending=lastAttempt==='PENDING'?latest:null
  return {oa:{name:config.name,basicId:config.basicId,addFriendUrl:config.addFriendUrl},available:config.enabled,mode:config.mode,reason:config.reason||null,status:binding?.status||'UNLINKED',version:binding?.version||0,displayName:binding?.displayName||null,linkedAt:binding?.linkedAt||null,pendingUntil:pending?.expiresAt||null,lastAttempt,notificationDeliveryEnabled:false}
}

export async function readStaffLineTicket(tx,config,input,now=new Date()){
 if(!config.enabled)fail(config.reason||'LINE_NOT_CONFIGURED',503)
 if(!isLinkSecret(input.request)||typeof input.linkToken!=='string'||input.linkToken.length<10||input.linkToken.length>512)fail('LINE_LINK_INVALID')
 const request=await tx.staffLineRequest.findUnique({where:{id:lineHash(input.request)}})
 if(!request||request.channelKey!==config.channelKey||request.tokenHash!==lineHash(input.linkToken)||request.expiresAt<=now||request.status!=='ISSUED')fail('LINE_LINK_INVALID')
 return request
}
export async function inspectStaffLineTicket(db,userId,sessionId,config,input){
 return db.$transaction(async tx=>{
  await linkingSession(tx,userId,sessionId)
  const ticket=await readStaffLineTicket(tx,config,input)
  return {displayName:ticket.displayName,expiresAt:ticket.expiresAt,oaName:config.name,mode:config.mode}
 },{readOnly:true})
}
export async function confirmStaffLine(db,userId,sessionId,config,input){
 if(input.accepted!==true)fail('LINE_CONSENT_REQUIRED')
 const nonce=lineSecret()
 await db.$transaction(async tx=>{
  await linkingSession(tx,userId,sessionId)
  const ticket=await readStaffLineTicket(tx,config,input)
  const own=await tx.staffLineBinding.findUnique({where:ownWhere(config,userId)})
  const occupied=await tx.staffLineBinding.findUnique({where:{channelKey_lineUserId:{channelKey:config.channelKey,lineUserId:ticket.lineUserId}}})
  if(own?.lineUserId||occupied)fail('LINE_LINK_CONFLICT',409)
  await tx.staffLineRequest.updateMany({where:{channelKey:config.channelKey,userId,status:'PENDING'},data:{status:'CANCELLED',sealedTicket:null}})
  await tx.staffLineRequest.update({where:{id:ticket.id},data:{userId,webSessionId:sessionId,nonceHash:lineHash(nonce),status:'PENDING',sealedTicket:null}})
  await tx.auditEvent.create({data:{actorId:userId,targetId:userId,action:'staff.line.link.requested',details:{channelId:config.channelId,mode:config.mode}}})
 })
 const redirect=new URL('https://access.line.me/dialog/bot/accountLink');redirect.searchParams.set('linkToken',input.linkToken);redirect.searchParams.set('nonce',nonce)
 return {redirectUrl:redirect.href,status:'PENDING',mode:config.mode}
}
export async function unlinkStaffLine(tx,userId,config,{version,source='profile'}={}){
 const old=await tx.staffLineBinding.findUnique({where:ownWhere(config,userId)})
 if(version!==undefined&&version!==(old?.version||0))fail('LINE_LINK_CHANGED',409)
 await tx.staffLineRequest.updateMany({where:{channelKey:config.channelKey,userId,status:{in:['ISSUED','PENDING']}},data:{status:'CANCELLED',sealedTicket:null}})
 if(old?.lineUserId){
  await tx.staffLineRequest.updateMany({where:{channelKey:config.channelKey,lineUserId:old.lineUserId,status:{in:['ISSUED','PENDING']}},data:{status:'CANCELLED',sealedTicket:null}})
  await tx.staffLineBinding.update({where:{id:old.id},data:{lineUserId:null,displayName:null,status:'UNLINKED',version:{increment:1},unlinkedAt:new Date()}})
  await tx.auditEvent.create({data:{actorId:userId,targetId:userId,action:'staff.line.unlinked',details:{source,channelId:config.channelId,mode:config.mode}}})
 }
 return {ok:true}
}
export async function changeStaffLine(db,userId,sessionId,config,input){
 return db.$transaction(async tx=>{
  await linkingSession(tx,userId,sessionId)
  if(input.action==='cancel'){
   const cancelled=await tx.staffLineRequest.updateMany({where:{channelKey:config.channelKey,userId,status:'PENDING'},data:{status:'CANCELLED',sealedTicket:null}})
   if(cancelled.count)await tx.auditEvent.create({data:{actorId:userId,targetId:userId,action:'staff.line.link.cancelled',details:{channelId:config.channelId,mode:config.mode}}})
   return {ok:true}
  }
  if(input.action!=='unlink'||input.confirmed!==true||!Number.isSafeInteger(input.version))fail('INVALID_REQUEST')
  return unlinkStaffLine(tx,userId,config,{version:input.version})
 })
}
export async function verifiedStaffLineRecipient(db,userId,config){
 if(!config.enabled||config.mode!=='live')fail('LINE_DELIVERY_DISABLED',403)
 return db.$transaction(async tx=>{await activeStaff(tx,userId);const binding=await tx.staffLineBinding.findUnique({where:ownWhere(config,userId)});if(binding?.status!=='LINKED'||!binding.lineUserId)fail('LINE_ACCOUNT_NOT_LINKED',403);return binding.lineUserId},{readOnly:true})
}
export const newLineId=()=>randomUUID()
