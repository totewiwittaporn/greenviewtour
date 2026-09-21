import { formatAddress, safeMapUrl, validateAddress } from '../../../../packages/contracts/address.js'
import {demoTourEnabled} from './demo-checkout.js'
import { programBookingPlan } from '../operations/booking-plan.js'
import { saveBooking, bookingStatus, amendBookingDetails } from '../operations/bookings.js'
import { bookingQuote } from '../../../../packages/contracts/booking-plan.js'
import { effectiveAccess } from '../../../../packages/contracts/access.js'
import { validateEvidence } from '../evidence/service.js'
import { randomUUID } from 'node:crypto'
import { isoDay, saleDateAllowed, promotionAllowed, promotionUnits, cents, thailandDay } from '../../../../packages/contracts/commerce.js'
import { authorize, fail, uuid, int, string, hash, keys } from '../operations/common.js'

export const publicTourSelect={id:true,name:true,slug:true,tourType:true,description:true,highlights:true,imageUrls:true,route:true,departureTimes:true,childPolicy:true,cancellationTerms:true,bookingCutoff:true,adultPrice:true,childPrice:true,meals:true,fees:true,inclusions:true,exclusions:true,preparationNotes:true,ownership:true,durationDays:true,journeyMode:true,version:true,components:{where:{status:'ACTIVE',selection:'OPTIONAL'},select:{id:true,resource:{select:{name:true,salePrice:true}},basis:true,quantity:true}}}
const liveTour={status:'ACTIVE',publicStatus:'PUBLISHED'}
export async function publicCatalog(db,params,now=new Date()) {
 const page=int(params.get('page')||1,1,100000),q=string(params.get('q')||'',100,false)||'',slug=params.get('slug')
 const ownership=params.get('ownership')
 if(ownership!==null&&!['GREENVIEW','PARTNER'].includes(ownership))fail('INVALID_INPUT',400)
 const duration=params.get('duration')
 if(duration!==null&&!['day','overnight'].includes(duration))fail('INVALID_INPUT',400)
 const today=new Date(thailandDay(now)+'T00:00:00Z')
 const promotionWindow={status:'ACTIVE',startsOn:{lte:today},endsOn:{gte:today}}
 const where={...liveTour,...(ownership?{ownership}:{}),...(duration?{durationDays:duration==='day'?1:{gt:1}}:{}),...(params.get('promotionsOnly')==='true'?{promotions:{some:promotionWindow}}:{}),...(slug?{slug}:{}),...(q?{name:{contains:q,mode:'insensitive'}}:{})}
 const total=await db.tourProgram.count({where}),actual=Math.min(page,Math.max(1,Math.ceil(total/12)))
 const rows=await db.tourProgram.findMany({where,select:publicTourSelect,orderBy:[{name:'asc'},{id:'asc'}],skip:(actual-1)*12,take:12})
 if(rows.length){
  const ids=rows.map(row=>row.id)
  const seasons=await db.tourSeason.findMany({where:{tourId:{in:ids},status:'ACTIVE',endsOn:{gte:today}},select:{tourId:true,startsOn:true,endsOn:true,onlineStartsOn:true,onlineEndsOn:true,bookingStartsOn:true,bookingEndsOn:true,closedDates:true,cutoffDays:true,status:true},orderBy:{startsOn:'asc'}})
  const promotions=await db.tourPromotion.findMany({where:{tourId:{in:ids},...promotionWindow},select:{tourId:true,id:true,name:true,adultPrice:true,childPrice:true,startsOn:true,endsOn:true,serviceStartsOn:true,serviceEndsOn:true,quota:true,quotaUnit:true,terms:true,status:true},orderBy:{startsOn:'desc'}})
  const limited=promotions.filter(p=>p.quota!==null)
  const usage=limited.length?await db.customerRequest.groupBy({by:['promotionId'],where:promotionUsageWhere({in:limited.map(p=>p.id)},now),_count:{id:true},_sum:{adults:true,children:true}}):[]
  for(const p of promotions){const used=usage.find(u=>u.promotionId===p.id);p.remaining=p.quota===null?null:Math.max(0,p.quota-(used?(p.quotaUnit==='BOOKING'?used._count.id:(used._sum.adults||0)+(used._sum.children||0)):0))}
  for(const row of rows){row.demoCheckoutEnabled=demoTourEnabled(row.id);row.seasons=seasons.filter(s=>s.tourId===row.id);row.promotions=promotions.filter(p=>p.tourId===row.id)}
 }
 return {rows,total,page:actual,pageSize:12}
}
// Explicit publication boundary: company banking, tax and internal metadata stay private.
export async function publicCompany(db) {
 const row=await db.companySettings.findFirst({select:{name:true,address:true,phone:true,email:true,houseNumber:true,moo:true,villageName:true,subdistrict:true,district:true,province:true,postalCode:true,mapUrl:true,latitude:true,longitude:true}})
 if(!row)return {company:null}
 const invalid=validateAddress(row),coordinates=row.latitude&&row.longitude&&!invalid.latitude&&!invalid.longitude
 return {company:{name:row.name,address:formatAddress(row),phone:row.phone??null,email:row.email??null,mapUrl:safeMapUrl(row.mapUrl),latitude:coordinates?row.latitude:null,longitude:coordinates?row.longitude:null}}
}
export async function publicPopups(db,now=new Date()) {
 const day=new Date(thailandDay(now)+'T00:00:00Z')
 return {rows:await db.websitePopup.findMany({where:{status:'ACTIVE',startsOn:{lte:day},endsOn:{gte:day}},orderBy:[{priority:'desc'},{id:'asc'}],take:5,select:{id:true,version:true,title:true,imageUrl:true,mobileImageUrl:true,imageAlt:true,linkUrl:true,buttonLabel:true,frequency:true}})}
}
export async function customerFor(db,user) {
 if(!user.email_confirmed_at)fail('EMAIL_VERIFICATION_REQUIRED',403)
 const customer=await db.customerProfile.findUnique({where:{authUserId:user.id}})
 if(!customer||customer.status!=='ACTIVE')fail('CUSTOMER_UNAVAILABLE',403)
 return customer
}
export async function enrollCustomer(db,user) {
 if(!user.email_confirmed_at)fail('EMAIL_VERIFICATION_REQUIRED',403)
 // No existing customer/Booking is linked by email or public metadata.
 return db.customerProfile.upsert({where:{authUserId:user.id},create:{id:randomUUID(),authUserId:user.id,displayName:'สมาชิกใหม่',email:user.email},update:{}})
}
export async function saveCustomerProfile(db,user,input) {
 const customer=await customerFor(db,user)
 keys(input,['version','displayName','nickname','phone','lineId'])
 if(input.version!==customer.version)fail('SETTINGS_CONFLICT')
 const nickname={}
 if(Object.hasOwn(input,'nickname')){
  if(input.nickname!==null&&(typeof input.nickname!=='string'||input.nickname.trim().length>50||[...input.nickname].some(char => char.charCodeAt(0) < 32 || (char.charCodeAt(0) >= 127 && char.charCodeAt(0) <= 159))))fail('INVALID_INPUT',400)
  nickname.nickname=input.nickname?.trim()||null
 }
 const changed=await db.customerProfile.updateMany({where:{id:customer.id,version:input.version,status:'ACTIVE'},data:{displayName:string(input.displayName,200),...nickname,phone:string(input.phone??'',32,false),...(Object.hasOwn(input,'lineId')?{lineId:string(input.lineId??'',100,false)}:{}),version:{increment:1}}})
 if(!changed.count)fail('SETTINGS_CONFLICT')
 return {customer:await customerFor(db,user)}
}
export async function memberRequests(db,user,params) {
 const customer=await customerFor(db,user),page=int(params.get('page')||1,1,100000),where={customerId:customer.id}
 const total=await db.customerRequest.count({where}),actual=Math.min(page,Math.max(1,Math.ceil(total/12)))
 const rows=await db.customerRequest.findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(actual-1)*12,take:12,select:{id:true,tourId:true,version:true,createdAt:true,serviceDate:true,adults:true,children:true,status:true,snapshot:true,bookingId:true,holdUntil:true,booking:{select:{code:true,status:true}}}})
 const payment=await db.companySettings.findFirst({select:{bankName:true,bankAccountName:true,bankAccountNumber:true,paymentInstructions:true}})
 return {rows:rows.map(row=>({...row,demoCheckoutEnabled:demoTourEnabled(row.tourId),status:requestDisplayStatus(row)})),total,page:actual,pageSize:12,customer,payment}
}
export async function quoteRequest(tx,input,now=new Date()) {
 uuid(input.tourId);const adults=int(input.adults,0,100),children=int(input.children,0,100)
 if(!adults||adults+children>100)fail('INVALID_PASSENGER_COUNT',400)
 const tour=await tx.tourProgram.findUnique({where:{id:input.tourId},include:{seasons:true}})
 if(!tour||tour.status!=='ACTIVE'||tour.publicStatus!=='PUBLISHED'||!saleDateAllowed(tour.seasons,input.serviceDate,now))fail('ONLINE_DATE_UNAVAILABLE',409)
 const plan=await programBookingPlan(tx,{tourId:tour.id,serviceDate:input.serviceDate,adults,children,returnStatus:'PENDING'})
 if(!Array.isArray(input.optionalIds||[]))fail('INVALID_COMPONENTS',400)
 const selected=new Set(input.optionalIds||[])
 if(selected.size>100||[...selected].some(id=>!plan.lines.some(l=>l.componentId===id&&l.selection==='OPTIONAL')))fail('INVALID_COMPONENTS',400)
 const requestLines=plan.lines.map(l=>({componentId:l.componentId,resourceId:l.resourceId,name:l.resource.name,selection:l.selection,quantity:l.quantity,selected:l.selected||selected.has(l.componentId),included:l.included,unitPrice:l.unitPrice,usagePoint:l.usagePoint,componentVersion:l.snapshot.componentVersion}))
 let adultPrice=tour.adultPrice,childPrice=tour.childPrice,promotion=null
 if(input.promotionId){
  uuid(input.promotionId);promotion=await tx.tourPromotion.findUnique({where:{id:input.promotionId}})
  if(!promotion||promotion.tourId!==tour.id||!promotionAllowed(promotion,input.serviceDate,now))fail('PROMOTION_UNAVAILABLE',409)
  adultPrice=promotion.adultPrice;childPrice=promotion.childPrice
  if(promotion.quota!==null){
   if(await usedPromotionUnits(tx,promotion,now)+promotionUnits(promotion,adults,children)>promotion.quota)fail('PROMOTION_SOLD_OUT',409)
  }
 }
 if(cents(adultPrice)===null||children&&cents(childPrice)===null)fail('PRICE_REQUIRED',409)
 const total=bookingQuote({adultPrice,childPrice,adults,children,lines:requestLines}).total
 if(total===null)fail('PRICE_REQUIRED',409)
 // Store public price terms only; never copy procurement cost or provider contacts.
 return {tourId:tour.id,tourName:tour.name,tourVersion:tour.version,adultPrice:String(adultPrice),childPrice:childPrice===null?null:String(childPrice),originalAdultPrice:tour.adultPrice?.toString()??null,originalChildPrice:tour.childPrice?.toString()??null,packageTotal:total,components:requestLines,promotion:promotion?{id:promotion.id,name:promotion.name,version:promotion.version,terms:promotion.terms}:null,terms:{cancellationTerms:tour.cancellationTerms,fees:tour.fees,inclusions:tour.inclusions,exclusions:tour.exclusions,meals:tour.meals},priceScope:'SELECTED_SERVICES_REQUEST'}
}
export async function submitCustomerRequest(db,user,input,now=new Date()) {
 uuid(input.id)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const customer=await customerFor(tx,user),requestHash=hash(input)
  const prior=await tx.customerRequest.findUnique({where:{id:input.id}})
  if(prior){if(prior.customerId!==customer.id||prior.requestHash!==requestHash)fail('COMMAND_CONFLICT',409);return {id:prior.id,status:prior.status}}
  const snapshot=await quoteRequest(tx,input,now)
  if(input.quoteKey!==hash(snapshot))fail('QUOTE_CHANGED',409)
  if(!['NONE','HAS'].includes(input.allergyStatus)||input.allergyStatus==='HAS'&&!input.allergies?.trim())fail('ALLERGY_DETAILS_REQUIRED',400)
  const details={name:string(input.name,200),phone:string(input.phone,32),notes:string(input.notes||'',2000,false),allergyStatus:input.allergyStatus,allergies:string(input.allergies||'',2000,false)}
  const promotion=input.promotionId?await tx.tourPromotion.findUnique({where:{id:input.promotionId}}):null
  const holdUntil=promotion?.holdHours?new Date(+now+promotion.holdHours*3600000):null
  const row=await tx.customerRequest.create({data:{holdUntil,id:input.id,customerId:customer.id,tourId:input.tourId,promotionId:input.promotionId||null,serviceDate:new Date(input.serviceDate+'T00:00:00Z'),adults:input.adults,children:input.children,requestHash,snapshot,details}})
  return {id:row.id,status:row.status}
 })
}
export async function listCustomers(db,actorId,params) {
 await authorize(db,actorId)
 const kind=params.get('kind')==='requests'?'requests':'customers',model=kind==='requests'?'customerRequest':'customerProfile',page=int(params.get('page')||1,1,100000),q=string(params.get('q')||'',100,false)||''
 const where=q?(kind==='requests'?{customer:{displayName:{contains:q,mode:'insensitive'}}}:{displayName:{contains:q,mode:'insensitive'}}):{}
 const total=await db[model].count({where}),actual=Math.min(page,Math.max(1,Math.ceil(total/25)))
 const rows=await db[model].findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],take:25,skip:(actual-1)*25,...(kind==='requests'?{include:{customer:{select:{displayName:true,phone:true}}}}:{})})
 return {rows:kind==='requests'?rows.map(row=>({...row,demoCheckoutEnabled:demoTourEnabled(row.tourId),status:requestDisplayStatus(row)})):rows,total,page:actual,pageSize:25}
}

export async function commandCustomerRequest(db,actorId,input) {
 uuid(input.id);uuid(input.requestId);int(input.version)
 if(!['ACCEPT','REJECT','VERIFY_PAYMENT','RETURN_PROOF'].includes(input.action))fail('INVALID_ACTION',400)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const {actor}=await authorize(tx,actorId)
  const requestHash=hash({...input,actorId}),prior=await tx.operationCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  const row=await tx.customerRequest.findUnique({where:{id:input.requestId}})
  if(!row||row.version!==input.version)fail('SETTINGS_CONFLICT')
  const note=string(input.note||'',1000)
  let status=row.status,bookingId=row.bookingId,snapshot=row.snapshot
  if(input.action==='REJECT'){
   if(row.status!=='REQUESTED')fail('BOOKING_LOCKED')
   status='REJECTED'
  }else if(input.action==='ACCEPT'){
   if(row.status!=='REQUESTED')fail('BOOKING_LOCKED')
   const customer=await tx.customerProfile.findUnique({where:{id:row.customerId}})
   if(customer?.status!=='ACTIVE')fail('CUSTOMER_UNAVAILABLE',409)
   if(row.holdUntil&&row.holdUntil<=new Date())fail('PROMOTION_HOLD_EXPIRED',409)
   if(!['NONE','HAS'].includes(row.details.allergyStatus))fail('ALLERGY_STATUS_REQUIRED',400)
   const base={tourId:row.tourId,serviceDate:row.serviceDate.toISOString().slice(0,10),adults:row.adults,children:row.children,returnStatus:'PENDING'}
   const plan=await programBookingPlan(tx,base)
   if(plan.program.version!==row.snapshot.tourVersion)fail('PROGRAM_COMPONENTS_STALE')
   if(plan.lines.length!==row.snapshot.components.length||plan.lines.some(l=>!row.snapshot.components.some(c=>c.componentId===l.componentId&&c.componentVersion===l.snapshot.componentVersion&&c.quantity===l.quantity)))fail('PROGRAM_COMPONENTS_STALE')
   const lines=row.snapshot.components.map(l=>({componentId:l.componentId,resourceId:l.resourceId,selected:l.selected,quantity:l.quantity,usagePoint:l.usagePoint}))
   const nested={$transaction:fn=>fn(tx)}
   bookingId=randomUUID()
   const created=await saveBooking(nested,actorId,{...base,id:bookingId,version:0,name:row.details.name,contactPhone:row.details.phone,requestNotes:row.details.notes,allergyStatus:row.details.allergyStatus,allergies:row.details.allergies,paymentTerms:'PREPAID',specialRequirements:[],lines})
   const book=created.row
   await tx.tourBooking.update({where:{id:bookingId},data:{adultPrice:row.snapshot.adultPrice,childPrice:row.snapshot.childPrice,programSnapshot:{...book.programSnapshot,customerId:row.customerId,customerRequestId:row.id,priceSource:{kind:'DIRECT',promotion:row.snapshot.promotion},commerceTerms:row.snapshot.terms}}})
   const total=bookingQuote({...book,adultPrice:row.snapshot.adultPrice,childPrice:row.snapshot.childPrice}).total
   if(total===null||total!==row.snapshot.packageTotal)fail('PRICE_CHANGED_REVIEW_REQUIRED',409)
   await bookingStatus(nested,actorId,{id:randomUUID(),bookingId,version:book.version,action:'CONFIRM'})
   snapshot={...snapshot,confirmedTotal:total,bookingCode:book.code}
   status='AWAITING_PAYMENT'
  }else if(input.action==='RETURN_PROOF'){
   if(row.status!=='PAYMENT_REVIEW')fail('BOOKING_LOCKED')
   if(!effectiveAccess(actor,'finance.receive').allowed)fail('PERMISSION_DENIED',403)
   snapshot={...snapshot,paymentReview:{message:note,reviewedAt:new Date().toISOString()}}
   status='AWAITING_PAYMENT'
  }else{
   if(row.status!=='PAYMENT_REVIEW'||!row.bookingId)fail('BOOKING_LOCKED')
   if(!effectiveAccess(actor,'finance.receive').allowed)fail('PERMISSION_DENIED',403)
   if(!await tx.evidenceAttachment.count({where:{targetKind:'CUSTOMER_REQUEST',targetId:row.id,category:'PAYMENT'}}))fail('PAYMENT_PROOF_REQUIRED',409)
   if(!isoDay(input.receivedOn)||cents(input.amount)!==cents(row.snapshot.confirmedTotal))fail('PAYMENT_AMOUNT_MISMATCH',400)
   const booking=await tx.tourBooking.findUnique({where:{id:row.bookingId}})
   if(!booking||booking.status!=='CONFIRMED')fail('BOOKING_LOCKED')
   await amendBookingDetails({$transaction:fn=>fn(tx)},actorId,{id:randomUUID(),bookingId:row.bookingId,version:booking.version,amendmentReason:note,paymentTerms:'PAID'})
   snapshot={...snapshot,paymentReview:null,payment:{amount:input.amount,receivedOn:input.receivedOn,reference:note,verifiedAt:new Date().toISOString()}}
   status='PAID'
  }
  const result={id:row.id,status,bookingId}
  await tx.customerRequest.update({where:{id:row.id},data:{status,bookingId,snapshot,staffNote:note,version:{increment:1}}})
  await tx.auditEvent.create({data:{actorId,targetId:row.id,action:'customer-request.'+input.action.toLowerCase(),details:{version:row.version+1,bookingId}}})
  await tx.operationCommand.create({data:{id:input.id,requestHash,result}})
  return result
 })
}
export async function uploadCustomerProof(db,user,input){
 const data=validateEvidence({...input,targetKind:'CUSTOMER_REQUEST',category:'PAYMENT'}),requestHash=hash(input)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const customer=await customerFor(tx,user),row=await tx.customerRequest.findUnique({where:{id:input.targetId}})
  if(!row||row.customerId!==customer.id)fail('NOT_FOUND',404)
  const old=await tx.evidenceAttachment.findUnique({where:{id:input.id}})
  if(old){if(old.requestHash!==requestHash||old.uploadedBy!==user.id)fail('COMMAND_CONFLICT');return {ok:true}}
  if(!['AWAITING_PAYMENT','PAYMENT_REVIEW'].includes(row.status))fail('BOOKING_LOCKED')
  const booking=row.bookingId?await tx.tourBooking.findUnique({where:{id:row.bookingId},select:{status:true}}):null
  if(booking?.status!=='CONFIRMED')fail('BOOKING_LOCKED')
  if(await tx.evidenceAttachment.count({where:{targetKind:'CUSTOMER_REQUEST',targetId:row.id}})>=10)fail('TOO_MANY_DOCUMENTS',409)
  await tx.evidenceAttachment.create({data:{...data,id:input.id,targetKind:'CUSTOMER_REQUEST',targetId:row.id,uploadedBy:user.id,requestHash}})
  await tx.customerRequest.update({where:{id:row.id},data:{status:'PAYMENT_REVIEW',version:{increment:1}}})
  return {ok:true,status:'PAYMENT_REVIEW'}
 })
}

export async function saveWebsiteImage(db,actorId,input){
 await authorize(db,actorId)
 const data=validateEvidence({...input,targetKind:'BOOKING',targetId:input.id,category:'OTHER',note:'',documentNumber:''})
 if(!['image/jpeg','image/png'].includes(data.mimeType))fail('INVALID_EVIDENCE_FILE',400)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`;await authorize(tx,actorId)
  const old=await tx.websiteImage.findUnique({where:{id:input.id}})
  if(old&&(old.sha256!==data.sha256||old.uploadedBy!==actorId))fail('COMMAND_CONFLICT')
  if(!old)await tx.websiteImage.create({data:{id:input.id,filename:data.filename,mimeType:data.mimeType,content:data.content,size:data.size,sha256:data.sha256,uploadedBy:actorId}})
  return {url:'/api/public/images/'+input.id}
 })
}
export async function websiteImage(db,id){
 uuid(id)
 // A draft upload is not publicly readable until a published tour or active popup uses it.
 const path='/api/public/images/'+id
 const referenced=await db.tourProgram.count({where:{status:'ACTIVE',publicStatus:'PUBLISHED',imageUrls:{contains:path}}})||await db.websitePopup.count({where:{status:'ACTIVE',OR:[{imageUrl:path},{mobileImageUrl:path}]}})
 if(!referenced)fail('NOT_FOUND',404)
 const image=await db.websiteImage.findUnique({where:{id}});if(!image)fail('NOT_FOUND',404)
 return image
}

export async function saveCustomer(db,actorId,input){
 uuid(input.id);int(input.version,0)
 if(!['ACTIVE','SUSPENDED'].includes(input.status))fail('INVALID_INPUT',400)
 const data={displayName:string(input.displayName,200),phone:string(input.phone||'',32,false),email:string(input.email||'',254,false),status:input.status}
 if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))fail('INVALID_EMAIL',400)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`;await authorize(tx,actorId)
  const old=await tx.customerProfile.findUnique({where:{id:input.id}})
  if(old?.authUserId&&data.email!==old.email)fail('CUSTOMER_EMAIL_LOCKED',409)
  if(old&&input.version===0&&old.version===1&&!old.authUserId&&Object.entries(data).every(([key,value])=>old[key]===value))return {customer:old}
  if(old?.version!==input.version&&!(input.version===0&&!old))fail('SETTINGS_CONFLICT')
  const customer=old?await tx.customerProfile.update({where:{id:old.id},data:{...data,version:{increment:1}}}):await tx.customerProfile.create({data:{id:input.id,...data}})
  await tx.auditEvent.create({data:{actorId,targetId:customer.id,action:'customer.saved',details:{version:customer.version,status:customer.status}}})
  return {customer}
 })
}
export async function customerDocuments(db,user,requestId){
 uuid(requestId);const customer=await customerFor(db,user),request=await db.customerRequest.findUnique({where:{id:requestId}})
 if(!request||request.customerId!==customer.id)fail('NOT_FOUND',404)
 const rows=await db.evidenceAttachment.findMany({where:{targetKind:'CUSTOMER_REQUEST',targetId:requestId},select:{id:true,filename:true,mimeType:true,size:true,createdAt:true,category:true},orderBy:{createdAt:'desc'},take:50})
 return {rows}
}
export async function customerDocument(db,user,id){
 uuid(id);const customer=await customerFor(db,user),file=await db.evidenceAttachment.findUnique({where:{id}})
 if(!file||file.targetKind!=='CUSTOMER_REQUEST')fail('NOT_FOUND',404)
 const request=await db.customerRequest.findUnique({where:{id:file.targetId}})
 if(!request||request.customerId!==customer.id)fail('NOT_FOUND',404)
 return file
}

async function usedPromotionUnits(db,p,now){
 const where=promotionUsageWhere(p.id,now)
 const usage=await db.customerRequest.aggregate({where,_count:{id:true},_sum:{adults:true,children:true}})
 return p.quotaUnit==='BOOKING'?usage._count.id:(usage._sum.adults||0)+(usage._sum.children||0)
}

export function requestDisplayStatus(row,now=new Date()){
 if(row.booking?.status==='CANCELLED')return 'CANCELLED'
 if(row.status==='REQUESTED'&&row.holdUntil&&new Date(row.holdUntil)<=now)return 'EXPIRED'
 return row.status
}

export async function cancelCustomerRequest(db,user,input){
 uuid(input.requestId);int(input.version)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const customer=await customerFor(tx,user),row=await tx.customerRequest.findUnique({where:{id:input.requestId}})
  if(!row||row.customerId!==customer.id)fail('NOT_FOUND',404)
  if(row.status==='CANCELLED'&&!row.bookingId)return {ok:true}
  if(row.version!==input.version)fail('SETTINGS_CONFLICT')
  if(row.status!=='REQUESTED'||row.bookingId)fail('BOOKING_LOCKED')
  await tx.customerRequest.update({where:{id:row.id},data:{status:'CANCELLED',version:{increment:1},snapshot:{...row.snapshot,cancelledAt:new Date().toISOString()}}})
  return {ok:true}
 })
}

export async function previewWebsiteImage(db,actorId,id){
 await authorize(db,actorId);uuid(id)
 const file=await db.websiteImage.findUnique({where:{id}});if(!file)fail('NOT_FOUND',404)
 return file
}

function promotionUsageWhere(promotionId,now){return {promotionId,status:{notIn:['REJECTED','CANCELLED']},AND:[{OR:[{status:{not:'REQUESTED'}},{holdUntil:null},{holdUntil:{gt:now}}]},{OR:[{bookingId:null},{booking:{status:{not:'CANCELLED'}}}]}]}}
