import {capacityDemandRows} from '../operations/capacity-read.js'
import {requestListSelect,customerDirectorySelect,requestListDetails,memberRequestSnapshots} from './read-models.js'
import {assessBookingCapacity,selections} from '../operations/capacity-core.js'
import {holdRequestCapacity,releaseRequestCapacity} from '../operations/capacity-service.js'
import { formatAddress, safeMapUrl, validateAddress } from '../../../../packages/contracts/address.js'
import {demoTourEnabled} from './demo-checkout.js'
import { programBookingPlan } from '../operations/booking-plan.js'
import { saveBooking, bookingStatus, amendBookingDetails } from '../operations/bookings.js'
import { bookingQuote } from '../../../../packages/contracts/booking-plan.js'
import { canReadCustomers, effectiveAccess } from '../../../../packages/contracts/access.js'
import { validateEvidence } from '../evidence/service.js'
import { randomUUID } from 'node:crypto'
import { isoDay, saleDateAllowed, promotionAllowed, promotionUnits, cents, thailandDay } from '../../../../packages/contracts/commerce.js'
import { authorize, fail, uuid, int, string, hash, keys } from '../operations/common.js'
import {readTransaction} from '../../platform/database/read-transaction.js'
import {isD1Client} from '../../platform/database/d1-runtime.js'
import {d1AtomicBatch} from '../../platform/database/d1-atomic.js'
import {d1FileStoreFor,readD1File} from '../../platform/files/bound-store.js'
import {fileObjectKey} from '../../platform/files/keys.js'

const publicContentSelect={locale:true,name:true,summary:true,introduction:true,longDescription:true,departureTimes:true,childPolicy:true,cancellationTerms:true,bookingCutoff:true,meals:true,fees:true,inclusions:true,exclusions:true,preparationNotes:true,specialConditions:true,suitableFor:true,meetingPoint:true,weatherNotes:true,seoTitle:true,metaDescription:true,ogTitle:true,ogDescription:true,contentReviewedAt:true}
const publicMediaSelect={id:true,sortOrder:true,kind:true,url:true,altTh:true,altEn:true,captionTh:true,captionEn:true}
export const publicTourSelect={id:true,name:true,slug:true,tourType:true,description:true,highlights:true,imageUrls:true,route:true,departureTimes:true,childPolicy:true,cancellationTerms:true,bookingCutoff:true,adultPrice:true,childPrice:true,meals:true,fees:true,inclusions:true,exclusions:true,preparationNotes:true,ownership:true,durationDays:true,journeyMode:true,version:true,homeBadge:true,confirmationMode:true,operator:{select:{name:true}},publicContent:{select:publicContentSelect},publicHighlights:{where:{status:'ACTIVE'},select:{id:true,sortOrder:true,titleTh:true,titleEn:true,descriptionTh:true,descriptionEn:true},orderBy:[{sortOrder:'asc'},{id:'asc'}]},itinerarySteps:{where:{status:'ACTIVE'},select:{id:true,day:true,sortOrder:true,timeLabel:true,titleTh:true,titleEn:true,descriptionTh:true,descriptionEn:true,locationTh:true,locationEn:true},orderBy:[{day:'asc'},{sortOrder:'asc'},{id:'asc'}]},publicFaqs:{where:{status:'ACTIVE'},select:{id:true,sortOrder:true,questionTh:true,answerTh:true,questionEn:true,answerEn:true},orderBy:[{sortOrder:'asc'},{id:'asc'}]},publicMedia:{where:{status:'ACTIVE'},select:publicMediaSelect,orderBy:[{sortOrder:'asc'},{id:'asc'}]},components:{where:{status:'ACTIVE'},select:{id:true,selection:true,basis:true,quantity:true,day:true,resource:{select:{name:true,category:true,baseUnit:true,salePrice:true}}}}}
export const publicCardSelect = { id:true, name:true, slug:true, description:true, highlights:true, imageUrls:true, adultPrice:true, childPrice:true, ownership:true, durationDays:true, tourType:true, journeyMode:true, homeBadge:true, publicContent:{select:{locale:true,name:true,summary:true}}, publicMedia:{where:{status:'ACTIVE',kind:'HERO'},select:publicMediaSelect,orderBy:[{sortOrder:'asc'},{id:'asc'}],take:1} }
const publicHighlightSelect = { id:true, name:true, slug:true, description:true, highlights:true, imageUrls:true, adultPrice:true, childPrice:true, ownership:true, durationDays:true, tourType:true, journeyMode:true, homeBadge:true, publicContent:{select:{locale:true,name:true,summary:true}}, publicMedia:{where:{status:'ACTIVE',kind:'HERO'},select:publicMediaSelect,orderBy:[{sortOrder:'asc'},{id:'asc'}],take:1} }
const liveTour={status:'ACTIVE',publicStatus:'PUBLISHED'}
export async function publicCatalog(db,params,now=new Date()) {
 const page=int(params.get('page')||1,1,100000),q=string(params.get('q')||'',100,false)||'',slug=params.get('slug')
 const view=params.get('view')||'detail'
 if(!['detail','cards','highlights'].includes(view))fail('INVALID_INPUT',400)
 const detail=Boolean(slug)||view==='detail',promotionsNeeded=detail||params.get('promotionsOnly')==='true'
 const pageSize=view==='highlights'&&!slug?int(params.get('pageSize')||3,1,6):12
 const ownership=params.get('ownership')
 if(ownership!==null&&!['GREENVIEW','PARTNER'].includes(ownership))fail('INVALID_INPUT',400)
 const duration=params.get('duration')
 if(duration!==null&&!['day','overnight'].includes(duration))fail('INVALID_INPUT',400)
 const today=new Date(thailandDay(now)+'T00:00:00Z')
 const promotionWindow={status:'ACTIVE',startsOn:{lte:today},endsOn:{gte:today}}
 const featuredOnly=params.get('featuredOnly')==='true'
 const where={...liveTour,...(featuredOnly?{homeFeatured:true}:{}),...(ownership?{ownership}:{}),...(duration?{durationDays:duration==='day'?1:{gt:1}}:{}),...(params.get('promotionsOnly')==='true'?{promotions:{some:promotionWindow}}:{}),...(slug?{slug}:{}),...(q?{name:{contains:q,mode:'insensitive'}}:{})}
 const total=await db.tourProgram.count({where}),actual=Math.min(page,Math.max(1,Math.ceil(total/pageSize)))
 const rows=await db.tourProgram.findMany({where,select:detail?publicTourSelect:view==='highlights'?publicHighlightSelect:publicCardSelect,orderBy:featuredOnly?[{homeFeaturedOrder:'asc'},{name:'asc'},{id:'asc'}]:[{name:'asc'},{id:'asc'}],skip:(actual-1)*pageSize,take:pageSize})
 if(rows.length&&(detail||promotionsNeeded)){
  const ids=rows.map(row=>row.id)
  const seasons=detail?await db.tourSeason.findMany({where:{tourId:{in:ids},status:'ACTIVE',endsOn:{gte:today}},select:{tourId:true,startsOn:true,endsOn:true,onlineStartsOn:true,onlineEndsOn:true,bookingStartsOn:true,bookingEndsOn:true,closedDates:true,cutoffDays:true,status:true},orderBy:{startsOn:'asc'}}):[]
  const promotions=await db.tourPromotion.findMany({where:{tourId:{in:ids},...promotionWindow},select:{tourId:true,id:true,name:true,adultPrice:true,childPrice:true,startsOn:true,endsOn:true,serviceStartsOn:true,serviceEndsOn:true,quota:true,quotaUnit:true,terms:true,status:true},orderBy:{startsOn:'desc'}})
  const limited=promotions.filter(p=>p.quota!==null)
  const usage=limited.length?await db.customerRequest.groupBy({by:['promotionId'],where:promotionUsageWhere({in:limited.map(p=>p.id)},now),_count:{id:true},_sum:{adults:true,children:true}}):[]
  for(const p of promotions){const used=usage.find(u=>u.promotionId===p.id);p.remaining=p.quota===null?null:Math.max(0,p.quota-(used?(p.quotaUnit==='BOOKING'?used._count.id:(used._sum.adults||0)+(used._sum.children||0)):0))}
  for(const row of rows){row.demoCheckoutEnabled=demoTourEnabled(row.id);row.seasons=seasons.filter(s=>s.tourId===row.id);row.promotions=promotions.filter(p=>p.tourId===row.id)}
 }
 return {rows,total,page:actual,pageSize}
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
 return readTransaction(db,tx=>readMemberRequests(tx,user,params),{isolationLevel:'RepeatableRead',timeout:30000})
}
async function readMemberRequests(db,user,params) {
 const customer=await customerFor(db,user),page=int(params.get('page')||1,1,100000),where={customerId:customer.id}
 const total=await db.customerRequest.count({where}),actual=Math.min(page,Math.max(1,Math.ceil(total/12)))
 let rows=await db.customerRequest.findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(actual-1)*12,take:12,select:{id:true,tourId:true,version:true,createdAt:true,serviceDate:true,adults:true,children:true,status:true,...(params.get('view')==='list'?{}:{snapshot:true}),bookingId:true,holdUntil:true,booking:{select:{code:true,status:true}},capacityHolds:{select:{expiresAt:true}}}})
 if(params.get('view')==='list')rows=await memberRequestSnapshots(db,rows)
 const mapped=[],contextCache=new Map()
 const paymentIds=rows.filter(row=>row.bookingId&&row.booking?.status==='CONFIRMED'&&['AWAITING_PAYMENT','PAYMENT_REVIEW'].includes(row.status)).map(row=>row.bookingId)
 const paymentBookings=paymentIds.length?await capacityDemandRows(db,{id:{in:paymentIds}}):[]
 for(const row of rows){
  let paymentAllowed=false
  if(row.bookingId&&row.booking?.status==='CONFIRMED'&&['AWAITING_PAYMENT','PAYMENT_REVIEW'].includes(row.status)){
   const booking=paymentBookings.find(b=>b.id===row.bookingId)
   if(booking)paymentAllowed=(await assessBookingCapacity(db,booking,{excludeRequestId:row.id,contextCache})).canConfirm
  }
  const seatHoldUntil=(row.capacityHolds||[]).filter(h=>h.expiresAt>new Date()).map(h=>h.expiresAt).sort((a,b)=>+a-+b)[0]||null
  const seatHoldExpired=!row.bookingId&&!seatHoldUntil&&Boolean(row.capacityHolds?.length)
  mapped.push({...row,capacityHolds:undefined,seatHoldUntil,seatHoldExpired,paymentAllowed,demoCheckoutEnabled:demoTourEnabled(row.tourId)&&row.status==='REQUESTED',status:requestDisplayStatus(row)})
 }
 const payment=mapped.some(row=>row.paymentAllowed)?await db.companySettings.findFirst({select:{bankName:true,bankAccountName:true,bankAccountNumber:true,paymentInstructions:true}}):null
 return {rows:mapped,total,page:actual,pageSize:12,...(params.get('view')==='list'?{}:{customer}),payment}
}
export async function quoteRequest(tx,input,now=new Date(),excludeRequestId=null) {
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
   if(await usedPromotionUnits(tx,promotion,now,excludeRequestId)+promotionUnits(promotion,adults,children)>promotion.quota)fail('PROMOTION_SOLD_OUT',409)
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
  const availability=await customerCapacity(tx,{...input,capacitySelections:selections(input.capacitySelections||[])},snapshot,now)
  if(!availability.canConfirm&&input.allowWaitlist!==true)fail('CAPACITY_CHANGED',409)
  const status=availability.canConfirm?'REQUESTED':'WAITING_TEAM'
  const row=await tx.customerRequest.create({data:{holdUntil,id:input.id,customerId:customer.id,tourId:input.tourId,promotionId:input.promotionId||null,serviceDate:new Date(input.serviceDate+'T00:00:00Z'),adults:input.adults,children:input.children,requestHash,status,snapshot:{...snapshot,capacitySelections:availability.selections,capacityAvailability:availability},details}})
  await tx.auditEvent.create({data:{actorId:null,targetId:row.id,action:'customer-request.created',details:{}}})
  const seatHoldUntil=await holdRequestCapacity(tx,row.id,availability,now,holdUntil)
  return {id:row.id,status:row.status,seatHoldUntil,availability,confirmed:false}
 })
}
export async function listCustomers(db,actorId,params) {
 if(params.get('view')==='list'||params.get('requestId'))return readTransaction(db,tx=>readCustomers(tx,actorId,params),{isolationLevel:'RepeatableRead',timeout:15000})
 return readCustomers(db,actorId,params)
}
async function readCustomers(db,actorId,params) {
 if(params.get('kind')==='requests')await authorize(db,actorId,'customer')
 else {const {actor}=await authorize(db,actorId,'active');if(!canReadCustomers(actor))fail('PERMISSION_DENIED',403)}
 const kind=params.get('kind')==='requests'?'requests':'customers',model=kind==='requests'?'customerRequest':'customerProfile',page=int(params.get('page')||1,1,100000),q=string(params.get('q')||'',100,false)||''
 const where=q?(kind==='requests'?{customer:{displayName:{contains:q,mode:'insensitive'}}}:{displayName:{contains:q,mode:'insensitive'}}):{}
 const requestId=params.get('requestId'),lean=params.get('view')==='list'&&!requestId
 if(requestId){if(kind!=='requests')fail('INVALID_FILTER',400);where.id=uuid(requestId)}
 const total=await db[model].count({where}),actual=Math.min(page,Math.max(1,Math.ceil(total/25)))
 let rows=await db[model].findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],take:25,skip:(actual-1)*25,...(lean?{select:kind==='requests'?requestListSelect:customerDirectorySelect}:kind==='requests'?{include:{customer:{select:{displayName:true,phone:true}},booking:{select:{status:true}}}}:{})})
 if(requestId&&!rows.length)fail('NOT_FOUND',404)
 if(lean&&kind==='requests')rows=await requestListDetails(db,rows)
 return {rows:kind==='requests'?rows.map(row=>({...row,...(lean?{}:{demoCheckoutEnabled:demoTourEnabled(row.tourId)}),status:requestDisplayStatus(row)})):rows,total,page:actual,pageSize:25}
}

export async function commandCustomerRequest(db,actorId,input) {
 uuid(input.id);uuid(input.requestId);int(input.version)
 if(!['ACCEPT','REJECT','VERIFY_PAYMENT','RETURN_PROOF','PROPOSE_DATE'].includes(input.action))fail('INVALID_ACTION',400)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const {actor}=await authorize(tx,actorId,'customer')
  const requestHash=hash({...input,actorId}),prior=await tx.operationCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  const row=await tx.customerRequest.findUnique({where:{id:input.requestId}})
  if(!row||row.version!==input.version)fail('SETTINGS_CONFLICT')
  const note=string(input.note||'',1000)
  let status=row.status,bookingId=row.bookingId,snapshot=row.snapshot
  if(input.action==='PROPOSE_DATE'){
   return proposeCustomerDate(tx,actorId,row,input,requestHash,note)
  }else if(input.action==='REJECT'){
   if(!['REQUESTED','WAITING_TEAM','DATE_PROPOSED'].includes(row.status)||row.bookingId)fail('BOOKING_LOCKED')
   await releaseRequestCapacity(tx,row.id)
   status='REJECTED'
  }else if(input.action==='ACCEPT'){
   if(!['REQUESTED','WAITING_TEAM'].includes(row.status)||row.bookingId)fail('BOOKING_LOCKED')
   const customer=await tx.customerProfile.findUnique({where:{id:row.customerId}})
   if(customer?.status!=='ACTIVE')fail('CUSTOMER_UNAVAILABLE',409)
   if(row.holdUntil&&row.holdUntil<=new Date())fail('PROMOTION_HOLD_EXPIRED',409)
   if(!['NONE','HAS'].includes(row.details.allergyStatus))fail('ALLERGY_STATUS_REQUIRED',400)
   const base={tourId:row.tourId,serviceDate:row.serviceDate.toISOString().slice(0,10),adults:row.adults,children:row.children,returnStatus:'PENDING'}
   const plan=await programBookingPlan(tx,base)
   if(plan.program.version!==row.snapshot.tourVersion)fail('PROGRAM_COMPONENTS_STALE')
   if(plan.lines.length!==row.snapshot.components.length||plan.lines.some(l=>!row.snapshot.components.some(c=>c.componentId===l.componentId&&c.componentVersion===l.snapshot.componentVersion&&c.quantity===l.quantity)))fail('PROGRAM_COMPONENTS_STALE')
   const lines=row.snapshot.components.map(l=>({componentId:l.componentId,resourceId:l.resourceId,selected:l.selected,quantity:l.quantity,usagePoint:l.usagePoint}))
   const availability=await customerCapacity(tx,{...base,capacitySelections:input.capacitySelections??row.snapshot.capacitySelections??[]},row.snapshot,new Date(),row.id)
   if(!availability.canConfirm){
    const result={id:row.id,status:'WAITING_TEAM',bookingId:null,availability,confirmed:false}
    await tx.customerRequest.update({where:{id:row.id},data:{status:'WAITING_TEAM',snapshot:{...row.snapshot,capacityAvailability:availability},staffNote:note,version:{increment:1}}})
    await releaseRequestCapacity(tx,row.id)
    await tx.auditEvent.create({data:{actorId,targetId:row.id,action:'customer-request.waiting-capacity',details:{version:row.version+1}}})
    await tx.operationCommand.create({data:{id:input.id,requestHash,result}});return result
   }
   const nested={$transaction:fn=>fn(tx)}
   bookingId=randomUUID()
   const created=await saveBooking(nested,actorId,{...base,capacitySelections:availability.selections,id:bookingId,version:0,name:row.details.name,contactPhone:row.details.phone,requestNotes:row.details.notes,allergyStatus:row.details.allergyStatus,allergies:row.details.allergies,paymentTerms:'PREPAID',specialRequirements:[],lines})
   const book=created.row
   await tx.tourBooking.update({where:{id:bookingId},data:{adultPrice:row.snapshot.adultPrice,childPrice:row.snapshot.childPrice,programSnapshot:{...book.programSnapshot,customerId:row.customerId,customerRequestId:row.id,priceSource:{kind:'DIRECT',promotion:row.snapshot.promotion},commerceTerms:row.snapshot.terms}}})
   const total=bookingQuote({...book,adultPrice:row.snapshot.adultPrice,childPrice:row.snapshot.childPrice}).total
   if(total===null||total!==row.snapshot.packageTotal)fail('PRICE_CHANGED_REVIEW_REQUIRED',409)
   const confirmed=await bookingStatus(nested,actorId,{id:randomUUID(),bookingId,version:book.version,action:'CONFIRM'})
   if(!confirmed.ok)fail('BOAT_CAPACITY_REVIEW_REQUIRED')
   await releaseRequestCapacity(tx,row.id)
   snapshot={...snapshot,capacitySelections:availability.selections,capacityAvailability:availability,confirmedTotal:total,bookingCode:book.code}
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

async function d1WebsiteImage(db,row){
 const file=await readD1File(db,row.objectKey,{size:row.size,sha256:row.sha256})
 return {...row,content:file.body}
}
export async function saveWebsiteImage(db,actorId,input){
 const {actor}=await authorize(db,actorId)
 const data=validateEvidence({...input,targetKind:'BOOKING',targetId:input.id,category:'OTHER',note:'',documentNumber:''})
 if(!['image/jpeg','image/png'].includes(data.mimeType))fail('INVALID_EVIDENCE_FILE',400)
 if(isD1Client(db)){
  const old=await db.websiteImage.findUnique({where:{id:input.id}})
  if(old){if(old.sha256!==data.sha256||old.uploadedBy!==actorId)fail('COMMAND_CONFLICT');return {url:'/api/public/images/'+input.id}}
  const store=d1FileStoreFor(db);if(!store)throw new Error('R2_BUCKET_REQUIRED')
  const objectKey=fileObjectKey('websiteImage',input.id)
  const object=await store.putIfAbsent(objectKey,data.content,{mimeType:data.mimeType,sha256:data.sha256})
  if(!object.created&&(object.size!==data.size||object.mimeType!==data.mimeType||object.sha256!==data.sha256))fail('COMMAND_CONFLICT')
  const [insert]=await d1AtomicBatch(db,[{
   sql:'INSERT INTO "WebsiteImage" ("id","filename","mimeType","objectKey","size","sha256","uploadedBy") SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM "WebsiteImage" WHERE "id"=?) AND EXISTS (SELECT 1 FROM "UserProfile" WHERE "id"=? AND "accessVersion"=? AND "status"=\'ACTIVE\')',
   params:[input.id,data.filename,data.mimeType,objectKey,data.size,data.sha256,actorId,input.id,actorId,actor.accessVersion],
  }])
  if((insert?.meta?.changes||0)!==1){
   const current=await db.websiteImage.findUnique({where:{id:input.id}})
   if(current?.sha256===data.sha256&&current.uploadedBy===actorId)return {url:'/api/public/images/'+input.id}
   if(object.created&&!current)await store.delete(objectKey)
   await authorize(db,actorId)
   fail('COMMAND_CONFLICT')
  }
  return {url:'/api/public/images/'+input.id}
 }
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
 return isD1Client(db)?d1WebsiteImage(db,image):image
}

export async function saveCustomer(db,actorId,input){
 uuid(input.id);int(input.version,0)
 if(!['ACTIVE','SUSPENDED'].includes(input.status))fail('INVALID_INPUT',400)
 const data={displayName:string(input.displayName,200),phone:string(input.phone||'',32,false),email:string(input.email||'',254,false),status:input.status}
 if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))fail('INVALID_EMAIL',400)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`;await authorize(tx,actorId,'customer')
  const old=await tx.customerProfile.findUnique({where:{id:input.id}})
  if(old?.authUserId&&data.email!==old.email)fail('CUSTOMER_EMAIL_LOCKED',409)
  if(old&&input.version===0&&old.version===1&&!old.authUserId&&Object.entries(data).every(([key,value])=>old[key]===value))return {customer:old}
  if(old?.version!==input.version&&!(input.version===0&&!old))fail('SETTINGS_CONFLICT')
  const customer=old?await tx.customerProfile.update({where:{id:old.id},data:{...data,version:{increment:1}}}):await tx.customerProfile.create({data:{id:input.id,...data}})
  await tx.auditEvent.create({data:{actorId,targetId:customer.id,action:'customer.saved',details:{version:customer.version,status:customer.status}}})
  return {customer}
 })
}
export async function customerDocuments(db,user,requestId,requested=1){
 uuid(requestId);const customer=await customerFor(db,user),request=await db.customerRequest.findUnique({where:{id:requestId},select:{customerId:true}})
 if(!request||request.customerId!==customer.id)fail('NOT_FOUND',404)
 int(requested,1,100000)
 const where={targetKind:'CUSTOMER_REQUEST',targetId:requestId},total=await db.evidenceAttachment.count({where}),page=Math.min(requested,Math.max(1,Math.ceil(total/25)))
 const rows=await db.evidenceAttachment.findMany({where,select:{id:true,filename:true,mimeType:true,size:true},orderBy:[{createdAt:'desc'},{id:'asc'}],take:25,skip:(page-1)*25})
 return {rows,total,page,pageSize:25}
}
export async function customerDocument(db,user,id){
 uuid(id);const customer=await customerFor(db,user),file=await db.evidenceAttachment.findUnique({where:{id},select:{id:true,targetKind:true,targetId:true}})
 if(!file||file.targetKind!=='CUSTOMER_REQUEST')fail('NOT_FOUND',404)
 const request=await db.customerRequest.findUnique({where:{id:file.targetId},select:{customerId:true}})
 if(!request||request.customerId!==customer.id)fail('NOT_FOUND',404)
 if(isD1Client(db)){
  const stored=await db.evidenceAttachment.findUnique({where:{id},select:{filename:true,mimeType:true,size:true,sha256:true,objectKey:true}})
  const object=await readD1File(db,stored.objectKey,{size:stored.size,sha256:stored.sha256})
  return {filename:stored.filename,mimeType:stored.mimeType,size:stored.size,content:object.body}
 }
 return db.evidenceAttachment.findUnique({where:{id},select:{filename:true,mimeType:true,size:true,content:true}})
}

async function usedPromotionUnits(db,p,now,excludeRequestId=null){
 const where={...promotionUsageWhere(p.id,now),...(excludeRequestId?{id:{not:excludeRequestId}}:{})}
 const usage=await db.customerRequest.aggregate({where,_count:{id:true},_sum:{adults:true,children:true}})
 return p.quotaUnit==='BOOKING'?usage._count.id:(usage._sum.adults||0)+(usage._sum.children||0)
}

export function requestDisplayStatus(row,now=new Date()){
 if(row.booking?.status==='CANCELLED')return 'CANCELLED'
 if(['REQUESTED','WAITING_TEAM'].includes(row.status)&&row.holdUntil&&new Date(row.holdUntil)<=now)return 'EXPIRED'
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
  if(!['REQUESTED','WAITING_TEAM','DATE_PROPOSED'].includes(row.status)||row.bookingId)fail('BOOKING_LOCKED')
  await releaseRequestCapacity(tx,row.id)
  await tx.customerRequest.update({where:{id:row.id},data:{status:'CANCELLED',version:{increment:1},snapshot:{...row.snapshot,cancelledAt:new Date().toISOString()}}})
  return {ok:true}
 })
}

export async function previewWebsiteImage(db,actorId,id){
 await authorize(db,actorId);uuid(id)
 const file=await db.websiteImage.findUnique({where:{id}});if(!file)fail('NOT_FOUND',404)
 return isD1Client(db)?d1WebsiteImage(db,file):file
}

function promotionUsageWhere(promotionId,now){return {promotionId,status:{notIn:['REJECTED','CANCELLED']},AND:[{OR:[{status:{notIn:['REQUESTED','WAITING_TEAM','DATE_PROPOSED']}},{holdUntil:null},{holdUntil:{gt:now}}]},{OR:[{bookingId:null},{booking:{status:{not:'CANCELLED'}}}]}]}}

// Quote terms and volatile availability are separate: a price hash never promises seats.
export async function customerCapacity(tx,input,snapshot,now=new Date(),excludeRequestId=null){
 const plan=await programBookingPlan(tx,{tourId:input.tourId,serviceDate:input.serviceDate,adults:input.adults,children:input.children,returnStatus:input.returnStatus||'PENDING',returnDate:input.returnDate||null})
 const booking={adults:input.adults,children:input.children,...plan.journey,programSnapshot:{capacitySelections:selections(input.capacitySelections||[])},lines:plan.lines.map(l=>({...l,selected:Boolean(snapshot.components.find(c=>c.componentId===l.componentId)?.selected)}))}
 return assessBookingCapacity(tx,booking,{now,excludeRequestId})
}
export async function publicQuoteAvailability(db,input,now=new Date()){
 return readTransaction(db,async tx=>{
  const quote=await quoteRequest(tx,input,now)
  const availability=await customerCapacity(tx,input,quote,now)
  return {...quote,quoteKey:hash(quote),availability}
 },{isolationLevel:'RepeatableRead',timeout:30000})
}
export async function staffCustomerCapacity(db,actorId,params){
 await authorize(db,actorId,'customer')
 return readTransaction(db,async tx=>{
  await authorize(tx,actorId,'customer')
  const row=await tx.customerRequest.findUnique({where:{id:uuid(params.get('requestId'))}})
  if(!row)fail('NOT_FOUND',404)
  const chosen=params.get('capacitySelections')?parseCapacitySelections(params.get('capacitySelections')):row.snapshot.capacitySelections||[]
  return customerCapacity(tx,{tourId:row.tourId,serviceDate:row.serviceDate.toISOString().slice(0,10),adults:row.adults,children:row.children,capacitySelections:chosen},row.snapshot,new Date(),row.id)
 },{isolationLevel:'RepeatableRead',timeout:30000})
}
export function parseCapacitySelections(value){
 try{return selections(value?JSON.parse(value):[])}catch{fail('INVALID_CAPACITY_SELECTION',400)}
}

async function proposeCustomerDate(tx,actorId,row,input,requestHash,note){
 if(row.bookingId||!['REQUESTED','WAITING_TEAM','DATE_PROPOSED'].includes(row.status))fail('BOOKING_LOCKED')
 if(!isoDay(input.proposedDate)||input.proposedDate===row.serviceDate.toISOString().slice(0,10))fail('INVALID_DATE',400)
 const values={tourId:row.tourId,serviceDate:input.proposedDate,adults:row.adults,children:row.children,promotionId:row.promotionId,optionalIds:row.snapshot.components.filter(c=>c.selection==='OPTIONAL'&&c.selected).map(c=>c.componentId)}
 const quote=await quoteRequest(tx,values,new Date(),row.id)
 const availability=await customerCapacity(tx,{...values,capacitySelections:input.capacitySelections||[]},quote,new Date(),row.id)
 const proposal={serviceDate:input.proposedDate,quote,quoteKey:hash(quote),capacitySelections:availability.selections,availability,note,proposedAt:new Date().toISOString(),previousStatus:row.status==='DATE_PROPOSED'?row.snapshot.dateProposal?.previousStatus||'WAITING_TEAM':row.status}
 await tx.customerRequest.update({where:{id:row.id},data:{status:'DATE_PROPOSED',snapshot:{...row.snapshot,dateProposal:proposal},staffNote:note,version:{increment:1}}})
 const result={id:row.id,status:'DATE_PROPOSED',bookingId:null,confirmed:false}
 await tx.auditEvent.create({data:{actorId,targetId:row.id,action:'customer-request.date-proposed',details:{proposedDate:input.proposedDate,version:row.version+1}}})
 await tx.operationCommand.create({data:{id:input.id,requestHash,result}});return result
}
export async function answerCustomerDate(db,user,input,now=new Date()){
 uuid(input.id);uuid(input.requestId);int(input.version)
 if(!['ACCEPT','DECLINE'].includes(input.answer))fail('INVALID_ACTION',400)
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const customer=await customerFor(tx,user),row=await tx.customerRequest.findUnique({where:{id:input.requestId}})
  if(!row||row.customerId!==customer.id)fail('NOT_FOUND',404)
  const requestHash=hash({...input,customerId:customer.id}),prior=await tx.operationCommand.findUnique({where:{id:input.id}})
  if(prior){if(prior.requestHash!==requestHash)fail('COMMAND_CONFLICT');return prior.result}
  if(row.version!==input.version)fail('SETTINGS_CONFLICT')
  if(row.status!=='DATE_PROPOSED'||row.bookingId||!row.snapshot.dateProposal)fail('BOOKING_LOCKED')
  const proposal=row.snapshot.dateProposal
  let snapshot={...row.snapshot,dateProposal:null},status=proposal.previousStatus,serviceDate=row.serviceDate,seatHoldUntil=null
  let holdUntil=row.holdUntil
  if(input.answer==='ACCEPT'){
   if(input.serviceDate!==proposal.serviceDate||input.quoteKey!==proposal.quoteKey)fail('QUOTE_CHANGED',409)
   const values={tourId:row.tourId,serviceDate:proposal.serviceDate,adults:row.adults,children:row.children,promotionId:row.promotionId,optionalIds:proposal.quote.components.filter(c=>c.selection==='OPTIONAL'&&c.selected).map(c=>c.componentId)}
   const quote=await quoteRequest(tx,values,now,row.id)
   if(hash(quote)!==proposal.quoteKey)fail('QUOTE_CHANGED',409)
   const availability=await customerCapacity(tx,{...values,capacitySelections:input.capacitySelections||proposal.capacitySelections||[]},quote,now,row.id)
   if(!availability.canConfirm&&input.allowWaitlist!==true)fail('CAPACITY_CHANGED',409)
   const promotion=row.promotionId?await tx.tourPromotion.findUnique({where:{id:row.promotionId}}):null
   holdUntil=promotion?.holdHours?new Date(+now+promotion.holdHours*3600000):null
   seatHoldUntil=await holdRequestCapacity(tx,row.id,availability,now,holdUntil)
   snapshot={...quote,capacitySelections:availability.selections,capacityAvailability:availability,dateProposal:null,acceptedDateChange:{previousDate:row.serviceDate.toISOString().slice(0,10),serviceDate:proposal.serviceDate,acceptedAt:now.toISOString()}}
   status=availability.canConfirm?'REQUESTED':'WAITING_TEAM';serviceDate=new Date(proposal.serviceDate+'T00:00:00Z')
  }
  if(!['REQUESTED','WAITING_TEAM'].includes(status))status='WAITING_TEAM'
  await tx.customerRequest.update({where:{id:row.id},data:{status,serviceDate,snapshot,holdUntil,version:{increment:1}}})
  const result={id:row.id,status,seatHoldUntil,confirmed:false}
  await tx.auditEvent.create({data:{actorId:null,targetId:row.id,action:'customer-request.date-'+input.answer.toLowerCase(),details:{customerId:customer.id,version:row.version+1}}})
  await tx.operationCommand.create({data:{id:input.id,requestHash,result}});return result
 },{maxWait:15000,timeout:30000})
}
