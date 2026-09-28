import {billDocument} from '../src/modules/receivables/signatures.js'
import {hash} from '../src/modules/operations/common.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {validateEvidence,saveEvidence,downloadEvidence} from '../src/modules/evidence/service.js'
import {commandReceivable} from '../src/modules/receivables/service.js'
import {csvDocument} from '../../packages/contracts/csv.js'
const id=n=>`b0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const file=()=>({id:id(1),targetKind:'AGENT_PAYMENT',targetId:id(5),filename:'receipt.pdf',mimeType:'application/pdf',base64:Buffer.from('%PDF-1.4\n%%EOF').toString('base64'),documentNumber:'R-123',category:'RECEIPT',note:'Company copy'})
test('documents reject mismatched, dangerous, empty and oversized files',()=>{
 assert.equal(validateEvidence(file()).documentNumber,'R-123')
 for(const patch of [{base64:''},{base64:'!!!!'},{filename:'../receipt.pdf'},{mimeType:'image/jpeg'},{filename:'receipt.html'},{category:'FAKE'},{base64:'A'.repeat(7100000)}])assert.throws(()=>validateEvidence({...file(),...patch}))
})
function fixture(){
 const bills=new Map(),payments=new Map(),commands=new Map(),attachments=new Map(),links=new Map(),events=[]
 let profile={id:id(9),status:'ACTIVE',roles:[{roleCode:'ACCOUNT',scope:'COMPANY'}]}
 const bookings=[{id:id(3),code:'DEMO-3',name:'Test',status:'COMPLETED',paymentTerms:'AGENT_CREDIT',agentId:id(4),agent:{name:'Test Agent'},adultPrice:'100.01',childPrice:'0',adults:1,children:0,lines:[],version:2}]
 const tx={serviceDayClose:{count:async()=>0},bookingAttendance:{findMany:async()=>[],findUnique:async()=>null,count:async()=>0},$executeRaw:async()=>{},userProfile:{findUnique:async()=>profile},tourBooking:{findMany:async()=>bookings},auditEvent:{create:async({data})=>events.push({...data,createdAt:new Date()}),findMany:async({where})=>events.filter(e=>e.targetId===where.targetId&&e.action===where.action)},financePersonnelCommand:{findUnique:async({where})=>commands.get(where.id),create:async({data})=>commands.set(data.id,data)},agentBillLine:{count:async()=>links.size,deleteMany:async()=>links.clear()},agentBill:{findUnique:async({where})=>bills.get(where.id),create:async({data})=>{const {lines,...rest}=data;for(const l of lines.create)links.set(l.bookingId,data.id);const row={...rest,paid:'0',status:'OPEN',version:1};bills.set(row.id,row);return row},update:async({where,data})=>{const row={...bills.get(where.id),...data,version:bills.get(where.id).version+1};bills.set(row.id,row);return row}},agentPayment:{findUnique:async({where})=>payments.get(where.id),create:async({data})=>payments.set(data.id,data)},evidenceAttachment:{findUnique:async({where})=>attachments.get(where.id),create:async({data})=>{attachments.set(data.id,data);return data}}}
 return {tx,prisma:{$transaction:fn=>fn(tx)},bills,payments,commands,events,bookings,attachments,revoke:()=>{profile={...profile,status:'INACTIVE'}}}
}
const create=()=>({id:id(10),action:'CREATE',bookingIds:[id(3)],title:'DEMO internal',dueOn:'2026-09-30'})
const pay=(n,version,amount)=>({id:id(n),action:'PAY',billId:id(10),version,amount,receivedOn:'2026-09-01',reference:`DEMO-${n}`})
test('one statement per completed credit booking; partial/full payments are exact and replay-safe',async()=>{
 const f=fixture(),c=create();await commandReceivable(f.prisma,id(9),c)
 assert.equal(f.bills.get(id(10)).total,'100.01')
 await commandReceivable(f.prisma,id(9),c);assert.equal(f.bills.size,1)
 await assert.rejects(commandReceivable(f.prisma,id(9),{...c,id:id(11)}),{code:'BOOKINGS_ALREADY_BILLED'})
 const p=pay(12,1,'30.01');await commandReceivable(f.prisma,id(9),p);await commandReceivable(f.prisma,id(9),p)
 assert.equal(f.payments.size,1);assert.equal(f.bills.get(id(10)).paid,'30.01')
 await assert.rejects(commandReceivable(f.prisma,id(9),pay(13,1,'70')),{code:'RECORD_CONFLICT'})
 await assert.rejects(commandReceivable(f.prisma,id(9),pay(13,2,'70.01')),{code:'PAYMENT_EXCEEDS_BALANCE'})
 await commandReceivable(f.prisma,id(9),pay(13,2,'70'))
 assert.equal(f.bills.get(id(10)).status,'PAID');assert.equal(f.bills.get(id(10)).paid,'100.01')
 f.revoke();await assert.rejects(commandReceivable(f.prisma,id(9),p),{code:'PERMISSION_DENIED'})
})
test('void releases unpaid bookings but retains original statement; cannot void after partial payment',async()=>{
 const f=fixture();await commandReceivable(f.prisma,id(9),create())
 await commandReceivable(f.prisma,id(9),{id:id(14),action:'VOID',billId:id(10),version:1,reason:'Wrong grouping'})
 assert.equal(f.bills.get(id(10)).status,'VOID')
 await commandReceivable(f.prisma,id(9),{...create(),id:id(15)})
 assert.equal(f.bills.size,2)
 const g=fixture();await commandReceivable(g.prisma,id(9),create());await commandReceivable(g.prisma,id(9),pay(12,1,'1'))
 await assert.rejects(commandReceivable(g.prisma,id(9),{id:id(14),action:'VOID',billId:id(10),version:2,reason:'Wrong grouping'}),{code:'PAID_BILL_CANNOT_VOID'})
})
test('billing rejects draft, non-credit and invalid amounts',async()=>{
 for(const patch of [{status:'DRAFT'},{paymentTerms:'PAID'},{agentId:null},{adultPrice:null}]){const f=fixture();Object.assign(f.bookings[0],patch);await assert.rejects(commandReceivable(f.prisma,id(9),create()));assert.equal(f.bills.size,0)}
 const f=fixture();await commandReceivable(f.prisma,id(9),create())
 for(const amount of ['-1','0','1e2','0.001'])await assert.rejects(commandReceivable(f.prisma,id(9),pay(12,1,amount)),{code:'INVALID_AMOUNT'})
 assert.equal(f.payments.size,0)
})
test('attachments check parent existence and fresh permission, and do not duplicate or overwrite',async()=>{
 const f=fixture(),input=file();f.payments.set(id(5),{id:id(5)})
 await saveEvidence(f.prisma,id(9),input);await saveEvidence(f.prisma,id(9),input)
 assert.equal(f.attachments.size,1);assert.equal(f.events.length,1)
 await assert.rejects(saveEvidence(f.prisma,id(9),{...input,note:'Changed'}),{code:'COMMAND_CONFLICT'})
 await assert.rejects(saveEvidence(f.prisma,id(9),{...input,id:id(2),targetId:id(6)}),{code:'NOT_FOUND'})
 await downloadEvidence(f.tx,id(9),input.id)
 f.revoke();await assert.rejects(downloadEvidence(f.tx,id(9),input.id),{code:'PERMISSION_DENIED'})
 await assert.rejects(saveEvidence(f.prisma,id(9),input),{code:'PERMISSION_DENIED'})
})
test('CSV preserves Thai and quoting while neutralizing spreadsheet formulas',()=>{
 const csv=csvDocument([['พนักงาน','name, "quoted"','=HYPERLINK("x")','  +SUM(1)','@test','100.01']])
 assert.ok(csv.startsWith('\uFEFF"พนักงาน"'));assert.ok(csv.includes('"name, ""quoted"""'));assert.ok(csv.includes('"\'=HYPERLINK'));assert.ok(csv.includes('"\'  +SUM'));assert.ok(csv.includes('"\'@test"'));assert.ok(csv.endsWith('"100.01"\r\n'))
})

const strokes=[[[50,80],[80,50],[100,90],[140,50],[170,90],[210,50],[240,90],[280,60]]]
const sign=(f,side,n,version)=>({id:id(n),action:'SIGN',billId:id(10),version,side,signerName:'DEMO ONLY '+side,strokes,documentHash:hash(billDocument(f.bills.get(id(10))))})
test('both signatures are immutable, sequenced, document-bound and do not change payment state',async()=>{
 const f=fixture();await commandReceivable(f.prisma,id(9),create())
 await assert.rejects(commandReceivable(f.prisma,id(9),sign(f,'AGENT',20,1)),{code:'COMPANY_SIGNATURE_REQUIRED'})
 await assert.rejects(commandReceivable(f.prisma,id(9),{...sign(f,'COMPANY',21,1),documentHash:'stale'}),{code:'RECORD_CONFLICT'})
 assert.equal(f.events.filter(e=>e.action==='receivable.SIGN').length,0)
 const first=sign(f,'COMPANY',22,1);await commandReceivable(f.prisma,id(9),first);await commandReceivable(f.prisma,id(9),first)
 assert.equal(f.events.filter(e=>e.action==='receivable.SIGN').length,1)
 await assert.rejects(commandReceivable(f.prisma,id(9),sign(f,'COMPANY',23,2)),{code:'ALREADY_SIGNED'})
 await commandReceivable(f.prisma,id(9),sign(f,'AGENT',24,2))
 assert.equal(f.events.filter(e=>e.action==='receivable.SIGN').length,2)
 assert.equal(f.bills.get(id(10)).paid,'0');assert.equal(f.bills.get(id(10)).status,'OPEN')
 const saved=f.events.find(e=>e.action==='receivable.SIGN').details.signature
 assert.equal(saved.document.total,'100.01');assert.equal(saved.documentHash,hash(saved.document))
 f.revoke();await assert.rejects(commandReceivable(f.prisma,id(9),first),{code:'PERMISSION_DENIED'})
})
test('signature validation rejects empty, oversized and out-of-range strokes and void bills',async()=>{
 const f=fixture();await commandReceivable(f.prisma,id(9),create())
 for(const bad of [[],[[[1,1]]],[[[1,1],[1001,2]]],Array(101).fill(strokes[0]),[Array(4001).fill([1,2])]])await assert.rejects(commandReceivable(f.prisma,id(9),{...sign(f,'COMPANY',25,1),strokes:bad}),{code:'INVALID_SIGNATURE'})
 await commandReceivable(f.prisma,id(9),{id:id(26),action:'VOID',billId:id(10),version:1,reason:'DEMO'})
 await assert.rejects(commandReceivable(f.prisma,id(9),sign(f,'COMPANY',27,2)),{code:'RECORD_CONFLICT'})
})
test('Agent ticket and booking document categories use the same private evidence validation',()=>{
 for(const category of ['AGENT_TICKET','AGENT_BOOKING'])assert.equal(validateEvidence({...file(),category,targetKind:'BOOKING'}).category,category)
})

test('no-show financial hold prevents new billing until review is resolved',async()=>{const f=fixture();f.tx.bookingAttendance.count=async()=>1;await assert.rejects(()=>commandReceivable(f.prisma,id(9),create()),{code:'NO_SHOW_FINANCE_REVIEW_REQUIRED'});assert.equal(f.bills.size,0)})
