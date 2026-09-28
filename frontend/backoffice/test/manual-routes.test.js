import test from 'node:test'
import assert from 'node:assert/strict'
import {workspaceRoute} from '../src/core/navigation/workspaceRoutes.js'
import {roleNames} from '../../../packages/contracts/access.js'
test('manual index and every role guide resolve to protected Workspace routes',()=>{
 for(const path of ['/manuals','/manuals/'])assert.deepEqual(workspaceRoute(path),{kind:'manuals',title:'User guides',path:'/manuals',role:null})
 for(const role of Object.keys(roleNames))for(const suffix of ['', '/'])assert.deepEqual(workspaceRoute('/manuals/'+role+suffix),{kind:'manuals',title:'User guides',path:'/manuals/'+role,role})
})
test('unknown manual roles still reach server authorization; nested paths are not guides',()=>{
 assert.equal(workspaceRoute('/manuals/UNASSIGNED_ROLE').kind,'manuals')
 assert.equal(workspaceRoute('/manuals/UNASSIGNED_ROLE').role,'UNASSIGNED_ROLE')
 assert.equal(workspaceRoute('/manuals/MANAGER/extra'),null)
 assert.equal(workspaceRoute('/profile').kind,'profile')
})
