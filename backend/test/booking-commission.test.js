import test from 'node:test'
import assert from 'node:assert/strict'
import {bookingCommissionSnapshot as snapshot} from '../src/modules/operations/booking-commission.js'
import {initialValues,validateCatalog,visibleField,catalog} from '../../packages/contracts/catalog.js'
const program={id:'tour',version:1,bookingCommissionEligible:true,bookingAdultCommission:'12.35',bookingChildCommission:'2.10',supplierAdultCommission:'999.00'}
const agent={id:'agent',version:1,bookingCommissionEligible:true}
const base={program,agent,adults:2,children:1,ownerId:'owner'}
test('both eligibility flags are required; no wins in either direction',()=>{
 for(const p of [true,false])for(const a of [true,false]){const got=snapshot({...base,program:{...program,bookingCommissionEligible:p},agent:{...agent,bookingCommissionEligible:a}});assert.equal(got.eligible,p&&a);assert.equal(got.amount,p&&a?'26.80':'0.00')}
 assert.equal(snapshot({...base,program:{id:'tour'},agent:{id:'agent'}}).status,'NO_COMMISSION')
})
test('direct bookings use program condition; standalone has none; missing rate is not zero',()=>{
 assert.equal(snapshot({...base,agent:null}).amount,'26.80')
 assert.equal(snapshot({...base,program:null}).status,'NO_COMMISSION')
 assert.equal(snapshot({...base,program:{...program,bookingChildCommission:null}}).status,'RATE_NOT_CONFIGURED')
 assert.equal(snapshot({...base,program:{...program,bookingChildCommission:null},children:0}).amount,'24.70')
})
test('master edits and owner reassignment preserve commission conditions and beneficiary',()=>{
 const original=snapshot(base),existing={agentId:'agent',trip:{tourId:'tour'},commissionSnapshot:original}
 const changed=snapshot({...base,existing,ownerId:'new-owner',program:{...program,bookingCommissionEligible:false,bookingAdultCommission:'900'},adults:3})
 assert.equal(changed.amount,'39.15');assert.equal(changed.beneficiaryId,'owner');assert.equal(changed.programEligible,true)
 const replaced=snapshot({...base,existing,ownerId:'new-owner',program:{...program,id:'other',bookingCommissionEligible:false}})
 assert.equal(replaced.amount,'0.00');assert.equal(replaced.beneficiaryId,'owner')
})
test('legacy bookings do not gain commission retrospectively',()=>{
 const got=snapshot({...base,existing:{agentId:'agent',trip:{tourId:'tour'},commissionSnapshot:null}})
 assert.equal(got.reason,'LEGACY_UNCONFIGURED');assert.equal(got.beneficiaryId,null);assert.equal(got.amount,'0.00')
})
test('catalog commission eligibility is explicit, conservative and independently validated',()=>{
 const values=initialValues('tours');assert.equal(values.bookingCommissionEligible,'false')
 let result=validateCatalog('tours',{...values,bookingCommissionEligible:'true',bookingAdultCommission:'12.345'})
 assert.ok(result.errors.bookingAdultCommission)
 result=validateCatalog('tours',{...values,bookingCommissionEligible:'false',bookingAdultCommission:'12.34'})
 assert.equal(result.data.bookingCommissionEligible,false);assert.equal(result.data.bookingAdultCommission,null)
 assert.equal(visibleField(catalog.tours.fields.find(f=>f.key==='bookingAdultCommission'),{bookingCommissionEligible:'true'}),true)
 assert.ok(validateCatalog('partners',{bookingCommissionEligible:'yes'}).errors.bookingCommissionEligible)
})
