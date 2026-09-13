import {randomUUID} from 'node:crypto'
import {effectiveAccess,isManager} from '../../../../packages/contracts/access.js'
import {workDefinitions,calendarDate,scheduleDates,purchaseTotal,satang,baht} from '../../../../packages/contracts/company-work.js'
import {profileInclude} from '../identity-access/policy.js'
import {fail,uuid,int,string,keys,hash} from '../operations/common.js'
import {stockCommand} from '../operations/stock.js'

const permitted=(actor,permission)=>effectiveAccess(actor,permission).allowed
const requirePermission=(actor,permission)=>{if(!permitted(actor,permission))fail('PERMISSION_DENIED',403)}
const canArea=(actor,kind)=>permitted(actor,workDefinitions[kind]?.permission)||(kind==='SCHEDULE'&&permitted(actor,'inventory.approve'))||(kind==='JOB'&&permitted(actor,'inventory.request'))
const nested=tx=>({...tx,$transaction:fn=>fn(tx)})
async function actorFor(p,id){const actor=await p.userProfile.findUnique({where:{id},include:profileInclude});if(actor?.status!=='ACTIVE')fail('PERMISSION_DENIED',403);return actor}
async function active(p,model,id){const row=await p[model].findUnique({where:{id:uuid(id)}});if(!row||row.status!=='ACTIVE')fail('RELATED_RECORD_UNAVAILABLE');return row}
const audit=(p,actorId,targetId,action,details)=>p.auditEvent.create({data:{actorId,targetId,action:'company.'+action,details:JSON.parse(JSON.stringify(details))}})
async function transact(p,actorId,fn){return p.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`;return fn(tx,await actorFor(tx,actorId))},{timeout:60000,maxWait:15000})}
const cleanLines=value=>{if(!Array.isArray(value)||!value.length||value.length>50)fail('INVALID_CHECKLIST',400);const lines=value.map(v=>string(v,300));if(new Set(lines).size!==lines.length)fail('DUPLICATE_CHECKLIST_ITEM',400);return lines}
const optionalId=value=>value?uuid(value):null
function date(value){try{return calendarDate(value)}catch{fail('INVALID_DATE',400)}}
function address(value){if(!value)return null;try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error();return string(value,2048)}catch{fail('INVALID_EVIDENCE_URL',400)}}
async function storeAccess(tx,actor,storeId){
 // An explicit denial still wins over a custodian appointment.
 if(effectiveAccess(actor,'operations.stock').source==='User restriction')return false
 if(permitted(actor,'operations.stock'))return true
 const duty=await tx.warehouseResponsibility.findUnique({where:{storeId}})
 return Boolean(duty&&(duty.primaryUserId===actor.id||duty.deputyUserIds.includes(actor.id)))
}
async function canRead(tx,actor,row){
 if(row.kind==='ZONE')return permitted(actor,'housekeeping.view')
 if(row.kind==='SCHEDULE')return permitted(actor,row.payload.jobKind==='COUNT'?'inventory.approve':'housekeeping.view')
 if(row.kind==='JOB')return row.assigneeId===actor.id||(row.payload.jobKind==='COUNT'?permitted(actor,'inventory.approve'):permitted(actor,'housekeeping.manage')||permitted(actor,'housekeeping.approve'))
 if(row.kind==='STOCK_REQUEST'||row.kind==='COUNT')return row.createdById===actor.id||permitted(actor,'inventory.approve')||row.storeId&&await storeAccess(tx,actor,row.storeId)
 if(row.kind==='MAINTENANCE')return row.createdById===actor.id||row.assigneeId===actor.id||permitted(actor,'inventory.approve')
 return false
}
export async function saveCompanyWork(prisma,actorId,input){
 keys(input,['id','kind','version','name','payload']);uuid(input.id);int(input.version,0)
 if(!workDefinitions[input.kind]||input.kind==='JOB')fail('INVALID_WORK_KIND',400)
 return transact(prisma,actorId,async(tx,actor)=>{
  const definition=workDefinitions[input.kind];requirePermission(actor,input.kind==='SCHEDULE'&&input.payload?.jobKind==='COUNT'?'inventory.approve':definition.edit)
  const requestHash=hash(input),name=string(input.name),payload=input.payload
  if(!payload||typeof payload!=='object'||Array.isArray(payload))fail('INVALID_INPUT',400)
  if(input.kind==='RESPONSIBILITY'){
   keys(payload,['storeId','primaryUserId','deputyUserId','reason'])
   if(!isManager(actor))fail('PERMISSION_DENIED',403)
   await active(tx,'stockLocation',payload.storeId);await active(tx,'userProfile',payload.primaryUserId)
   if(payload.deputyUserId)await active(tx,'userProfile',payload.deputyUserId)
   if(payload.primaryUserId===payload.deputyUserId)fail('DUPLICATE_CUSTODIAN',400)
   const old=await tx.warehouseResponsibility.findUnique({where:{storeId:payload.storeId}})
   if((old?.version||0)!==input.version)fail('SETTINGS_CONFLICT')
   const data={primaryUserId:payload.primaryUserId,deputyUserIds:payload.deputyUserId?[payload.deputyUserId]:[],reason:string(payload.reason,2000),updatedById:actorId}
   const row=await tx.warehouseResponsibility.upsert({where:{storeId:payload.storeId},create:{storeId:payload.storeId,...data},update:{...data,version:{increment:1}}})
   await audit(tx,actorId,row.storeId,'custodian.saved',{before:old,after:row});return {row}
  }
  if(input.kind==='PURCHASE')return savePurchase(tx,actor,input,requestHash)
  const old=await tx.companyWorkRecord.findUnique({where:{id:input.id}})
  if(old?.commandHash===requestHash){if(!await canRead(tx,actor,old))fail('PERMISSION_DENIED',403);return {row:old}}
  if(old&&(old.kind!==input.kind||!['DRAFT','REJECTED','ACTIVE','INACTIVE'].includes(old.status)||old.version!==input.version)||!old&&input.version!==0)fail('SETTINGS_CONFLICT')
  if(old&&!await canRead(tx,actor,old))fail('PERMISSION_DENIED',403)
  if(old&&!['ZONE','SCHEDULE'].includes(input.kind)&&old.createdById!==actorId)fail('PERMISSION_DENIED',403)
  let data={},status=['ZONE','SCHEDULE'].includes(input.kind)?'ACTIVE':'DRAFT',storeId=null,assigneeId=null,dueOn=null
  if(input.kind==='ZONE'){keys(payload,['description','checklist']);data={description:string(payload.description,2000),checklist:cleanLines(payload.checklist)}}
  if(input.kind==='SCHEDULE'){
   keys(payload,['jobKind','zoneId','storeId','assigneeId','frequency','startsOn','endsOn','customDates','checklist'])
   if(!['CLEANING','COUNT'].includes(payload.jobKind))fail('INVALID_WORK_KIND',400)
   if(payload.jobKind==='COUNT'){requirePermission(actor,'inventory.approve');await active(tx,'stockLocation',payload.storeId);storeId=payload.storeId}
   else {const zone=await tx.companyWorkRecord.findUnique({where:{id:uuid(payload.zoneId)}});if(zone?.kind!=='ZONE'||zone.status!=='ACTIVE')fail('RELATED_RECORD_UNAVAILABLE')}
   await active(tx,'userProfile',payload.assigneeId);assigneeId=payload.assigneeId
   data={...payload,zoneId:payload.jobKind==='CLEANING'?payload.zoneId:null,storeId,checklist:cleanLines(payload.checklist),customDates:payload.customDates||[]}
   try{scheduleDates(data)}catch(e){fail(e.message,400)}
   // One schedule revision owns its job history. Create a new schedule for a changed recurrence.
   if(old&&await tx.companyWorkRecord.count({where:{parentId:old.id}}))fail('SCHEDULE_HAS_JOBS')
  }
  if(input.kind==='STOCK_REQUEST'){
   keys(payload,['storeId','destinationId','resourceId','quantity','dueOn','vehicleId','reason'])
   await active(tx,'stockLocation',payload.storeId);await active(tx,'stockLocation',payload.destinationId)
   const resource=await active(tx,'operationResource',payload.resourceId);if(resource.kind==='SERVICE')fail('INVALID_RESOURCE',400)
   if(payload.vehicleId)await active(tx,'fleetVehicle',payload.vehicleId)
   data={...payload,quantity:int(payload.quantity),vehicleId:optionalId(payload.vehicleId),reason:string(payload.reason,2000)};storeId=payload.storeId;dueOn=date(payload.dueOn)
  }
  if(input.kind==='COUNT'){
   keys(payload,['balanceId','countedQuantity','jobId','reason'])
   const balance=await tx.stockBalance.findUnique({where:{id:uuid(payload.balanceId)}});if(!balance)fail('RELATED_RECORD_UNAVAILABLE')
   if(!await storeAccess(tx,actor,balance.locationId))fail('PERMISSION_DENIED',403)
   if(payload.jobId){const job=await tx.companyWorkRecord.findUnique({where:{id:uuid(payload.jobId)}});if(job?.kind!=='JOB'||job.payload.jobKind!=='COUNT'||job.storeId!==balance.locationId||job.assigneeId!==actorId||job.status!=='PENDING')fail('INVALID_COUNT_JOB')}
   data={balanceId:balance.id,balanceVersion:balance.version,previousQuantity:balance.quantity,countedQuantity:int(payload.countedQuantity,0,100000000),jobId:optionalId(payload.jobId),reason:string(payload.reason,2000)};storeId=balance.locationId
  }
  if(input.kind==='MAINTENANCE'){
   keys(payload,['vehicleId','resourceId','assigneeId','dueOn','reason'])
   if(!payload.vehicleId&&!payload.resourceId)fail('ASSET_REQUIRED',400)
   if(payload.vehicleId)await active(tx,'fleetVehicle',payload.vehicleId)
   if(payload.resourceId)await active(tx,'operationResource',payload.resourceId)
   await active(tx,'userProfile',payload.assigneeId);assigneeId=payload.assigneeId;dueOn=date(payload.dueOn)
   data={...payload,vehicleId:optionalId(payload.vehicleId),resourceId:optionalId(payload.resourceId),reason:string(payload.reason,2000)}
  }
  const values={name,payload:data,status,storeId,assigneeId,dueOn,commandHash:requestHash,approvedById:null}
  const row=old?await tx.companyWorkRecord.update({where:{id:old.id},data:{...values,version:{increment:1}}}):await tx.companyWorkRecord.create({data:{id:input.id,kind:input.kind,createdById:actorId,...values}})
  await audit(tx,actorId,row.id,'work.saved',{kind:row.kind,version:row.version,before:old?.payload,after:data});return {row}
 })
}
async function savePurchase(tx,actor,input,requestHash){
 const p=input.payload;keys(p,['supplierId','storeId','requestId','quotationUrl','reason','lines'])
 const old=await tx.purchaseOrder.findUnique({where:{id:input.id}})
 if(old?.commandHash===requestHash){if(old.createdById!==actor.id)fail('PERMISSION_DENIED',403);return {row:old}}
 if(old&&(old.createdById!==actor.id||!['DRAFT','REJECTED'].includes(old.status)||old.version!==input.version)||!old&&input.version!==0)fail('SETTINGS_CONFLICT')
 await active(tx,'businessPartner',p.supplierId);await active(tx,'stockLocation',p.storeId)
 if(p.requestId){const r=await tx.companyWorkRecord.findUnique({where:{id:uuid(p.requestId)}});if(r?.kind!=='STOCK_REQUEST'||r.status!=='APPROVED')fail('REQUEST_APPROVAL_REQUIRED')}
 let total;try{total=purchaseTotal(p.lines)}catch(e){fail(e.message,400)}
 const seen=new Set(),lines=[]
 for(const line of p.lines){keys(line,['resourceId','quantity','unitCost']);const resource=await active(tx,'operationResource',line.resourceId);if(resource.kind==='SERVICE'||seen.has(resource.id))fail('INVALID_LINES',400);seen.add(resource.id);lines.push({id:randomUUID(),resourceId:resource.id,name:resource.name,baseUnit:resource.baseUnit,quantity:line.quantity,unitCost:baht(satang(line.unitCost)),receivedQty:0})}
 const data={name:string(input.name),supplierId:p.supplierId,storeId:p.storeId,requestId:optionalId(p.requestId),quotationUrl:address(p.quotationUrl),reason:string(p.reason,2000),lines,total,status:'DRAFT',approvedById:null,commandHash:requestHash}
 const row=old?await tx.purchaseOrder.update({where:{id:old.id},data:{...data,version:{increment:1}}}):await tx.purchaseOrder.create({data:{id:input.id,createdById:actor.id,...data}})
 await audit(tx,actor.id,row.id,'purchase.saved',{version:row.version,total});return {row}
}
async function stock(tx,actor,input,permissionCheck,approvedCount=false){
 return stockCommand(nested(tx),actor.id,input,{authorizeDelegated:async(t,a)=>permissionCheck(t,a),approvedCount})
}
export async function commandCompanyWork(prisma,actorId,input){
 keys(input,['id','recordId','kind','version','action','data']);uuid(input.id);uuid(input.recordId);int(input.version)
 return transact(prisma,actorId,async(tx,actor)=>{
  if(!workDefinitions[input.kind]||!canArea(actor,input.kind))fail('PERMISSION_DENIED',403)
  const current=input.kind==='PURCHASE'?await tx.purchaseOrder.findUnique({where:{id:input.recordId}}):await tx.companyWorkRecord.findUnique({where:{id:input.recordId}})
  if(!current||input.kind!=='PURCHASE'&&!await canRead(tx,actor,current))fail('PERMISSION_DENIED',403)
  const requestHash=hash(input),prior=await tx.companyWorkCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.actorId!==actorId||prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');await authorizeReplay(tx,actor,current,input);return prior.result}
  const action=input.action,data=input.data||{};let result
  if(input.kind==='PURCHASE')result=await commandPurchase(tx,actor,input)
  else {
   const row=await tx.companyWorkRecord.findUnique({where:{id:input.recordId}})
   if(!row||row.kind!==input.kind||row.version!==input.version)fail('SETTINGS_CONFLICT')
   if(!await canRead(tx,actor,row))fail('PERMISSION_DENIED',403)
   let status=row.status,payload={...row.payload},approvedById=row.approvedById,completedById=row.completedById
   if(action==='GENERATE'){
    keys(data,['through']);requirePermission(actor,payload.jobKind==='COUNT'?'inventory.approve':'housekeeping.manage')
    if(row.kind!=='SCHEDULE'||status!=='ACTIVE')fail('INVALID_TRANSITION')
    if(payload.jobKind==='COUNT')requirePermission(actor,'inventory.approve')
    else {const zone=await tx.companyWorkRecord.findUnique({where:{id:payload.zoneId}});if(zone?.status!=='ACTIVE')fail('RELATED_RECORD_UNAVAILABLE')}
    let dates;try{dates=scheduleDates(payload,data.through||payload.endsOn)}catch(e){fail(e.message,400)}let count=0
    for(const due of dates){
     const dueOn=date(due),found=await tx.companyWorkRecord.findUnique({where:{parentId_dueOn:{parentId:row.id,dueOn}}})
     if(found)continue
     await tx.companyWorkRecord.create({data:{id:randomUUID(),kind:'JOB',name:row.name+' · '+due,status:'PENDING',parentId:row.id,dueOn,assigneeId:row.assigneeId,storeId:row.storeId,createdById:actorId,commandHash:hash({scheduleId:row.id,version:row.version,due}),payload:{...payload,scheduleVersion:row.version,checklist:[...payload.checklist],checked:[],evidence:'',note:''}}});count++
    }
    result={ok:true,generated:count}
   }else if(action==='DEACTIVATE'){
    keys(data,['reason']);requirePermission(actor,row.kind==='SCHEDULE'&&payload.jobKind==='COUNT'?'inventory.approve':'housekeeping.manage');if(!['ZONE','SCHEDULE'].includes(row.kind)||status!=='ACTIVE')fail('INVALID_TRANSITION');payload.deactivationReason=string(data.reason,2000);status='INACTIVE'
   }else if(action==='SUBMIT'){
    keys(data,[]);if(row.createdById!==actorId||!['DRAFT','REJECTED'].includes(status)||!['STOCK_REQUEST','COUNT','MAINTENANCE'].includes(row.kind))fail('INVALID_TRANSITION');status='SUBMITTED'
   }else if(['APPROVE','REJECT'].includes(action)&&['STOCK_REQUEST','COUNT','MAINTENANCE'].includes(row.kind)){
    keys(data,['reason']);requirePermission(actor,'inventory.approve');if(status!=='SUBMITTED'||row.createdById===actorId)fail('INDEPENDENT_APPROVER_REQUIRED');payload.reviewReason=string(data.reason,2000);status=action==='APPROVE'?'APPROVED':'REJECTED';approvedById=action==='APPROVE'?actorId:null
    if(action==='APPROVE'&&row.kind==='COUNT'){
     const balance=await tx.stockBalance.findUnique({where:{id:payload.balanceId}})
     if(!balance||balance.version!==payload.balanceVersion)fail('COUNT_STALE_RECOUNT_REQUIRED')
     if(payload.countedQuantity!==payload.previousQuantity)await stock(tx,actor,{id:randomUUID(),action:'COUNT',balanceId:balance.id,version:balance.version,countedQuantity:payload.countedQuantity,note:payload.reason},async()=>true,true)
     status='CLOSED'
    }
   }else if(action==='ISSUE'){
    keys(data,['balanceId','quantity']);if(row.kind!=='STOCK_REQUEST'||status!=='APPROVED')fail('REQUEST_APPROVAL_REQUIRED')
    if(!await storeAccess(tx,actor,row.storeId))fail('PERMISSION_DENIED',403)
    const balance=await tx.stockBalance.findUnique({where:{id:uuid(data.balanceId)},include:{lot:true}})
    if(!balance||balance.locationId!==row.storeId||balance.lot.resourceId!==payload.resourceId)fail('INVALID_BALANCE')
    const already=(payload.issues||[]).reduce((n,i)=>n+i.quantity,0),quantity=int(data.quantity)
    if((payload.issues||[]).length>=50)fail('TOO_MANY_PARTIAL_ISSUES')
    if(quantity>payload.quantity-already)fail('ISSUE_EXCEEDS_REQUIREMENT')
    const requester=await tx.userProfile.findUnique({where:{id:row.createdById},select:{displayName:true}})
    const movement=await stock(tx,actor,{id:randomUUID(),action:'ISSUE',balanceId:balance.id,version:balance.version,quantity,destinationId:payload.destinationId,custodian:requester?.displayName||row.createdById,note:'Stock request '+row.id+' · requester '+row.createdById},(t,a)=>storeAccess(t,a,row.storeId))
    payload.issues=[...(payload.issues||[]),{id:movement.row.details.issueId,quantity,issuedById:actorId}];if(already+quantity===payload.quantity)status='ISSUED'
   }else if(action==='SETTLE'){
    keys(data,['issueId','quantity','disposition','locationId','note']);if(row.kind!=='STOCK_REQUEST'||!['APPROVED','ISSUED'].includes(status)||!(payload.issues||[]).some(i=>i.id===data.issueId))fail('INVALID_TRANSITION')
    if(!await storeAccess(tx,actor,row.storeId))fail('PERMISSION_DENIED',403)
    if(data.locationId&&!await storeAccess(tx,actor,data.locationId))fail('PERMISSION_DENIED',403)
    await stock(tx,actor,{id:randomUUID(),action:'SETTLE',issueId:data.issueId,quantity:int(data.quantity),disposition:data.disposition,...(data.locationId?{locationId:data.locationId}:{}),note:string(data.note,2000)},(t,a)=>storeAccess(t,a,row.storeId))
    const issues=await tx.stockIssue.findMany({where:{id:{in:payload.issues.map(i=>i.id)}}})
    if(issues.reduce((n,i)=>n+i.quantity,0)===payload.quantity&&issues.every(i=>i.quantity===i.settledQty))status='CLOSED'
   }else if(action==='COMPLETE'){
    keys(data,['checked','evidence','note']);if(!['JOB','MAINTENANCE'].includes(row.kind)||row.assigneeId!==actorId||status!==(row.kind==='JOB'?'PENDING':'APPROVED'))fail('INVALID_TRANSITION')
    requirePermission(actor,row.kind==='JOB'&&payload.jobKind==='CLEANING'?'housekeeping.view':'inventory.request')
    const expected=row.kind==='JOB'?payload.checklist:[]
    if(!Array.isArray(data.checked)||data.checked.length!==expected.length||data.checked.some((value,i)=>value!==expected[i]))fail('CHECKLIST_INCOMPLETE',400)
    if(row.kind==='JOB'&&payload.jobKind==='COUNT'&&!await tx.companyWorkRecord.count({where:{kind:'COUNT',status:'CLOSED',payload:{path:['jobId'],equals:row.id}}}))fail('APPROVED_COUNT_REQUIRED')
    payload={...payload,checked:data.checked,evidence:address(data.evidence),note:string(data.note,2000)};status='DONE';completedById=actorId
   }else if(['ACCEPT','REOPEN'].includes(action)){
    keys(data,['reason']);requirePermission(actor,row.kind==='JOB'&&payload.jobKind==='CLEANING'?'housekeeping.approve':'inventory.approve')
    if(!['JOB','MAINTENANCE'].includes(row.kind)||status!=='DONE'||row.completedById===actorId)fail('INDEPENDENT_APPROVER_REQUIRED')
    payload.reviewReason=string(data.reason,2000);status=action==='ACCEPT'?'ACCEPTED':row.kind==='JOB'?'PENDING':'APPROVED';approvedById=actorId
   }else if(action==='CANCEL'){
    keys(data,['reason']);if(row.createdById!==actorId||!['DRAFT','SUBMITTED','REJECTED'].includes(status))fail('INVALID_TRANSITION');payload.cancellationReason=string(data.reason,2000);status='CANCELLED'
   }else fail('INVALID_ACTION',400)
   if(!result){const updated=await tx.companyWorkRecord.update({where:{id:row.id},data:{status,payload,approvedById,completedById,version:{increment:1}}});result={row:updated}}
  }
  await audit(tx,actorId,input.recordId,'work.'+String(action).toLowerCase(),{kind:input.kind,version:input.version,data})
  await tx.companyWorkCommand.create({data:{id:input.id,actorId,requestHash,result:JSON.parse(JSON.stringify(result))}})
  return result
 })
}
async function authorizeReplay(tx,actor,row,input){
 const action=input.action,kind=input.kind
 if(kind==='PURCHASE'){requirePermission(actor,['APPROVE','REJECT'].includes(action)?'purchasing.approve':action==='RECEIVE'?'purchasing.receive':'purchasing.edit');return}
 if(['ISSUE','SETTLE'].includes(action)){if(!await storeAccess(tx,actor,row.storeId))fail('PERMISSION_DENIED',403);return}
 const cleaning=kind==='JOB'&&row.payload.jobKind==='CLEANING'
 const permission=['GENERATE','DEACTIVATE'].includes(action)?(row.payload.jobKind==='COUNT'?'inventory.approve':'housekeeping.manage'):['APPROVE','REJECT'].includes(action)?'inventory.approve':['ACCEPT','REOPEN'].includes(action)?(cleaning?'housekeeping.approve':'inventory.approve'):action==='COMPLETE'?(cleaning?'housekeeping.view':'inventory.request'):'inventory.request'
 requirePermission(actor,permission)
}
async function commandPurchase(tx,actor,input){
 const row=await tx.purchaseOrder.findUnique({where:{id:input.recordId}});if(!row||row.version!==input.version)fail('SETTINGS_CONFLICT')
 requirePermission(actor,'purchasing.view');const data=input.data||{},action=input.action;let status=row.status,lines=row.lines,receivedTotal=row.receivedTotal,approvedById=row.approvedById
 if(action==='SUBMIT'){
  keys(data,[]);requirePermission(actor,'purchasing.edit');if(row.createdById!==actor.id||!['DRAFT','REJECTED'].includes(status))fail('INVALID_TRANSITION');status='SUBMITTED'
 }else if(['APPROVE','REJECT'].includes(action)){
  keys(data,['reason']);requirePermission(actor,'purchasing.approve');string(data.reason,2000)
  if(status!=='SUBMITTED'||row.createdById===actor.id)fail('INDEPENDENT_APPROVER_REQUIRED');status=action==='APPROVE'?'APPROVED':'REJECTED';approvedById=action==='APPROVE'?actor.id:null
 }else if(action==='RECEIVE'){
  keys(data,['lineId','quantity','receivedOn','expiresOn','lotLabel','note']);requirePermission(actor,'purchasing.receive')
  if(!['APPROVED','PART_RECEIVED'].includes(status))fail('PURCHASE_APPROVAL_REQUIRED')
  const line=lines.find(l=>l.id===data.lineId),quantity=int(data.quantity)
  if(!line||quantity>line.quantity-line.receivedQty)fail('RECEIPT_EXCEEDS_ORDER')
  await stock(tx,actor,{id:randomUUID(),action:'RECEIVE',resourceId:line.resourceId,locationId:row.storeId,quantity,unit:'BASE',receivedOn:data.receivedOn,...(data.expiresOn?{expiresOn:data.expiresOn}:{}),lotLabel:string(data.lotLabel),unitCost:line.unitCost,note:'Purchase '+row.id+' · '+string(data.note,1000)},async()=>true)
  lines=lines.map(l=>l.id===line.id?{...l,receivedQty:l.receivedQty+quantity}:l);receivedTotal=baht(lines.reduce((n,l)=>n+l.receivedQty*satang(l.unitCost),0));status=lines.every(l=>l.receivedQty===l.quantity)?'RECEIVED':'PART_RECEIVED'
 }else if(action==='CANCEL'){
  keys(data,['reason']);requirePermission(actor,'purchasing.edit');string(data.reason,2000);if(row.createdById!==actor.id||!['DRAFT','SUBMITTED','REJECTED'].includes(status))fail('INVALID_TRANSITION');status='CANCELLED'
 }else fail('INVALID_ACTION',400)
 return {row:await tx.purchaseOrder.update({where:{id:row.id},data:{status,lines,receivedTotal,approvedById,version:{increment:1}}})}
}

export async function listCompanyWork(prisma,actorId,params){
 const actor=await actorFor(prisma,actorId),kind=params.get('kind')||'JOB'
 const definition=workDefinitions[kind];if(!definition)fail('INVALID_WORK_KIND',400)
 const ownedWork=['STOCK_REQUEST','COUNT','MAINTENANCE'].includes(kind)
 if(!canArea(actor,kind))fail('PERMISSION_DENIED',403)
 if(params.get('lookup'))return lookup(prisma,actor,params)
 const q=(params.get('q')||'').trim(),status=params.get('status')||'',requested=int(params.get('page')||1,1,100000)
 if(q.length>100)fail('INVALID_FILTER',400)
 return prisma.$transaction(async tx=>{
  let model='companyWorkRecord',base={kind}
  if(kind==='PURCHASE'){model='purchaseOrder';base={}}
  if(kind==='RESPONSIBILITY'){model='warehouseResponsibility';base={}}
  if(kind==='SCHEDULE')base.OR=[...(permitted(actor,'housekeeping.view')?[{payload:{path:['jobKind'],equals:'CLEANING'}}]:[]),...(permitted(actor,'inventory.approve')?[{payload:{path:['jobKind'],equals:'COUNT'}}]:[])]
  if(kind==='JOB')base.OR=[{assigneeId:actorId},...(permitted(actor,'housekeeping.manage')||permitted(actor,'housekeeping.approve')?[{payload:{path:['jobKind'],equals:'CLEANING'}}]:[]),...(permitted(actor,'inventory.approve')?[{payload:{path:['jobKind'],equals:'COUNT'}}]:[])]
  if(ownedWork&&!permitted(actor,'inventory.approve')&&!permitted(actor,'operations.stock')){
   const duties=effectiveAccess(actor,'operations.stock').source==='User restriction'?[]:await tx.warehouseResponsibility.findMany({where:{OR:[{primaryUserId:actorId},{deputyUserIds:{has:actorId}}]},select:{storeId:true}})
   base.OR=[{createdById:actorId},{assigneeId:actorId},{storeId:{in:duties.map(d=>d.storeId)}}]
  }
  let where={...base,...(status&&kind!=='RESPONSIBILITY'?{status}:{}),...(q&&kind!=='RESPONSIBILITY'?{name:{contains:q,mode:'insensitive'}}:{})}
  if(kind==='RESPONSIBILITY'&&!permitted(actor,'inventory.assign'))where={...where,OR:[{primaryUserId:actorId},{deputyUserIds:{has:actorId}}]}
  const total=await tx[model].count({where}),page=Math.min(requested,Math.max(1,Math.ceil(total/25)))
  let rows=await tx[model].findMany({where,orderBy:{updatedAt:'desc'},skip:(page-1)*25,take:25})
  if(kind==='RESPONSIBILITY'){
   const ids=rows.flatMap(r=>[r.primaryUserId,...r.deputyUserIds]),users=await tx.userProfile.findMany({where:{id:{in:ids}},select:{id:true,displayName:true}}),stores=await tx.stockLocation.findMany({where:{id:{in:rows.map(r=>r.storeId)}},select:{id:true,name:true}})
   rows=rows.map(r=>({...r,id:r.storeId,kind,name:stores.find(s=>s.id===r.storeId)?.name||'Stock location',status:'ACTIVE',payload:{storeId:r.storeId,primaryUserId:r.primaryUserId,deputyUserId:r.deputyUserIds[0]||'',reason:r.reason},primaryName:users.find(u=>u.id===r.primaryUserId)?.displayName}))
  }
  for(const row of rows){
   row.actions=await availableActions(tx,actor,{...row,kind})
   if(kind==='STOCK_REQUEST'&&row.payload.issues?.length)row.issueDetails=await tx.stockIssue.findMany({where:{id:{in:row.payload.issues.map(i=>i.id)}},select:{id:true,quantity:true,settledQty:true}})
  }
  await enrichRows(tx,rows,kind)
  return {rows,total,page,pageSize:25,permissions:Object.fromEntries(Object.values(workDefinitions).flatMap(d=>[d.permission,d.edit]).concat(['housekeeping.approve','inventory.approve','purchasing.approve','purchasing.receive']).filter(Boolean).map(code=>[code,permitted(actor,code)])),actorId}
 },{isolationLevel:'RepeatableRead',timeout:15000})
}
async function availableActions(tx,actor,row){
 const result=[],own=row.createdById===actor.id,s=row.status,k=row.kind
 if(k==='RESPONSIBILITY')return permitted(actor,'inventory.assign')?['EDIT']:[]
 if(k==='PURCHASE'){
  if(own&&['DRAFT','REJECTED'].includes(s)&&permitted(actor,'purchasing.edit'))result.push('EDIT','SUBMIT')
  if(s==='SUBMITTED'&&!own&&permitted(actor,'purchasing.approve'))result.push('APPROVE','REJECT')
  if(['APPROVED','PART_RECEIVED'].includes(s)&&permitted(actor,'purchasing.receive'))result.push('RECEIVE')
  if(own&&['DRAFT','REJECTED','SUBMITTED'].includes(s)&&permitted(actor,'purchasing.edit'))result.push('CANCEL')
  return result
 }
 if(['ZONE','SCHEDULE'].includes(k)&&permitted(actor,k==='SCHEDULE'&&row.payload.jobKind==='COUNT'?'inventory.approve':'housekeeping.manage')){if(s==='ACTIVE')result.push('EDIT',...(k==='SCHEDULE'?['GENERATE']:[]),'DEACTIVATE');return result}
 if(own&&['DRAFT','REJECTED'].includes(s))result.push('EDIT','SUBMIT')
 if(own&&['DRAFT','REJECTED','SUBMITTED'].includes(s))result.push('CANCEL')
 if(s==='SUBMITTED'&&!own&&permitted(actor,'inventory.approve'))result.push('APPROVE','REJECT')
 if(k==='STOCK_REQUEST'&&await storeAccess(tx,actor,row.storeId)){if(s==='APPROVED')result.push('ISSUE');if(['APPROVED','ISSUED'].includes(s)&&row.payload.issues?.length)result.push('SETTLE')}
 if(['JOB','MAINTENANCE'].includes(k)&&row.assigneeId===actor.id&&s===(k==='JOB'?'PENDING':'APPROVED')&&permitted(actor,k==='JOB'&&row.payload.jobKind==='CLEANING'?'housekeeping.view':'inventory.request'))result.push('COMPLETE')
 if(['JOB','MAINTENANCE'].includes(k)&&s==='DONE'&&row.completedById!==actor.id&&permitted(actor,k==='JOB'&&row.payload.jobKind==='CLEANING'?'housekeeping.approve':'inventory.approve'))result.push('ACCEPT','REOPEN')
 return result
}
async function lookup(p,actor,params){
 const entity=params.get('lookup'),q=(params.get('q')||'').trim(),page=int(params.get('page')||1,1,100000)
 if(q.length>100)fail('INVALID_FILTER',400)
 let model,where={},select={id:true,name:true}
 if(entity==='users'){model='userProfile';where={status:'ACTIVE'};select={id:true,displayName:true}}
 else if(entity==='stores'){model='stockLocation';where={status:'ACTIVE'}}
 else if(entity==='resources'){model='operationResource';where={status:'ACTIVE',kind:{not:'SERVICE'}};select={id:true,name:true,baseUnit:true}}
 else if(entity==='partners'){model='businessPartner';where={status:'ACTIVE'}}
 else if(entity==='vehicles'){model='fleetVehicle';where={status:'ACTIVE'}}
 else if(['zones','jobs','requests'].includes(entity)){
  model='companyWorkRecord';where=entity==='zones'?{kind:'ZONE',status:'ACTIVE'}:entity==='jobs'?{kind:'JOB',status:'PENDING',assigneeId:actor.id,payload:{path:['jobKind'],equals:'COUNT'}}:{kind:'STOCK_REQUEST',status:'APPROVED'}
  if(entity==='requests'&&!permitted(actor,'purchasing.edit')&&!permitted(actor,'inventory.approve'))where.createdById=actor.id
 }else if(entity==='balances'){
  model='stockBalance';select=undefined
  const duties=effectiveAccess(actor,'operations.stock').source==='User restriction'?[]:await p.warehouseResponsibility.findMany({where:{OR:[{primaryUserId:actor.id},{deputyUserIds:{has:actor.id}}]},select:{storeId:true}})
  where={...(permitted(actor,'operations.stock')?{}:{locationId:{in:duties.map(d=>d.storeId)}}),...(q?{lot:{resource:{name:{contains:q,mode:'insensitive'}}}}:{})}
 }else fail('INVALID_LOOKUP',400)
 if(q&&entity!=='balances')where[entity==='users'?'displayName':'name']={contains:q,mode:'insensitive'}
 const total=await p[model].count({where}),rows=await p[model].findMany({where,select,...(entity==='balances'?{include:{lot:{include:{resource:true}},location:true}}:{}),orderBy:{id:'asc'},skip:(page-1)*25,take:25})
 return {rows:rows.map(r=>entity==='users'?{id:r.id,name:r.displayName}:entity==='balances'?{id:r.id,name:`${r.lot.resource.name} · ${r.location.name} · ${r.lot.label} · ${r.condition} · ${r.quantity}`,quantity:r.quantity,version:r.version}:r),total,page,pages:Math.max(1,Math.ceil(total/25)),pageSize:25}
}
async function enrichRows(tx,rows,kind){
 const fields={zoneId:'companyWorkRecord',jobId:'companyWorkRecord',requestId:'companyWorkRecord',storeId:'stockLocation',destinationId:'stockLocation',resourceId:'operationResource',vehicleId:'fleetVehicle',supplierId:'businessPartner',assigneeId:'userProfile',primaryUserId:'userProfile',deputyUserId:'userProfile',createdById:'userProfile'}
 for(const model of new Set(Object.values(fields))){
  const keysFor=Object.keys(fields).filter(k=>fields[k]===model),ids=[...new Set(rows.flatMap(row=>keysFor.map(k=>(kind==='PURCHASE'?row:row.payload||{})[k]||row[k]).filter(Boolean)))]
  const records=ids.length?await tx[model].findMany({where:{id:{in:ids}},select:{id:true,[model==='userProfile'?'displayName':'name']:true}}):[],names=new Map(records.map(r=>[r.id,r.name||r.displayName]))
  for(const row of rows){row.references||={};for(const key of keysFor){const id=(kind==='PURCHASE'?row:row.payload||{})[key]||row[key];if(id)row.references[key]=names.get(id)||'Unavailable record'}row.requesterName=row.references.createdById}
 }
 const balanceIds=rows.map(r=>r.payload?.balanceId).filter(Boolean)
 if(balanceIds.length){const balances=await tx.stockBalance.findMany({where:{id:{in:balanceIds}},include:{lot:{include:{resource:true}},location:true}});for(const row of rows){const b=balances.find(b=>b.id===row.payload?.balanceId);if(b)row.references.balanceId=`${b.lot.resource.name} · ${b.location.name} · ${b.lot.label} · ${b.condition}`}}
}
