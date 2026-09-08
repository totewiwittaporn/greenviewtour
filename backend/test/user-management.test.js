import test from 'node:test'
import assert from 'node:assert/strict'
import { managementScope, canEditProfile, validateProfilePatch } from '../src/modules/identity-access/user-management.js'
import { checkAuthResult, createAuthProvider } from '../src/platform/auth/provider.js'
import { SessionStore } from '../src/platform/auth/sessions.js'
const profile=(role,department,scope='SELF')=>({status:'ACTIVE',department,roles:[{roleCode:role,scope,role:{permissions:[{permissionCode:'users.read'},{permissionCode:'users.profile.edit'}]}}]})
test('heads are scoped by assigned department, not editable metadata or target IDs',()=>{
  const head=profile('HEAD_GUIDE','GUIDE'), guide=profile('GUIDE','GUIDE')
  assert.deepEqual(managementScope(head),{company:false,department:'GUIDE'})
  assert.equal(canEditProfile(head,guide),true)
  assert.equal(canEditProfile(head,profile('DRIVER','DRIVER')),false)
  assert.equal(canEditProfile(head,profile('ADMIN_MANAGER','GUIDE')),false)
  assert.equal(managementScope(profile('HEAD_GUIDE',null)),null)
  assert.equal(managementScope(profile('HEAD_GUIDE','DRIVER')),null)
  assert.equal(managementScope(profile('GUIDE','GUIDE')),null)
  assert.equal(canEditProfile(profile('MANAGER',null,'COMPANY'),profile('ADMIN_MANAGER',null)),true)
  assert.equal(managementScope(profile('MANAGER',null)),null)
})
test('profile edits reject roles, status, identity and department escalation',()=>{
  const base={displayName:'Guide',updatedAt:new Date().toISOString()}
  for(const key of ['roles','roleCode','status','email','id']) assert.throws(()=>validateProfilePatch({...base,[key]:'ADMIN_MANAGER'},{company:true}))
  assert.throws(()=>validateProfilePatch({...base,department:'DRIVER'},{company:false}))
  assert.throws(()=>validateProfilePatch({...base,department:'UNKNOWN'},{company:true}))
  assert.throws(()=>validateProfilePatch({...base,updatedAt:''},{company:true}))
  assert.deepEqual(validateProfilePatch({...base,department:'GUIDE'},{company:true}),{displayName:'Guide',department:'GUIDE'})
})
test('service failures preserve sessions, while permanently invalid tokens remove them',async()=>{
  for(const status of [0,429,500,503,401]) {
    const store=new SessionStore(),id=store.create({user:{id:'test'},expires_at:Date.now()/1000+3600,access_token:'fixture'})
    await assert.rejects(()=>store.authenticated({headers:{cookie:`gv_session=${id}`}},{user:async()=>checkAuthResult({error:{status}},'SESSION_EXPIRED')},{}),error=>error.status===(status===0?503:status===500?503:status))
    assert.equal(store.entries.has(id),status!==401)
  }
})
test('password success remains success when remote sign-out errors or throws',async()=>{
  for(const throws of [false,true]) {
    const provider=createAuthProvider({SUPABASE_URL:'https://qplzgpyidszxbtbyknjc.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'},()=>({auth:{setSession:async()=>({data:{}}),updateUser:async()=>({data:{}}),signOut:async()=>{if(throws)throw new Error('offline');return {error:{status:503}}}}}))
    assert.deepEqual(await provider.password({access_token:'fixture',refresh_token:'fixture'},'fixture-new-password'),{providerRevoked:false})
  }
})
test('reset handler clears local sessions and records password success despite provider revocation failure',async()=>{
  const {createHandler}=await import('../src/app/http.js')
  const {Readable}=await import('node:stream')
  for(const auditFailure of [false,true]) {
    let cleared=false,finalized=false,status,response,cookie
    const req=Readable.from([JSON.stringify({password:'fixture-password-123'})])
    Object.assign(req,{method:'POST',url:'/api/auth/reset-password',headers:{host:'127.0.0.1:5000',origin:'http://localhost:5174','x-greenview-local-token':'a'.repeat(64),'content-type':'application/json'}})
    const sessions={authenticated:async()=>({user:{id:'fixture'},entry:{purpose:'recovery',session:{}}}),deleteUser:()=>{cleared=true},cookie:id=>`gv_session=${id}; Max-Age=0`}
    const prisma={userProfile:{findUnique:async()=>({status:'ACTIVE'})},auditEvent:{create:async()=>({id:'attempt'}),update:async()=>{finalized=true;if(auditFailure)throw new Error('database unavailable')}}}
    await createHandler({token:'a'.repeat(64),sessions,prisma,provider:{password:async()=>({providerRevoked:false})}})(req,{writeHead:s=>{status=s},end:b=>{response=JSON.parse(b)}})
    cookie=sessions.cookie('')
    assert.equal(status,200);assert.equal(response.ok,true);assert.equal(cleared,true);assert.equal(finalized,true);assert.match(cookie,/Max-Age=0/)
  }
})
