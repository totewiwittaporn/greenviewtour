import {acquireWriteLock} from '../../platform/database/write-lock.js'
import {randomUUID} from 'node:crypto'
import {pushText} from '../../platform/line/messaging.js'
import {notificationFor} from './service.js'
import {accessProfileSelect} from '../identity-access/policy.js'
import {fail} from '../operations/common.js'
// Explicit runner integration. Never invoked by startup or an HTTP request.
// Verified recipient mappings must come from protected server configuration, not
// editable contact lineId fields. Simulation is the default and makes no request.
export async function deliverPersonalNotification(prisma,{eventId,userId,mode='simulation',enabled=false,env=process.env,transport=fetch}){
 if(!['simulation','test','live'].includes(mode))fail('INVALID_LINE_MODE',400)
 if(mode!=='simulation'&&(!enabled||env.PERSONAL_LINE_DELIVERY_ENABLED!=='true'||env.PERSONAL_LINE_MODE!==mode))fail('LINE_DELIVERY_DISABLED')
 const actor=await prisma.userProfile.findUnique({where:{id:userId},select:accessProfileSelect})
 if(actor?.status!=='ACTIVE')fail('PERMISSION_DENIED',403)
 const event=await prisma.auditEvent.findUnique({where:{id:eventId}})
 if(!event)fail('NOT_FOUND',404)
 const notification=await notificationFor(prisma,actor,event)
 if(!notification?.important)return {status:'NOT_APPLICABLE'}
 let recipients;try{recipients=JSON.parse(env.PERSONAL_LINE_VERIFIED_RECIPIENTS||'{}')}catch{fail('LINE_NOT_CONFIGURED')}
 const to=mode==='test'?env.PERSONAL_LINE_TEST_RECIPIENT:recipients[userId]
 if(!/^U[0-9a-f]{32}$/i.test(to||''))fail('LINE_NOT_CONFIGURED')
 let base;try{base=new URL(env.OPERATIONS_PUBLIC_BASE_URL);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error()}catch{fail('LINE_NOT_CONFIGURED')}
 const payload={to,messages:[{type:'text',text:notification.label+'\n'+base.origin+notification.href}]}
 if(mode==='simulation')return pushText({payload,retryKey:randomUUID(),mode:'simulation',transport})
 const item=await prisma.$transaction(async tx=>{
  await acquireWriteLock(tx)
  const where={eventId_userId_mode:{eventId,userId,mode}}
  let old=await tx.personalLineDelivery.findUnique({where})
  if(old?.status==='ACCEPTED')return old
  if(old&&old.recipient!==to)fail('LINE_CONFIG_CHANGED')
  if(old&&Date.now()-+old.createdAt>=23*3600000)fail('LINE_RETRY_EXPIRED')
  if(old?.status==='SENDING'&&Date.now()-+old.updatedAt<120000)fail('LINE_DELIVERY_BUSY')
  if(!old)old=await tx.personalLineDelivery.create({data:{id:randomUUID(),eventId,userId,mode,recipient:to,status:'PREPARED'}})
  return tx.personalLineDelivery.update({where:{id:old.id},data:{status:'SENDING'}})
 })
 if(item.status==='ACCEPTED')return {status:'ACCEPTED'}
 const result=await pushText({payload,retryKey:item.id,token:env.LINE_CHANNEL_ACCESS_TOKEN,mode:'live',transport})
 await prisma.personalLineDelivery.update({where:{id:item.id},data:{status:result.accepted?'ACCEPTED':'FAILED'}})
 return result
}
