import test from 'node:test'
import assert from 'node:assert/strict'
import {addBillingPeriod,billingCycleClose,billingDueDate,agentCollection} from '../../packages/contracts/agent-billing.js'
const policy={mode:'BILLING',cycleCount:1,cycleUnit:'MONTH',cycleAnchor:'2024-01-31',creditCount:1,creditUnit:'MONTH',creditAnchor:'BILL_RECEIVED'}
test('calendar month terms clamp leap February and retain original cycle anchor',()=>{
 assert.equal(addBillingPeriod('2024-01-31',1,'MONTH'),'2024-02-29')
 assert.equal(billingCycleClose(policy,'2024-03-01'),'2024-03-31')
 assert.equal(addBillingPeriod('2026-12-31',1,'MONTH'),'2027-01-31')
 assert.equal(addBillingPeriod('2026-09-28',15,'DAY'),'2026-10-13')
})
test('missing credit anchor never invents a due date',()=>{
 assert.equal(billingDueDate(policy,{issuedOn:'2024-01-01'}),null)
 assert.equal(billingDueDate(policy,{receivedOn:'2024-01-31'}),'2024-02-29')
 assert.equal(billingDueDate(null,{issuedOn:'2024-01-01'}),null)
 assert.throws(()=>addBillingPeriod('2026-02-30',1,'MONTH'))
})
test('agent-held margin offsets debt before any refund',()=>{
 assert.deepEqual(agentCollection({net:'2300',received:'3500',basis:'FULL',outstanding:'2000'}),{netCents:230000,receivedCents:350000,marginCents:120000,offsetCents:120000,refundableCents:0,outstandingCents:80000})
 assert.equal(agentCollection({net:'2300',received:'3500',basis:'FULL',outstanding:'500'}).refundableCents,70000)
 assert.equal(agentCollection({net:'2300',received:'2300',basis:'NET_ONLY'}).marginCents,0)
 assert.throws(()=>agentCollection({net:'2300',received:'2000',basis:'FULL'}))
 assert.throws(()=>agentCollection({net:'2300',received:'3500',basis:'NET_ONLY'}))
})
