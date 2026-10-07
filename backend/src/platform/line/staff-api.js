import {linkedLineProfile} from './staff-profile.js'
import {syncStaffRichMenu} from './staff-rich-menu.js'
import {AccessError} from '../../modules/identity-access/membership.js'
import {staffLineStatus,inspectStaffLineTicket,confirmStaffLine,changeStaffLine} from '../../modules/identity-access/staff-line.js'
import {boundedAuthBody} from '../auth/cloudflare/request-body.js'
import {consumeRate} from '../auth/cloudflare/rate-limit.js'
export async function staffLineApi(request,{db,database,sessions,provider,config,client}){
 if(!['GET','POST'].includes(request.method))throw new AccessError('METHOD_NOT_ALLOWED',405)
 const auth=await sessions.authenticated({headers:{cookie:request.headers.get('cookie')}})
 if(auth.entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
 const userId=auth.user.id,sessionId=auth.entry.session.webSessionId
 if(request.method==='GET'){
  if(new URL(request.url).searchParams.get('view')==='profile')return {linkedLineProfile:await linkedLineProfile(db,userId,config,client)}
  const status=await staffLineStatus(db,userId,config)
  const profile=status.status==='LINKED'?await linkedLineProfile(db,userId,config,client):null
  const current=await staffLineStatus(db,userId,config)
  return {...current,linkedLineProfile:current.status==='LINKED'&&current.version===status.version?profile:null}
 }
 await consumeRate(database,'staff-line:'+userId,{maximum:30,seconds:60})
 const {input}=await boundedAuthBody(request)
 const fields={inspect:['action','request','linkToken'],confirm:['action','request','linkToken','password','accepted'],unlink:['action','version','confirmed'],cancel:['action']}[input.action]
 if(!Array.isArray(fields)||Object.keys(input).some(key=>!fields.includes(key)))throw new AccessError('INVALID_REQUEST',400)
 if(input.action==='inspect')return inspectStaffLineTicket(db,userId,sessionId,config,input)
 if(input.action==='confirm'){
  if(input.accepted!==true)throw new AccessError('LINE_CONSENT_REQUIRED',400)
  await consumeRate(database,'staff-line-password:'+userId,{maximum:6,seconds:900})
  if(typeof input.password!=='string'||!input.password||input.password.length>128)throw new AccessError('INVALID_PASSWORD',400)
  // Check the ticket first; missing configuration must never prompt a provider login.
  await inspectStaffLineTicket(db,userId,sessionId,config,input)
  const verified=await provider.login(auth.user.email,input.password)
  try{
   if(verified.user.id!==userId)throw new AccessError('INVALID_CREDENTIALS',400)
   return await confirmStaffLine(db,userId,sessionId,config,input)
  }finally{await provider.logout(verified.session)}
 }
 let oldBinding
 if(input.action==='unlink'){
  oldBinding=await db.staffLineBinding.findUnique({where:{channelKey_userId:{channelKey:config.channelKey,userId}}})
  // Capture only the version the user confirmed. changeStaffLine rechecks this
  // inside its write transaction, so a concurrent relink cannot target another LINE user.
  if(Number.isSafeInteger(input.version)&&input.version!==(oldBinding?.version||0))throw new AccessError('LINE_LINK_CHANGED',409)
 }
 const result=await changeStaffLine(db,userId,sessionId,config,input)
 if(oldBinding?.lineUserId){
  const menu=await syncStaffRichMenu(db,config,oldBinding.lineUserId,client)
  if(menu.status==='retry')return {...result,warning:'LINE_RICH_MENU_SYNC_PENDING'}
 }
 return result
}
