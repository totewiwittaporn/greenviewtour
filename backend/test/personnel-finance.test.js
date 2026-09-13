import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { cents,payrollTotal,recordActions } from '../../packages/contracts/personnel-finance.js'
import { validatePayload,savePersonnelFinance,commandPersonnelFinance,listPersonnelFinance } from '../src/modules/personnel-finance/service.js'
const actor=randomUUID(),reviewer=randomUUID(),employeeId=randomUUID()
function fixture(kind='REIMBURSEMENT',payload={date:'2026-09-13',amount:'100.20',evidence:'Receipt 01',notes:'Fuel'}){
 const row={id:randomUUID(),kind,payload,employeeId,title:'Test',status:'DRAFT',version:1,createdBy:actor},commands=new Map(),events=[]
 const profiles={ [actor]:{id:actor,status:'ACTIVE',roles:[],permissionOverrides:['view','edit','pay'].map(action=>({permissionCode:`${kind==='PAYROLL'||kind==='SALARY_ADVANCE'?'payroll':'expenses'}.${action}`,effect:'ALLOW'}))},[reviewer]:{id:reviewer,status:'ACTIVE',roles:[],permissionOverrides:['view','approve','pay'].map(action=>({permissionCode:`${kind==='PAYROLL'||kind==='SALARY_ADVANCE'?'payroll':'expenses'}.${action}`,effect:'ALLOW'}))}}
 const tx={ $executeRaw:async()=>0,userProfile:{findUnique:async({where})=>profiles[where.id]||{id:employeeId,status:'ACTIVE'},findMany:async()=>[]},financePersonnelRecord:{findUnique:async()=>row,update:async({data})=>{Object.assign(row,{...data,version:row.version+1});return row},findMany:async()=>[],count:async()=>0},financePersonnelCommand:{findUnique:async({where})=>commands.get(where.id),create:async({data})=>commands.set(data.id,data)},auditEvent:{create:async({data})=>events.push(data)}}
 return {prisma:{$transaction:fn=>fn(tx),...tx},row,events,profiles}
}
const command=(row,action,extra={})=>({id:randomUUID(),recordId:row.id,version:row.version,action,...extra})
test('payroll computes integer cents and never applies an attendance deduction formula',()=>{
 assert.equal(cents('0.10')+cents('0.20'),30)
 assert.equal(payrollTotal([{label:'Agreed wage',reason:'Agreed test basis',type:'EARNING',amount:'10000'},{label:'Agreed adjustment',reason:'Agreed test basis',type:'DEDUCTION',amount:'100.25'}]),989975)
 assert.throws(()=>payrollTotal([{label:'Invalid',reason:'Agreed test basis',type:'EARNING',amount:'1e3'}]))
 assert.throws(()=>payrollTotal([{label:'Deduction',reason:'Agreed test basis',type:'DEDUCTION',amount:'100'}]))
})
test('seasonal and attendance records reject hidden compensation fields and invalid date ranges',()=>{
 assert.throws(()=>validatePayload('EMPLOYMENT',{position:'Captain',startsOn:'2026-10-01',endsOn:'2026-09-01',notes:'Season'}))
 assert.throws(()=>validatePayload('EMPLOYMENT',{position:'Captain',startsOn:'2026-09-01',endsOn:'2027-03-01',notes:'Season',salary:'10000'}))
 assert.equal(validatePayload('ATTENDANCE',{date:'2026-09-13',type:'AVAILABLE_NO_JOB',substituteId:null,notes:'No assignment; available'}).type,'AVAILABLE_NO_JOB')
 assert.throws(()=>validatePayload('ATTENDANCE',{date:'2026-02-30',type:'REST',notes:'Roster'}))
})
test('payment requires submitted then independent approval; duplicate command returns same revision',async()=>{
 const {prisma,row}=fixture()
 await assert.rejects(commandPersonnelFinance(prisma,actor,command(row,'PAY',{paidOn:'2026-09-01',reference:'Bank-1'})),{code:'TRANSITION_NOT_ALLOWED'})
 await commandPersonnelFinance(prisma,actor,command(row,'SUBMIT'))
 await assert.rejects(commandPersonnelFinance(prisma,actor,command(row,'APPROVE')),{code:'TRANSITION_NOT_ALLOWED'})
 await commandPersonnelFinance(prisma,reviewer,command(row,'APPROVE'))
 const input=command(row,'PAY',{paidOn:'2026-09-01',reference:'Bank-1'})
 const paid=await commandPersonnelFinance(prisma,actor,input),replayed=await commandPersonnelFinance(prisma,actor,input)
 assert.equal(paid.row.status,'PAID');assert.equal(paid.row.payment.amountCents,10020);assert.deepEqual(replayed,paid)
 await assert.rejects(commandPersonnelFinance(prisma,actor,{...input,reference:'changed'}),{code:'COMMAND_CONFLICT'})
})
test('stale revision and editing another author draft are rejected',async()=>{
 const {prisma,row,profiles}=fixture();profiles[reviewer].permissionOverrides.push({permissionCode:'expenses.edit',effect:'ALLOW'})
 await assert.rejects(commandPersonnelFinance(prisma,actor,{...command(row,'SUBMIT'),version:999}),{code:'RECORD_CONFLICT'})
 await assert.rejects(savePersonnelFinance(prisma,reviewer,{id:row.id,version:1,kind:row.kind,title:row.title,employeeId,payload:row.payload}),{code:'ONLY_AUTHOR_CAN_EDIT'})
})
test('advance clearance must balance and be accepted by a different reviewer',async()=>{
 const {prisma,row}=fixture('WORK_ADVANCE',{date:'2026-09-13',dueOn:'2026-09-20',amount:'100',notes:'Supplies'})
 row.status='PAID'
 await assert.rejects(commandPersonnelFinance(prisma,actor,command(row,'CLEAR',{clearanceItems:[],returnedAmount:'99'})),{code:'CLEARANCE_MUST_BALANCE'})
 await commandPersonnelFinance(prisma,actor,command(row,'CLEAR',{clearanceItems:[{description:'Supplies',amount:'60',evidence:'Receipt-2'}],returnedAmount:'40'}))
 assert.equal(recordActions(row,{approve:true},actor).includes('APPROVE_CLEARANCE'),false)
 await commandPersonnelFinance(prisma,reviewer,command(row,'APPROVE_CLEARANCE'));assert.equal(row.status,'CLEARED')
})
test('personnel access alone cannot expose payroll through list API',async()=>{
 const {prisma,profiles}=fixture('PAYROLL',{startsOn:'2026-09-01',endsOn:'2026-09-30',basis:'Manual agreed',baseAmount:'10000',items:[{label:'Wage',reason:'Agreed test basis',type:'EARNING',amount:'10000'}]})
 profiles[actor].permissionOverrides=[{permissionCode:'personnel.view',effect:'ALLOW'}]
 await assert.rejects(listPersonnelFinance(prisma,actor,new URLSearchParams({kind:'PAYROLL'})),{code:'PERMISSION_DENIED'})
})
test('Manager appointment authority cannot read payroll and an explicit active DENY overrides Admin',async()=>{
 const {prisma,profiles}=fixture('PAYROLL')
 profiles[actor]={id:actor,status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY'}],permissionOverrides:[]}
 await assert.rejects(listPersonnelFinance(prisma,actor,new URLSearchParams({kind:'PAYROLL'})),{code:'PERMISSION_DENIED'})
 profiles[actor].roles=[{roleCode:'ADMIN_MANAGER',scope:'COMPANY'}];profiles[actor].permissionOverrides=[{permissionCode:'payroll.view',effect:'DENY'}]
 await assert.rejects(listPersonnelFinance(prisma,actor,new URLSearchParams({kind:'PAYROLL'})),{code:'PERMISSION_DENIED'})
})
test('rejected drafts can be revised by their author with prior approval cleared',async()=>{
 const {prisma,row}=fixture();row.status='REJECTED';row.approvedBy=reviewer
 await commandPersonnelFinance(prisma,actor,command(row,'REVISE'));assert.equal(row.status,'DRAFT');assert.equal(row.approvedBy,null)
})
test('supplier approval cannot exceed received value already reserved by other approvals',async()=>{
 const orderId=randomUUID(),{prisma,row}=fixture('SUPPLIER_PAYMENT',{sourcePurchaseId:orderId,date:'2026-09-13',amount:'60',evidence:'Invoice',notes:'Partial'})
 row.status='SUBMITTED';prisma.purchaseOrder={findUnique:async()=>({id:orderId,status:'PART_RECEIVED',receivedTotal:'100'})}
 // The transaction wrapper deliberately points to the same mock object for this purchase integration.
 prisma.$transaction=fn=>fn(prisma);prisma.financePersonnelRecord.findMany=async()=>[{payload:{amount:'50'}}]
 await assert.rejects(commandPersonnelFinance(prisma,reviewer,command(row,'APPROVE')),{code:'SUPPLIER_BALANCE_EXCEEDED'})
 assert.equal(row.status,'SUBMITTED')
 row.payload.amount='50';await commandPersonnelFinance(prisma,reviewer,command(row,'APPROVE'));assert.equal(row.status,'APPROVED')
})
test('payroll requires explicit base wage and reasons for every addition or deduction',()=>{
 const payload={startsOn:'2026-09-01',endsOn:'2026-09-30',baseAmount:'10000',basis:'Approved monthly amount',items:[{label:'Trip allowance',reason:'Agreed for completed jobs',type:'EARNING',amount:'500'}]}
 assert.equal(validatePayload('PAYROLL',payload).baseAmount,'10000')
 assert.equal(payrollTotal(payload.items,payload.baseAmount),1050000)
 assert.throws(()=>validatePayload('PAYROLL',{...payload,items:[{label:'Deduction',type:'DEDUCTION',amount:'100'}]}))
})
test('salary advance clearance cannot be accepted by its submitting payroll administrator',async()=>{
 const {prisma,row,profiles}=fixture('SALARY_ADVANCE',{date:'2026-09-13',dueOn:'2026-09-30',amount:'1000',notes:'Manual repayment'})
 profiles[actor].permissionOverrides.push({permissionCode:'payroll.approve',effect:'ALLOW'});row.status='PAID'
 await commandPersonnelFinance(prisma,actor,command(row,'CLEAR',{clearanceItems:[],returnedAmount:'1000'}))
 await assert.rejects(commandPersonnelFinance(prisma,actor,command(row,'APPROVE_CLEARANCE')),{code:'TRANSITION_NOT_ALLOWED'})
 await commandPersonnelFinance(prisma,reviewer,command(row,'APPROVE_CLEARANCE'));assert.equal(row.status,'CLEARED')
})
test('only the draft author can submit or cancel even when another employee has edit permission',async()=>{
 const {prisma,row,profiles}=fixture();profiles[reviewer].permissionOverrides.push({permissionCode:'expenses.edit',effect:'ALLOW'})
 for(const action of ['SUBMIT','CANCEL'])await assert.rejects(commandPersonnelFinance(prisma,reviewer,command(row,action)),{code:'TRANSITION_NOT_ALLOWED'})
 assert.equal(row.status,'DRAFT')
})
test('a payroll beneficiary cannot approve or record their own payment prepared by another author',async()=>{
 const {prisma,row}=fixture('PAYROLL');row.employeeId=reviewer;row.status='SUBMITTED'
 await assert.rejects(commandPersonnelFinance(prisma,reviewer,command(row,'APPROVE')),{code:'TRANSITION_NOT_ALLOWED'})
 row.status='APPROVED'
 await assert.rejects(commandPersonnelFinance(prisma,reviewer,command(row,'PAY',{paidOn:'2026-09-01',reference:'Self'})),{code:'TRANSITION_NOT_ALLOWED'})
 const supplier={...row,kind:'SUPPLIER_PAYMENT',status:'SUBMITTED'}
 assert.equal(recordActions(supplier,{approve:true},reviewer).includes('APPROVE'),true)
})
test('uncertain create retry replays one save and a changed body at that revision conflicts',async()=>{
 const {prisma,row,events}=fixture();let created=false,creates=0
 prisma.financePersonnelRecord.findUnique=async()=>created?row:null
 prisma.financePersonnelRecord.create=async({data})=>{creates++;created=true;Object.assign(row,data);return row}
 const input={id:row.id,version:0,kind:row.kind,title:row.title,employeeId,payload:row.payload}
 const first=await savePersonnelFinance(prisma,actor,input),again=await savePersonnelFinance(prisma,actor,input)
 assert.deepEqual(first,again);assert.equal(creates,1);assert.equal(events.length,1)
 await assert.rejects(savePersonnelFinance(prisma,actor,{...input,title:'Changed after uncertain save'}),{code:'COMMAND_CONFLICT'})
})
test('replay still requires the current action permission',async()=>{
 const {prisma,row,profiles}=fixture(),input=command(row,'SUBMIT')
 await commandPersonnelFinance(prisma,actor,input)
 profiles[actor].permissionOverrides=profiles[actor].permissionOverrides.filter(g=>g.permissionCode!=='expenses.edit')
 await assert.rejects(commandPersonnelFinance(prisma,actor,input),{code:'TRANSITION_NOT_ALLOWED'})
})
