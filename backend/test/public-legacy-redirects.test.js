import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../src/cloudflare/public-worker.js'
import {publicLegacyRedirects} from '../../packages/contracts/public-legacy-redirects.js'
import {ownsPublicPath} from '../../packages/contracts/public-routes.js'
const env={APP_ENV:'production',PRODUCTION_ENABLED:'true',PUBLIC_ORIGIN:'https://greenviewtour.com',PUBLIC_ALIAS_ORIGIN:'https://www.greenviewtour.com',BACKOFFICE_ORIGIN:'https://backoffice.greenviewtour.com',ASSETS:{fetch:async req=>new URL(req.url).pathname==='/'?new Response('shell'):new Response(null,{status:404})}}
test('verified legacy URLs redirect in one hop with query retained, GET and HEAD',async()=>{
 for(const [old,target] of Object.entries(publicLegacyRedirects)){
  assert.ok(ownsPublicPath(target)); assert.equal(publicLegacyRedirects[target],undefined)
  for(const host of ['https://greenviewtour.com','https://www.greenviewtour.com'])for(const slash of ['','/'])for(const method of ['GET','HEAD']){
   const response=await worker.fetch(new Request(host+old+slash+'?utm_source=google',{method}),env)
   assert.equal(response.status,301);assert.equal(response.headers.get('location'),'https://greenviewtour.com'+target+'?utm_source=google')
  }
 }
})
test('unverified slugs and Thai URLs do not redirect to guessed content',async()=>{
 for(const path of ['/koh-surin-food/','/koh-surin-snorkeling-spots/','/how-to-get-surin-island/','/เดย์ทริปเกาะสุรินทร์/']){
  const response=await worker.fetch(new Request('https://greenviewtour.com'+path),env)
  assert.equal(response.status,404);assert.equal(response.headers.get('location'),null)
 }
})
test('redirects do not weaken method, host and origin guards',async()=>{
 for(const options of [{method:'POST'},{headers:{origin:'https://example.org'}}]){
  assert.ok([403,405].includes((await worker.fetch(new Request('https://greenviewtour.com/how-to-get-to-surin-island/',options),env)).status))
 }
 assert.equal((await worker.fetch(new Request('https://example.org/how-to-get-to-surin-island/'),env)).status,403)
})
