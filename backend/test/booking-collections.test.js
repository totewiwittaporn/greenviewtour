import test from 'node:test'
import assert from 'node:assert/strict'
import {recordBookingCollection} from '../src/modules/receivables/collections.js'
const id=n=>`a0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
function fixture(debt='2000'){
 const receipts=[],offsets=[],commands=new Map(),bills=[{id:id(3),agentId:id(2),total:debt,paid:'0',status:'OPEN'}]
 const booking={id:id(1),version:1,status:'COMPLETED',agentId:id(2),paymentTerms:'COUNTER',adults:1,children:0,adultPrice:'2300',childPrice:'0',lines:[]}
 let active=true
 const tx={customerRequest:{findFirst:async()=>null},$executeRaw:async()=>{},userProfile:{findUnique:async()=>({id:id(9),status:active?'ACTIVE':'INACTIVE',roles:[{roleCode:'ACCOUNT',scope:'COMPANY'}]})},financePersonnelCommand:{findUnique:async({where})=>commands.get(where.id),create:async({data})=>commands.set(data.id,data)},tourBooking:{findUnique:async()=>booking,findMany:async()=>[],update:async()=>{booking.version++}},bookingAttendance:{count:async()=>0},bookingReceipt:{findMany:async({where})=>receipts.filter(r=>r.bookingId===where.bookingId),create:async({data})=>{receipts.push(data);return data}},agentMarginOffset:{findMany:async({where})=>offsets.filter(r=>where.receiptId?r.receiptId===where.receiptId:r.bookingId===where.bookingId),create:async({data})=>{offsets.push(data);return data}},agentBill:{findMany:async()=>bills,update:async({data})=>Object.assign(bills[0],data)},auditEvent:{create:async()=>{}}}
 return {db:{$transaction:fn=>fn(tx)},tx,receipts,offsets,bills,booking,revoke:()=>{active=false}}
}
const input={id:id(10),bookingId:id(1),version:1,payer:'CUSTOMER',basis:'FULL',received:'3500',receivedOn:'2026-09-01',reference:'Verified receipt'}
test('verified collection offsets margin without inventing cash and preserves Agent source',async()=>{
 const f=fixture();const result=await recordBookingCollection(f.db,id(9),input)
 assert.equal(result.offset,'1200.00');assert.equal(result.refundable,'0.00');assert.equal(f.bills[0].paid,'1200.00');assert.equal(f.bills[0].status,'OPEN')
 assert.equal(f.booking.agentId,id(2));assert.equal(f.receipts[0].net,'2300.00');assert.equal(f.receipts[0].received,'3500.00')
 await recordBookingCollection(f.db,id(9),input);assert.equal(f.receipts.length,1);assert.equal(f.offsets.length,1)
 f.revoke();await assert.rejects(recordBookingCollection(f.db,id(9),input),{code:'PERMISSION_DENIED'})
})
test('excess margin becomes refundable; net-only creates no margin or offset',async()=>{
 const f=fixture('500');const result=await recordBookingCollection(f.db,id(9),input)
 assert.equal(result.refundable,'700.00');assert.equal(f.bills[0].status,'PAID')
 const g=fixture();const net=await recordBookingCollection(g.db,id(9),{...input,basis:'NET_ONLY',received:'2300'})
 assert.equal(net.refundable,'0.00');assert.equal(g.offsets.length,0)
})
test('billed, already paid and stale bookings cannot receive duplicate collection',async()=>{
 for(const patch of [{billLine:{bill:{status:'PAID'}}},{paymentTerms:'PAID'},{version:2},{status:'CANCELLED'}]){
  const f=fixture();Object.assign(f.booking,patch);await assert.rejects(recordBookingCollection(f.db,id(9),input));assert.equal(f.receipts.length,0)
 }
})

test('customer-request payments remain in their original proof workflow',async()=>{
 const f=fixture();f.tx.customerRequest.findFirst=async()=>({id:id(99)})
 await assert.rejects(recordBookingCollection(f.db,id(9),input),{code:'RECORD_PAYMENT_ON_CUSTOMER_REQUEST'})
 assert.equal(f.receipts.length,0)
})
test('a billed source collection reduces its statement without a second cash entry',async()=>{
 const f=fixture('2300');f.bills[0].snapshot=[{bookingId:id(1),total:'2300'}];f.booking.billLine={bill:f.bills[0]}
 const result=await recordBookingCollection(f.db,id(9),{...input,basis:'NET_ONLY',received:'2300'})
 assert.equal(result.receipt.received,'2300.00');assert.equal(f.bills[0].paid,'2300.00');assert.equal(f.bills[0].status,'PAID');assert.equal(f.offsets.length,0)
})
