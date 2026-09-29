import {receivableAccess} from '../receivables/service.js'
import {createHash,randomUUID} from 'node:crypto'
import {authorize,fail,uuid,keys,string,hash} from '../operations/common.js'
import {canEditBooking,effectiveAccess} from '../../../../packages/contracts/access.js'
import {personnelFinancePermission} from '../personnel-finance/service.js'
import {isD1Client} from '../../platform/database/d1-runtime.js'
import {d1AtomicBatch,d1Date} from '../../platform/database/d1-atomic.js'
import {d1FileStoreFor,readD1File} from '../../platform/files/bound-store.js'
import {fileObjectKey} from '../../platform/files/keys.js'

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
 if(kind==='CUSTOMER_REQUEST'){const {actor}=await authorize(tx,actorId,'customer');if(!await tx.customerRequest.findUnique({where:{id},select:{id:true}}))fail('NOT_FOUND',404);return {upload:effectiveAccess(actor,'finance.receive').allowed}}
 if(kind==='BOOKING'){
  const {actor}=await authorize(tx,actorId,'booking')
  const booking=await tx.tourBooking.findUnique({where:{id},select:{id:true,createdById:true,assigneeId:true}})
  if(!booking)fail('NOT_FOUND',404)
  return {upload:effectiveAccess(actor,'finance.receive').allowed&&canEditBooking({...actor,id:actorId},booking)}
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
const d1EvidenceParents={AGENT_BILL:'AgentBill',AGENT_PAYMENT:'AgentPayment',CUSTOMER_REQUEST:'CustomerRequest',BOOKING:'TourBooking',PERSONNEL_FINANCE:'FinancePersonnelRecord'}
async function saveEvidenceD1(prisma,actorId,input,data,requestHash){
 const access=await parentAccess(prisma,actorId,input.targetKind,input.targetId)
 if(!access.upload)fail('PERMISSION_DENIED',403)
 const previous=await prisma.evidenceAttachment.findUnique({where:{id:input.id},select:{...metadata,requestHash:true,sha256:true}})
 if(previous){
  if(previous.uploadedBy!==actorId||previous.requestHash!==requestHash||previous.sha256!==data.sha256)fail('COMMAND_CONFLICT')
  const {requestHash:ignored,sha256:ignoredHash,...row}=previous;void ignored;void ignoredHash;return {row}
 }
 const actor=await prisma.userProfile.findUnique({where:{id:actorId},select:{accessVersion:true,status:true}})
 if(actor?.status!=='ACTIVE')fail('PERMISSION_DENIED',403)
 const store=d1FileStoreFor(prisma);if(!store)throw new Error('R2_BUCKET_REQUIRED')
 const objectKey=fileObjectKey('evidenceAttachment',input.id)
 const object=await store.putIfAbsent(objectKey,data.content,{mimeType:data.mimeType,sha256:data.sha256})
 if(!object.created&&(object.size!==data.size||object.mimeType!==data.mimeType||object.sha256!==data.sha256))fail('COMMAND_CONFLICT')
 const createdAt=d1Date(new Date()),parent=d1EvidenceParents[input.targetKind]
 if(!parent)fail('INVALID_REFERENCE',400)
 const actorGuard='EXISTS (SELECT 1 FROM "UserProfile" WHERE "id"=? AND "accessVersion"=? AND "status"=\'ACTIVE\')'
 const parentGuard=`EXISTS (SELECT 1 FROM "${parent}" WHERE "id"=?)`
 const details=JSON.stringify({attachmentId:input.id,targetKind:input.targetKind,sha256:data.sha256})
 try{
  const results=await d1AtomicBatch(prisma,[
   {
    sql:`INSERT INTO "EvidenceAttachment" ("id","createdAt","targetKind","targetId","uploadedBy","filename","mimeType","size","sha256","objectKey","note","documentNumber","category","requestHash") SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM "EvidenceAttachment" WHERE "id"=?) AND ${actorGuard} AND ${parentGuard}`,
    params:[input.id,createdAt,input.targetKind,input.targetId,actorId,data.filename,data.mimeType,data.size,data.sha256,objectKey,data.note,data.documentNumber,data.category,requestHash,input.id,actorId,actor.accessVersion,input.targetId],
   },
   {
    sql:'INSERT INTO "AuditEvent" ("id","actorId","action","targetId","createdAt","details") VALUES (CASE WHEN EXISTS (SELECT 1 FROM "EvidenceAttachment" WHERE "id"=? AND "createdAt"=? AND "uploadedBy"=? AND "requestHash"=?) THEN ? ELSE NULL END,?,?,?,?,?)',
    params:[input.id,createdAt,actorId,requestHash,randomUUID(),actorId,'evidence.attached',input.targetId,createdAt,details],
   },
  ])
  if((results[0]?.meta?.changes||0)!==1||(results[1]?.meta?.changes||0)!==1)throw new Error('D1_EVIDENCE_ATOMIC_WRITE_FAILED')
 }catch(error){
  const current=await prisma.evidenceAttachment.findUnique({where:{id:input.id},select:{...metadata,requestHash:true,sha256:true}})
  if(current?.uploadedBy===actorId&&current.requestHash===requestHash&&current.sha256===data.sha256){
   const {requestHash:ignored,sha256:ignoredHash,...row}=current;void ignored;void ignoredHash;return {row}
  }
  await parentAccess(prisma,actorId,input.targetKind,input.targetId)
  throw error
 }
 const row=await prisma.evidenceAttachment.findUnique({where:{id:input.id},select:metadata})
 return {row}
}
export async function saveEvidence(prisma,actorId,input){
 const data=validateEvidence(input),requestHash=hash(input)
 if(isD1Client(prisma))return saveEvidenceD1(prisma,actorId,input,data,requestHash)
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
 if(isD1Client(prisma)){
  const file=await prisma.evidenceAttachment.findUnique({where:{id},select:{filename:true,mimeType:true,size:true,sha256:true,objectKey:true}})
  const stored=await readD1File(prisma,file.objectKey,{size:file.size,sha256:file.sha256})
  return {filename:file.filename,mimeType:file.mimeType,size:file.size,content:stored.body}
 }
 return prisma.evidenceAttachment.findUnique({where:{id},select:{filename:true,mimeType:true,content:true,size:true}})
}
