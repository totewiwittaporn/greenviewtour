import {receivableAccess} from '../receivables/service.js'
import {createHash} from 'node:crypto'
import {authorize,fail,uuid,keys,string,hash} from '../operations/common.js'
import {effectiveAccess} from '../../../../packages/contracts/access.js'
import {personnelFinancePermission} from '../personnel-finance/service.js'

export const maxEvidenceBytes=5*1024*1024
const metadata={id:true,createdAt:true,targetKind:true,targetId:true,uploadedBy:true,filename:true,mimeType:true,size:true,note:true,documentNumber:true,category:true}
export function validateEvidence(input){
 keys(input,['id','targetKind','targetId','filename','mimeType','base64','note','documentNumber','category'])
 uuid(input.id);uuid(input.targetId)
 const filename=string(input.filename,200)
 if(/[\\/]/.test(filename))fail('INVALID_EVIDENCE_FILE',400)
 if(typeof input.base64!=='string'||input.base64.length>Math.ceil(maxEvidenceBytes/3)*4)fail('EVIDENCE_TOO_LARGE',413)
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64))fail('INVALID_EVIDENCE_FILE',400)
 const content=Buffer.from(input.base64,'base64')
 if(!content.length||content.length>maxEvidenceBytes)fail('INVALID_EVIDENCE_FILE',400)
 const valid=input.mimeType==='image/png'?content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&/\.png$/i.test(filename):input.mimeType==='image/jpeg'?content[0]===255&&content[1]===216&&content[2]===255&&/\.jpe?g$/i.test(filename):input.mimeType==='application/pdf'?content.subarray(0,5).toString()==='%PDF-'&&/\.pdf$/i.test(filename):false
 if(!valid)fail('INVALID_EVIDENCE_FILE',400)
 if(!['RECEIPT','TAX_INVOICE','PAYMENT','OTHER','AGENT_TICKET','AGENT_BOOKING'].includes(input.category))fail('INVALID_INPUT',400)
 return {filename,mimeType:input.mimeType,content,size:content.length,sha256:createHash('sha256').update(content).digest('hex'),category:input.category,documentNumber:string(input.documentNumber||'',100,false)||'',note:string(input.note||'',1000,false)||''}
}
async function parentAccess(tx,actorId,kind,id){
 uuid(id)
 if(['AGENT_BILL','AGENT_PAYMENT'].includes(kind)){
  await receivableAccess(tx,actorId)
  if(!await tx[kind==='AGENT_BILL'?'agentBill':'agentPayment'].findUnique({where:{id},select:{id:true}}))fail('NOT_FOUND',404)
  return {upload:true}
 }
 if(kind==='CUSTOMER_REQUEST'){const {actor}=await authorize(tx,actorId);if(!await tx.customerRequest.findUnique({where:{id}}))fail('NOT_FOUND',404);return {upload:effectiveAccess(actor,'finance.receive').allowed}}
 if(kind==='BOOKING'){
  const {actor}=await authorize(tx,actorId,'booking')
  if(!await tx.tourBooking.findUnique({where:{id},select:{id:true}}))fail('NOT_FOUND',404)
  return {upload:effectiveAccess(actor,'finance.receive').allowed}
 }
 if(kind==='PERSONNEL_FINANCE'){
  const row=await tx.financePersonnelRecord.findUnique({where:{id},select:{kind:true}});if(!row)fail('NOT_FOUND',404)
  const access=await personnelFinancePermission(tx,actorId,row.kind)
  return {upload:access.edit||access.pay}
 }
 fail('INVALID_REFERENCE',400)
}
export async function listEvidence(prisma,actorId,params){
 const targetKind=params.get('targetKind'),targetId=params.get('targetId')
 const access=await parentAccess(prisma,actorId,targetKind,targetId)
 const requested=Number(params.get('page')||1);if(!Number.isInteger(requested)||requested<1)fail('INVALID_INPUT',400)
 const where={targetKind,targetId},total=await prisma.evidenceAttachment.count({where}),page=Math.min(requested,Math.max(1,Math.ceil(total/25)))
 const rows=await prisma.evidenceAttachment.findMany({where,select:metadata,orderBy:[{createdAt:'desc'},{id:'asc'}],take:25,skip:(page-1)*25})
 return {rows,total,page,access}
}
export async function saveEvidence(prisma,actorId,input){
 const data=validateEvidence(input),requestHash=hash(input)
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const access=await parentAccess(tx,actorId,input.targetKind,input.targetId)
  if(!access.upload)fail('PERMISSION_DENIED',403)
  const previous=await tx.evidenceAttachment.findUnique({where:{id:input.id},select:{...metadata,requestHash:true}})
  if(previous){if(previous.uploadedBy!==actorId||previous.requestHash!==requestHash)fail('COMMAND_CONFLICT');const {requestHash:ignored,...row}=previous;void ignored;return {row}}
  const row=await tx.evidenceAttachment.create({data:{...data,id:input.id,targetKind:input.targetKind,targetId:input.targetId,uploadedBy:actorId,requestHash},select:metadata})
  await tx.auditEvent.create({data:{actorId,targetId:input.targetId,action:'evidence.attached',details:{attachmentId:row.id,targetKind:row.targetKind,sha256:data.sha256}}})
  return {row}
 },{maxWait:15000,timeout:30000})
}
export async function downloadEvidence(prisma,actorId,id){
 const row=await prisma.evidenceAttachment.findUnique({where:{id:uuid(id)},select:metadata});if(!row)fail('NOT_FOUND',404)
 await parentAccess(prisma,actorId,row.targetKind,row.targetId)
 return prisma.evidenceAttachment.findUnique({where:{id},select:{filename:true,mimeType:true,content:true,size:true}})
}
