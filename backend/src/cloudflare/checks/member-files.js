import {saveGuideAssignment} from '../../modules/operations/guide-assignments.js'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
import {quoteRequest,submitCustomerRequest,commandCustomerRequest,uploadCustomerProof,memberRequests,customerDocument,customerDocuments} from '../../modules/commerce/service.js'
import {hash} from '../../modules/operations/common.js'
import {createD1Prisma} from '../../platform/database/d1-client.ts'
import {saveEvidence,downloadEvidence} from '../../modules/evidence/service.js'
import {saveWebsiteImage,previewWebsiteImage,websiteImage} from '../../modules/commerce/service.js'
export async function memberFiles(env){
const tx=createD1Prisma(env.DB,{files:env.FILES})
try{

  const manager=await tx.userProfile.findFirst({where:{status:'ACTIVE',roles:{some:{roleCode:'ADMIN_MANAGER',scope:'COMPANY'}}}})
  assert.ok(manager,'Active owner required')
  const id=randomUUID(),user={id:randomUUID(),email_confirmed_at:'test'},other={id:randomUUID(),email_confirmed_at:'test'},date='2026-11-02',now=new Date('2026-10-01T00:00:00Z')
  const resource=await tx.operationResource.create({data:{id:randomUUID(),code:'QA-'+id.slice(0,8),name:'DEMO QA boat',kind:'SERVICE',category:'TOUR_BOAT',baseUnit:'PERSON',status:'ACTIVE',salePrice:'0'}})
  await tx.tourProgram.create({data:{id,code:'QA-'+id.slice(0,8),name:'DEMO QA tour',status:'ACTIVE',ownership:'GREENVIEW',journeyMode:'OUTBOUND_ONLY',confirmationMode:'REQUEST',supplierPricing:'NOT_SET',publicStatus:'PUBLISHED',adultPrice:'1000',childPrice:'500',components:{create:{id:randomUUID(),resourceId:resource.id,selection:'REQUIRED',basis:'PER_PERSON',quantity:1,usagePoint:'BOAT',status:'ACTIVE'}},seasons:{create:{id:randomUUID(),code:'QA-'+id.slice(0,8),name:'QA season',status:'ACTIVE',startsOn:new Date('2026-10-01'),endsOn:new Date('2027-05-01'),onlineStartsOn:new Date('2026-11-01'),onlineEndsOn:new Date('2027-04-01'),bookingStartsOn:new Date('2026-09-01'),bookingEndsOn:new Date('2027-04-01'),cutoffDays:1}}}})
  await tx.customerProfile.create({data:{id:randomUUID(),authUserId:user.id,displayName:'DEMO QA customer'}})
  await tx.customerProfile.create({data:{id:randomUUID(),authUserId:other.id,displayName:'DEMO QA other'}})
  const vehicle=await tx.fleetVehicle.create({data:{id:randomUUID(),code:'QA-'+id.slice(0,8)+'-BOAT',name:'Local fixture boat',kind:'SPEEDBOAT',ownership:'GREENVIEW',capacity:30,status:'ACTIVE'}})
  await tx.capacityPool.create({data:{id:randomUUID(),code:'QA-'+id.slice(0,8)+'-POOL',name:'Local fixture capacity',kind:'BOAT',serviceDate:new Date(date),direction:'OUTBOUND',startsAt:new Date(date+'T01:00:00Z'),endsAt:new Date(date+'T10:00:00Z'),resourceIds:[resource.id],holdMinutes:30,offers:{create:{id:randomUUID(),vehicleId:vehicle.id,capacity:30,status:'READY'}}}})
  const nested=tx
  const input={id:randomUUID(),tourId:id,serviceDate:date,adults:1,children:1,name:'DEMO QA',phone:'0000000000',allergyStatus:'NONE',allergies:''}
  const quote=await quoteRequest(tx,input,now);input.quoteKey=hash(quote)
  const result=await submitCustomerRequest(nested,user,input,now)
  assert.equal((await submitCustomerRequest(nested,user,input,now)).id,result.id)
  assert.equal((await memberRequests(tx,other,new URLSearchParams())).total,0)
  await commandCustomerRequest(nested,manager.id,{id:randomUUID(),requestId:result.id,version:1,action:'ACCEPT',note:'DEMO QA availability reviewed',priceConfirmation:{confirmed:true,choice:'KEEP_STORED',serviceDate:date,total:quote.packageTotal}})
  let row=await tx.customerRequest.findUnique({where:{id:result.id}})
  assert.equal(row.status,'AWAITING_PAYMENT');assert.equal(row.snapshot.confirmedTotal,'1500.00')
  const booking=await tx.tourBooking.findUnique({where:{id:row.bookingId},include:{lines:true}})
  assert.equal(booking.status,'CONFIRMED');assert.equal(booking.lines.length,1)
  assert.equal(booking.programSnapshot.customerRequestId,result.id)
  const guideRole=await tx.userRole.findFirst({where:{userId:manager.id,roleCode:'GUIDE'}})
  if(!guideRole)await tx.userRole.create({data:{userId:manager.id,roleCode:'GUIDE',scope:'SELF'}})
  const job={id:randomUUID(),version:0,bookingId:booking.id,guideId:manager.id,startsAt:'2026-11-02 08:00',endsAt:'2026-11-02 16:00',status:'PLANNED',notes:'DEMO QA partner guide'}
  await saveGuideAssignment(nested,manager.id,job)
  await saveGuideAssignment(nested,manager.id,job)
  await assert.rejects(()=>saveGuideAssignment(nested,manager.id,{...job,id:randomUUID()}),{code:'STAFF_TIME_CONFLICT'})
  assert.equal(await tx.guideAssignment.count({where:{bookingId:booking.id}}),1)

  const proof={id:randomUUID(),targetId:result.id,filename:'DEMO.pdf',mimeType:'application/pdf',base64:Buffer.from('%PDF-1.4 DEMO ONLY').toString('base64'),note:'',documentNumber:''}
  await assert.rejects(()=>uploadCustomerProof(nested,other,proof),{message:'NOT_FOUND'})
  await uploadCustomerProof(nested,user,proof)
  row=await tx.customerRequest.findUnique({where:{id:result.id}});assert.equal(row.status,'PAYMENT_REVIEW')
  assert.equal((await customerDocuments(tx,user,result.id)).rows.length,1)
  await assert.rejects(()=>customerDocument(tx,other,proof.id),{message:'NOT_FOUND'})
  assert.equal((await customerDocument(tx,user,proof.id)).filename,'DEMO.pdf')
  await commandCustomerRequest(nested,manager.id,{id:randomUUID(),requestId:result.id,version:row.version,action:'RETURN_PROOF',note:'DEMO QA unreadable evidence'})
  row=await tx.customerRequest.findUnique({where:{id:result.id}});assert.equal(row.status,'AWAITING_PAYMENT')
  await uploadCustomerProof(nested,user,{...proof,id:randomUUID()})
  row=await tx.customerRequest.findUnique({where:{id:result.id}});assert.equal(row.status,'PAYMENT_REVIEW')
  await commandCustomerRequest(nested,manager.id,{id:randomUUID(),requestId:result.id,version:row.version,action:'VERIFY_PAYMENT',note:'DEMO QA transfer reference',receivedOn:'2026-10-01',amount:'1500.00'})
  assert.equal((await tx.customerRequest.findUnique({where:{id:result.id}})).status,'PAID')
  assert.equal((await tx.tourBooking.findUnique({where:{id:booking.id}})).paymentTerms,'PAID')
  const png={id:randomUUID(),filename:'atomic.png',mimeType:'image/png',base64:Buffer.from([137,80,78,71,13,10,26,10,1,2,3]).toString('base64')}
  const image=await saveWebsiteImage(tx,manager.id,png)
  assert.deepEqual(await saveWebsiteImage(tx,manager.id,png),image)
  await assert.rejects(async()=>{try{return await websiteImage(tx,png.id)}catch(error){if(error.code!=='NOT_FOUND')console.error('PUBLIC_IMAGE_LOOKUP_ERROR',error);throw error}},{code:'NOT_FOUND'})
  assert.equal((await previewWebsiteImage(tx,manager.id,png.id)).size,11)
  await tx.tourProgram.update({where:{id},data:{imageUrls:image.url}})
  assert.equal((await websiteImage(tx,png.id)).size,11)
  const evidence={...proof,id:randomUUID(),targetKind:'BOOKING',targetId:booking.id,category:'OTHER'}
  const [first,second]=await Promise.all([saveEvidence(tx,manager.id,evidence),saveEvidence(tx,manager.id,evidence)])
  assert.equal(first.row.id,second.row.id);assert.equal(await tx.evidenceAttachment.count({where:{id:evidence.id}}),1)
  assert.equal((await downloadEvidence(tx,manager.id,evidence.id)).filename,proof.filename)
  assert.equal((await env.DB.prepare('PRAGMA foreign_key_check').all()).results.length,0)
  return {checks:['member quote, seat hold, acceptance and operational booking are one atomic flow','request replay and foreign customer isolation','guide assignment retry and staff time conflict','R2 payment proof return/resubmit and verified payment','draft/public image boundary and idempotent R2 upload','concurrent evidence upload creates one metadata row with readable bytes']}

}catch(error){console.error('MEMBER_FILES_FAILED',error);throw error}
finally{await tx.$disconnect()}
}
