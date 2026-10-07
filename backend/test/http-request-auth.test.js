import test from 'node:test'
import assert from 'node:assert/strict'
import {createHandler} from '../src/app/http.js'
import {AccessError} from '../src/modules/identity-access/membership.js'
function fixture(){
 let calls=0,revoked=false
 const actor={id:'owner',status:'ACTIVE',roles:[{roleCode:'ADMIN_MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}],permissionOverrides:[]}
 const db={userProfile:{findUnique:async()=>actor},$transaction:async fn=>fn(db)}
 const handler=createHandler({prisma:db,pool:db,workerRuntime:true,environment:'production',port:443,allowedOrigins:{workspace:['https://backoffice.greenviewtour.com']},lineOnboarding:async()=>false,sessions:{cookie:()=>'',authenticated:async()=>{calls++;if(revoked)throw new AccessError('SESSION_EXPIRED',401);return {user:{id:'owner'},entry:{purpose:'workspace'}}}}})
 async function request(method='GET',url='/api/dashboard'){
  let status,body
  await handler({method,url,headers:{host:'backoffice.greenviewtour.com',origin:'https://backoffice.greenviewtour.com','content-type':'application/json'},async *[Symbol.asyncIterator](){yield 'invalid-json'}},{writeHead:code=>{status=code},end:data=>{body=JSON.parse(data)}})
  return {status,body}
 }
 return {request,calls:()=>calls,revoke:()=>{revoked=true}}
}
test('GET dashboard validates session once for LINE gate and route, and freshly on every request',async()=>{
 const f=fixture()
 assert.equal((await f.request()).status,200)
 assert.equal(f.calls(),1,'LINE gate and dashboard must share only this request authentication')
 assert.equal((await f.request()).status,200);assert.equal(f.calls(),2)
 f.revoke();assert.equal((await f.request()).status,401);assert.equal(f.calls(),3,'revoked next request cannot reuse prior success')
})
test('mutation gate and route retain independent authentication checks',async()=>{
 const f=fixture()
 const result=await f.request('POST','/api/users/11111111-1111-4111-8111-111111111111/access')
 assert.equal(result.status,400);assert.equal(f.calls(),2)
})
