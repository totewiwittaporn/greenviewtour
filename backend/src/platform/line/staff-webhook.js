import {AccessError} from '../../modules/identity-access/membership.js'
import {staffLineAccountSummary} from '../../modules/identity-access/staff-line-summary.js'
import {activeStaff,linkingSession,unlinkStaffLine,newLineId} from '../../modules/identity-access/staff-line.js'
import {lineHash,lineSecret,isLineUser,isLinkSecret,sealTicket,openTicket} from './staff-crypto.js'
import {verifyWebhook} from './messaging.js'
import {syncStaffRichMenu} from './staff-rich-menu.js'
import {createStaffLineClient} from './staff-client.js'
const fail=(code,status=400)=>{throw new AccessError(code,status)}
const eventKey=(config,event)=>lineHash(config.channelKey+':'+event.webhookEventId)
export function parseStaffWebhook(raw,signature,config){
 if(!config.enabled)fail(config.reason||'LINE_NOT_CONFIGURED',503)
 if(!verifyWebhook(raw,signature,config.secret))fail('LINE_SIGNATURE_INVALID',401)
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))}catch{fail('LINE_EVENT_INVALID')}
 if(!data||typeof data!=='object'||data.destination!==config.botId||!Array.isArray(data.events)||data.events.length>25)fail('LINE_EVENT_INVALID')
 for(const event of data.events)if(!event||typeof event!=='object'||typeof event.type!=='string'||!Number.isSafeInteger(event.timestamp)||event.timestamp>Date.now()+300000||!/^[-_A-Za-z0-9]{10,128}$/.test(event.webhookEventId||''))fail('LINE_EVENT_INVALID')
 return data.events
}
function payloadHash(event){return lineHash(JSON.stringify({type:event.type,timestamp:event.timestamp,source:event.source||null,link:event.link||null,message:event.message?{id:event.message.id,type:event.message.type,text:event.message.text}:null,postback:event.postback||null,mode:event.mode}))}
async function claim(tx,config,event){
 const id=eventKey(config,event),hash=payloadHash(event),old=await tx.staffLineEvent.findUnique({where:{id}})
 if(old?.payloadHash!==undefined&&old.payloadHash!==hash)fail('LINE_EVENT_CONFLICT',409)
 if(old?.status==='DONE')return false
 if(old?.status==='PROCESSING'&&Date.now()-+old.updatedAt<30000)fail('LINE_EVENT_BUSY',503)
 await tx.staffLineEvent.upsert({where:{id},create:{id,channelKey:config.channelKey,payloadHash:hash,status:'PROCESSING'},update:{status:'PROCESSING'}})
 return true
}
const finish=(tx,config,event,outcome)=>tx.staffLineEvent.update({where:{id:eventKey(config,event)},data:{status:'DONE',outcome}})
async function accountLink(tx,config,event){
 if(!isLinkSecret(event.link?.nonce))return 'IGNORED'
 const ticket=await tx.staffLineRequest.findUnique({where:{nonceHash:lineHash(event.link.nonce)}})
 if(!ticket||ticket.channelKey!==config.channelKey||ticket.status!=='PENDING')return 'IGNORED'
 let status=event.link.result==='ok'?'LINKED':'FAILED'
 if(ticket.expiresAt<=new Date())status='EXPIRED'
 if(event.link.result==='ok'&&(event.source?.type!=='user'||event.source.userId!==ticket.lineUserId))status='FAILED'
 if(status==='LINKED'){
  try{await linkingSession(tx,ticket.userId,ticket.webSessionId)}catch(error){if(!(error instanceof AccessError))throw error;status='FAILED'}
 }
 if(status==='LINKED'){
  const own=await tx.staffLineBinding.findUnique({where:{channelKey_userId:{channelKey:config.channelKey,userId:ticket.userId}}})
  const occupied=await tx.staffLineBinding.findUnique({where:{channelKey_lineUserId:{channelKey:config.channelKey,lineUserId:ticket.lineUserId}}})
  if(own?.lineUserId||occupied)status='CONFLICT'
  else{
   const data={lineUserId:ticket.lineUserId,displayName:ticket.displayName,status:'LINKED',linkedAt:new Date(),unlinkedAt:null,sourceEventAt:new Date(event.timestamp)}
   await tx.staffLineBinding.upsert({where:{channelKey_userId:{channelKey:config.channelKey,userId:ticket.userId}},create:{id:newLineId(),channelKey:config.channelKey,userId:ticket.userId,...data},update:{...data,version:{increment:1}}})
   await tx.auditEvent.create({data:{actorId:ticket.userId,targetId:ticket.userId,action:'staff.line.linked',details:{channelId:config.channelId,mode:config.mode}}})
  }
 }
 await tx.staffLineRequest.update({where:{id:ticket.id},data:{status,sealedTicket:null}})
 return status
}
async function blockAccount(tx,config,event){
 const binding=await tx.staffLineBinding.findUnique({where:{channelKey_lineUserId:{channelKey:config.channelKey,lineUserId:event.source.userId}}})
 if(binding&&(!binding.sourceEventAt||+binding.sourceEventAt<=event.timestamp)){
  await tx.staffLineBinding.update({where:{id:binding.id},data:{status:'BLOCKED',sourceEventAt:new Date(event.timestamp),version:{increment:1}}})
 }
 await tx.staffLineRequest.updateMany({where:{channelKey:config.channelKey,lineUserId:event.source.userId,status:{in:['ISSUED','PENDING']},createdAt:{lte:new Date(event.timestamp)}},data:{status:'CANCELLED',sealedTicket:null}})
 return 'BLOCKED'
}
async function restoreAccount(tx,config,event){
 const binding=await tx.staffLineBinding.findUnique({where:{channelKey_lineUserId:{channelKey:config.channelKey,lineUserId:event.source.userId}}})
 if(binding?.status!=='BLOCKED'||(binding.sourceEventAt&&+binding.sourceEventAt>event.timestamp))return 'IGNORED'
 try{await activeStaff(tx,binding.userId)}catch(error){if(!(error instanceof AccessError))throw error;return 'IGNORED'}
 await tx.staffLineBinding.update({where:{id:binding.id},data:{status:'LINKED',sourceEventAt:new Date(event.timestamp),version:{increment:1}}})
 await tx.auditEvent.create({data:{actorId:binding.userId,targetId:binding.userId,action:'staff.line.unblocked',details:{channelId:config.channelId,mode:config.mode}}})
 return 'RESTORED'
}
async function issueLink(db,config,event,client,limit){
 let stage='REQUEST_LOOKUP'
 try{
 const where={channelKey_sourceEventId:{channelKey:config.channelKey,sourceEventId:event.webhookEventId}}
 let request=await db.staffLineRequest.findUnique({where})
 if(!request){
  stage='RATE_GATE'
  if(typeof limit!=='function')fail('LINE_RATE_GATE_REQUIRED',503)
  await limit(event.source.userId)
  stage='LINK_TOKEN'
  const linkToken=await client.linkToken(event.source.userId)
  stage='PROFILE'
  const displayName=await client.profile(event.source.userId)
  stage='TICKET_SEAL'
  const handle=lineSecret(),id=lineHash(handle)
  const sealedTicket=sealTicket({handle,linkToken},config.encryptionSecret,config.channelKey+':'+id)
  stage='REQUEST_CREATE'
  request=await db.staffLineRequest.create({data:{id,channelKey:config.channelKey,sourceEventId:event.webhookEventId,lineUserId:event.source.userId,displayName,tokenHash:lineHash(linkToken),sealedTicket,status:'ISSUED',expiresAt:new Date(Date.now()+8*60000)}})
 }
 if(request.status!=='ISSUED'||request.expiresAt<=new Date()||!request.sealedTicket)return 'EXPIRED'
 stage='TICKET_OPEN'
 const ticket=openTicket(request.sealedTicket,config.encryptionSecret,config.channelKey+':'+request.id)
 const link=config.origin+'/line/connect#'+new URLSearchParams({request:ticket.handle,linkToken:ticket.linkToken})
 stage='REPLY'
 await client.reply(event.replyToken,'เชื่อมบัญชีพนักงาน Greenview Staff\nเข้าสู่ระบบพนักงานครั้งถัดไป\n'+config.origin+'/login\n\nเปิดลิงก์ด้านล่างเพื่อเชื่อมบัญชี เข้าสู่ระบบและยืนยันด้วยบัญชีของคุณเท่านั้น คุณยกเลิกการเชื่อมได้จากข้อมูลผู้ใช้ทุกเมื่อ\n'+link)
 return 'LINK_OFFERED'
 }catch(error){
  const knownCodes=['LINE_NOT_CONFIGURED','LINE_RATE_GATE_REQUIRED','AUTH_RATE_LIMITED','LINE_PROVIDER_UNAVAILABLE','LINE_IDENTITY_INVALID','LINE_EVENT_INVALID']
  const code=error instanceof AccessError&&knownCodes.includes(error.code)?error.code:'UNCLASSIFIED'
  const providerStatus=error instanceof AccessError&&Number.isInteger(error.providerStatus)&&error.providerStatus>=100&&error.providerStatus<=599?error.providerStatus:undefined
  if(error instanceof Error)error.lineIssueOutcome=stage+(providerStatus?'_HTTP_'+providerStatus:'_'+code)
  throw error
 }
}
function statusMessage(summary,config){
 const login='เข้าสู่ระบบพนักงาน\n'+config.origin+'/login'
 if(summary.status==='UNLINKED')return 'LINE นี้ยังไม่ได้เชื่อมกับบัญชีพนักงาน\nกดเชื่อมบัญชี หรือส่ง LINK STAFF เพื่อเริ่มต้น\n\n'+login
 if(summary.status!=='LINKED')return 'บัญชีที่เชื่อมกับ LINE นี้ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ\n\n'+login
 const clean=value=>Array.from(String(value||'').slice(0,200)).map(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127?' ':char).join('')
 return 'เชื่อมบัญชีพนักงานแล้ว\nชื่อ: '+clean(summary.displayName)+(summary.nickname?' ('+clean(summary.nickname)+')':'')+'\nตำแหน่ง: '+summary.roles.join(', ')+'\n\n'+login
}
async function replyStatus(client,event,summary,config){
 try{await client.reply(event.replyToken,statusMessage(summary,config))}
 catch{console.warn(JSON.stringify({event:'STAFF_LINE_STATUS_REPLY_FAILED'}))}
}
function command(event){
 if(event.type==='postback')return event.postback?.data==='staff-link:start'?'link':event.postback?.data==='staff-link:status'?'status':null
 if(event.type!=='message'||event.message?.type!=='text')return null
 if(typeof event.message.text!=='string')return null
 const text=event.message.text.trim().toUpperCase()
 if(['LINK STAFF','เชื่อมบัญชี','เชื่อมบัญชีพนักงาน'].includes(text))return 'link'
 if(['STATUS STAFF','ตรวจสอบบัญชี','สถานะบัญชี'].includes(text))return 'status'
 if(['UNLINK STAFF','ยกเลิกการเชื่อมบัญชี'].includes(text))return 'unlink'
 return null
}
export async function processStaffWebhook(db,config,raw,signature,client=createStaffLineClient(config),limit){
 const events=parseStaffWebhook(raw,signature,config)
 for(const event of events){
  if(event.mode!=='active')continue
  const action=command(event),direct=event.source?.type==='user'&&isLineUser(event.source.userId)
  if(event.type!=='accountLink'&&!(direct&&(event.type==='unfollow'||event.type==='follow'||action)))continue
  try{
  if(action==='link'||action==='status'){
   if(Date.now()-event.timestamp>8*60000)continue
   const accepted=await db.$transaction(async tx=>{
    if(!await claim(tx,config,event))return false
    const summary=await staffLineAccountSummary(tx,config,event.source.userId)
    if(action==='status'||summary.hasBinding){await finish(tx,config,event,'STATUS_READY');return {summary}}
    const recent=await tx.staffLineRequest.count({where:{channelKey:config.channelKey,lineUserId:event.source.userId,sourceEventId:{not:event.webhookEventId},createdAt:{gt:new Date(Date.now()-600000)}}})
    if(recent>=10){await finish(tx,config,event,'RATE_LIMITED');return false}
    return true
   })
   if(!accepted)continue
   if(accepted.summary){await replyStatus(client,event,accepted.summary,config);continue}
   try{
    const outcome=await issueLink(db,config,event,client,limit)
    await finish(db,config,event,outcome)
   }catch(error){await db.staffLineEvent.update({where:{id:eventKey(config,event)},data:{status:'RETRY',outcome:error?.lineIssueOutcome||'PROVIDER_RETRY'}});throw error}
  }else {
   const outcome=await db.$transaction(async tx=>{
   if(!await claim(tx,config,event))return
   let outcome='IGNORED'
   if(event.type==='accountLink')outcome=await accountLink(tx,config,event)
   else if(event.type==='unfollow')outcome=await blockAccount(tx,config,event)
   else if(event.type==='follow')outcome=await restoreAccount(tx,config,event)
   else if(action==='unlink'){
    const binding=await tx.staffLineBinding.findUnique({where:{channelKey_lineUserId:{channelKey:config.channelKey,lineUserId:event.source.userId}}})
    if(binding&&(!binding.sourceEventAt||+binding.sourceEventAt<=event.timestamp)){await unlinkStaffLine(tx,binding.userId,config,{source:'line'});outcome='UNLINKED'}
   }
   await finish(tx,config,event,outcome)
   return outcome
   })
   // Commit both the binding and DONE marker before provider I/O. Redelivery must
   // never resend a welcome or undo a linked account after an ambiguous reply.
   if(outcome==='LINKED'&&typeof event.replyToken==='string'&&event.replyToken.length>0&&event.replyToken.length<=200){
    try{await client.reply(event.replyToken,'เชื่อมบัญชี Greenview Staff สำเร็จแล้ว\nยินดีต้อนรับเข้าสู่ทีม Greenview Tour\nเข้าสู่ระบบพนักงานเพื่อดูงานและจัดการข้อมูลตามสิทธิ์ของคุณ\n'+config.origin+'/login')}
    catch{console.warn(JSON.stringify({event:'STAFF_LINE_WELCOME_REPLY_FAILED'}))}
   }
  }
  }finally{
   if(direct&&(await syncStaffRichMenu(db,config,event.source.userId,client)).status==='retry')fail('LINE_MENU_SYNC_RETRY',503)
  }
 }
 await db.$transaction(async tx=>{
  await tx.staffLineRequest.updateMany({where:{channelKey:config.channelKey,status:{in:['ISSUED','PENDING']},expiresAt:{lte:new Date()}},data:{status:'EXPIRED',sealedTicket:null}})
  const cutoff=new Date(Date.now()-7*86400000)
  await tx.staffLineRequest.deleteMany({where:{channelKey:config.channelKey,expiresAt:{lt:cutoff}}})
  await tx.staffLineEvent.deleteMany({where:{channelKey:config.channelKey,createdAt:{lt:cutoff},status:'DONE'}})
 })
 return {ok:true}
}
