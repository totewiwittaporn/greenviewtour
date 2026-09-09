import test from 'node:test'
import assert from 'node:assert/strict'
import { preparationShare, projectBoatPreparation, boatPreparation, stockCommand } from '../src/modules/operations/stock.js'
import { operationAccess } from '../../packages/contracts/operation-access.js'
const id=n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const profile=role=>({status:'ACTIVE',roles:[{roleCode:role,scope:role==='MANAGER'?'COMPANY':'SELF'}]})
function fixture(){
 const resource={id:id(8),kind:'EQUIPMENT',name:'Child mask',code:'MASK-C',baseUnit:'PIECE',size:'CHILD'}
 const stock={id:id(4),selected:true,resourceId:resource.id,resource,usagePoint:'BOAT',quantity:5,issuedQty:0,sourceId:null,snapshot:{...resource,costPrice:'SECRET'},issues:[]}
 const transport={id:id(3),selected:true,dispatchDirection:'BOTH',resource:{kind:'SERVICE',category:'TOUR_BOAT'},snapshot:{kind:'SERVICE',category:'TOUR_BOAT'},dispatchAssignments:[
  {runId:id(1),adults:3,children:1,run:{kind:'BOAT',status:'OPEN',direction:'OUTBOUND'}},
  {runId:id(2),adults:5,children:1,run:{kind:'BOAT',status:'OPEN',direction:'OUTBOUND'}},
  {runId:id(9),adults:8,children:2,run:{kind:'BOAT',status:'OPEN',direction:'RETURN'}},
 ]}
 const booking={id:id(5),code:'B1',name:'Family',status:'CONFIRMED',adults:8,children:2,lines:[transport,stock],adultPrice:'SECRET'}
 const run={id:id(1),code:'BOAT1',kind:'BOAT',direction:'OUTBOUND',status:'OPEN',capacity:40,slot:{vehicle:{name:'Boat 1'}},staff:[{userId:id(6)}],assignments:[{adults:3,children:1,bookingLine:{booking}}]}
 return {resource,stock,transport,booking,run}
}
test('split boats receive exact integer shares once; return leg does not duplicate whole booking stock',()=>{
 const {stock,booking,transport}=fixture()
 assert.equal(preparationShare(stock,booking,id(1)),2)
 assert.equal(preparationShare(stock,booking,id(2)),3)
 assert.equal(preparationShare(stock,booking,id(9)),0)
 transport.dispatchAssignments=transport.dispatchAssignments.slice(0,1)
 assert.equal(preparationShare(stock,booking,id(1)),2,'unallocated guests retain their unallocated stock')
})
test('return-only bookings prepare on return and cancelled allocations do not claim stock',()=>{
 const {stock,booking,transport}=fixture()
 transport.dispatchDirection='RETURN'
 assert.equal(preparationShare(stock,booking,id(9)),5)
 transport.dispatchAssignments[2].run.status='CANCELLED'
 assert.equal(preparationShare(stock,booking,id(9)),0)
})
test('boat projection includes item size and loan balances without booking or resource prices',()=>{
 const {run,stock}=fixture()
 stock.issuedQty=3
 stock.issues=[{id:id(10),runId:id(1),quantity:2,settledQty:1},{id:id(11),runId:id(2),quantity:1,settledQty:0}]
 const result=projectBoatPreparation(run)
 assert.equal(result.bookings.passengers,4)
 assert.equal(result.rows[0].quantity,2)
 assert.equal(result.rows[0].outstandingQty,1)
 assert.equal(result.rows[0].remainingQty,0)
 assert.equal(result.rows[0].size,'CHILD')
 assert.equal(JSON.stringify(result).includes('SECRET'),false)
 run.assignments[0].bookingLine.booking.status='CANCELLED'
 assert.equal(projectBoatPreparation(run).rows.length,0)
})
test('assistant preparation requires an assigned boat; stock inventory management remains restricted',async()=>{
 const {run}=fixture()
 const tx={userProfile:{findUnique:async()=>profile('ASSISTANT_TOUR_GUIDE')},dispatchRun:{findUnique:async()=>run},stockBalance:{findMany:async()=>[]},stockLocation:{findMany:async()=>[]}}
 const prisma={$transaction:fn=>fn(tx)}
 const result=await boatPreparation(prisma,id(6),new URLSearchParams({runId:run.id}))
 assert.equal(result.rows.length,1)
 await assert.rejects(boatPreparation(prisma,id(7),new URLSearchParams({runId:run.id})),{code:'PERMISSION_DENIED'})
 assert.equal(operationAccess(profile('ASSISTANT_TOUR_GUIDE')).prepareStock,true)
 assert.equal(operationAccess(profile('ASSISTANT_TOUR_GUIDE')).stock,false)
 assert.equal(operationAccess(profile('DRIVER')).prepareStock,false)
})
test('assistant cannot issue unlinked stock or receive inventory',async()=>{
 const tx={$executeRaw:async()=>{},userProfile:{findUnique:async()=>profile('ASSISTANT_TOUR_GUIDE')}}
 const prisma={$transaction:fn=>fn(tx)}
 await assert.rejects(stockCommand(prisma,id(6),{id:id(20),action:'ISSUE'}),{code:'PERMISSION_DENIED'})
 await assert.rejects(stockCommand(prisma,id(6),{id:id(20),action:'RECEIVE'}),{code:'PERMISSION_DENIED'})
})
test('assistant issue cannot exceed its boat share even when booking and physical stock remain',async()=>{
 const {run,stock,booking,resource}=fixture()
 const lot={id:id(30),resource,resourceId:resource.id,expiresOn:null}
 const tx={$executeRaw:async()=>{},userProfile:{findUnique:async()=>profile('ASSISTANT_TOUR_GUIDE')},dispatchRun:{findUnique:async()=>run},stockMovement:{findUnique:async()=>null},stockBalance:{findUnique:async()=>({id:id(31),version:1,quantity:100,condition:'READY',lot,location:{id:id(32),status:'ACTIVE'}})},stockLocation:{findUnique:async()=>({id:id(33),status:'ACTIVE'})},bookingComponent:{findUnique:async()=>({...stock,booking:{...booking,trip:{endsAt:new Date('2026-09-10')}}})}}
 resource.status='ACTIVE'
 await assert.rejects(stockCommand({$transaction:fn=>fn(tx)},id(6),{id:id(20),action:'ISSUE',runId:run.id,bookingLineId:stock.id,balanceId:id(31),version:1,quantity:3,unit:'BASE',destinationId:id(33),custodian:'Assistant'}),{code:'ISSUE_EXCEEDS_REQUIREMENT'})
})
test('stock team chooses physical source at issue when Booking has no warehouse selected',async()=>{
 const {run,stock,booking,resource}=fixture()
 resource.status='ACTIVE'
 const lot={id:id(30),label:'Lot',resource,resourceId:resource.id,expiresOn:null}
 let createdIssue,issuedIncrement,balanceDecrement
 const tx={$executeRaw:async()=>{},userProfile:{findUnique:async()=>profile('ASSISTANT_TOUR_GUIDE')},dispatchRun:{findUnique:async()=>run},stockMovement:{findUnique:async()=>null,create:async({data})=>data},stockBalance:{findUnique:async()=>({id:id(31),version:1,quantity:100,condition:'READY',lot,location:{id:id(32),name:'Warehouse',status:'ACTIVE'}}),update:async({data})=>{balanceDecrement=data.quantity.decrement}},stockLocation:{findUnique:async()=>({id:id(33),name:'Boat',status:'ACTIVE'})},bookingComponent:{findUnique:async()=>({...stock,booking:{...booking,trip:{endsAt:new Date('2026-09-10')}}}),update:async({data})=>{issuedIncrement=data.issuedQty.increment},findMany:async()=>[]},stockIssue:{create:async({data})=>{createdIssue=data;return data}},operationResource:{findUnique:async()=>resource},auditEvent:{create:async()=>{}}}
 await stockCommand({$transaction:fn=>fn(tx)},id(6),{id:id(20),action:'ISSUE',runId:run.id,bookingLineId:stock.id,balanceId:id(31),version:1,quantity:2,unit:'BASE',destinationId:id(33),custodian:'Assistant'})
 assert.equal(createdIssue.runId,run.id)
 assert.equal(createdIssue.sourceId,id(32))
 assert.equal(issuedIncrement,2)
 assert.equal(balanceDecrement,2)
 assert.equal(stock.sourceId,null)
})
test('assistant cannot settle a loan issued on another unassigned boat',async()=>{
 const {run}=fixture()
 const tx={$executeRaw:async()=>{},userProfile:{findUnique:async()=>profile('ASSISTANT_TOUR_GUIDE')},stockMovement:{findUnique:async()=>null},stockIssue:{findUnique:async()=>({runId:run.id})},dispatchRun:{findUnique:async()=>run}}
 await assert.rejects(stockCommand({$transaction:fn=>fn(tx)},id(7),{id:id(20),action:'SETTLE',issueId:id(21),quantity:1,disposition:'RETURN_READY'}),{code:'PERMISSION_DENIED'})
})
test('child and adult item requirements follow the assigned age group, not total passengers',()=>{
 const {stock,booking,transport}=fixture()
 transport.dispatchAssignments[0].adults=4;transport.dispatchAssignments[0].children=0
 transport.dispatchAssignments[1].adults=4;transport.dispatchAssignments[1].children=2
 stock.quantity=2;stock.snapshot.basis='PER_CHILD'
 assert.equal(preparationShare(stock,booking,id(1)),0)
 assert.equal(preparationShare(stock,booking,id(2)),2)
 stock.quantity=8;stock.snapshot.basis='PER_ADULT'
 assert.equal(preparationShare(stock,booking,id(1)),4)
 assert.equal(preparationShare(stock,booking,id(2)),4)
})
test('unknown return equipment never creates projected availability from a legacy trip end',async()=>{
 const {ensureStockReservations}=await import('../src/modules/operations/reservations.js')
 const future={startsAt:new Date('2026-10-10T02:00:00Z'),endsAt:new Date('2026-10-10T10:00:00Z')}
 const tx={operationResource:{findUnique:async()=>({kind:'EQUIPMENT'})},bookingComponent:{findMany:async()=>[{quantity:1,issuedQty:0,booking:{trip:future}}]},stockBalance:{findMany:async()=>[]},stockIssue:{findMany:async()=>[{quantity:1,settledQty:0,lot:{expiresOn:null},bookingLine:{booking:{returnDate:null,trip:{endsAt:new Date('2026-10-01')}}}}]}}
 await assert.rejects(ensureStockReservations(tx,id(8),id(32)),{code:'INSUFFICIENT_STOCK'})
 tx.stockIssue.findMany=async()=>[{quantity:1,settledQty:0,lot:{expiresOn:null},bookingLine:{booking:{returnDate:new Date('2026-10-08'),trip:{endsAt:new Date('2026-10-01')}}}}]
 await ensureStockReservations(tx,id(8),id(32))
})
test('program meals, park fees and accommodation flow into boat preparation as read-only needs',()=>{
 const {run,booking}=fixture()
 for(const [index,category]of ['MEAL','ACCOMMODATION','PARK_FEE'].entries())booking.lines.push({id:id(40+index),resourceId:id(45+index),selected:true,quantity:10,usagePoint:'ISLAND',resource:{kind:'SERVICE',category,baseUnit:'PERSON',name:category,costPrice:'SECRET'},snapshot:{kind:'SERVICE',category,day:1,provider:'Park',notes:'Lunch',basis:'PER_PERSON',costPrice:'SECRET'}})
 const result=projectBoatPreparation(run)
 assert.equal(result.services.length,3)
 assert.equal(result.rows.length,1)
 assert.equal(result.services[0].quantity,4)
 assert.equal(result.services[0].provider,'Park')
 assert.equal(result.services[0].day,1)
 assert.equal(JSON.stringify(result.services).includes('SECRET'),false)
 assert.equal('readyBalances' in result.services[0],false)
})
test('guest dietary and preparation instructions flow to assistant without agent billing data',()=>{
 const {run,booking}=fixture()
 Object.assign(booking,{allergyStatus:'HAS_ALLERGY',allergies:'Peanuts',specialRequirements:['VEGAN'],assistance:'Child fins',requestNotes:'Use child mask',paymentTerms:'PRIVATE'})
 const result=projectBoatPreparation(run)
 assert.equal(result.guestRequirements.length,1)
 assert.equal(result.guestRequirements[0].allergies,'Peanuts')
 assert.deepEqual(result.guestRequirements[0].specialRequirements,['VEGAN'])
 assert.equal(result.guestRequirements[0].requestNotes,'Use child mask')
 assert.equal('paymentTerms' in result.guestRequirements[0],false)
})
