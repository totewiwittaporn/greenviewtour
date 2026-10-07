import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {inspectSourceIdentity} from '../../scripts/local-import/identity.js'
test('a recorded non-member customer needs no Auth identity',()=>{
 const customers=[{id:'member',authUserId:'user'},{id:'offline',authUserId:null,status:'ACTIVE'}],before=JSON.stringify(customers)
 const result=inspectSourceIdentity(new Set(['user','staff']),[{id:'staff'}],customers)
 assert.equal(result.identity.customersWithoutAccount,1)
 assert.equal(result.identity.missingCustomerAuth,0)
 assert.equal(result.identity.readyForAuthCutover,true)
 assert.deepEqual(result.identityIssues.customers,[])
 assert.equal(JSON.stringify(customers),before)
})
test('a broken non-null customer reference and missing staff remain blockers',()=>{
 const result=inspectSourceIdentity(new Set(['valid']),[{id:'missing-staff',status:'ACTIVE'}],[{id:'customer',authUserId:'missing-account',status:'ACTIVE'},{id:'offline',authUserId:null}])
 assert.equal(result.identity.missingStaffAuth,1);assert.equal(result.identity.missingCustomerAuth,1)
 assert.equal(result.identity.readyForAuthCutover,false)
 assert.equal(result.identityIssues.customers[0].authUserId,'missing-account')
 assert.equal(result.identityIssues.action,'PRESERVED_UNCHANGED_AUTH_CUTOVER_BLOCKED')
})
test('malformed empty or omitted account references are not treated as null',()=>{
 for(const customer of [{id:'empty',authUserId:''},{id:'omitted'}])assert.equal(inspectSourceIdentity(new Set(),[],[customer]).identity.missingCustomerAuth,1)
})
test('legacy directory query excludes legitimate null customer references',()=>{
 const source=readFileSync(new URL('../../scripts/local-identity.js',import.meta.url),'utf8')
 assert.match(source,/p\.authUserId IS NOT NULL AND i\.id IS NULL/)
})
