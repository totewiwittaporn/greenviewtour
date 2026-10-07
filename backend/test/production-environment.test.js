import test from 'node:test'
import assert from 'node:assert/strict'
import {requestEnvironment,requestAddress,mutationRateKeys} from '../src/cloudflare/environment.js'
import {SessionStore} from '../src/platform/auth/sessions.js'
const env={APP_ENV:'production',PRODUCTION_ENABLED:'true',AUTH_SECRET:'a'.repeat(48),BACKOFFICE_ORIGIN:'https://backoffice.greenviewtour.com',PUBLIC_ORIGIN:'https://greenviewtour.com',MEMBER_ORIGIN:'https://member.greenviewtour.com'}
const request=(url='https://backoffice.greenviewtour.com/api/auth/login',headers={})=>new Request(url,{headers})
test('production requires explicit activation and valid complete HTTPS configuration',()=>{
 assert.deepEqual(requestEnvironment(request(),env),{local:false})
 for(const patch of [{APP_ENV:'preview'},{PRODUCTION_ENABLED:undefined},{PRODUCTION_ENABLED:'false'},{AUTH_SECRET:'short'},{BACKOFFICE_ORIGIN:'http://backoffice.greenviewtour.com'},{PUBLIC_ORIGIN:''},{MEMBER_ORIGIN:'https://member.greenviewtour.com/path'}])assert.equal(requestEnvironment(request(),{...env,...patch}).status,503)
})
test('production rejects alternate hosts, protocols, ports and misleading suffixes',()=>{
 for(const url of ['http://backoffice.greenviewtour.com/api/me','https://backoffice.greenviewtour.com:444/api/me','https://backoffice.greenviewtour.com.evil.test/api/me','https://greenviewtour.com/api/me','https://example.workers.dev/api/me'])assert.equal(requestEnvironment(request(url),env).code,'HOST_DENIED')
})
test('local access remains loopback-only without requiring production settings',()=>{
 for(const host of ['localhost','127.0.0.1','[::1]'])assert.deepEqual(requestEnvironment(request('http://'+host+':8787/api/me'),{APP_ENV:'local'}),{local:true})
 assert.equal(requestEnvironment(request(),{APP_ENV:'local'}).code,'LOCAL_HOST_REQUIRED')
})
test('rate identity trusts only the Cloudflare ingress address',()=>{
 assert.equal(requestAddress(request(undefined,{'cf-connecting-ip':'203.0.113.10','x-forwarded-for':'1.1.1.1'}),false),'203.0.113.10')
 assert.equal(requestAddress(request(undefined,{'x-forwarded-for':'1.1.1.1'}),false),'unknown-edge-client')
 assert.equal(requestAddress(request(undefined,{'cf-connecting-ip':'forged address'}),false),'unknown-edge-client')
 assert.equal(requestAddress(request(),true),'local-browser')
})
test('forged cookies cannot avoid IP cap; validated workspace sessions add an independent cap',async()=>{
 const rejected={authenticated:async()=>{throw new Error('SESSION_EXPIRED')}}
 assert.deepEqual(await mutationRateKeys({headers:{cookie:'gv_session='+'a'.repeat(64)}},rejected,'203.0.113.10'),['mutations:ip:203.0.113.10'])
 const session={authenticated:async()=>({id:'a'.repeat(64),entry:{purpose:'workspace'}})}
 const keys=await mutationRateKeys({},session,'203.0.113.10')
 assert.equal(keys.length,2);assert.match(keys[1],/^mutations:session:[a-f0-9]{64}$/)
 assert.notEqual(keys[1],'mutations:session:'+'a'.repeat(64))
 assert.deepEqual(await mutationRateKeys({},{authenticated:async()=>({id:'x',entry:{purpose:'recovery'}})},'ip'),['mutations:ip:ip'])
})
test('production session cookies and logout cookies are Secure, including forked stores',()=>{
 const sessions=new SessionStore({webSession:{}},{secure:true})
 for(const store of [sessions,sessions.fork('gv_member_session')])for(const value of ['a'.repeat(64),'']){
  const cookie=store.cookie(value)
  assert.match(cookie,/; Secure$/);assert.match(cookie,/; HttpOnly;/);assert.match(cookie,/; SameSite=Strict;/)
 }
 assert.doesNotMatch(new SessionStore({webSession:{}}).cookie('a'.repeat(64)),/Secure/)
})
