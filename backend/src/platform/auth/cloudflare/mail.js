import {AccessError} from '../../../modules/identity-access/membership.js'

const mailbox=value=>typeof value==='string'&&value.length<=254&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value)&&!value.includes('..')
const escapeHtml=value=>value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))

// Only the environment-owned binding can send. Local never calls a provider,
// even if a binding was accidentally supplied to it.
export function createAuthMail(db,env,config,surface){
 const origin=config.origins[surface]
 if(!origin)throw new Error('AUTH_SURFACE_REQUIRED')
 return async(kind,user,token)=>{
  if(!['verify','reset','invite'].includes(kind)||typeof token!=='string'||!token||!mailbox(user?.email))throw new AccessError('AUTH_EMAIL_INVALID',400)
  const link=kind==='invite'?origin+'/onboarding#invitation='+encodeURIComponent(token):origin+(kind==='reset'&&surface==='workspace'?'/reset-password#':'/login#')+(kind==='verify'?'verify':'recovery')+'='+encodeURIComponent(token)
  if(config.local){
   await db.localMail.create({data:{kind,recipient:user.email,link}})
   return
  }
  let url
  try{url=new URL(origin)}catch{throw new AccessError('PRODUCTION_EMAIL_NOT_CONFIGURED',503)}
  if(env.APP_ENV!=='production'||url.protocol!=='https:'||url.origin!==origin||!mailbox(env.AUTH_EMAIL_FROM)||typeof env.EMAIL?.send!=='function')throw new AccessError('PRODUCTION_EMAIL_NOT_CONFIGURED',503)
  const invite=kind==='invite',verify=kind==='verify'
  const title=invite?'คำเชิญพนักงาน / Employee invitation':verify?'ยืนยันอีเมล / Verify your email':'ตั้งรหัสผ่านใหม่ / Reset your password'
  const instructions=invite?'ยืนยันอีเมล กรอกข้อมูลพนักงาน ตั้งรหัสผ่าน และเชื่อม LINE เพื่อเปิดบัญชี Greenview Tour / Verify your email, enter employee information, set your password and connect LINE to activate your account.':verify?'ยืนยันอีเมลของคุณเพื่อใช้งาน Greenview Tour / Confirm your email to use Greenview Tour.':'ตั้งรหัสผ่านใหม่สำหรับบัญชี Greenview Tour / Reset your Greenview Tour password.'
  const expiry=invite?'ลิงก์หมดอายุใน 72 ชั่วโมง / This link expires in 72 hours.':verify?'ลิงก์หมดอายุใน 1 ชั่วโมง / This link expires in 1 hour.':'ลิงก์หมดอายุใน 15 นาที / This link expires in 15 minutes.'
  const ignore='หากคุณไม่ได้ทำรายการนี้ ให้ละเว้นอีเมลนี้ / If you did not request this, ignore this email.'
  const message={from:{email:env.AUTH_EMAIL_FROM,name:'Greenview Tour'},to:user.email,subject:'Greenview Tour — '+title,text:[instructions,link,expiry,ignore].join('\n\n'),html:'<p>'+instructions+'</p><p><a href="'+escapeHtml(link)+'">'+title+'</a></p><p>'+expiry+'</p><p>'+ignore+'</p>'}
  // A failed/ambiguous submission must not be retried blindly or expose the
  // provider error, which may contain recipient addresses and token links.
  return sendAuthMessage(env.EMAIL,message)
 }
}
async function sendAuthMessage(binding,message){
 try{
  const result=await binding.send(message)
  if(typeof result?.messageId!=='string'||!result.messageId.trim())throw new Error('MISSING_MESSAGE_ID')
  return {messageId:result.messageId}
 }catch{throw new AccessError('AUTH_EMAIL_DELIVERY_UNAVAILABLE',503)}
}

// D1 callbacks may be replayed. Keep only the successful attempt's mail and
// submit after commit. This is not a durable outbox: process loss after commit
// needs an explicit login/recovery request, never an automatic blind resend.
export async function authMailTransaction(db,env,callback,{requiresMail=true,concealDeliveryFailure=false}={}){
 if(requiresMail&&env.APP_ENV==='production'&&(!mailbox(env.AUTH_EMAIL_FROM)||typeof env.EMAIL?.send!=='function'))throw new AccessError('PRODUCTION_EMAIL_NOT_CONFIGURED',503)
 let pending=[]
 const result=await db.$transaction(async tx=>{
  pending=[]
  const attemptEnv=env.APP_ENV==='production'&&typeof env.EMAIL?.send==='function'?{...env,EMAIL:{send:async message=>{pending.push(message);return {messageId:'pending-after-commit'}}}}:env
  return callback(tx,attemptEnv)
 },{timeout:30000})
 for(const message of pending){
  try{await sendAuthMessage(env.EMAIL,message)}catch(error){
   // Public recovery must not reveal account existence through a provider
   // failure. Its response promises neither delivery nor account existence.
   if(!concealDeliveryFailure)throw error
  }
 }
 return result
}
