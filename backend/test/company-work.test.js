import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {scheduleDates,purchaseTotal,satang} from '../../packages/contracts/company-work.js'
import {listCompanyWork,commandCompanyWork} from '../src/modules/company-work/service.js'
import {hash} from '../src/modules/operations/common.js'
import {stockCommand} from '../src/modules/operations/stock.js'
import {companyRoutes} from '../../packages/contracts/company-routes.js'
import {personnelFinanceKinds} from '../../packages/contracts/personnel-finance.js'
test('monthly recurrence anchors to the original day through short months and leap years',()=>{
 assert.deepEqual(scheduleDates({frequency:'MONTHLY',startsOn:'2028-01-31',endsOn:'2028-04-30'}),['2028-01-31','2028-02-29','2028-03-31','2028-04-30'])
 assert.deepEqual(scheduleDates({frequency:'WEEKLY',startsOn:'2026-09-13',endsOn:'2026-10-04'},'2026-09-27'),['2026-09-13','2026-09-20','2026-09-27'])
})
test('custom recurrence rejects duplicate and out-of-range dates rather than silently scheduling them',()=>{
 assert.throws(()=>scheduleDates({frequency:'CUSTOM',startsOn:'2026-09-01',endsOn:'2026-09-30',customDates:['2026-09-13','2026-09-13']}),/INVALID_CUSTOM_DATES/)
 assert.throws(()=>scheduleDates({frequency:'CUSTOM',startsOn:'2026-09-01',endsOn:'2026-09-30',customDates:['2026-10-01']}),/SCHEDULE_RANGE/)
 assert.throws(()=>scheduleDates({frequency:'MONTHLY',startsOn:'2026-02-30',endsOn:'2026-12-31'}),/INVALID_DATE/)
})
test('purchase amounts use exact satang and reject negative, exponent, missing and oversized input',()=>{
 assert.equal(satang('0.10')+satang('0.20'),30)
 assert.equal(purchaseTotal([{quantity:3,unitCost:'0.10'},{quantity:1,unitCost:'0.20'}]),'0.50')
 for(const value of ['-1','1e3','',null])assert.throws(()=>purchaseTotal([{quantity:1,unitCost:value}]))
 assert.throws(()=>purchaseTotal([{quantity:1000000,unitCost:'99999999.99'}]))
})
test('direct count command cannot bypass independent review',async()=>{
 await assert.rejects(stockCommand({},randomUUID(),{id:randomUUID(),action:'COUNT'}),{code:'COUNT_APPROVAL_REQUIRED'})
})
test('all finance routes require the same read capability as the server domain',()=>{
 for(const route of Object.values(companyRoutes).filter(r=>r.finance))assert.equal(route.permission,personnelFinanceKinds[route.kind].group+'.view')
})
test('revoked custodians cannot recover old command results by replay',async()=>{
 const actor={id:randomUUID(),status:'ACTIVE',roles:[{roleCode:'CAPTAIN',scope:'SELF'}],permissionOverrides:[]}
 const row={id:randomUUID(),kind:'STOCK_REQUEST',storeId:randomUUID(),createdById:randomUUID(),payload:{}}
 let readCommand=false
 const tx={$executeRaw:async()=>0,userProfile:{findUnique:async()=>actor},companyWorkRecord:{findUnique:async()=>row},warehouseResponsibility:{findUnique:async()=>null},companyWorkCommand:{findUnique:async()=>{readCommand=true;return {result:'secret'}}}}
 await assert.rejects(commandCompanyWork({$transaction:fn=>fn(tx)},actor.id,{id:randomUUID(),recordId:row.id,kind:'STOCK_REQUEST',version:1,action:'ISSUE',data:{}}),{code:'PERMISSION_DENIED'})
 assert.equal(readCommand,false)
})
test('explicit inventory denial removes warehouse balance lookup access',async()=>{
 const actor={id:randomUUID(),status:'ACTIVE',roles:[{roleCode:'CAPTAIN',scope:'SELF'}],permissionOverrides:[{permissionCode:'operations.stock',effect:'DENY'}]};let where
 const p={userProfile:{findUnique:async()=>actor},warehouseResponsibility:{findMany:async()=>{throw Error('DENY must skip custody grants')}},stockBalance:{count:async input=>{where=input.where;return 0},findMany:async()=>[]}}
 await listCompanyWork(p,actor.id,new URLSearchParams({kind:'COUNT',lookup:'balances'}));assert.deepEqual(where.locationId,{in:[]})
})
test('job lists only include own assignments and job kinds within the approver scope',async()=>{
 const actor={id:randomUUID(),status:'ACTIVE',roles:[{roleCode:'HEAD_HOUSEKEEPING',scope:'SELF'}],permissionOverrides:[]};let where
 const tx={userProfile:{findUnique:async()=>actor},companyWorkRecord:{count:async input=>{where=input.where;return 0},findMany:async()=>[]}}
 const p={...tx,$transaction:fn=>fn(tx)}
 await listCompanyWork(p,actor.id,new URLSearchParams({kind:'JOB'}))
 assert.deepEqual(where.OR,[{assigneeId:actor.id},{payload:{path:['jobKind'],equals:'CLEANING'}}])
})


test('replayed approvals still require the current action permission when view access remains',async()=>{
 const actor={id:randomUUID(),status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY'}],permissionOverrides:[{permissionCode:'purchasing.approve',effect:'DENY'}]}
 const input={id:randomUUID(),recordId:randomUUID(),kind:'PURCHASE',version:1,action:'APPROVE',data:{reason:'Reviewed'}}
 const tx={$executeRaw:async()=>0,userProfile:{findUnique:async()=>actor},purchaseOrder:{findUnique:async()=>({id:input.recordId,status:'APPROVED'})},companyWorkCommand:{findUnique:async()=>({actorId:actor.id,requestHash:hash(input),result:{row:{status:'APPROVED'}}})}}
 await assert.rejects(commandCompanyWork({$transaction:fn=>fn(tx)},actor.id,input),{code:'PERMISSION_DENIED'})
})
