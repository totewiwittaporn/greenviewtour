import test from 'node:test'
import assert from 'node:assert/strict'
import {createStaffLineOnboarding,staffLineOnboardingAllowed} from '../src/platform/line/staff-onboarding.js'
import {createHandler} from '../src/app/http.js'
const env={APP_ENV:'production',LINE_STAFF_REQUIRED:'true',LINE_STAFF_SETUP_USER_ID:'owner'}
function database({id='staff',role='BOOKING',status='ACTIVE',binding=null}={}){
 const tx={userProfile:{findUnique:async()=>({id,status,roles:[{roleCode:role}]})},staffLineBinding:{findUnique:async({where})=>{assert.equal(where.channelKey_userId.channelKey,'live:2005588057:2011806264');return binding}}}
 return {$transaction:async fn=>fn(tx)}
}
test('Local and nonmandatory deployments do not enable employee gate',()=>{
 assert.equal(createStaffLineOnboarding(database(),{...env,APP_ENV:'local'}),undefined)
 assert.equal(createStaffLineOnboarding(database(),{...env,LINE_STAFF_REQUIRED:'false'}),undefined)
})
test('only configured setup owner with current admin role is exempt',async()=>{
 assert.equal(await createStaffLineOnboarding(database({role:'ADMIN_MANAGER'}),env)('owner'),false)
 assert.equal(await createStaffLineOnboarding(database({role:'ADMIN_MANAGER'}),env)('another-admin'),true)
 assert.equal(await createStaffLineOnboarding(database(),env)('owner'),true)
 await assert.rejects(()=>createStaffLineOnboarding(database({status:'SUSPENDED',role:'ADMIN_MANAGER'}),env)('owner'),{code:'ACCOUNT_UNAVAILABLE'})
})
test('only verified live channel binding unlocks access; block/unlink promptly re-locks',async()=>{
 for(const status of ['UNLINKED','BLOCKED','PENDING'])assert.equal(await createStaffLineOnboarding(database({binding:{status,lineUserId:'U'+'a'.repeat(32)}}),env)('staff'),true)
 assert.equal(await createStaffLineOnboarding(database({binding:{status:'LINKED',lineUserId:null}}),env)('staff'),true)
 assert.equal(await createStaffLineOnboarding(database({binding:{status:'LINKED',lineUserId:'U'+'a'.repeat(32)}}),env)('staff'),false)
})
test('only self onboarding and auth routes bypass mandatory binding, never operations',()=>{
 for(const [path,method] of [['/api/me','GET'],['/api/me/profile','POST'],['/api/me/password','POST'],['/api/me/line','POST'],['/api/auth/logout','POST']])assert.equal(staffLineOnboardingAllowed(path,method),true)
 for(const [path,method] of [['/api/me','POST'],['/api/me/profile','GET'],['/api/me/line/anything','POST'],['/api/users','GET'],['/api/settings/company','POST'],['/api/evidence/file','GET']])assert.equal(staffLineOnboardingAllowed(path,method),false)
})
test('HTTP gate rejects operational reads and writes before domain code, preserves auth and member pause',async()=>{
 const origins={workspace:['https://backoffice.greenviewtour.com'],public:['https://greenviewtour.com'],customer:['https://member.greenviewtour.com']}
 let checks=0
 const handler=createHandler({workerRuntime:true,environment:'production',port:443,allowedOrigins:origins,lineOnboarding:async()=>{checks++;return true},sessions:{authenticated:async()=>({user:{id:'staff'},entry:{purpose:'workspace'}}),logout:async()=>{},cookie:()=>''}})
 async function call(path,method='GET'){
  let status,data
  await handler({url:path,method,headers:{host:'backoffice.greenviewtour.com',origin:origins.workspace[0],'content-type':'application/json'},async *[Symbol.asyncIterator](){yield '{}'}},{writeHead:code=>{status=code},end:body=>{data=JSON.parse(body)}})
  return {status,data}
 }
 for(const [path,method] of [['/api/dashboard','GET'],['/api/users','GET'],['/api/settings/company','POST'],['/api/operations/bookings','POST'],['/api/evidence/123','GET']])assert.deepEqual(await call(path,method),{status:403,data:{code:'LINE_ONBOARDING_REQUIRED'}})
 assert.equal(checks,5)
 assert.equal((await call('/api/auth/logout','POST')).status,200)
 assert.equal((await call('/api/member/profile')).status,503)
 assert.equal(checks,5)
})
test('current user remains readable with explicit onboarding status while operational access is blocked',async()=>{
 const profile={id:'staff',status:'ACTIVE',displayName:'Staff',roles:[],permissionOverrides:[]}
 const handler=createHandler({workerRuntime:true,environment:'production',port:443,allowedOrigins:{workspace:['https://backoffice.greenviewtour.com']},lineOnboarding:async()=>true,prisma:{userProfile:{findUnique:async()=>profile}},sessions:{authenticated:async()=>({user:{id:'staff',email:'staff@example.test'},entry:{purpose:'workspace'}})}})
 let status,data
 await handler({method:'GET',url:'/api/me',headers:{host:'backoffice.greenviewtour.com'}},{writeHead:code=>{status=code},end:body=>{data=JSON.parse(body)}})
 assert.equal(status,200);assert.equal(data.user.id,'staff');assert.equal(data.user.lineOnboardingRequired,true)
})
