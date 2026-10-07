import {confirmationInput} from './booking-confirmation-input.js'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {profileInclude} from '../../modules/identity-access/policy.js'
import {managementScope} from '../../modules/identity-access/user-management.js'
import {saveSettings} from '../../modules/service-catalog/settings.js'
import {initialValues} from '../../../../packages/contracts/catalog.js'
import {saveOperationCatalog,listOperations} from '../../modules/operations/catalog.js'
import {saveBooking,bookingStatus,getBlueprint,tripPreparation} from '../../modules/operations/bookings.js'
import {stockCommand} from '../../modules/operations/stock.js'
import {createD1Prisma} from '../../platform/database/d1-client.ts'

// Original business assertions run against a disposable D1/R2 copy.
// PostgreSQL RLS checks are not represented as D1 checks; Worker access is tested separately.
export async function operationsFlow(env){
const prisma=createD1Prisma(env.DB,{files:env.FILES}),prefix=`QAOPS-${Date.now()}`,created=new Set(),commands=[],checks=[]
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
 const status=async(row,action)=>{const input={id:newId(),bookingId:row.id,version:row.version,action,...(action==='CONFIRM'?{priceConfirmation:await confirmationInput(prisma,actor,row.id)}:{})};await bookingStatus(prisma,actor,input);return prisma.tourBooking.findUnique({where:{id:row.id},include:{lines:true}})}
 let booking=await book(trip.id,[{resourceId:fins.id,selected:true,quantity:10,sourceId:store.id,usagePoint:'BOAT'}])
 booking=await status(booking,'CONFIRM')
 let second=await book(later.id,[{resourceId:fins.id,selected:true,quantity:10,sourceId:store.id,usagePoint:'BOAT'}]);second=await status(second,'CONFIRM');pass('sequential equipment reservations reuse stock')
 const overlap=await book(trip.id,[{resourceId:fins.id,selected:true,quantity:1,sourceId:store.id,usagePoint:'BOAT'}]);await expectCode(()=>status(overlap,'CONFIRM'),'INSUFFICIENT_STOCK')
 const fb=await balance(fins.id)
 const issued=await command({action:'ISSUE',balanceId:fb.id,version:fb.version,destinationId:boat.id,quantity:10,unit:'BASE',custodian:'QA custodian',bookingLineId:booking.lines[0].id})
 assert.equal((await balance(fins.id)).quantity,0);pass('first reserved trip issue permits later reuse plan')
 await expectCode(()=>command({action:'ISSUE',balanceId:fb.id,version:fb.version+1,destinationId:boat.id,quantity:10,unit:'BASE',custodian:'QA',bookingLineId:second.lines[0].id}),'INSUFFICIENT_STOCK')
 await expectCode(()=>status(booking,'COMPLETE'),'OUTSTANDING_ISSUES')
 // Current approved return contract retired CLEANING; verify rejection has no writes.
 await expectCode(()=>command({action:'SETTLE',issueId:issued.details.issueId,quantity:10,unit:'BASE',disposition:'RETURN_CLEANING',locationId:store.id}),'INVALID_DISPOSITION')
 assert.equal((await balance(fins.id)).quantity,0)
 await command({action:'SETTLE',issueId:issued.details.issueId,quantity:10,unit:'BASE',disposition:'RETURN_READY',locationId:store.id})
 assert.equal((await balance(fins.id)).quantity,10);pass('approved one-step return restores exact ready stock; retired cleaning makes no change')
 await status(booking,'COMPLETE');pass('complete booking after return and preparation')
 let sb=await book(trip.id,[{resourceId:service.id,selected:true,quantity:2,slotId:slot.id,usagePoint:'TRANSFER'}]);sb=await status(sb,'CONFIRM')
 const oversell=await book(trip.id,[{resourceId:service.id,selected:true,quantity:1,slotId:slot.id,usagePoint:'TRANSFER'}]);await expectCode(()=>status(oversell,'CONFIRM'),'SERVICE_CAPACITY_EXCEEDED')
 await status(sb,'CANCEL');await status(oversell,'CONFIRM');pass('cancellation releases service capacity')
 let water=await book(trip.id,[{resourceId:drink.id,selected:true,quantity:24,sourceId:boat.id,usagePoint:'BOAT'}]);water=await status(water,'CONFIRM')
 const wb=await balance(drink.id,'READY',boat.id)
 await expectCode(()=>command({action:'COUNT',balanceId:wb.id,version:wb.version,countedQuantity:23,note:'QA reserve protection'}),'COUNT_APPROVAL_REQUIRED')
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

 return {checks};
}catch(error){console.error('OPERATIONS_FAILED',checks,error);throw Object.assign(error,{stage:checks.at(-1)||'setup'})}
finally{await prisma.$disconnect()}
}
