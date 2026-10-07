import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'
const root=fileURLToPath(new URL('../src/',import.meta.url))
test('real workerd staff client supports link token, profile and reply without following redirects',async()=>{
 const requests=[]
 const main=`import {pushText} from './platform/line/messaging.js';import {createStaffLineClient} from './platform/line/staff-client.js';export default {async fetch(request){if(new URL(request.url).pathname.startsWith('/push'))return Response.json(await pushText({payload:{to:'U'+'a'.repeat(32),messages:[{type:'text',text:'fixture'}]},retryKey:'11111111-1111-4111-8111-111111111111',token:'fixture-token',mode:'live'}));const client=createStaffLineClient({enabled:true,accessToken:'fixture-token'});try{const user='U'+'a'.repeat(32);if(new URL(request.url).pathname==='/redirect'){await client.linkToken(user);return Response.json({unexpected:true})}const token=await client.linkToken(user);const name=await client.profile(user);await client.reply('fixture-reply','fixture welcome');return Response.json({token,name})}catch(error){return Response.json({code:error.code,providerStatus:error.providerStatus},{status:503})}}}`
 const modules=[{type:'ESModule',path:root+'fixture.js',contents:main},{type:'ESModule',path:root+'platform/line/messaging.js',contents:await readFile(root+'platform/line/messaging.js','utf8')},{type:'ESModule',path:root+'platform/line/staff-client.js',contents:await readFile(root+'platform/line/staff-client.js','utf8')},{type:'ESModule',path:root+'platform/line/staff-crypto.js',contents:await readFile(root+'platform/line/staff-crypto.js','utf8')},
 // Domain exception dependency is isolated; real client and crypto are unchanged.
 {type:'ESModule',path:root+'modules/identity-access/membership.js',contents:'export class AccessError extends Error {constructor(code,status){super(code);this.code=code;this.status=status}}'}]
 let redirect=false
 const mf=new Miniflare(convertV4MiniflareOptions({modules,modulesRoot:root,compatibilityDate:'2026-09-29',compatibilityFlags:['nodejs_compat'],outboundService:request=>{
  requests.push(request.url)
  if(redirect)return new Response(null,{status:302,headers:{location:'https://must-not-follow.example.test/'}})
  return Response.json(request.url.endsWith('/linkToken')?{linkToken:'fixture-issued-token'}:request.url.includes('/profile/')?{userId:'U'+'a'.repeat(32),displayName:'Fixture staff'}:{})
 }}))
 try{
  let response=await mf.dispatchFetch('https://fixture.test/');assert.equal(response.status,200);assert.deepEqual(await response.json(),{token:'fixture-issued-token',name:'Fixture staff'});assert.equal(requests.length,3)
  redirect=true;response=await mf.dispatchFetch('https://fixture.test/redirect');assert.equal(response.status,503);assert.deepEqual(await response.json(),{code:'LINE_PROVIDER_UNAVAILABLE',providerStatus:302});assert.equal(requests.length,4);
  response=await mf.dispatchFetch('https://fixture.test/push');assert.deepEqual(await response.json(),{status:'FAILED',accepted:false,retryable:false});assert.equal(requests.length,5);
  redirect=false;response=await mf.dispatchFetch('https://fixture.test/push');assert.deepEqual(await response.json(),{status:'ACCEPTED',accepted:true,retryable:false});assert.equal(requests.length,6);assert.ok(requests.every(url=>url.startsWith('https://api.line.me/v2/bot/')))
 }finally{await mf.dispose()}
})
