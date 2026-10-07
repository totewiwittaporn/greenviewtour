import test from 'node:test'
import assert from 'node:assert/strict'
import {userVisibilityWhere} from '../src/modules/identity-access/user-visibility.js'
import {bookingAssignees} from '../src/modules/operations/booking-ownership.js'
import {dispatchOptions} from '../src/modules/operations/dispatch.js'
import {guideAssignmentOptions} from '../src/modules/operations/guide-assignments.js'
import {listCompanyWork} from '../src/modules/company-work/service.js'
import {listPersonnelFinance} from '../src/modules/personnel-finance/service.js'
const actor={id:'00000000-0000-4000-8000-000000000002',status:'ACTIVE',department:'MANAGEMENT',roles:[{roleCode:'MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}]}
test('every staff selector applies canonical privacy scope to both count and paged rows',async()=>{
 for(const [operation,params] of [[bookingAssignees,''],[dispatchOptions,'entity=staff&kind=BOAT'],[guideAssignmentOptions,'entity=staff'],[listCompanyWork,'lookup=users&kind=JOB'],[listPersonnelFinance,'lookup=employees&kind=EMPLOYMENT']]){
  const calls=[],db={userProfile:{findUnique:async()=>actor,count:async args=>{calls.push(args);return 0},findMany:async args=>{calls.push(args);return []}}};db.$transaction=fn=>fn(db)
  const result=await operation(db,actor.id,new URLSearchParams(params))
  assert.equal(result.total,0);assert.deepEqual(result.rows,[]);assert.equal(calls.length,2,operation.name)
  assert.deepEqual(calls[0].where,calls[1].where,operation.name+' count and rows scope differ')
  assert.deepEqual(calls[0].where.AND,[userVisibilityWhere(actor)],operation.name+' missing visibility scope')
  assert.equal(JSON.stringify(calls[0].where.AND).includes('ADMIN_MANAGER'),false)
 }
})
