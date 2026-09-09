import test from 'node:test'
import assert from 'node:assert/strict'
import { bookingAmount, dailyBookingSummary } from '../../packages/contracts/booking-document.js'
import { dailyBookingDocument, documentBrand } from '../src/modules/operations/documents.js'
test('collection uses snapshot prices and selected paid extras with exact satang',()=>{
 assert.equal(bookingAmount({adults:3,children:1,adultPrice:'0.10',childPrice:'0.20',lines:[{selected:true,included:false,quantity:3,unitPrice:'0.10'},{selected:true,included:true,quantity:9,unitPrice:'99'},{selected:false,quantity:10,unitPrice:'99'}]}),'0.80')
 assert.equal(bookingAmount({adults:1,adultPrice:null,children:0,lines:[]}),null)
 assert.equal(bookingAmount({adults:1,adultPrice:'0',children:0,lines:[]}),'0.00')
})
test('daily document is unpaginated, Bangkok scoped and denies driver access',async()=>{
 let query
 const booking={id:'b',code:'B',name:'Guests',version:1,adults:2,children:1,adultPrice:'100',childPrice:'50',paymentTerms:'COUNTER',trip:{name:'Tour'},programSnapshot:{tourId:'t',name:'Tour'},lines:[]}
 const tx={tourBooking:{findMany:async q=>{query=q;return Array.from({length:31},(_,i)=>({...booking,id:String(i)}))}}}
 const prisma={userProfile:{findUnique:async()=>({status:'ACTIVE',roles:[{roleCode:'BOOKING',scope:'SELF'}]})},$transaction:fn=>fn(tx)}
 const d=await dailyBookingDocument(prisma,'actor','2026-09-11')
 assert.equal(d.rows.length,31);assert.equal(d.summary.collectAmount,'7750.00');assert.equal(query.take,undefined);assert.equal(query.skip,undefined)
 assert.equal(query.where.trip.startsAt.lt.toISOString(),'2026-09-11T17:00:00.000Z')
 assert.equal(query.where.trip.endsAt.gte.toISOString(),'2026-09-10T17:00:00.000Z')
 assert.deepEqual(query.where.status.in,['CONFIRMED','COMPLETED'])
 prisma.userProfile.findUnique=async()=>({status:'ACTIVE',roles:[{roleCode:'DRIVER',scope:'SELF'}]})
 await assert.rejects(()=>dailyBookingDocument(prisma,'actor','2026-09-11'),{code:'PERMISSION_DENIED'})
})
test('missing COUNTER price is explicit and non-counter rows do not contribute',()=>{
 const s=dailyBookingSummary([{programId:'a',programName:'Tour',adults:2,children:0,paymentTerms:'COUNTER',collectAmount:null},{programId:'a',programName:'Tour',adults:1,children:0,paymentTerms:'PAID',collectAmount:'999.00'}])
 assert.equal(s.unknownPrices,1);assert.equal(s.collectAmount,'0.00');assert.equal(s.guests,3)
})
test('database logo response preserves original bytes',async()=>{
 const bytes=Buffer.from('fixture')
 const b=await documentBrand({documentAsset:{findUnique:async()=>({content:bytes,mimeType:'image/png',sha256:'hash'})}})
 assert.deepEqual(Buffer.from(b.logo.split(',')[1],'base64'),bytes)
})
