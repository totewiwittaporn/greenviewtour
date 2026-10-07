import {randomUUID} from 'node:crypto'
import {effectiveAccess,roleNames} from '../../../../packages/contracts/access.js'
import {accessProfileSelect} from '../identity-access/policy.js'
import {authorize,dateOnly,fail,hash,uuid,write} from '../operations/common.js'
import {pushText,validatePush} from '../../platform/line/messaging.js'
import {activeStaff} from '../identity-access/staff-line.js'
import {isLineUser} from '../../platform/line/staff-crypto.js'
import {programSummaryRoles,programSummaryJobs} from './daily-work-assignment.js'
import {headGuideJobs} from './daily-work-head-guide.js'
import {headDriverJobs,driverJobs} from './daily-work-driver.js'
const boatRoles=['CAPTAIN','HEAD_CAPTAIN','ASSISTANT_CAPTAIN','GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE']; export const dailyWorkAssignmentRoles=Object.freeze(['MANAGER','HEAD_BOOKING','BOOKING','HEAD_GUIDE','GUIDE','ASSISTANT_TOUR_GUIDE','HEAD_CAPTAIN','CAPTAIN','ASSISTANT_CAPTAIN','HEAD_DRIVER','DRIVER','HEAD_HOUSEKEEPING','HOUSEKEEPING']);
const guideRoles=['GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE']
const limit=1000
const modeCheck=mode=>{if(!['simulation','live'].includes(mode))fail('INVALID_LINE_MODE',400)}
const hasRole=(actor,role)=>actor.roles?.some(grant=>['SELF','COMPANY'].includes(grant.scope)&&(grant.roleCode||grant.code)===role)
const publicRow=row=>({id:row.id,userId:row.userId,serviceDate:row.serviceDate,mode:row.mode,status:row.status,revision:row.revision,attempts:row.attempts,createdAt:row.createdAt,contentHash:row.contentHash,messages:row.payload.messages.map(message=>({type:'text',text:message.text}))})
function configuration(config){if(!config||typeof config.channelKey!=='string'||!config.channelKey||config.channelKey.length>200)fail('LINE_NOT_CONFIGURED');return config}
function safeBase(value){if(!value)return null;try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash)return url.origin}catch{/* optional links */}fail('PUBLIC_URL_REQUIRED')}
function messagesFor(serviceDate,jobs,base){
 const lines=[]
 for(const job of jobs){
  const generic=`${job.role}: ${job.kind} #${job.key.split(':')[1].slice(0,8)}${job.time?' · '+job.time+' (Thailand)':''}${job.passengers===undefined?'':` · ${job.passengers} passengers`}`
  const linked=(job.text||generic)+(base&&job.href?'\n'+base+job.href:'')
  for(const raw of linked.split('\n')){
   if(!raw){lines.push('');continue}
   for(let offset=0;offset<raw.length;offset+=4400)lines.push(raw.slice(offset,offset+4400))
  }
 }
 const messages=[]
 let text=`แจ้งงานประจำวัน / Daily Work Assignment วันที่ ${serviceDate}\nตรวจสอบงานและจำนวนลูกค้าสำหรับวันให้บริการถัดไปใน Backoffice หากมีการเปลี่ยนแปลง`
 for(const line of lines){
  if(text.length+line.length+2>4800){messages.push({type:'text',text});text=`Daily Work Assignment วันที่ ${serviceDate} (ต่อ)`}
  text+='\n\n'+line
 }
 messages.push({type:'text',text})
 if(messages.length>5)fail('SUMMARY_TOO_LARGE')
 return messages
}

// Always query complete bounded assignments, never notification/audit-event history.
async function project(tx,{serviceDate,config,now=new Date()}){
 configuration(config);const day=dateOnly(serviceDate),start=new Date(serviceDate+'T00:00:00+07:00'),end=new Date(+start+86400000),base=safeBase(config.baseUrl)
 const [runs,guides,work,bookings]=await Promise.all([
  tx.dispatchRun.findMany({where:{status:'OPEN',slot:{status:'ACTIVE',startsAt:{gte:start,lt:end}}},select:{id:true,name:true,kind:true,direction:true,version:true,slot:{select:{startsAt:true,vehicle:{select:{code:true,name:true,registration:true}}}},staff:{select:{userId:true,role:true}},assignments:{where:{status:{not:'CANCELLED'},bookingLine:{booking:{status:{in:['CONFIRMED','COMPLETED']}}}},select:{adults:true,children:true,pickupAt:true,dropoffPoint:true,bookingLine:{select:{booking:{select:{id:true,code:true,name:true,hotel:true,pickupPoint:true,dropoffPoint:true}}}}}}},take:limit+1}),
  tx.guideAssignment.findMany({where:{status:'PLANNED',startsAt:{lt:end},endsAt:{gt:start},booking:{status:'CONFIRMED'}},select:{id:true,version:true,guideId:true,startsAt:true,endsAt:true},take:limit+1}),
  tx.companyWorkRecord.findMany({where:{dueOn:day,OR:[{kind:'JOB',status:'PENDING'},{kind:'MAINTENANCE',status:'APPROVED'}]},select:{id:true,version:true,kind:true,payload:true,assigneeId:true},take:limit+1}),
  tx.tourBooking.findMany({where:{status:{in:['CONFIRMED','COMPLETED']},trip:{startsAt:{lt:end},endsAt:{gte:start}}},select:{id:true,code:true,name:true,adults:true,children:true,programSnapshot:true,specialRequirements:true,allergyStatus:true,allergies:true,trip:{select:{tourId:true,name:true,tour:{select:{name:true,printCode:true}}}},lines:{where:{selected:true},select:{selected:true,quantity:true,snapshot:true,resource:{select:{category:true,mealPeriod:true,accommodationType:true,ownership:true}}}}},orderBy:{id:'asc'},take:limit+1}),
 ])
 if([runs,guides,work,bookings].some(rows=>rows.length>limit))fail('DIGEST_LIMIT_EXCEEDED')
const actorCandidates = await tx.userProfile.findMany({where:{status:'ACTIVE'},select:accessProfileSelect,take:limit+1})
if (actorCandidates.length > limit) fail('DIGEST_LIMIT_EXCEEDED')
const actors = actorCandidates.filter(actor => !hasRole(actor, 'ADMIN_MANAGER') && dailyWorkAssignmentRoles.some(role => hasRole(actor, role))), ids = actors.map(row => row.id).sort()
 const authUsers=ids.length?await tx.authUser.findMany({where:{id:{in:ids}},select:{id:true,emailVerified:true,disabled:true,bannedUntil:true}}):[]
 const bindings=ids.length?await tx.staffLineBinding.findMany({where:{channelKey:config.channelKey,userId:{in:ids}}}):[]
 const rows=[]
 for(const userId of ids){
  const actor=actors.find(row=>row.id===userId),auth=authUsers.find(row=>row.id===userId);let jobs=[]
const staffAvailable=actor?.status==='ACTIVE'&&Boolean(actor.roles?.length)&&Boolean(auth?.emailVerified)&&!auth.disabled&&(!auth.bannedUntil||+new Date(auth.bannedUntil)<=+now)&&dailyWorkAssignmentRoles.some(role=>hasRole(actor,role))
  const allowed=permission=>effectiveAccess(actor,permission,{now}).allowed
if(staffAvailable){if(hasRole(actor,'HEAD_GUIDE'))jobs.push(...headGuideJobs(bookings));else if(programSummaryRoles.some(role=>hasRole(actor,role)))jobs.push(...programSummaryJobs(bookings))
   if((hasRole(actor,'HEAD_DRIVER')||hasRole(actor,'DRIVER'))&&allowed('operations.driver')){
    if(hasRole(actor,'HEAD_DRIVER'))jobs.push(...headDriverJobs(runs,serviceDate))
    jobs.push(...driverJobs(runs,userId,serviceDate))
   }
   for(const run of runs.filter(run=>run.kind==='BOAT')){
    for(const staff of run.staff.filter(staff=>staff.userId===userId))if(boatRoles.includes(staff.role)&&hasRole(actor,staff.role)&&allowed('operations.guide'))jobs.push({key:'run:'+run.id,version:run.version,role:roleNames[staff.role],kind:'Boat job',time:new Date(+new Date(run.slot.startsAt)+7*3600000).toISOString().slice(11,16),passengers:run.assignments.reduce((n,row)=>n+(Number(row.adults)||0)+(Number(row.children)||0),0),href:`/operations/guide?runId=${run.id}&date=${serviceDate}`})
   }
   for(const row of guides.filter(row=>row.guideId===userId))if(guideRoles.some(role=>hasRole(actor,role))&&allowed('operations.guide'))jobs.push({key:'guide:'+row.id,version:row.version,role:'Guide',kind:'Guide assignment',href:'/operations/guide-assignments'})
   for(const row of work.filter(row=>row.assigneeId===userId)){
    const cleaning=row.kind==='JOB'&&row.payload?.jobKind==='CLEANING',count=row.kind==='JOB'&&row.payload?.jobKind==='COUNT',maintenance=row.kind==='MAINTENANCE'
    if((cleaning&&allowed('housekeeping.view'))||((count||maintenance)&&allowed('inventory.request')))jobs.push({key:'work:'+row.id,version:row.version,role:cleaning?'Housekeeping':count?'Stock count':'Maintenance',kind:cleaning?'Cleaning job':count?'Count job':'Maintenance job',href:'/company/'+(maintenance?'maintenance':'cleaning-jobs')})
   }
  }
  jobs.sort((a,b)=>a.key.localeCompare(b.key)||a.role.localeCompare(b.role)||a.kind.localeCompare(b.kind));jobs=jobs.filter((job,index)=>!index||job.key!==jobs[index-1].key||job.role!==jobs[index-1].role);const binding=bindings.find(row=>row.userId===userId)
  const reason=!staffAvailable?'STAFF_UNAVAILABLE':!jobs.length?'NO_AUTHORIZED_WORK':binding?.status!=='LINKED'||!isLineUser(binding.lineUserId)?'NOT_LINKED':null
  const messages=jobs.length?messagesFor(serviceDate,jobs,base):[]
  rows.push({userId,name:actor?.displayName||'Unavailable staff',jobs,messages,reason,binding,contentHash:hash({serviceDate,jobs,messages,bindingVersion:binding?.version,channelKey:config.channelKey})})
 }
 return rows
}
export async function previewStaffDailyDigests(db,options){
 return db.$transaction(async tx=>{await authorize(tx,options.actorId);const rows=await project(tx,options);return {serviceDate:options.serviceDate,rows:rows.map(row=>({userId:row.userId,name:row.name,jobs:row.jobs,messages:row.messages,reason:row.reason,contentHash:row.contentHash})),coverage:'ROLE_BASED_DAILY_WORK'}},{timeout:30000})
}
export async function prepareStaffDailyDigests(db,{actorId,serviceDate,config,mode='simulation',now=new Date()}){
 modeCheck(mode)
 return write(db,actorId,async tx=>{
  const projected=await project(tx,{serviceDate,config,now}),rows=[],skipped=[]
  for(const item of projected){
   if(item.reason&&!(mode==='simulation'&&item.reason==='NOT_LINKED')){skipped.push({userId:item.userId,reason:item.reason});continue}
   const where={serviceDate:dateOnly(serviceDate),userId:item.userId,mode,channelKey:config.channelKey}
   const prior=await tx.staffDailyDigest.findFirst({where,orderBy:{revision:'desc'}})
   if(prior?.contentHash===item.contentHash&&!(prior.status==='BLOCKED'&&prior.attempts===0)){rows.push(publicRow(prior));continue}
   // Failed/in-flight sends may already have been accepted; never replace their key to bypass uncertainty.
   if(prior&&['SENDING','FAILED','BLOCKED','EXPIRED'].includes(prior.status)&&prior.attempts>0){skipped.push({userId:item.userId,reason:'UNCERTAIN_DELIVERY_REQUIRES_RETRY'});continue}
   if(prior?.status==='PREPARED')await tx.staffDailyDigest.update({where:{id:prior.id},data:{status:'SUPERSEDED'}})
   const payload={...(item.reason?{}:{to:item.binding.lineUserId}),messages:item.messages},id=randomUUID();if(payload.to)validatePush(payload,id)
   const row=await tx.staffDailyDigest.create({data:{id,retryKey:id,...where,revision:(prior?.revision||0)+1,contentHash:item.contentHash,bindingVersion:item.binding?.version||0,payload,status:'PREPARED',attempts:0,createdAt:now,updatedAt:now}})
   rows.push(publicRow(row))
  }
  return {serviceDate,mode,rows,skipped}
 })
}
export async function deliverStaffDailyDigest(db,{actorId,id,config,mode='simulation',enabled=false,scope='manual',now=new Date(),transport=fetch}){
 uuid(id);modeCheck(mode);configuration(config);if(!['manual','scheduled'].includes(scope)||scope==='scheduled'&&mode!=='live')fail('INVALID_LINE_MODE',400)
 const scheduled=scope==='scheduled'
 if(mode==='live'&&(!enabled||config.liveEnabled!==true||config.enabled!==true||config.mode!=='live'||!config.accessToken||scheduled&&config.automaticEnabled!==true||!scheduled&&!config.ownerUserId))fail('LINE_DELIVERY_DISABLED')
 const row=await write(db,actorId,async tx=>{
  const item=await tx.staffDailyDigest.findUnique({where:{id}})
  if(!item)fail('NOT_FOUND',404)
  if(item.mode!==mode||item.channelKey!==config.channelKey)fail('LINE_CONFIG_CHANGED')
  if(['ACCEPTED','SIMULATED','SUPERSEDED','EXPIRED','BLOCKED'].includes(item.status))return item
  if(mode==='live'&&!scheduled&&item.userId!==config.ownerUserId)fail('LINE_OWNER_ONLY')
  if(mode==='live'){try{await activeStaff(tx,item.userId)}catch{return tx.staffDailyDigest.update({where:{id},data:{status:'BLOCKED',updatedAt:now}})}}
  if(item.firstAttemptAt&&+now-+new Date(item.firstAttemptAt)>=23*3600000)return tx.staffDailyDigest.update({where:{id},data:{status:'EXPIRED',updatedAt:now}})
  if(item.attempts>=5)fail('LINE_ATTEMPTS_EXHAUSTED')
  if(item.status==='SENDING'&&+now-+new Date(item.lastAttemptAt)<120000)fail('LINE_DELIVERY_BUSY')
  const current=(await project(tx,{serviceDate:new Date(item.serviceDate).toISOString().slice(0,10),config,now})).find(row=>row.userId===item.userId)
  if(!current||(current.reason&&!(mode==='simulation'&&current.reason==='NOT_LINKED'))||current.contentHash!==item.contentHash||(current.reason?undefined:current.binding.lineUserId)!==item.payload.to||(current.binding?.version||0)!==item.bindingVersion)return tx.staffDailyDigest.update({where:{id},data:{status:'BLOCKED',updatedAt:now}})
  if(item.payload.to)validatePush(item.payload,item.retryKey)
  return tx.staffDailyDigest.update({where:{id},data:{status:'SENDING',attempts:{increment:1},firstAttemptAt:item.firstAttemptAt||now,lastAttemptAt:now,updatedAt:now}})
 })
 if(row.status!=='SENDING')return publicRow(row)
 const result=mode==='simulation'?{accepted:false}:await pushText({payload:row.payload,retryKey:row.retryKey,mode,token:config.accessToken,transport})
 const status=mode==='simulation'?'SIMULATED':result.accepted?'ACCEPTED':'FAILED'
 await write(db,actorId,tx=>tx.staffDailyDigest.updateMany({where:{id,status:'SENDING',attempts:row.attempts},data:{status,updatedAt:now}}))
 return {...publicRow(row),status,accepted:result.accepted}
}

// A deliberate resend is permitted only after a settled outcome; uncertainty uses retry.
export async function resendStaffDailyDigest(db,{actorId,id,commandId,config,mode='simulation',now=new Date()}){
 uuid(id);uuid(commandId);modeCheck(mode);configuration(config)
 return write(db,actorId,async tx=>{
  const source=await tx.staffDailyDigest.findUnique({where:{id}})
  if(!source)fail('NOT_FOUND',404)
  if(source.mode!==mode||source.channelKey!==config.channelKey)fail('LINE_CONFIG_CHANGED')
  const existing=await tx.staffDailyDigest.findUnique({where:{id:commandId}})
  if(existing){if(existing.sourceId!==id||existing.userId!==source.userId||existing.mode!==mode||existing.channelKey!==config.channelKey)fail('COMMAND_CONFLICT');return publicRow(existing)}
  if(!['ACCEPTED','SIMULATED'].includes(source.status))fail('LINE_RESEND_REQUIRES_SETTLED')
  const serviceDate=new Date(source.serviceDate).toISOString().slice(0,10)
  const current=(await project(tx,{serviceDate,config,now})).find(row=>row.userId===source.userId)
  if(!current||(current.reason&&!(mode==='simulation'&&current.reason==='NOT_LINKED')))fail('DIGEST_RECIPIENT_UNAVAILABLE')
  if(mode==='live'){if(!config.enabled||config.mode!=='live'||config.liveEnabled!==true||source.userId!==config.ownerUserId)fail('LINE_DELIVERY_DISABLED');await activeStaff(tx,source.userId)}
  const where={serviceDate:source.serviceDate,userId:source.userId,mode,channelKey:config.channelKey}
  const latest=await tx.staffDailyDigest.findFirst({where,orderBy:{revision:'desc'}})
  if(latest&&['PREPARED','SENDING','FAILED','BLOCKED','EXPIRED'].includes(latest.status)&&latest.id!==source.id)fail('LINE_DELIVERY_BUSY')
  const payload={...(current.reason?{}:{to:current.binding.lineUserId}),messages:current.messages}
  if(payload.to)validatePush(payload,commandId)
  return publicRow(await tx.staffDailyDigest.create({data:{id:commandId,retryKey:commandId,sourceId:id,...where,revision:(latest?.revision||0)+1,contentHash:current.contentHash,bindingVersion:current.binding?.version||0,payload,status:'PREPARED',attempts:0,createdAt:now,updatedAt:now}}))
 })
}
