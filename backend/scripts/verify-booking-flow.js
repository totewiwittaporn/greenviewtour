// Preview-only transactional integration check. All fixture rows roll back.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
import { operationAccess } from '../../packages/contracts/operation-access.js'
import { getBlueprint,saveBooking,bookingStatus,amendBookingReturn } from '../src/modules/operations/bookings.js'
import { bookingQuote } from '../../packages/contracts/booking-plan.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),prisma=createPrisma(pool),rollback=new Error('VERIFIED_ROLLBACK')
let verified=false
try{
 const actor=(await prisma.userProfile.findMany({where:{status:'ACTIVE'},include:{roles:true}})).find(p=>operationAccess(p).manager)
 if(!actor)throw Error('MANAGER_NOT_FOUND')
 await prisma.$transaction(async tx=>{
  const db={...tx,$transaction:fn=>fn(tx)},suffix=randomUUID().slice(0,8)
  const agent=await tx.businessPartner.create({data:{id:randomUUID(),code:`QA-${suffix}`,name:'Transactional verification agent',status:'ACTIVE',roles:['SALES_AGENT']}})
  const agreement=await tx.agentAgreement.create({data:{id:randomUUID(),agentId:agent.id,code:`QA-${suffix}`,name:'Verification agreement',startsOn:new Date('2026-01-01'),endsOn:new Date('2026-12-31')}})
  const program=await tx.tourProgram.create({data:{id:randomUUID(),code:`QA-${suffix}`,name:'Transactional day trip',status:'ACTIVE',ownership:'GREENVIEW',confirmationMode:'INSTANT',supplierPricing:'NOT_SET',journeyMode:'FIXED',durationDays:1,adultPrice:'1000',childPrice:'500'}})
  await tx.agentTourPrice.create({data:{id:randomUUID(),agentId:agent.id,tourId:program.id,agreementId:agreement.id,adultPrice:'800',childPrice:'400',status:'ACTIVE'}})
  for(const [i,category,kind,unit,selection] of [[1,'TOUR_BOAT','SERVICE','PERSON','REQUIRED'],[2,'MEAL','SERVICE','PERSON_MEAL','INCLUDED'],[3,'SNORKEL_MASK','EQUIPMENT','PIECE','REQUIRED']]){
   const resource=await tx.operationResource.create({data:{id:randomUUID(),code:`QA-${suffix}-${i}`,name:`Verification ${category}`,status:'ACTIVE',category,kind,baseUnit:unit,salePrice:'100',...(category==='MEAL'?{mealPeriod:'LUNCH'}:{})}})
   await tx.programComponent.create({data:{id:randomUUID(),tourId:program.id,resourceId:resource.id,selection,basis:i===3?'PER_CHILD':'PER_PERSON',quantity:1,usagePoint:'BOAT',day:1,status:'ACTIVE',removalCredit:selection==='INCLUDED'?'100':null}})
  }
  const query={tourId:program.id,agentId:agent.id,serviceDate:'2026-11-10',adults:'2',children:'1'}
  const plan=await getBlueprint(db,actor.id,new URLSearchParams(query))
  assert.equal(plan.adultPrice,'800');assert.equal(plan.journey.returnDate,'2026-11-10')
  const payload={...query,id:randomUUID(),version:0,name:'Transactional guests',adults:2,children:1,paymentTerms:'PREPAID',allergyStatus:'NONE',specialRequirements:['NO_MEALS'],lines:plan.lines.map(l=>({componentId:l.componentId,resourceId:l.resourceId,quantity:l.quantity,selected:l.resource.category!=='MEAL'}))}
  const {row}=await saveBooking(db,actor.id,payload)
  assert.match(row.code,/^BK-2026-\d{6}$/);assert.equal(bookingQuote(row).total,'1700.00')
  assert.equal((await saveBooking(db,actor.id,payload)).row.id,row.id)
  await bookingStatus(db,actor.id,{id:randomUUID(),bookingId:row.id,version:row.version,action:'CONFIRM'})
  assert.equal((await tx.tourBooking.findUnique({where:{id:row.id}})).status,'CONFIRMED')
  await tx.tourProgram.update({where:{id:program.id},data:{journeyMode:'OPEN_RETURN',durationDays:null}})
  await tx.programComponent.updateMany({where:{tourId:program.id,selection:'INCLUDED'},data:{status:'INACTIVE'}})
  const open=await getBlueprint(db,actor.id,new URLSearchParams({...query,returnStatus:'PENDING'}))
  const saved=await saveBooking(db,actor.id,{...payload,id:randomUUID(),specialRequirements:[],returnStatus:'PENDING',lines:open.lines.map(l=>({componentId:l.componentId,resourceId:l.resourceId,quantity:l.quantity,selected:true}))})
  await bookingStatus(db,actor.id,{id:randomUUID(),bookingId:saved.row.id,version:1,action:'CONFIRM'})
  await assert.rejects(()=>bookingStatus(db,actor.id,{id:randomUUID(),bookingId:saved.row.id,version:2,action:'COMPLETE'}),{code:'RETURN_STATUS_PENDING'})
  await amendBookingReturn(db,actor.id,{id:randomUUID(),bookingId:saved.row.id,version:2,returnStatus:'OUR',returnDate:'2026-11-12',reason:'Transactional verification'})
  const returned=await tx.tourBooking.findUnique({where:{id:saved.row.id}})
  assert.equal(returned.returnDate.toISOString().slice(0,10),'2026-11-12')
  verified=true;throw rollback
 },{timeout:60000,maxWait:15000}).catch(e=>{if(e!==rollback)throw e})
 assert.equal(verified,true)
 const rls=await pool.query(`SELECT relname,relrowsecurity FROM pg_class WHERE oid IN ('app_private."AgentAgreement"'::regclass,'app_private."BookingSequence"'::regclass)`)
 assert.ok(rls.rows.every(r=>r.relrowsecurity));assert.equal(rls.rows.length,2)
 console.log('PASS real Preview transaction: annual agent rate, exact removal credit, automatic/idempotent code, PREPAID constraint, child-only supplies, confirmation without logistics, pending-return lifecycle, return amendment, rollback and private RLS')
}finally{await prisma.$disconnect();await pool.end()}
