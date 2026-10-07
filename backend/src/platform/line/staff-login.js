import {randomBytes,randomUUID,createHash} from 'node:crypto'
import {AccessError,hashToken} from '../../modules/identity-access/membership.js'
import {pendingEmployee,completeEmployeeOnboarding} from '../../modules/identity-access/employee-onboarding.js'
import {staffOa} from './staff-config.js'
const secret=()=>randomBytes(32).toString('base64url')
const fail=(code,status=400)=>{throw new AccessError(code,status)}
export function staffLoginSettings(env){
 const base={available:false,reason:'LINE_LOGIN_NOT_CONFIGURED',addFriendUrl:'https://line.me/R/ti/p/%40335bydey'}
 // Local never inherits live channel credentials. Tests inject a separate adapter.
 if(env.APP_ENV==='local')return {...base,reason:'LINE_LOCAL_ONLY'}
 if(env.LINE_STAFF_LOGIN_ENABLED!=='true'||env.LINE_STAFF_LOGIN_PROVIDER_ID!==staffOa.providerId||!/^\d{6,20}$/.test(env.LINE_STAFF_LOGIN_CHANNEL_ID||'')||!/^[a-f0-9]{32}$/i.test(env.LINE_STAFF_LOGIN_CHANNEL_SECRET||''))return base
 let callback
 try{callback=new URL('/onboarding/line-callback',env.BACKOFFICE_ORIGIN);if(callback.protocol!=='https:')return base}catch{return base}
 return {...base,available:true,reason:null,channelId:env.LINE_STAFF_LOGIN_CHANNEL_ID,channelSecret:env.LINE_STAFF_LOGIN_CHANNEL_SECRET,callbackUrl:callback.href,channelKey:'live:'+staffOa.providerId+':'+staffOa.channelId}
}
async function jsonRequest(transport,url,options){
 try{
  const response=await transport(url,{...options,signal:AbortSignal.timeout(10000),redirect:'manual'})
  if(!response.ok)fail('LINE_LOGIN_UNAVAILABLE',503)
  return await response.json()
 }catch(error){if(error instanceof AccessError)throw error;fail('LINE_LOGIN_UNAVAILABLE',503)}
}
const form=values=>({method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values).toString()})
export function createStaffLogin(db,config,transport=fetch){
 return {
  readiness:()=>({available:config.available,reason:config.reason,addFriendUrl:config.addFriendUrl}),
  async start(user,webSessionId){
   if(!config.available)fail(config.reason||'LINE_LOGIN_NOT_CONFIGURED',503)
   const state=secret(),nonce=secret(),verifier=secret()
   await db.$transaction(async tx=>{
    const {row,invitation}=await pendingEmployee(tx,user)
    if(!row.passwordSetAt||!row.profileCompletedAt||!row.addressDetails)fail('ONBOARDING_STEP_CONFLICT',409)
    const web=await tx.webSession.findUnique({where:{id:webSessionId}})
    if(web?.purpose!=='onboarding'||web.userId!==user.id||web.expiresAt<=new Date())fail('SESSION_EXPIRED',401)
    const identifier='staff-line-login:'+hashToken(state)
    await tx.authVerification.deleteMany({where:{identifier:{startsWith:'staff-line-login:'},expiresAt:{lte:new Date()}}})
    await tx.authVerification.create({data:{id:randomUUID(),identifier,value:JSON.stringify({userId:user.id,webSessionId,nonce,verifier,invitationId:invitation.id,invitationTokenHash:invitation.tokenHash,channelId:config.channelId}),expiresAt:new Date(Date.now()+600000)}})
   })
   const url=new URL('https://access.line.me/oauth2/v2.1/authorize')
   url.search=new URLSearchParams({response_type:'code',client_id:config.channelId,redirect_uri:config.callbackUrl,state,scope:'openid profile',nonce,bot_prompt:'aggressive',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString()
   return {redirectUrl:url.href}
  },
  async finish(user,webSessionId,input){
   if(!config.available)fail(config.reason||'LINE_LOGIN_NOT_CONFIGURED',503)
   if(typeof input.state!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(input.state)||typeof input.code!=='string'||!input.code||input.code.length>2048||Object.keys(input).some(k=>!['state','code'].includes(k)))fail('LINE_LOGIN_INVALID')
   const proof=await db.$transaction(async tx=>{
    const {row}=await pendingEmployee(tx,user)
    if(!row.passwordSetAt)fail('ONBOARDING_STEP_CONFLICT',409)
    const grant=await tx.authVerification.findUnique({where:{identifier:'staff-line-login:'+hashToken(input.state)}})
    if(!grant||grant.expiresAt<=new Date())fail('LINE_LOGIN_EXPIRED')
    const proof=JSON.parse(grant.value)
    if(proof.userId!==user.id||proof.webSessionId!==webSessionId||proof.channelId!==config.channelId)fail('LINE_LOGIN_INVALID')
    await tx.authVerification.delete({where:{id:grant.id}})
    return proof
   })
   let accessToken
   try{
    const token=await jsonRequest(transport,'https://api.line.me/oauth2/v2.1/token',form({grant_type:'authorization_code',code:input.code,redirect_uri:config.callbackUrl,client_id:config.channelId,client_secret:config.channelSecret,code_verifier:proof.verifier}))
    accessToken=token.access_token
    if(typeof accessToken!=='string'||typeof token.id_token!=='string')fail('LINE_LOGIN_INVALID')
    const identity=await jsonRequest(transport,'https://api.line.me/oauth2/v2.1/verify',form({id_token:token.id_token,client_id:config.channelId,nonce:proof.nonce}))
    if(identity.iss!=='https://access.line.me'||identity.aud!==config.channelId||identity.nonce!==proof.nonce||!Number.isFinite(identity.exp)||identity.exp*1000<=Date.now()||!/^U[0-9a-f]{32}$/.test(identity.sub||''))fail('LINE_LOGIN_INVALID')
    const friendship=await jsonRequest(transport,'https://api.line.me/friendship/v1/status',{headers:{authorization:'Bearer '+accessToken}})
    if(friendship.friendFlag!==true)fail('LINE_FRIEND_REQUIRED',409)
    return await completeEmployeeOnboarding(db,user,proof,{userId:identity.sub,displayName:typeof identity.name==='string'?identity.name.slice(0,255):null,friendFlag:true,channelKey:config.channelKey},webSessionId)
   }finally{
    if(accessToken)try{await transport('https://api.line.me/oauth2/v2.1/revoke',{...form({access_token:accessToken,client_id:config.channelId,client_secret:config.channelSecret}),signal:AbortSignal.timeout(5000),redirect:'manual'})}catch{/* Ephemeral token is never retained or logged. */}
   }
  },
 }
}
