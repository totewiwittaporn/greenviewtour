import test from 'node:test'
import assert from 'node:assert/strict'
import {memberSurfacePaused} from '../src/modules/commerce/member-release.js'
import {createHandler} from '../src/app/http.js'

test('member self-service fails closed except for an explicitly injected Local regression',()=>{
 for(const path of ['/api/member','/api/member/profile','/api/member/login','/api/member/register','/api/member/verify-email','/api/member/proof']){
  for(const environment of ['local','production','preview',undefined]){
   assert.equal(memberSurfacePaused(path,environment),true)
   assert.equal(memberSurfacePaused(path,environment,true),environment!=='local')
  }
 }
 for(const path of ['/api/auth/login','/api/me/line','/api/public/tours','/health/live'])assert.equal(memberSurfacePaused(path,'local'),false)
})
test('direct Member HTTP requests cannot access data or activate regression via query/header',async()=>{
 const failAccess=new Proxy({},{get(){throw new Error('Paused Member must not access data')}})
 const handler=createHandler({port:5001,token:'a'.repeat(32),prisma:failAccess,provider:failAccess})
 for(const path of ['/api/member/profile','/api/member/register','/api/member/recover','/api/member/requests','/api/member/proof']){
  let status,result
  await handler({method:'POST',url:path+'?memberRegression=true',headers:{host:'localhost:5001',origin:'http://localhost:5175','x-greenview-local-token':'a'.repeat(32),'x-member-regression':'true'}},{writeHead(code){status=code},end(body){result=JSON.parse(body)}})
  assert.equal(status,503);assert.deepEqual(result,{code:'MEMBER_PAUSED'})
 }
})
