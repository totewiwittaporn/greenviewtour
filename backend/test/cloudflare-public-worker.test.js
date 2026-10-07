import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/cloudflare/public-worker.js'
const env=()=>({APP_ENV:'production',PRODUCTION_ENABLED:'true',PUBLIC_ORIGIN:'https://greenviewtour.com',BACKOFFICE_ORIGIN:'https://backoffice.greenviewtour.com',ASSETS:{fetch:async()=>new Response('<html>Public</html>',{headers:{'content-type':'text/html'}})},API:{fetch:async()=>new Response('{}')}})
const request=(path='/',options={})=>new Request('https://greenviewtour.com'+path,options)
test('Public deployment fails closed for disabled or invalid origin configuration',async()=>{
 for(const override of [{PRODUCTION_ENABLED:'false'},{APP_ENV:'local'},{PUBLIC_ORIGIN:'http://greenviewtour.com'},{BACKOFFICE_ORIGIN:'https://backoffice.greenviewtour.com/'},{BACKOFFICE_ORIGIN:'https://greenviewtour.com'}])assert.equal((await worker.fetch(request(),{...env(),...override})).status,503)
 assert.equal((await worker.fetch(new Request('https://unexpected.example/'),env())).status,403)
 assert.equal((await worker.fetch(request('/',{headers:{origin:'https://evil.example'}}),env())).status,403)
})
test('Public APIs proxy only clean GET requests to the staff service binding',async()=>{
 let received
 const config={...env(),API:{fetch:async req=>{received=req;return new Response('{"ok":true}',{headers:{'set-cookie':'secret=1','content-type':'application/json'}})}}}
 const response=await worker.fetch(request('/api/public/tours?page=2',{headers:{cookie:'staff=secret',authorization:'Bearer secret','x-forwarded-for':'spoof'}}),config)
 assert.equal(response.status,200)
 assert.equal(received.url,'https://backoffice.greenviewtour.com/api/public/tours?page=2')
 assert.deepEqual([...received.headers],[['accept','application/json'],['origin','https://greenviewtour.com']])
 assert.equal(received.redirect,'manual')
 assert.equal(response.headers.get('set-cookie'),null)
})
test('Private API, Member API and API mutations never fall back to Public assets',async()=>{
 const config={...env(),ASSETS:{fetch:()=>assert.fail('assets must not receive API requests')},API:{fetch:()=>assert.fail('service must not receive private/mutation requests')}}
 for(const path of ['/api','/api/auth/login','/api/member/session','/api/workspace/users','/api/public/../auth/login'])assert.equal((await worker.fetch(request(path),config)).status,404)
 for(const method of ['POST','PUT','DELETE','OPTIONS','HEAD'])assert.equal((await worker.fetch(request('/api/public/company',{method}),config)).status,405)
})
test('Public routes serve assets and remain indexable',async()=>{
 const response=await worker.fetch(request('/tours'),env())
 assert.match(await response.text(),/Public/)
 assert.equal(response.headers.get('x-robots-tag'),null)
 assert.equal(response.headers.get('x-content-type-options'),'nosniff')
 assert.equal((await worker.fetch(request('/',{method:'POST'}),env())).status,405)
})
test('Missing services and provider failures return controlled unavailable responses',async()=>{
 assert.equal((await worker.fetch(request('/api/public/company'),{...env(),API:null})).status,503)
 assert.equal((await worker.fetch(request('/api/public/company'),{...env(),API:{fetch:async()=>{throw Error('private provider details')}}})).status,503)
 assert.equal((await worker.fetch(request('/'),{...env(),ASSETS:null})).status,503)
})

test('Only configured public alias redirects canonical GET and HEAD requests',async()=>{
 const config={...env(),PUBLIC_ALIAS_ORIGIN:'https://www.greenviewtour.com'}
 for(const method of ['GET','HEAD']){
  const response=await worker.fetch(new Request('https://www.greenviewtour.com/tours?page=2',{method}),config)
  assert.equal(response.status,308)
  assert.equal(response.headers.get('location'),'https://greenviewtour.com/tours?page=2')
 }
 assert.equal((await worker.fetch(new Request('https://www.greenviewtour.com/',{method:'POST'}),config)).status,405)
 assert.equal((await worker.fetch(new Request('https://www.greenviewtour.com/'),env())).status,403)
 assert.equal((await worker.fetch(new Request('https://other.greenviewtour.com/'),config)).status,403)
 assert.equal((await worker.fetch(request(),{...config,PUBLIC_ALIAS_ORIGIN:'http://www.greenviewtour.com'})).status,503)
})
