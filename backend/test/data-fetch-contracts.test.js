import test from 'node:test'
import assert from 'node:assert/strict'
import {Prisma} from '@prisma/client'
import {catalog} from '../../packages/contracts/catalog.js'
import {catalogReadSelect,materialOptionSelect} from '../src/modules/service-catalog/read-models.js'
import {operationReadSelect,attachBookingListFlags} from '../src/modules/operations/list-read-models.js'
import {accessProfileSelect} from '../src/modules/identity-access/policy.js'
import {capacityDemandSelect,capacityDemandRows} from '../src/modules/operations/capacity-read.js'
import {runSelectorSelect} from '../src/modules/operations/dispatch-read.js'
import {readJsonFields} from '../src/platform/database/read-json.js'
import {financeListPayloads} from '../src/modules/personnel-finance/read-models.js'
import {memberRequestSnapshots,requestListDetails} from '../src/modules/commerce/read-models.js'
import {publicCatalog,customerDocument,customerDocuments} from '../src/modules/commerce/service.js'
import {dashboardOverview} from '../src/backoffice/dashboard/overview/service.js'
const id=n=>`51000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const models=new Map(Prisma.dmmf.datamodel.models.map(model=>[model.name.toLowerCase(),model]))
function validSelect(modelName,select){
 const model=models.get(modelName.toLowerCase());assert.ok(model,modelName)
 for(const [key,value]of Object.entries(select)){
  const field=model.fields.find(field=>field.name===key);assert.ok(field,`${modelName}.${key}`)
  if(value&&typeof value==='object'&&field.kind==='object')validSelect(field.type,value.select||value.include||{})
 }
}
const project=(row,select)=>Object.fromEntries(Object.entries(select).filter(([,v])=>v).map(([key,value])=>[key,value===true?row[key]:Array.isArray(row[key])?row[key].map(item=>project(item,value.select)):row[key]?project(row[key],value.select):null]))
for(const [entity,definition]of Object.entries(catalog))for(const view of ['list','options'])test(`${entity} ${view} selects only existing schema fields`,()=>{const select=catalogReadSelect(entity,view);if(select)validSelect(definition.model,select)})
for(const [entity,model]of Object.entries({bookings:'TourBooking',resources:'OperationResource',stock:'StockBalance',issues:'StockIssue',movements:'StockMovement'}))for(const view of ['list','options'])test(`${entity} ${view} relation contract matches Prisma`,()=>validSelect(model,operationReadSelect(entity,view)))
test('authorization, capacity and run selectors match the generated schema',()=>{validSelect('UserProfile',accessProfileSelect);validSelect('TourBooking',capacityDemandSelect);validSelect('DispatchRun',runSelectorSelect)})
test('list contracts exclude expensive graphs but keep action and conversion dependencies',()=>{const booking=operationReadSelect('bookings','list');assert.equal(booking.lines,undefined);assert.equal(booking.programSnapshot,undefined);assert.equal(booking.assigneeId,true);assert.equal(booking.createdById,true);for(const key of ['id','kind','baseUnit','packSize','caseSize'])assert.equal(materialOptionSelect[key],true);assert.equal(catalogReadSelect('tours','list').supplierAdultNet,undefined);assert.equal(catalogReadSelect('partners','list').allowedPaymentTerms,undefined)})
test('JSON projections skip empty sets and reject untrusted identifiers',async()=>{
 let calls=0;const tx={tourBooking:{findMany:async()=>{calls++;return []}}}
 assert.equal((await readJsonFields(tx,'TourBooking','programSnapshot',[],['name'])).size,0)
 for(const [table,column,paths]of [['TourBooking; DROP TABLE x','programSnapshot',['name']],['TourBooking','password',['name']],['TourBooking','programSnapshot',["name'); SELECT 1--"]]])await assert.rejects(()=>readJsonFields(tx,table,column,[id(1)],paths),/INVALID_READ_PROJECTION/)
 assert.equal(calls,0)
})
test('JSON projection uses bounded Prisma reads and portable nested paths',async()=>{
 let query;const rows=await readJsonFields({tourBooking:{findMany:async value=>{query=value;return [{id:id(1),programSnapshot:{name:'A',nested:{value:7}}}]}}},'TourBooking','programSnapshot',[id(1),id(1)],['name','nested.value','missing'])
 assert.equal(rows.get(id(1)).name,'A');assert.equal(rows.get(id(1))['nested.value'],7);assert.equal(rows.get(id(1)).missing,null)
 assert.deepEqual(query.where,{id:{in:[id(1)]}});assert.deepEqual(query.select,{id:true,programSnapshot:true})
})
test('booking list preserves price-review, journey and capacity flags without the full snapshot',async()=>{
 const snapshot={journeyMode:'OPEN_RETURN',capacityReview:{status:'WAITING_TEAM'},priceException:{status:'PENDING',requestedById:id(2)}}
 const rows=await attachBookingListFlags({tourBooking:{findMany:async()=>[{id:id(1),programSnapshot:snapshot}]}},[{id:id(1),status:'DRAFT'}])
 assert.deepEqual(rows[0].programSnapshot,{name:null,tourId:null,dateStatus:null,journeyMode:'OPEN_RETURN',capacityReview:{status:'WAITING_TEAM'},priceException:{status:'PENDING',requestedById:id(2)}})
})
test('capacity projection reads every obligation, not the first page or arbitrary cap',async()=>{
 let args;const obligations=Array.from({length:70},(_,n)=>({id:id(n),lines:[],adults:1,children:0})),where={status:{in:['CONFIRMED','COMPLETED']}}
 const tx={tourBooking:{findMany:async value=>{if(value.select?.programSnapshot)return obligations.map(row=>({id:row.id,programSnapshot:{durationDays:2,capacitySelections:[],customerRequestId:null}}));args=value;return obligations}}}
 const rows=await capacityDemandRows(tx,where);assert.equal(rows.length,70);assert.deepEqual(args.where,where);assert.equal(args.take,undefined);assert.equal(args.skip,undefined);assert.equal(args.select.programSnapshot,undefined);assert.equal(rows.at(-1).programSnapshot.durationDays,2)
})
test('finance table retains the exact fixed-decimal total while omitting evidence and notes',async()=>{
 const row={id:id(1),kind:'REIMBURSEMENT',status:'DRAFT'},tx={financePersonnelRecord:{findMany:async()=>[{id:row.id,payload:{amount:'100.25'}}]}}
 const [result]=await financeListPayloads(tx,[row],row.kind);assert.equal(result.amountCents,10025);assert.deepEqual(result.payload,{})
})
test('payroll list calculation retains manual additions/deductions and positive-total validation',async()=>{
 const row={id:id(1),kind:'PAYROLL',status:'DRAFT'},payload={baseAmount:'1000.00',items:[{type:'EARNING',label:'Extra',reason:'Approved basis',amount:'20.05'},{type:'DEDUCTION',label:'Agreed item',reason:'Recorded basis',amount:'10.01'}]}
 const tx={financePersonnelRecord:{findMany:async()=>[{id:row.id,payload}]}}
 const [result]=await financeListPayloads(tx,[row],row.kind);assert.equal(result.amountCents,101004);assert.deepEqual(result.payload,{})
})
test('advance list keeps clearance submitter for independent-review decisions',async()=>{
 const row={id:id(1),kind:'WORK_ADVANCE',status:'CLEARANCE_SUBMITTED'},tx={financePersonnelRecord:{findMany:async query=>[{id:row.id,...(query.select.clearance?{clearance:{submittedBy:id(2)}}:{payload:{amount:'1200.50'}})}]}}
 const [result]=await financeListPayloads(tx,[row],row.kind);assert.equal(result.amountCents,120050);assert.equal(result.clearance.submittedBy,id(2))
})
test('Member date proposal retains acceptance hash, date, price, terms and seat choices',async()=>{
 const row={id:id(1),status:'DATE_PROPOSED'},snapshot={tourName:'Tour',packageTotal:'2500.00',dateProposal:{serviceDate:'2026-11-03',quoteKey:'quote-hash',capacitySelections:[{poolId:id(2)}],quote:{packageTotal:'2600.00',terms:{cancellationTerms:'Exact agreed terms'}},availability:{canConfirm:false},note:'Customer must decide'}}
 const tx={customerRequest:{findMany:async()=>[{id:row.id,snapshot}]}}
 const [result]=await memberRequestSnapshots(tx,[row]);const proposal=result.snapshot.dateProposal
 assert.equal(proposal.quoteKey,'quote-hash');assert.equal(proposal.quote.packageTotal,'2600.00');assert.equal(proposal.quote.terms.cancellationTerms,'Exact agreed terms');assert.deepEqual(proposal.capacitySelections,[{poolId:id(2)}]);assert.equal(result.snapshot.components,undefined)
})
function publicFixture(){
 const calls=[];const tours=Array.from({length:30},(_,n)=>({id:id(n),name:'Tour '+n,slug:'tour-'+n,description:'Description',imageUrls:'image.jpg',durationDays:1,ownership:'GREENVIEW',adultPrice:'0',childPrice:null,components:[],supplierAdultNet:'PRIVATE'}))
 const tx={tourProgram:{count:async()=>30,findMany:async args=>{calls.push(args);return tours.slice(args.skip,args.skip+args.take).map(row=>project(row,args.select))}},tourSeason:{findMany:async()=>{calls.push('seasons');return []}},tourPromotion:{findMany:async()=>{calls.push('promotions');return []}}}
 return {tx,calls}
}
test('home highlights retrieve two rows and no seasons, components or promotion quotas',async()=>{
 const {tx,calls}=publicFixture(),result=await publicCatalog(tx,new URLSearchParams('view=highlights&pageSize=2'))
 assert.equal(result.rows.length,2);assert.equal(result.total,30);assert.equal(result.pageSize,2);assert.equal(calls.length,1);assert.equal(result.rows[0].supplierAdultNet,undefined);assert.equal(result.rows[0].components,undefined)
})
test('tour cards retain zero price versus unset price and full pagination without detail joins',async()=>{
 const {tx,calls}=publicFixture(),result=await publicCatalog(tx,new URLSearchParams('view=cards&page=99'))
 assert.equal(result.page,3);assert.equal(result.rows.length,6);assert.equal(result.total,30);assert.equal(result.rows[0].adultPrice,'0');assert.equal(result.rows[0].childPrice,null);assert.equal(calls.length,1)
})
test('tour detail keeps selectable components and sale windows',async()=>{const {tx,calls}=publicFixture();await publicCatalog(tx,new URLSearchParams('slug=tour-1&view=cards'));assert.ok(calls[0].select.components);assert.ok(calls.includes('seasons'));assert.ok(calls.includes('promotions'))})
test('Programmer page does not fetch customer, finance or operational datasets',async()=>{
 const actor={id:id(1),status:'ACTIVE',roles:[{roleCode:'ADMIN_MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}],permissionOverrides:[]};let reads=0
 const tx={userProfile:{findUnique:async()=>{reads++;return actor}}};tx.$transaction=fn=>fn(tx)
 const result=await dashboardOverview(tx,actor.id,new Date('2026-10-20T03:00:00Z'),{surface:'page'});assert.equal(reads,1);assert.deepEqual(result.widgets,[]);assert.equal(result.managementOverview,null)
})
test('Member ownership is checked before retrieving evidence content bytes',async()=>{
 let contentReads=0;const user={id:id(1),email_confirmed_at:'2026-10-01'},db={customerProfile:{findUnique:async()=>({id:id(2),status:'ACTIVE'})},customerRequest:{findUnique:async()=>({customerId:id(99)})},evidenceAttachment:{findUnique:async args=>{if(args.select?.content)contentReads++;return {id:id(3),targetKind:'CUSTOMER_REQUEST',targetId:id(4)}}}}
 await assert.rejects(()=>customerDocument(db,user,id(3)),error=>error.status===404);assert.equal(contentReads,0)
})
test('Member document pagination never silently hides attachments after the former first-50 limit',async()=>{
 const user={id:id(1),email_confirmed_at:'2026-10-01'};let query
 const db={customerProfile:{findUnique:async()=>({id:id(2),status:'ACTIVE'})},customerRequest:{findUnique:async()=>({customerId:id(2)})},evidenceAttachment:{count:async()=>61,findMany:async args=>{query=args;return Array.from({length:11},(_,n)=>({id:id(50+n),filename:'file.pdf',size:100,mimeType:'application/pdf'}))}}}
 const result=await customerDocuments(db,user,id(3),999);assert.equal(result.page,3);assert.equal(result.total,61);assert.equal(result.rows.length,11);assert.equal(query.skip,50);assert.equal(query.take,25);assert.equal(query.select.content,undefined)
})

test('request list reads booking status in one portable metadata query',async()=>{
 let query,calls=0;const tx={customerRequest:{findMany:async value=>{calls++;query=value;return [{id:id(1),details:{name:'Customer',private:'omit'},snapshot:{tourName:'Tour',packageTotal:'100.00',components:['omit']},booking:{status:'CANCELLED'}}]}}}
 const result=await requestListDetails(tx,[{id:id(1),status:'PAID'}])
 assert.equal(calls,1);assert.deepEqual(query.select,{id:true,details:true,snapshot:true,booking:{select:{status:true}}});assert.equal(result[0].booking.status,'CANCELLED');assert.equal(result[0].details.name,'Customer');assert.equal(result[0].details.private,undefined);assert.equal(result[0].snapshot.packageTotal,'100.00');assert.equal(result[0].snapshot.components,undefined)
})
