import {loadEnvFile} from 'node:process'
import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import assert from 'node:assert/strict'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {quoteRequest,submitCustomerRequest,memberRequests} from '../src/modules/commerce/service.js'
import {demoCheckout} from '../src/modules/commerce/demo-checkout.js'
import {hash} from '../src/modules/operations/common.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),db=createPrisma(pool),rollback=new Error('ROLLBACK')
try{await db.$transaction(async tx=>{
 const nested=new Proxy(tx,{get(target,key){return key==='$transaction'?fn=>fn(target):target[key]}})
 const fixture=JSON.parse(await readFile(new URL('../../docs/validation/commerce-demo-manifest.json',import.meta.url),'utf8'))
 const user={id:randomUUID(),email_confirmed_at:'test'},other={id:randomUUID(),email_confirmed_at:'test'}
 for(const u of [user,other])await tx.customerProfile.create({data:{id:randomUUID(),authUserId:u.id,displayName:'DEMO rollback'}})
 const input={id:randomUUID(),tourId:fixture.tour,serviceDate:'2026-11-02',adults:1,children:0,name:'DEMO rollback',phone:'0000000000',allergyStatus:'NONE',allergies:''}
 input.quoteKey=hash(await quoteRequest(tx,input))
 await submitCustomerRequest(nested,user,input)
 const listed=await memberRequests(tx,user,new URLSearchParams());assert.equal(listed.rows.find(r=>r.id===input.id).demoCheckoutEnabled,true)
 await assert.rejects(()=>demoCheckout(nested,other,{requestId:input.id,action:'PREPARE'}),{message:'NOT_FOUND'})
 await demoCheckout(nested,user,{requestId:input.id,action:'PREPARE'})
 const pending=await tx.customerRequest.findUnique({where:{id:input.id}}),paymentId=pending.snapshot.demoCheckout.payment.id
 await assert.rejects(()=>demoCheckout(nested,user,{requestId:input.id,action:'SUCCEED',paymentId:'wrong'}),{message:'PAYMENT_REFERENCE_MISMATCH'})
 const command={requestId:input.id,action:'SUCCEED',paymentId}
 const a=await demoCheckout(nested,user,command),b=await demoCheckout(nested,user,command)
 assert.equal(a.bookingId,b.bookingId)
 const row=await tx.customerRequest.findUnique({where:{id:input.id},include:{booking:{include:{lines:true}}}})
 assert.equal(row.booking.status,'CONFIRMED');assert.equal(row.booking.paymentTerms,'PREPAID');assert.equal(row.booking.programSnapshot.demo,true);assert.equal(row.booking.lines.length,1)
 assert.equal(row.snapshot.demoCheckout.notification.customerId,row.customerId);assert.equal(row.snapshot.demoCheckout.notification.status,'SIMULATED');assert.equal(row.snapshot.demoCheckout.notification.accepted,false)
 assert.equal(await tx.auditEvent.count({where:{targetId:input.id,action:'demo.checkout.simulated'}}),1)
 throw rollback
},{timeout:30000})}catch(e){if(e!==rollback){console.error({error:e.code||e.name,message:/^[A-Z_]+$/.test(e.message)?e.message:'CHECK_FAILED'});process.exitCode=1}else console.log('PASS: owner isolation, payment reference, persistent demo Booking, idempotent success, scoped LINE preview. Transaction rolled back; retained tour untouched.')}
finally{await db.$disconnect();await pool.end()}
