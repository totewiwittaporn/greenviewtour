import {readD1Session} from './d1-session-read.js'
import {randomBytes,createHash} from 'node:crypto'
import {AccessError} from '../../modules/identity-access/membership.js'
import {assertAuthUser,publicAuthUser,sessionSeconds} from './cloudflare/runtime.js'
export const COOKIE='gv_session'
const digest=value=>createHash('sha256').update(value).digest('hex')
export function sessionCookie(name,id,{secure=false}={}){
 if(!['gv_session','gv_member_session'].includes(name))throw new Error('SESSION_COOKIE_NAME_INVALID')
 return `${name}=${id}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${id?sessionSeconds:0}${secure?'; Secure':''}`
}
export function deniedSessions(name=COOKIE){return {cookie:id=>sessionCookie(name,id),authenticated:async()=>{throw new AccessError('SESSION_REQUIRED',401)}}}
export class SessionStore {
 constructor(db,{cookieName=COOKIE,secure=false}={}){if(!db?.webSession)throw new Error('PERSISTENT_SESSION_DATABASE_REQUIRED');this.db=db;this.cookieName=cookieName;this.secure=secure}
 fork(cookieName){return new SessionStore(this.db,{cookieName,secure:this.secure})}
 id(req){const raw=req.headers.cookie?.split(';').map(value=>value.trim()).find(value=>value.startsWith(this.cookieName+'='))?.slice(this.cookieName.length+1);return /^[a-f0-9]{64}$/.test(raw||'')?raw:null}
 cookie(id){return sessionCookie(this.cookieName,id,{secure:this.secure})}
 async create(session,purpose='workspace'){
  const raw=randomBytes(32).toString('hex'),id=digest(raw)
  const expected=this.cookieName===COOKIE?['workspace','recovery','onboarding']:['customer','customer-recovery']
  if(!expected.includes(purpose))throw new AccessError('SESSION_SCOPE_INVALID',403)
  await this.db.$transaction(async tx=>{
   const user=assertAuthUser(await tx.authUser.findUnique({where:{id:session.user.id}}))
   if(!user.emailVerified)throw new AccessError('EMAIL_CONFIRMATION_REQUIRED',403)
   let expiresAt,authSessionId=null,verificationId=null
   if(purpose.endsWith('recovery')){
    const verification=await tx.authVerification.findUnique({where:{id:session.verificationId}})
    if(!verification||verification.value!==user.id||verification.expiresAt<=new Date())throw new AccessError('RECOVERY_INVALID',400)
    if(await tx.webSession.findUnique({where:{verificationId:verification.id}}))throw new AccessError('RECOVERY_ALREADY_USED',400)
    verificationId=verification.id;expiresAt=verification.expiresAt
   }else{
    const authSession=await tx.authSession.findUnique({where:{id:session.id}})
    if(!authSession||authSession.userId!==user.id||authSession.expiresAt<=new Date())throw new AccessError('SESSION_EXPIRED',401)
    authSessionId=authSession.id;expiresAt=new Date(Math.min(+authSession.expiresAt,Date.now()+sessionSeconds*1000))
   }
   await tx.webSession.create({data:{id,userId:user.id,authSessionId,verificationId,purpose,expiresAt}})
  })
  return raw
 }
 async replace(req,provider,session,purpose='workspace'){await this.logout(req,provider);return this.create(session,purpose)}
 async logout(req){
  const raw=this.id(req);if(!raw)return
  await this.db.$transaction(async tx=>{
   const row=await tx.webSession.findUnique({where:{id:digest(raw)}});if(!row)return
   if(row.authSessionId)await tx.authSession.deleteMany({where:{id:row.authSessionId}})
   if(row.verificationId)await tx.authVerification.deleteMany({where:{id:row.verificationId}})
   await tx.webSession.deleteMany({where:{id:row.id}})
  })
 }
 async deleteUser(userId){await this.db.$transaction(async tx=>{await tx.webSession.deleteMany({where:{userId}});await tx.authSession.deleteMany({where:{userId}})})}
 async authenticated(req){
  const raw=this.id(req);if(!raw)throw new AccessError('SESSION_REQUIRED',401)
  const validate=async(row,readProfile)=>{
   if(!row||row.expiresAt<=new Date())throw new AccessError('SESSION_EXPIRED',401)
   const expected=this.cookieName===COOKIE?['workspace','recovery','onboarding']:['customer','customer-recovery']
   if(!expected.includes(row.purpose))throw new AccessError('SESSION_REQUIRED',401)
   const user=assertAuthUser(row.user);if(!user.emailVerified)throw new AccessError('EMAIL_CONFIRMATION_REQUIRED',403)
   if(row.authSessionId&&(!row.authSession||row.authSession.expiresAt<=new Date()))throw new AccessError('SESSION_EXPIRED',401)
   if(row.verificationId&&(!row.verification||row.verification.expiresAt<=new Date()))throw new AccessError('RECOVERY_INVALID',401)
   if(!row.authSessionId&&!row.verificationId)throw new AccessError('SESSION_EXPIRED',401)
   if(row.purpose==='workspace'||row.purpose==='recovery'){
    const profile=await readProfile(user.id)
    if(profile?.status!=='ACTIVE')throw new AccessError('ACCOUNT_UNAVAILABLE',403)
   }
   const publicUser=publicAuthUser(user)
   return {id:raw,user:publicUser,entry:{purpose:row.purpose,session:{id:row.authSessionId,verificationId:row.verificationId,webSessionId:row.id,user:publicUser}}}
  }
  const snapshot=await readD1Session(this.db,digest(raw))
  if(snapshot)return validate(snapshot.row,async()=>snapshot.profile)
  return this.db.$transaction(async tx=>validate(await tx.webSession.findUnique({where:{id:digest(raw)},include:{user:true,authSession:true,verification:true}}),userId=>tx.userProfile.findUnique({where:{id:userId},select:{status:true}})),{readOnly:true})
 }
}
