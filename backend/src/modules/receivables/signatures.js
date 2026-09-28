import {fail,hash,string} from '../operations/common.js'

export function billDocument(row) {
 return {id:row.id,title:row.title,agentId:row.agentId,agentName:row.agentName,total:String(row.total),dueOn:new Date(row.dueOn).toISOString().slice(0,10),bookings:row.snapshot}
}
export function signatureInput(input){
 if(!['COMPANY','AGENT'].includes(input.side))fail('INVALID_SIGNATURE',400)
 const name=string(input.signerName,160)
 if(!Array.isArray(input.strokes)||!input.strokes.length||input.strokes.length>100)fail('INVALID_SIGNATURE',400)
 let points=0,distance=0
 for(const stroke of input.strokes){
  if(!Array.isArray(stroke)||stroke.length<2)fail('INVALID_SIGNATURE',400)
  points+=stroke.length
  if(points>4000)fail('INVALID_SIGNATURE',400)
  for(let i=0;i<stroke.length;i++){
   const p=stroke[i]
   if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isInteger(n)||n<0)||p[0]>1000||p[1]>260)fail('INVALID_SIGNATURE',400)
   if(i)distance+=Math.hypot(p[0]-stroke[i-1][0],p[1]-stroke[i-1][1])
  }
 }
 if(points<8||distance<40)fail('INVALID_SIGNATURE',400)
 return {side:input.side,signerName:name,strokes:input.strokes}
}
export async function billSignatures(tx,billId){
 const events=await tx.auditEvent.findMany({where:{targetId:billId,action:'receivable.SIGN'},orderBy:{createdAt:'asc'},take:2,select:{details:true,createdAt:true,actorId:true}})
 return events.map(e=>({...e.details.signature,signedAt:e.createdAt,recordedBy:e.actorId}))
}
export async function signBill(tx,actorId,row,input){
 const signature=signatureInput(input),document=billDocument(row),documentHash=hash(document)
 if(input.documentHash!==documentHash)fail('RECORD_CONFLICT')
 const signatures=await billSignatures(tx,row.id)
 if(signatures.some(s=>s.side===signature.side))fail('ALREADY_SIGNED')
 if(signature.side==='AGENT'&&!signatures.some(s=>s.side==='COMPANY'))fail('COMPANY_SIGNATURE_REQUIRED')
 await tx.auditEvent.create({data:{actorId,targetId:row.id,action:'receivable.SIGN',details:{commandId:input.id,signature:{...signature,documentHash,document}}}})
}
