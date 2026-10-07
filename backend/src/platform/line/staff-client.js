import {AccessError} from '../../modules/identity-access/membership.js'
import {isLineUser} from './staff-crypto.js'
function providerUnavailable(status){
 const error=new AccessError('LINE_PROVIDER_UNAVAILABLE',503)
 if(Number.isInteger(status)&&status>=100&&status<=599)error.providerStatus=status
 return error
}
export function safeLinePictureUrl(value){
 if(typeof value!=='string'||value.length>2048)return null
 try{const url=new URL(value);return url.protocol==='https:'&&['profile.line-scdn.net','sprofile.line-scdn.net','obs.line-apps.com'].includes(url.hostname)&&!url.username&&!url.password&&!url.port&&!url.hash?url.href:null}catch{return null}
}
export function cleanLineDisplayName(value){return typeof value==='string'?Array.from(value.slice(0,200)).filter(char=>char.charCodeAt(0)>=32&&char.charCodeAt(0)!==127).join('').trim():''}
export function createStaffLineClient(config,transport=fetch){
 async function call(endpoint,body,method=body===undefined?'GET':'POST'){
  if(!config.enabled||!config.accessToken)throw new AccessError('LINE_NOT_CONFIGURED',503)
  let response
  try{response=await transport('https://api.line.me/v2/bot/'+endpoint,{method,headers:{authorization:'Bearer '+config.accessToken,'content-type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(8000)})}
  catch{throw new AccessError('LINE_PROVIDER_UNAVAILABLE',503)}
  if(!response.ok){await response.body?.cancel();throw providerUnavailable(response.status)}
  const data=await response.json().catch(()=>null)
  if(!data||typeof data!=='object')throw providerUnavailable(response.status)
  return data
 }
 async function readProfile(userId){
  if(!isLineUser(userId))throw new AccessError('LINE_IDENTITY_INVALID',400)
  const data=await call('profile/'+userId)
  if(data.userId!==userId||typeof data.displayName!=='string')throw new AccessError('LINE_IDENTITY_INVALID',400)
  return {displayName:cleanLineDisplayName(data.displayName),pictureUrl:safeLinePictureUrl(data.pictureUrl)}
 }
 return {
  async setUserRichMenu(userId,richMenuId){
   if(!isLineUser(userId))throw new AccessError('LINE_IDENTITY_INVALID',400)
   if(!/^richmenu-[a-f0-9]{32}$/.test(richMenuId||''))throw new AccessError('LINE_RICH_MENU_INVALID',400)
   await call('user/'+userId+'/richmenu/'+richMenuId,{},'POST')
  },
  async deleteUserRichMenu(userId){
   if(!isLineUser(userId))throw new AccessError('LINE_IDENTITY_INVALID',400)
   await call('user/'+userId+'/richmenu',undefined,'DELETE')
  },
  async linkToken(userId){
   if(!isLineUser(userId))throw new AccessError('LINE_IDENTITY_INVALID',400)
   const data=await call('user/'+userId+'/linkToken',{})
   if(typeof data.linkToken!=='string'||data.linkToken.length<10||data.linkToken.length>512)throw new AccessError('LINE_PROVIDER_UNAVAILABLE',503)
   return data.linkToken
  },
  async profile(userId){return (await readProfile(userId)).displayName},
  async profileDetails(userId){return readProfile(userId)},
  async reply(replyToken,text){if(typeof replyToken!=='string'||replyToken.length>200||!replyToken)throw new AccessError('LINE_EVENT_INVALID',400);await call('message/reply',{replyToken,messages:[{type:'text',text}]})},
 }
}
