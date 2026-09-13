// Preview-only integration verification. Creates uniquely prefixed fixtures and removes only those fixtures.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {loadEnvFile} from 'node:process'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {profileInclude} from '../src/modules/identity-access/policy.js'
import {managementScope} from '../src/modules/identity-access/user-management.js'
import {saveSettings} from '../src/modules/service-catalog/settings.js'
import {initialValues} from '../../packages/contracts/catalog.js'
import {saveOperationCatalog,listOperations} from '../src/modules/operations/catalog.js'
import {saveBooking,bookingStatus,getBlueprint,tripPreparation} from '../src/modules/operations/bookings.js'
import {stockCommand} from '../src/modules/operations/stock.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),prisma=createPrisma(pool),prefix=`QAOPS-${Date.now()}`,created=new Set(),commands=[],checks=[]
let actor
const pass=name=>{checks.push(name);console.log('PASS '+name)}
const expectCode=async(fn,code)=>{await assert.rejects(fn,e=>e.code===code);pass(code)}
const newId=()=>{const id=randomUUID();created.add(id);return id}
const save=async(entity,values)=>{const input={...initialValues(entity),...values,id:newId(),version:0};const row=(await saveOperationCatalog(prisma,actor,entity,input)).row;return row}
const command=async values=>{const id=newId();commands.push(id);return (await stockCommand(prisma,actor,{id,...values})).row}
const balance=async(resourceId,condition='READY',locationId)=>prisma.stockBalance.findFirst({where:{condition,lot:{resourceId},...(locationId?{locationId}:{})},include:{lot:{include:{resource:true}},location:true}})
const date='2026-09-09',start='2026-10-10 08:00',end='2026-10-10 18:00'
try{
 const profiles=await prisma.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude});actor=profiles.find(p=>managementScope(p)?.company)?.id;assert.ok(actor,'An existing active manager is required')
 await expectCode(()=>listOperations(prisma,randomUUID(),'services',new URLSearchParams()),'PERMISSION_DENIED')
 const store=await save('stores',{code:prefix+'-STORE',name:prefix+' warehouse',kind:'WAREHOUSE'}),boat=await save('stores',{code:prefix+'-BOAT',name:prefix+' boat',kind:'BOAT'})
 const drink=await save('consumables',{code:prefix+'-WATER',name:prefix+' Water',category:'WATER',baseUnit:'BOTTLE',packSize:'12',caseSize:'24',salePrice:'10.00'})
 const fins=await save('equipment',{code:prefix+'-FINS',name:prefix+' Fins',category:'FINS',baseUnit:'PAIR',salePrice:'20.00'})
 const fruit=await save('consumables',{code:prefix+'-FRUIT',name:prefix+' Watermelon',category:'WATERMELON',baseUnit:'FRUIT',salePrice:'0'})
 const service=await save('services',{code:prefix+'-VAN',name:prefix+' Transfer',category:'OTHER',baseUnit:'PERSON',salePrice:'100.00'})
 await expectCode(()=>save('consumables',{code:prefix+'-INVALID',name:'invalid',category:'WATER',baseUnit:'FRUIT'}),'INVALID_UNIT')
 const receive=await command({action:'RECEIVE',resourceId:drink.id,locationId:store.id,quantity:10,unit:'PACK',lotLabel:prefix,receivedOn:date,expiresOn:'2027-01-01',unitCost:'120'})
 assert.equal((await balance(drink.id)).quantity,120);assert.equal(receive.factor,12)
 await stockCommand(prisma,actor,{id:receive.id,action:'RECEIVE',resourceId:drink.id,locationId:store.id,quantity:10,unit:'PACK',lotLabel:prefix,receivedOn:date,expiresOn:'2027-01-01',unitCost:'120'})
 assert.equal((await balance(drink.id)).quantity,120);pass('pack receipt and idempotent replay')
 const b=await balance(drink.id)
 await command({action:'TRANSFER',balanceId:b.id,version:b.version,destinationId:boat.id,quantity:2,unit:'PACK'})
 assert.equal((await balance(drink.id,'READY',store.id)).quantity,96);assert.equal((await balance(drink.id,'READY',boat.id)).quantity,24);pass('pack transfer preserves base stock')
 await command({action:'RECEIVE',resourceId:fins.id,locationId:store.id,quantity:10,unit:'BASE',lotLabel:prefix,receivedOn:date})
 await command({action:'RECEIVE',resourceId:fruit.id,locationId:boat.id,quantity:3,unit:'BASE',lotLabel:prefix,receivedOn:date})
 const trip=await save('trips',{code:prefix+'-TRIP',name:prefix+' Trip',startsAt:start,endsAt:end,capacity:'10'})
 const later=await save('trips',{code:prefix+'-LATER',name:prefix+' Later',startsAt:'2026-10-11 08:00',endsAt:'2026-10-11 18:00',capacity:'10'})
 const slot=await save('slots',{code:prefix+'-SLOT',name:prefix+' Slot',resourceId:service.id,startsAt:start,endsAt:end,capacity:'2'})
 const book=async(tripId,lines,name='booking')=>(await saveBooking(prisma,actor,{id:newId(),version:0,code:prefix+'-'+created.size,name:prefix+' '+name,tripId,adults:1,children:0,adultPrice:'0',childPrice:'0',paymentTerms:'COUNTER',lines})).row
 const status=async(row,action)=>{const input={id:newId(),bookingId:row.id,version:row.version,action};await bookingStatus(prisma,actor,input);return prisma.tourBooking.findUnique({where:{id:row.id},include:{lines:true}})}
 let booking=await book(trip.id,[{resourceId:fins.id,selected:true,quantity:10,sourceId:store.id,usagePoint:'BOAT'}])
 booking=await status(booking,'CONFIRM')
 let second=await book(later.id,[{resourceId:fins.id,selected:true,quantity:10,sourceId:store.id,usagePoint:'BOAT'}]);second=await status(second,'CONFIRM');pass('sequential equipment reservations reuse stock')
 const overlap=await book(trip.id,[{resourceId:fins.id,selected:true,quantity:1,sourceId:store.id,usagePoint:'BOAT'}]);await expectCode(()=>status(overlap,'CONFIRM'),'INSUFFICIENT_STOCK')
 const fb=await balance(fins.id)
 const issued=await command({action:'ISSUE',balanceId:fb.id,version:fb.version,destinationId:boat.id,quantity:10,unit:'BASE',custodian:'QA custodian',bookingLineId:booking.lines[0].id})
 assert.equal((await balance(fins.id)).quantity,0);pass('first reserved trip issue permits later reuse plan')
 await expectCode(()=>command({action:'ISSUE',balanceId:fb.id,version:fb.version+1,destinationId:boat.id,quantity:10,unit:'BASE',custodian:'QA',bookingLineId:second.lines[0].id}),'INSUFFICIENT_STOCK')
 await expectCode(()=>status(booking,'COMPLETE'),'OUTSTANDING_ISSUES')
 await command({action:'SETTLE',issueId:issued.details.issueId,quantity:10,unit:'BASE',disposition:'RETURN_CLEANING',locationId:store.id})
 const dirty=await balance(fins.id,'CLEANING');assert.equal(dirty.quantity,10);assert.equal((await balance(fins.id)).quantity,0);pass('returned equipment excluded until cleaned')
 await command({action:'CONDITION',balanceId:dirty.id,version:dirty.version,quantity:10,unit:'BASE',condition:'READY',note:'QA inspected and clean'})
 await status(booking,'COMPLETE');pass('complete booking after return and preparation')
 let sb=await book(trip.id,[{resourceId:service.id,selected:true,quantity:2,slotId:slot.id,usagePoint:'TRANSFER'}]);sb=await status(sb,'CONFIRM')
 const oversell=await book(trip.id,[{resourceId:service.id,selected:true,quantity:1,slotId:slot.id,usagePoint:'TRANSFER'}]);await expectCode(()=>status(oversell,'CONFIRM'),'SERVICE_CAPACITY_EXCEEDED')
 await status(sb,'CANCEL');await status(oversell,'CONFIRM');pass('cancellation releases service capacity')
 let water=await book(trip.id,[{resourceId:drink.id,selected:true,quantity:24,sourceId:boat.id,usagePoint:'BOAT'}]);water=await status(water,'CONFIRM')
 const wb=await balance(drink.id,'READY',boat.id)
 await expectCode(()=>command({action:'COUNT',balanceId:wb.id,version:wb.version,countedQuantity:23,note:'QA reserve protection'}),'INSUFFICIENT_STOCK')
 const waterIssue=await command({action:'ISSUE',balanceId:wb.id,version:wb.version,destinationId:boat.id,quantity:24,unit:'BASE',custodian:'QA',bookingLineId:water.lines[0].id})
 await command({action:'SETTLE',issueId:waterIssue.details.issueId,quantity:20,unit:'BASE',disposition:'CONSUMED'})
 await command({action:'SETTLE',issueId:waterIssue.details.issueId,quantity:4,unit:'BASE',disposition:'RETURN_READY',locationId:boat.id})
 await expectCode(()=>command({action:'SETTLE',issueId:waterIssue.details.issueId,quantity:1,unit:'BASE',disposition:'CONSUMED'}),'RETURN_EXCEEDS_ISSUE');pass('consumption and intact returns settle exact issue')
 const current=await balance(drink.id,'READY',store.id)
 const results=await Promise.allSettled([1,2].map(()=>command({action:'ISSUE',balanceId:current.id,version:current.version,destinationId:boat.id,quantity:60,unit:'BASE',custodian:'QA concurrency'})))
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await balance(drink.id,'READY',store.id)).quantity,36);pass('concurrent issue cannot overdraw or reuse stale version')
 const template=(await saveSettings(prisma,actor,'tours',{...initialValues('tours'),id:newId(),version:0,code:prefix+'-PROGRAM',name:prefix+' Program',adultPrice:'1000',childPrice:'500'})).row
 const component=await save('components',{tourId:template.id,resourceId:service.id,selection:'OPTIONAL',basis:'PER_PERSON',quantity:'1',usagePoint:'TRANSFER',day:'1'})
 const tp=await save('trips',{code:prefix+'-PROGRAM-TRIP',name:prefix+' Program trip',tourId:template.id,startsAt:start,endsAt:end,capacity:'10'})
 const blueprint=await getBlueprint(prisma,actor,new URLSearchParams({tripId:tp.id,adults:'2',children:'1'}));assert.equal(blueprint.lines[0].quantity,3)
 let snap=await book(tp.id,[{componentId:component.id,resourceId:service.id,selected:true,quantity:1,usagePoint:'TRANSFER'}])
 await saveOperationCatalog(prisma,actor,'services',{...initialValues('services',service),id:service.id,version:service.version,salePrice:'999.00'})
 const edit={id:snap.id,version:snap.version,code:snap.code,name:prefix+' changed guest',tripId:tp.id,adults:1,children:0,adultPrice:'0',childPrice:'0',lines:[{componentId:component.id,resourceId:service.id,selected:true,quantity:1,usagePoint:'TRANSFER'}]}
 snap=(await saveBooking(prisma,actor,edit)).row;assert.equal(snap.lines[0].unitPrice.toString(),'100');assert.equal((await saveBooking(prisma,actor,edit)).row.version,snap.version);pass('draft name edit preserves saved component price and retry replays')
 const prep=await tripPreparation(prisma,actor,new URLSearchParams({tripId:trip.id}));assert.ok(prep.rows.length>=3);pass('trip preparation aggregates confirmed and completed requirements')
 const before=await listOperations(prisma,actor,'bookings',new URLSearchParams());const filtered=await listOperations(prisma,actor,'bookings',new URLSearchParams({q:'does-not-match'}));assert.deepEqual(before.summary,filtered.summary);pass('summary independent of list filters')
 const security=await pool.query("SELECT relname,relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') AS anon_read,has_table_privilege('authenticated',c.oid,'SELECT') AS user_read FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app_private' AND c.relname IN ('OperationResource','StockBalance','TourBooking','StockMovement')")
 assert.equal(security.rows.length,4);assert.ok(security.rows.every(r=>r.relrowsecurity&&!r.anon_read&&!r.user_read));pass('private tables deny browser role reads')
 console.log(JSON.stringify({result:'PASS',environment:'preview',checks:checks.length,prefix}))
}catch(error){console.error('QA FAILED',error.code||error.message);process.exitCode=1}
finally{
 // Only this run's IDs/prefix are removed; existing user programs and stock are not touched.
 try{
 const resources=await prisma.operationResource.findMany({where:{code:{startsWith:prefix}},select:{id:true}}),resourceIds=resources.map(r=>r.id)
 const lots=await prisma.stockLot.findMany({where:{resourceId:{in:resourceIds}},select:{id:true}}),lotIds=lots.map(r=>r.id)
 const bookings=await prisma.tourBooking.findMany({where:{code:{startsWith:prefix}},select:{id:true}}),bookingIds=bookings.map(r=>r.id)
 await prisma.$transaction(async tx=>{
  await tx.stockIssue.deleteMany({where:{lotId:{in:lotIds}}});await tx.stockBalance.deleteMany({where:{lotId:{in:lotIds}}});await tx.stockLot.deleteMany({where:{id:{in:lotIds}}})
  await tx.bookingComponent.deleteMany({where:{bookingId:{in:bookingIds}}});await tx.tourBooking.deleteMany({where:{id:{in:bookingIds}}})
  await tx.programComponent.deleteMany({where:{resourceId:{in:resourceIds}}});await tx.serviceSlot.deleteMany({where:{resourceId:{in:resourceIds}}});await tx.operationTrip.deleteMany({where:{code:{startsWith:prefix}}})
  await tx.tourProgram.deleteMany({where:{code:{startsWith:prefix}}});await tx.operationResource.deleteMany({where:{id:{in:resourceIds}}});await tx.stockLocation.deleteMany({where:{code:{startsWith:prefix}}})
  await tx.stockMovement.deleteMany({where:{id:{in:[...created]}}});await tx.operationCommand.deleteMany({where:{id:{in:[...created]}}});await tx.auditEvent.deleteMany({where:{targetId:{in:[...created]}}})
 },{timeout:30000});console.log('QA fixture cleanup complete')
 }catch(e){console.error('QA cleanup requires follow-up',e.code||'FAILED',prefix);process.exitCode=1}
 await prisma.$disconnect();await pool.end()
}
