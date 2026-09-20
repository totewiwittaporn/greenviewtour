import {saveGuideAssignment} from '../src/modules/operations/guide-assignments.js'
// Executes real service transactions against synthetic rows, then rolls back everything.
import {loadEnvFile} from 'node:process'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {quoteRequest,submitCustomerRequest,commandCustomerRequest,uploadCustomerProof,memberRequests,customerDocument,customerDocuments} from '../src/modules/commerce/service.js'
import {hash} from '../src/modules/operations/common.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),db=createPrisma(pool),rollback=new Error('ROLLBACK_VERIFIED')
try{
 await db.$transaction(async tx=>{
  const manager=await tx.userProfile.findFirst({where:{status:'ACTIVE',roles:{some:{roleCode:'ADMIN_MANAGER',scope:'COMPANY'}}}})
  assert.ok(manager,'Active owner required')
  const id=randomUUID(),user={id:randomUUID(),email_confirmed_at:'test'},other={id:randomUUID(),email_confirmed_at:'test'},date='2026-11-02',now=new Date('2026-10-01T00:00:00Z')
  const resource=await tx.operationResource.create({data:{id:randomUUID(),code:'QA-'+id.slice(0,8),name:'DEMO QA boat',kind:'SERVICE',category:'TOUR_BOAT',baseUnit:'PERSON',status:'ACTIVE',salePrice:'0'}})
  await tx.tourProgram.create({data:{id,code:'QA-'+id.slice(0,8),name:'DEMO QA tour',status:'ACTIVE',ownership:'GREENVIEW',confirmationMode:'REQUEST',supplierPricing:'NOT_SET',publicStatus:'PUBLISHED',adultPrice:'1000',childPrice:'500',components:{create:{id:randomUUID(),resourceId:resource.id,selection:'REQUIRED',basis:'PER_PERSON',quantity:1,usagePoint:'BOAT',status:'ACTIVE'}},seasons:{create:{id:randomUUID(),code:'QA-'+id.slice(0,8),name:'QA season',status:'ACTIVE',startsOn:new Date('2026-10-01'),endsOn:new Date('2027-05-01'),onlineStartsOn:new Date('2026-11-01'),onlineEndsOn:new Date('2027-04-01'),bookingStartsOn:new Date('2026-09-01'),bookingEndsOn:new Date('2027-04-01'),cutoffDays:1}}}})
  await tx.customerProfile.create({data:{id:randomUUID(),authUserId:user.id,displayName:'DEMO QA customer'}})
  await tx.customerProfile.create({data:{id:randomUUID(),authUserId:other.id,displayName:'DEMO QA other'}})
  const nested=new Proxy(tx,{get(target,key){if(key==='$transaction')return fn=>fn(target);return target[key]}})
  const input={id:randomUUID(),tourId:id,serviceDate:date,adults:1,children:1,name:'DEMO QA',phone:'0000000000',allergyStatus:'NONE',allergies:''}
  const quote=await quoteRequest(tx,input,now);input.quoteKey=hash(quote)
  const result=await submitCustomerRequest(nested,user,input,now)
  assert.equal((await submitCustomerRequest(nested,user,input,now)).id,result.id)
  assert.equal((await memberRequests(tx,other,new URLSearchParams())).total,0)
  await commandCustomerRequest(nested,manager.id,{id:randomUUID(),requestId:result.id,version:1,action:'ACCEPT',note:'DEMO QA availability reviewed'})
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
  throw rollback
 },{timeout:60000})
}catch(e){if(e!==rollback){console.error({test:'member-commerce',error:e.code||e.name});process.exitCode=1}else console.log('PASS: owned request, idempotency, operational booking, proof isolation, manual payment; all synthetic rows rolled back.')}
finally{await db.$disconnect();await pool.end()}
