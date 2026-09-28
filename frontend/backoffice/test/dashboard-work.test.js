import test from 'node:test'
import assert from 'node:assert/strict'
import { dashboardPersona, dashboardTitles } from '../src/core/ui/dashboardPersona.js'
import { canUseOperation, workspaceRoute } from '../src/core/navigation/workspaceRoutes.js'
import { operationAccess } from '../../../packages/contracts/operation-access.js'
import { roleNames } from '../../../packages/contracts/access.js'
const profile = role => ({ status:'ACTIVE', roles:[{roleCode:role,scope:['MANAGER','ADMIN_MANAGER'].includes(role)?'COMPANY':'SELF'}] })
test('all sixteen staff roles have a named dashboard, inactive users do not',()=>{
 for(const role of Object.keys(roleNames)){
  const persona=dashboardPersona(profile(role))
  assert.ok(persona);assert.ok(dashboardTitles[persona]);assert.notEqual(persona,'staff')
 }
 assert.equal(dashboardPersona({...profile('GUIDE'),status:'SUSPENDED'}),null)
 assert.equal(dashboardPersona({status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'SELF'}]}),'staff')
})
test('boat preparation permission opens supplies and loans but never inventory management',()=>{
 for(const role of ['GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE']){
  const user={operations:operationAccess(profile(role))}
  for(const path of ['/operations/stock','/operations/issues'])assert.equal(canUseOperation(user,workspaceRoute(path).group),true)
  for(const path of ['/operations/inventory','/operations/movements'])assert.equal(canUseOperation(user,workspaceRoute(path).group),false)
 }
})
test('a captain without preparation permission and an explicit preparation denial stay denied',()=>{
 const denied={...profile('ASSISTANT_TOUR_GUIDE'),permissionOverrides:[{permissionCode:'operations.prepareStock',effect:'DENY'}]}
 for(const p of [profile('CAPTAIN'),denied])assert.equal(canUseOperation({operations:operationAccess(p)},workspaceRoute('/operations/stock').group),false)
})
