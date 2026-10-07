import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createD1Prisma} from '../../platform/database/d1-client.ts'
import {saveCompanyWork,commandCompanyWork,listCompanyWork} from '../../modules/company-work/service.js'
import {savePersonnelFinance,commandPersonnelFinance,listPersonnelFinance,exportPayroll} from '../../modules/personnel-finance/service.js'
import {commandReceivable} from '../../modules/receivables/service.js'
import {recordBookingCollection,reconcileAgentMargin} from '../../modules/receivables/collections.js'
import {financialTotal} from '../../../../packages/contracts/personnel-finance.js'
export async function financeCompany(env){
 const db=createD1Prisma(env.DB,{files:env.FILES}),checks=[]
 const id=randomUUID,code='QAFIN-'+id().slice(0,8),today='2026-09-15'
 let stage='actors'
 const makeActor=async name=>(await db.userProfile.create({data:{id:id(),displayName:code+name,status:'ACTIVE',roles:{create:{roleCode:'ADMIN_MANAGER',scope:'COMPANY'}}}})).id
 try{
  const maker=await makeActor('maker'),reviewer=await makeActor('reviewer'),employee=await makeActor('employee')
  const supplier=await db.businessPartner.create({data:{id:id(),code:code+'-SUP',name:code,status:'ACTIVE',roles:['SUPPLIER']}})
  const store=await db.stockLocation.create({data:{id:id(),code:code+'-STORE',name:code,kind:'WAREHOUSE',status:'ACTIVE'}})
  const dest=await db.stockLocation.create({data:{id:id(),code:code+'-DEST',name:code,kind:'BOAT',status:'ACTIVE'}})
  const resource=await db.operationResource.create({data:{id:id(),code:code+'-ITEM',name:code,kind:'CONSUMABLE',category:'WATER',baseUnit:'BOTTLE',status:'ACTIVE',salePrice:'1.00'}})
  const act=async(actor,row,action,data={})=>commandCompanyWork(db,actor,{id:id(),recordId:row.id,kind:row.kind||'PURCHASE',version:row.version,action,data})
  stage='purchase'
  let order=(await saveCompanyWork(db,maker,{id:id(),kind:'PURCHASE',version:0,name:code,payload:{supplierId:supplier.id,storeId:store.id,reason:'Atomic test',lines:[{resourceId:resource.id,quantity:3,unitCost:'100.10'}]}})).row
  assert.equal(order.total.toFixed(2),'300.30')
  order=(await act(maker,order,'SUBMIT')).row
  await assert.rejects(()=>act(maker,order,'APPROVE',{reason:'must be independent'}),{code:'INDEPENDENT_APPROVER_REQUIRED'})
  order=(await act(reviewer,order,'APPROVE',{reason:'reviewed'})).row
  const receive={id:id(),recordId:order.id,kind:'PURCHASE',version:order.version,action:'RECEIVE',data:{lineId:order.lines[0].id,quantity:1,receivedOn:today,lotLabel:code,note:'receive one'}}
  const received=await commandCompanyWork(db,reviewer,receive)
  assert.equal(received.row.status,'PART_RECEIVED');assert.equal(String(received.row.receivedTotal),'100.1')
  assert.deepEqual(JSON.parse(JSON.stringify(await commandCompanyWork(db,reviewer,receive))),JSON.parse(JSON.stringify(received)))
  assert.equal(await db.stockLot.count({where:{resourceId:resource.id}}),1)
  order=received.row
  await assert.rejects(()=>act(reviewer,order,'RECEIVE',{...receive.data,quantity:3}),{code:'RECEIPT_EXCEEDS_ORDER'})
  assert.equal(await db.stockLot.count({where:{resourceId:resource.id}}),1)
  checks.push('purchase approval, partial receipt, exact cost and replay cannot create stock twice')
  stage='stock-request'
  const balance=await db.stockBalance.findFirst({where:{lot:{resourceId:resource.id},locationId:store.id}})
  let request=(await saveCompanyWork(db,maker,{id:id(),kind:'STOCK_REQUEST',version:0,name:code,payload:{storeId:store.id,destinationId:dest.id,resourceId:resource.id,quantity:1,dueOn:today,reason:'stock request'}})).row
  request=(await act(maker,request,'SUBMIT')).row;request=(await act(reviewer,request,'APPROVE',{reason:'approved'})).row
  request=(await act(reviewer,request,'ISSUE',{balanceId:balance.id,quantity:1})).row
  assert.equal(request.status,'ISSUED');assert.equal((await db.stockBalance.findUnique({where:{id:balance.id}})).quantity,0)
  request=(await act(reviewer,request,'SETTLE',{issueId:request.payload.issues[0].id,quantity:1,disposition:'RETURN_READY',locationId:store.id,note:'returned'})).row
  assert.equal(request.status,'CLOSED');assert.equal((await db.stockBalance.findUnique({where:{id:balance.id}})).quantity,1)
  stage='count'
  let count=(await saveCompanyWork(db,maker,{id:id(),kind:'COUNT',version:0,name:code,payload:{balanceId:balance.id,countedQuantity:2,reason:'verified physical count'}})).row
  count=(await act(maker,count,'SUBMIT')).row
  await assert.rejects(()=>act(maker,count,'APPROVE',{reason:'self approval'}),{code:'INDEPENDENT_APPROVER_REQUIRED'})
  count=(await act(reviewer,count,'APPROVE',{reason:'checked independently'})).row
  assert.equal(count.status,'CLOSED');assert.equal((await db.stockBalance.findUnique({where:{id:balance.id}})).quantity,2)
  checks.push('nested stock issue/return/count command shares the company transaction and audit')
  stage='housekeeping'
  const zone=(await saveCompanyWork(db,maker,{id:id(),kind:'ZONE',version:0,name:code,payload:{description:'fixture zone',checklist:['Check floor']}})).row
  const schedule=(await saveCompanyWork(db,maker,{id:id(),kind:'SCHEDULE',version:0,name:code,payload:{jobKind:'CLEANING',zoneId:zone.id,assigneeId:employee,frequency:'CUSTOM',startsOn:today,endsOn:'2026-09-16',customDates:[today,'2026-09-16'],checklist:['Check floor']}})).row
  const generated=await act(maker,schedule,'GENERATE');assert.equal(generated.generated,2)
  assert.equal((await act(maker,schedule,'GENERATE')).generated,0)
  let job=await db.companyWorkRecord.findFirst({where:{parentId:schedule.id}})
  await assert.rejects(()=>act(employee,job,'COMPLETE',{checked:[],note:'incomplete'}),{code:'CHECKLIST_INCOMPLETE'})
  job=(await act(employee,job,'COMPLETE',{checked:['Check floor'],note:'completed'})).row
  await assert.rejects(()=>act(employee,job,'ACCEPT',{reason:'self review'}),{code:'INDEPENDENT_APPROVER_REQUIRED'})
  job=(await act(reviewer,job,'ACCEPT',{reason:'reviewed'})).row;assert.equal(job.status,'ACCEPTED')
  let maintenance=(await saveCompanyWork(db,maker,{id:id(),kind:'MAINTENANCE',version:0,name:code,payload:{resourceId:resource.id,assigneeId:employee,dueOn:today,reason:'inspection'}})).row
  maintenance=(await act(maker,maintenance,'SUBMIT')).row;maintenance=(await act(reviewer,maintenance,'APPROVE',{reason:'approved'})).row
  maintenance=(await act(employee,maintenance,'COMPLETE',{checked:[],note:'inspected'})).row
  maintenance=(await act(reviewer,maintenance,'ACCEPT',{reason:'accepted'})).row;assert.equal(maintenance.status,'ACCEPTED')
  const duty=await saveCompanyWork(db,maker,{id:id(),kind:'RESPONSIBILITY',version:0,name:code,payload:{storeId:store.id,primaryUserId:maker,deputyUserId:reviewer,reason:'assigned'}})
  assert.deepEqual(duty.row.deputyUserIds,[reviewer])
  for(const kind of ['ZONE','SCHEDULE','JOB','STOCK_REQUEST','COUNT','MAINTENANCE','PURCHASE','RESPONSIBILITY'])await listCompanyWork(db,maker,new URLSearchParams({kind,view:'list'}))
  checks.push('scheduled jobs, maintenance, custodians and independent approval execute end to end')
  const finance=async(kind,payload,{doClear=false}={})=>{
   stage='finance-'+kind
   const input={id:id(),version:0,kind,title:code+' '+kind,employeeId:employee,payload}
   let row=(await savePersonnelFinance(db,maker,input)).row
   assert.equal((await savePersonnelFinance(db,maker,input)).row.id,row.id)
   const command=async(actor,action,extra={})=>commandPersonnelFinance(db,actor,{id:id(),recordId:row.id,version:row.version,action,...extra})
   row=(await command(maker,'SUBMIT')).row
   await assert.rejects(()=>command(maker,'APPROVE'),{code:'TRANSITION_NOT_ALLOWED'})
   row=(await command(reviewer,'APPROVE')).row
   if(!['EMPLOYMENT','ATTENDANCE'].includes(kind)){
    const pay={id:id(),recordId:row.id,version:row.version,action:'PAY',paidOn:today,reference:code}
    const [a,b]=await Promise.all([commandPersonnelFinance(db,reviewer,pay),commandPersonnelFinance(db,reviewer,pay)])
    assert.deepEqual(a,b);row=a.row
    assert.equal(row.status,'PAID');assert.equal(row.payment.amountCents,financialTotal(kind,payload))
    if(doClear){
     await assert.rejects(()=>command(maker,'CLEAR',{clearanceItems:[{description:'spent',amount:'1.00',evidence:'fixture'}],returnedAmount:'0'}),{code:'CLEARANCE_MUST_BALANCE'})
     row=(await command(maker,'CLEAR',{clearanceItems:[{description:'spent',amount:'100.20',evidence:'fixture'}],returnedAmount:'0.10'})).row
     row=(await command(reviewer,'APPROVE_CLEARANCE')).row;assert.equal(row.status,'CLEARED')
    }
   }
   await listPersonnelFinance(db,maker,new URLSearchParams({kind,view:'list'}))
   return row
  }
  await finance('EMPLOYMENT',{position:'Fixture',startsOn:today,endsOn:'2027-05-15',notes:'local'})
  await finance('ATTENDANCE',{date:today,type:'PRESENT',notes:'local'})
  await assert.rejects(()=>savePersonnelFinance(db,maker,{id:id(),version:0,kind:'ATTENDANCE',title:code,employeeId:employee,payload:{date:today,type:'PRESENT',notes:'duplicate'}}),{code:'ATTENDANCE_ALREADY_RECORDED'})
  await finance('PAYROLL',{startsOn:today,endsOn:'2026-09-30',baseAmount:'100.10',basis:'fixture',items:[{type:'EARNING',label:'addition',reason:'fixture',amount:'0.20'},{type:'DEDUCTION',label:'deduction',reason:'fixture',amount:'0.10'}]})
  await finance('REIMBURSEMENT',{date:today,amount:'100.30',evidence:'fixture',notes:'local'})
  for(const kind of ['WORK_ADVANCE','SALARY_ADVANCE'])await finance(kind,{date:today,dueOn:'2026-10-01',amount:'100.30',notes:'local'},{doClear:true})
  await finance('SUPPLIER_PAYMENT',{sourcePurchaseId:order.id,date:today,amount:'100.10',evidence:'fixture',notes:'local'})
  await assert.rejects(()=>savePersonnelFinance(db,maker,{id:id(),version:0,kind:'SUPPLIER_PAYMENT',title:code,employeeId:employee,payload:{sourcePurchaseId:order.id,date:today,amount:'0.01',evidence:'fixture',notes:'exceeds balance'}}),{code:'SUPPLIER_BALANCE_EXCEEDED'})
  const hiddenPayroll=await exportPayroll(db,maker,new URLSearchParams({q:code}))
  assert.equal(hiddenPayroll.count,0,'another owner payroll must not be exported')
  const ownPayroll=await exportPayroll(db,employee,new URLSearchParams({q:code}))
  assert.equal(ownPayroll.count,1,'owner must retain access to their own payroll')
  assert.match(ownPayroll.csv,/100\.20/,'payroll export preserves the exact net amount')
  checks.push('seven personnel/finance kinds, payment replay, exact payroll, clearance and supplier balance limits')
  // Remaining receipt/refund/commission checks continue below.
  stage='receivables'
  const agent=await db.businessPartner.create({data:{id:id(),code:code+'-AGENT',name:code+' Agent',status:'ACTIVE',roles:['SALES_AGENT']}})
  const trip=await db.operationTrip.create({data:{id:id(),code:code+'-TRIP',name:code,status:'OPEN',startsAt:new Date(today+'T01:00:00Z'),endsAt:new Date(today+'T10:00:00Z'),capacity:50}})
  const book=async(agentId,price,paymentTerms,suffix,commissionSnapshot=null)=>db.tourBooking.create({data:{id:id(),code:code+suffix,name:code,tripId:trip.id,agentId,agentName:code+' Agent',adults:1,children:0,status:'COMPLETED',adultPrice:price,childPrice:'0',paymentTerms,outboundDate:new Date(today),returnStatus:'NONE',createdById:maker,requestHash:code,programSnapshot:{name:code},...(commissionSnapshot?{commissionSnapshot}:{})}})
  const debt=await book(agent.id,'2000.00','AGENT_CREDIT','-DEBT')
  let bill=(await commandReceivable(db,maker,{id:id(),action:'CREATE',title:code,bookingIds:[debt.id],dueOn:'2026-09-20'})).row
  assert.equal(String(bill.total),'2000')
  const current=await book(agent.id,'2300.00','COUNTER','-COUNTER')
  const collect={id:id(),bookingId:current.id,version:current.version,payer:'CUSTOMER',basis:'FULL',received:'3500.00',receivedOn:today,reference:code}
  const [collection,replay]=await Promise.all([recordBookingCollection(db,maker,collect),recordBookingCollection(db,maker,collect)])
  assert.deepEqual(collection,replay);assert.equal(collection.offset,'1200.00');assert.equal(collection.refundable,'0.00')
  bill=await db.agentBill.findUnique({where:{id:bill.id}});assert.equal(bill.paid.toFixed(2),'1200.00')
  assert.equal(await db.agentPayment.count({where:{billId:bill.id}}),0)
  const payBill={id:id(),action:'PAY',billId:bill.id,version:bill.version,amount:'800.00',receivedOn:today,reference:code}
  const paid=await commandReceivable(db,maker,payBill)
  assert.equal(paid.row.status,'PAID');assert.equal((await commandReceivable(db,maker,payBill)).row.status,'PAID')
  assert.equal(await db.agentPayment.count({where:{billId:bill.id}}),1)
  assert.equal((await reconcileAgentMargin(db,maker,{id:id(),receiptId:collect.id})).refundable,'0.00')
  checks.push('3500 collection / 2300 net / 1200 old-debt offset; no false cash movement or duplicate payment')
  stage='refund-commission'
  const agent2=await db.businessPartner.create({data:{id:id(),code:code+'-REFUND',name:code,status:'ACTIVE',roles:['SALES_AGENT']}})
  const refundable=await book(agent2.id,'2300.00','COUNTER','-REFUND',{eligible:true,amount:'100.10',beneficiaryId:employee})
  const receipt=await recordBookingCollection(db,maker,{id:id(),bookingId:refundable.id,version:refundable.version,payer:'CUSTOMER',basis:'FULL',received:'3500.00',receivedOn:today,reference:code})
  assert.equal(receipt.refundable,'1200.00')
  await finance('AGENT_REFUND',{receiptId:receipt.receipt.id,amount:'1200.00',notes:'refund without outstanding debt'})
  assert.equal((await db.bookingReceipt.findUnique({where:{id:receipt.receipt.id}})).refunded.toFixed(2),'1200.00')
  assert.equal(await db.agentRefundClaim.count({where:{receiptId:receipt.receipt.id}}),1)
  await finance('BOOKING_COMMISSION',{bookingId:refundable.id,startsOn:today,endsOn:'2026-09-30',amount:'100.10',notes:'verified commission'})
  assert.equal(await db.bookingCommissionClaim.count({where:{bookingId:refundable.id}}),1)
  stage='allowance'
  const service=await db.operationResource.create({data:{id:id(),code:code+'-SERVICE',name:code,kind:'SERVICE',category:'TOUR_BOAT',baseUnit:'PERSON',status:'ACTIVE'}})
  const slot=await db.serviceSlot.create({data:{id:id(),code:code+'-SLOT',name:code,resourceId:service.id,startsAt:new Date(today+'T01:00:00Z'),endsAt:new Date(today+'T09:00:00Z'),capacity:30,status:'OPEN'}})
  const run=await db.dispatchRun.create({data:{id:id(),code:code+'-RUN',name:code,kind:'BOAT',direction:'OUTBOUND',period:'AM',capacity:30,slotId:slot.id,requestHash:'a'.repeat(64),staff:{create:{id:id(),userId:employee,role:'GUIDE'}}}})
  await finance('ALLOWANCE',{runId:run.id,amount:'100.10',notes:'assigned staff allowance'})
  checks.push('all ten finance kinds verified, including refund, commission, allowance and claim uniqueness')
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM D1TxnGuard').first()).n,0)
  assert.equal((await env.DB.prepare('PRAGMA foreign_key_check').all()).results.length,0)
  return {checks}
 }catch(error){console.error('FINANCE_COMPANY_FAILED',stage,error);throw Object.assign(error,{stage})}
 finally{await db.$disconnect()}
}
