import {csvDocument} from '../../../../packages/contracts/csv.js'
import { effectiveAccess } from '../../../../packages/contracts/access.js'
import { personnelFinanceKinds, financialTotal, cents, recordActions } from '../../../../packages/contracts/personnel-finance.js'
import { profileInclude } from '../identity-access/policy.js'
import { fail,uuid,keys,string,dateOnly,hash,int } from '../operations/common.js'

export async function personnelFinancePermission(tx,actorId,kind){
 const definition=personnelFinanceKinds[kind];if(!definition)fail('INVALID_KIND',400)
 const actor=await tx.userProfile.findUnique({where:{id:uuid(actorId)},include:profileInclude})
 const access=Object.fromEntries(['view','edit','approve','pay'].map(action=>[action,effectiveAccess(actor,`${definition.group}.${action}`).allowed]))
 if(!access.view)fail('PERMISSION_DENIED',403)
 return access
}
function assert(value,code='INVALID_INPUT'){if(!value)fail(code,400)}
export function validatePayload(kind,payload){
 const spec=personnelFinanceKinds[kind];assert(spec,'INVALID_KIND');keys(payload,spec.fields.map(f=>f[0]));const result={}
 for(const [key,,type,options] of spec.fields){const value=payload[key]
  if(type==='employee-optional'){result[key]=value?uuid(value):null;continue}
  if(type==='items'){try{financialTotal(kind,payload)}catch(e){fail(e.message,400)}result[key]=value.map(i=>({...i,label:i.label.trim(),amount:String(i.amount)}));continue}
  if(type==='date'){dateOnly(value);result[key]=value}
  else if(type==='money'){try{assert(cents(value)>0,'INVALID_AMOUNT')}catch{fail('INVALID_AMOUNT',400)}result[key]=String(value)}
  else if(type==='select'){assert(options.includes(value));result[key]=value}
  else if(type==='run'||type==='purchase')result[key]=uuid(value)
  else result[key]=string(value,2000)
 }
 if(result.startsOn&&result.endsOn)assert(result.endsOn>=result.startsOn,'INVALID_DATE_RANGE')
 if(result.date&&result.dueOn)assert(result.dueOn>=result.date,'INVALID_DATE_RANGE')
 return result
}
async function transaction(prisma,fn){return prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`;return fn(tx)},{maxWait:15000,timeout:30000})}
async function audit(tx,actorId,row,action,details={}){await tx.auditEvent.create({data:{actorId,targetId:row.id,action:`personnelFinance.${action}`,details:{kind:row.kind,version:row.version,...details}}})}
async function employee(tx,id){const row=await tx.userProfile.findUnique({where:{id:uuid(id)},select:{id:true,status:true}});if(!row||row.status!=='ACTIVE')fail('EMPLOYEE_UNAVAILABLE',409)}
async function supplierBalance(tx,row){
 const order=await tx.purchaseOrder.findUnique({where:{id:row.payload.sourcePurchaseId}})
 if(!order||!['PART_RECEIVED','RECEIVED'].includes(order.status))fail('PURCHASE_NOT_RECEIVED')
 const reserved=await tx.financePersonnelRecord.findMany({where:{kind:'SUPPLIER_PAYMENT',id:{not:row.id},status:{in:['APPROVED','PAID']},payload:{path:['sourcePurchaseId'],equals:order.id}}})
 if(reserved.reduce((sum,r)=>sum+cents(r.payload.amount),0)+cents(row.payload.amount)>cents(String(order.receivedTotal)))fail('SUPPLIER_BALANCE_EXCEEDED')
}
export async function listPersonnelFinance(prisma,actorId,params=new URLSearchParams()){
 const kind=params.get('kind')||'EMPLOYMENT',access=await personnelFinancePermission(prisma,actorId,kind)
 const page=Math.max(1,Math.min(10000,Number(params.get('page'))||1)),q=(params.get('q')||'').trim().slice(0,100)
 if(params.get('lookup')){
  const lookup=params.get('lookup');if(!['employees','runs','purchases'].includes(lookup))fail('INVALID_LOOKUP',400)
  if(lookup==='runs'&&kind!=='ALLOWANCE'||lookup==='purchases'&&kind!=='SUPPLIER_PAYMENT')fail('INVALID_LOOKUP',400)
  const model=lookup==='employees'?'userProfile':lookup==='runs'?'dispatchRun':'purchaseOrder',field=lookup==='employees'?'displayName':'name'
  const where={status:lookup==='employees'?'ACTIVE':lookup==='runs'?'OPEN':{in:['PART_RECEIVED','RECEIVED']},...(q?{[field]:{contains:q,mode:'insensitive'}}:{})}
  const total=await prisma[model].count({where});const rows=await prisma[model].findMany({where,select:{id:true,[field]:true},orderBy:{[field]:'asc'},take:25,skip:(page-1)*25})
  return {rows:rows.map(row=>({id:row.id,name:row[field]})),total,page,pages:Math.max(1,Math.ceil(total/25))}
 }
 const status=params.get('status');if(status&&!['DRAFT','SUBMITTED','APPROVED','REJECTED','PAID','CLEARED','CLEARANCE_SUBMITTED','CANCELLED'].includes(status))fail('INVALID_STATUS',400)
 const where={kind,...(status?{status}:{}),...(q?{title:{contains:q,mode:'insensitive'}}:{})};const total=await prisma.financePersonnelRecord.count({where})
 const actualPage=Math.min(page,Math.max(1,Math.ceil(total/25)))
 const rows=await prisma.financePersonnelRecord.findMany({where,orderBy:{createdAt:'desc'},take:25,skip:(actualPage-1)*25})
 const employeeIds=[...new Set(rows.flatMap(row=>[row.employeeId,row.payload.substituteId].filter(Boolean)))];const employees=await prisma.userProfile.findMany({where:{id:{in:employeeIds}},select:{id:true,displayName:true}})
 const runs=kind==='ALLOWANCE'?await prisma.dispatchRun.findMany({where:{id:{in:rows.map(row=>row.payload.runId)}},select:{id:true,name:true}}):[]
 const purchases=kind==='SUPPLIER_PAYMENT'?await prisma.purchaseOrder.findMany({where:{id:{in:rows.map(row=>row.payload.sourcePurchaseId)}},select:{id:true,name:true}}):[]
 const counts=await Promise.all(['DRAFT','SUBMITTED','APPROVED'].map(status=>prisma.financePersonnelRecord.count({where:{kind,status}})))
 return {rows:rows.map(row=>({...row,actions:recordActions(row,access,actorId)})),employees,runs,purchases,access,summary:{draft:counts[0],submitted:counts[1],approved:counts[2]},page:actualPage,total,pages:Math.max(1,Math.ceil(total/25)),actorId}
}
export async function savePersonnelFinance(prisma,actorId,input){
 keys(input,['id','version','kind','title','employeeId','payload']);uuid(input.id);const payload=validatePayload(input.kind,input.payload)
 int(input.version,0)
 const fingerprint=hash(input),digest=hash({namespace:'personnelFinance.save',recordId:input.id,version:input.version,actorId})
 const commandId=`${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`
 return transaction(prisma,async tx=>{
  const access=await personnelFinancePermission(tx,actorId,input.kind);if(!access.edit)fail('PERMISSION_DENIED',403)
  const prior=await tx.financePersonnelCommand.findUnique({where:{id:commandId}})
  if(prior){if(prior.actorId!==actorId||prior.requestHash!==fingerprint)fail('COMMAND_CONFLICT');return prior.result}
  const old=await tx.financePersonnelRecord.findUnique({where:{id:input.id}})
  if(old&&(old.kind!==input.kind||old.status!=='DRAFT'||old.version!==input.version)||!old&&input.version!==0)fail('RECORD_CONFLICT')
  if(old&&old.createdBy!==actorId)fail('ONLY_AUTHOR_CAN_EDIT',403)
  await employee(tx,input.employeeId)
  if(payload.substituteId){assert(payload.substituteId!==input.employeeId,'INVALID_SUBSTITUTE');await employee(tx,payload.substituteId)}
  if(input.kind==='ALLOWANCE'){const assigned=await tx.dispatchStaff.findFirst({where:{runId:payload.runId,userId:input.employeeId}});if(!assigned)fail('EMPLOYEE_NOT_ASSIGNED')}
  if(input.kind==='SUPPLIER_PAYMENT')await supplierBalance(tx,{id:input.id,payload})
  if(input.kind==='ATTENDANCE'){
   const duplicate=await tx.financePersonnelRecord.findFirst({where:{kind:'ATTENDANCE',employeeId:input.employeeId,id:{not:input.id},status:{notIn:['CANCELLED','REJECTED']},payload:{path:['date'],equals:payload.date}}});if(duplicate)fail('ATTENDANCE_ALREADY_RECORDED')
  }
  const data={title:string(input.title,160),employeeId:input.employeeId,payload}
  const row=old?await tx.financePersonnelRecord.update({where:{id:old.id},data:{...data,version:{increment:1}}}):await tx.financePersonnelRecord.create({data:{...data,id:input.id,kind:input.kind,createdBy:actorId}})
  await audit(tx,actorId,row,old?'EDIT':'CREATE')
  const result=JSON.parse(JSON.stringify({row}));await tx.financePersonnelCommand.create({data:{id:commandId,actorId,requestHash:fingerprint,result}});return result
 })
}
export async function commandPersonnelFinance(prisma,actorId,input){
 keys(input,['id','recordId','version','action','note','paidOn','reference','clearanceItems','returnedAmount']);uuid(input.id);uuid(input.recordId);int(input.version)
 const requestHash=hash(input)
 return transaction(prisma,async tx=>{
  const old=await tx.financePersonnelRecord.findUnique({where:{id:input.recordId}});if(!old)fail('NOT_FOUND',404)
  const access=await personnelFinancePermission(tx,actorId,old.kind)
  const duty={SUBMIT:'edit',CANCEL:'edit',REVISE:'edit',CLEAR:'edit',APPROVE:'approve',REJECT:'approve',APPROVE_CLEARANCE:'approve',REJECT_CLEARANCE:'approve',PAY:'pay'}[input.action]
  if(!duty||!access[duty])fail('TRANSITION_NOT_ALLOWED',403)
  const prior=await tx.financePersonnelCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash||prior.actorId!==actorId)fail('COMMAND_CONFLICT');return prior.result}
  if(old.version!==input.version)fail('RECORD_CONFLICT')
  if(!recordActions(old,access,actorId).includes(input.action))fail('TRANSITION_NOT_ALLOWED',403)
  const data={version:{increment:1}},note=string(input.note||'',2000,['REJECT','REJECT_CLEARANCE'].includes(input.action))
  if(input.action==='SUBMIT'){validatePayload(old.kind,old.payload);data.status='SUBMITTED'}
  if(input.action==='APPROVE'){if(old.kind==='SUPPLIER_PAYMENT')await supplierBalance(tx,old);data.status='APPROVED';data.approvedBy=actorId}
  if(input.action==='REJECT')data.status='REJECTED'
  if(input.action==='REVISE'){data.status='DRAFT';data.approvedBy=null}
  if(input.action==='CANCEL')data.status='CANCELLED'
  if(input.action==='PAY'){
   dateOnly(input.paidOn);assert(input.paidOn<=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Bangkok'}),'PAYMENT_DATE_IN_FUTURE')
   data.status='PAID';data.payment={paidOn:input.paidOn,reference:string(input.reference,300),recordedBy:actorId,amountCents:financialTotal(old.kind,old.payload)}
  }
  if(input.action==='CLEAR'){
   assert(Array.isArray(input.clearanceItems)&&input.clearanceItems.length<=100)
   const items=input.clearanceItems.map(item=>{keys(item,['description','amount','evidence']);return {description:string(item.description,300),amount:String(item.amount),evidence:string(item.evidence,1000)}})
   let spent,returned;try{spent=items.reduce((n,item)=>n+cents(item.amount),0);returned=cents(input.returnedAmount)}catch{fail('INVALID_AMOUNT',400)}
   assert(spent+returned===financialTotal(old.kind,old.payload),'CLEARANCE_MUST_BALANCE')
   data.status='CLEARANCE_SUBMITTED';data.clearance={items,returnedAmount:String(input.returnedAmount),submittedBy:actorId,submittedAt:new Date().toISOString(),note}
  }
  if(input.action==='APPROVE_CLEARANCE'){data.status='CLEARED';data.clearance={...old.clearance,approvedBy:actorId,approvedAt:new Date().toISOString()}}
  if(input.action==='REJECT_CLEARANCE')data.status='PAID'
  const row=await tx.financePersonnelRecord.update({where:{id:old.id},data});await audit(tx,actorId,row,input.action,{note})
  const result=JSON.parse(JSON.stringify({row}));await tx.financePersonnelCommand.create({data:{id:input.id,actorId,requestHash,result}});return result
 })
}

export async function exportPayroll(prisma,actorId,params){
 await personnelFinancePermission(prisma,actorId,'PAYROLL')
 const q=(params.get('q')||'').trim().slice(0,100),status=params.get('status')||''
 if(status&&!['DRAFT','SUBMITTED','APPROVED','REJECTED','PAID','CANCELLED'].includes(status))fail('INVALID_STATUS',400)
 const where={kind:'PAYROLL',...(q?{title:{contains:q,mode:'insensitive'}}:{}),...(status?{status}:{})}
 const records=await prisma.financePersonnelRecord.findMany({where,orderBy:[{createdAt:'asc'},{id:'asc'}],take:5001})
 if(records.length>5000)fail('EXPORT_TOO_LARGE',400)
 const employees=await prisma.userProfile.findMany({where:{id:{in:[...new Set(records.map(r=>r.employeeId))]}},select:{id:true,displayName:true}})
 const rows=[['Record ID','Record','Employee','Period starts','Period ends','Status','Base THB','Additions THB','Deductions THB','Net THB','Basis','Items and reasons','Paid on','Payment reference']]
 for(const row of records){const p=row.payload;rows.push([row.id,row.title,employees.find(e=>e.id===row.employeeId)?.displayName||row.employeeId,p.startsOn,p.endsOn,row.status,(cents(p.baseAmount)/100).toFixed(2),(p.items.filter(i=>i.type==='EARNING').reduce((n,i)=>n+cents(i.amount),0)/100).toFixed(2),(p.items.filter(i=>i.type==='DEDUCTION').reduce((n,i)=>n+cents(i.amount),0)/100).toFixed(2),(financialTotal('PAYROLL',p)/100).toFixed(2),p.basis,p.items.map(i=>`${i.type}: ${i.label} (${i.amount}) — ${i.reason}`).join('; '),row.payment?.paidOn,row.payment?.reference])}
 await prisma.auditEvent.create({data:{actorId,action:'personnelFinance.payrollExport',details:{count:records.length}}})
 return {csv:csvDocument(rows),count:records.length}
}
