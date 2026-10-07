// Production configuration exercised only in an in-memory local workerd instance.
import assert from 'node:assert/strict'
import {readFile,readdir,mkdtemp,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomBytes} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {localEnvironment} from './local-cloudflare-policy.js'
import {unstable_splitSqlQuery} from 'wrangler'
import {prepareOwnerBootstrap} from '../backend/src/platform/auth/cloudflare/owner-bootstrap.js'
import {Miniflare,convertV4MiniflareOptions} from 'miniflare'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const importRoot=root.replaceAll('\\','/')
const directory=await mkdtemp(path.join(tmpdir(),'greenview-production-smoke-'))
const origin='https://backoffice.greenviewtour.com',checks=[]
let mf

try{
 const fixture=path.join(directory,'fixture.ts'),config=path.join(directory,'wrangler.jsonc'),outdir=path.join(directory,'bundle')
 await writeFile(fixture,`import worker from '${importRoot}/backend/src/cloudflare/worker.ts'; import publicWorker from '${importRoot}/backend/src/cloudflare/public-worker.js'; import {createD1Prisma} from '${importRoot}/backend/src/platform/database/d1-client.ts'; import {passwordHash} from '${importRoot}/backend/src/platform/auth/cloudflare/runtime.js'; export default {async fetch(request,env,ctx){env.EMAIL={send:async()=>{throw new Error('UNEXPECTED_EMAIL_SEND')}};if([env.PUBLIC_ORIGIN,env.PUBLIC_ALIAS_ORIGIN].includes(new URL(request.url).origin))return publicWorker.fetch(request,{...env,API:{fetch:r=>worker.fetch(r,env,ctx)}});if(new URL(request.url).pathname!=='/__fixture')return worker.fetch(request,env,ctx); if(request.headers.get('x-fixture')!==env.FIXTURE_KEY)return new Response(null,{status:403}); const db=createD1Prisma(env.DB,{files:env.FILES});try{ const password=await passwordHash('Fixture-Password-12345'); for(let i=0;i<4;i++){const id=crypto.randomUUID();await db.$transaction(async tx=>{await tx.authUser.create({data:{id,name:'Smoke fixture',email:'pilot'+i+'@example.test',emailVerified:true,updatedAt:new Date()}});await tx.authAccount.create({data:{id:crypto.randomUUID(),accountId:id,providerId:'credential',userId:id,password,updatedAt:new Date()}});await tx.userProfile.create({data:{id,displayName:'Smoke fixture',department:'MANAGEMENT',roles:{create:{roleCode:i===0?'ADMIN_MANAGER':'BOOKING',scope:i===0?'COMPANY':'SELF'}}}})});}return Response.json({ok:true})}finally{await db.$disconnect()}}};`)
 await writeFile(config,JSON.stringify({name:'greenview-isolated-production-smoke',main:fixture,compatibility_date:'2026-09-29',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false}))
 await promisify(execFile)(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'deploy','--dry-run','--config',config,'--outdir',outdir,'--env-file',path.join(root,'backend/cloudflare.env')],{cwd:root,env:localEnvironment(),maxBuffer:4194304})
 const modules=await Promise.all((await readdir(outdir)).filter(file=>file.endsWith('.js')||file.endsWith('.wasm')).map(async file=>({type:file.endsWith('.wasm')?'CompiledWasm':'ESModule',path:path.join(outdir,file),contents:await readFile(path.join(outdir,file),file.endsWith('.js')?'utf8':undefined)})))
 modules.sort((a,b)=>a.type==='ESModule'?-1:b.type==='ESModule'?1:0)
 const fixtureKey=randomBytes(24).toString('hex')
 const options={modules,modulesRoot:outdir,outboundService:()=>new Response('External network disabled',{status:502}),compatibilityDate:'2026-09-29',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['FILES'],bindings:{APP_ENV:'production',AUTH_EMAIL_FROM:'system@greenviewtour.com',PRODUCTION_ENABLED:'true',AUTH_SECRET:randomBytes(48).toString('hex'),BACKOFFICE_ORIGIN:origin,PUBLIC_ORIGIN:'https://greenviewtour.com',PUBLIC_ALIAS_ORIGIN:'https://www.greenviewtour.com',MEMBER_ORIGIN:'https://member.greenviewtour.com',FIXTURE_KEY:fixtureKey},serviceBindings:{ASSETS:()=>new Response('<html>fixture asset</html>',{headers:{'content-type':'text/html'}})}}
 mf=new Miniflare(convertV4MiniflareOptions(options))
 const db=await mf.getD1Database('DB')
 for(const file of (await readdir(path.join(root,'backend/prisma-d1/migrations'))).filter(f=>f.endsWith('.sql')).sort()){
  const sql=await readFile(path.join(root,'backend/prisma-d1/migrations',file),'utf8')
  for(const statement of unstable_splitSqlQuery(sql))await db.prepare(statement).run()
 }
 for(const statement of unstable_splitSqlQuery(await readFile(path.join(root,'backend/release/authorization-catalog.sql'),'utf8')))await db.prepare(statement).run()
 for(const statement of unstable_splitSqlQuery(await readFile(path.join(root,'backend/release/company-contact.sql'),'utf8')))await db.prepare(statement).run()
 const bootstrap=prepareOwnerBootstrap({email:'owner@example.test',displayName:'Fixture owner',origin,accountId:'a'.repeat(32),databaseId:'00000000-0000-0000-0000-000000000001',databaseName:'greenviewtour-production-smoke',environment:'production'})
 for(const statement of unstable_splitSqlQuery(bootstrap.sql))await db.prepare(statement).run()
 assert.equal((await db.prepare('SELECT count(*) AS n FROM InvitationRole WHERE invitationId=?').bind(bootstrap.metadata.invitationId).first()).n,1)
 assert.equal((await db.prepare("SELECT count(*) AS n FROM AuditEvent WHERE targetId=? AND action='owner.bootstrap.prepared'").bind(bootstrap.metadata.invitationId).first()).n,1)
 checks.push('owner bootstrap SQL creates guarded invitation, Admin role and audit in isolated D1')
 async function call(route,{data,cookie,expected=200,headers={},base=origin}={}){
  const response=await mf.dispatchFetch(base+route,{method:data===undefined?'GET':'POST',redirect:'manual',headers:{'cf-connecting-ip':'192.0.2.10',...(data===undefined?{}:{origin:base,'content-type':'application/json'}),...(cookie?{cookie}:{}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})})
  const body=await response.text();assert.equal(response.status,expected,route+': '+body.slice(0,300));return {body,headers:response.headers,cookie:response.headers.get('set-cookie')?.split(';')[0]}
 }
 const publicOrigin='https://greenviewtour.com'
 const publicAsset=await call('/',{base:publicOrigin});assert.match(publicAsset.body,/fixture asset/);assert.equal(publicAsset.headers.get('x-robots-tag'),null)
 const publicCompany=JSON.parse((await call('/api/public/company',{base:publicOrigin})).body).company
 assert.equal(publicCompany.phone,'+66954266847');assert.equal(publicCompany.lineId,'@greenviewtour');assert.equal(publicCompany.instagramUrl,'https://www.instagram.com/greenviewtour/');assert.ok(!publicCompany.email)
 const catalog=JSON.parse((await call('/api/public/tours?view=cards&page=1',{base:publicOrigin})).body);assert.deepEqual(catalog.rows,[])
 await call('/api/me',{base:publicOrigin,expected:404});await call('/api/member/profile',{base:publicOrigin,expected:404})
 await call('/api/public/company',{base:publicOrigin,data:{},expected:405})
 const canonical=await call('/tours?page=2',{base:'https://www.greenviewtour.com',expected:308});assert.equal(canonical.headers.get('location'),publicOrigin+'/tours?page=2')
 const publicBuildDirectory=path.join(root,'frontend/public-web/dist/assets')
 const publicJavaScript=(await Promise.all((await readdir(publicBuildDirectory)).filter(file=>file.endsWith('.js')).map(file=>readFile(path.join(publicBuildDirectory,file),'utf8')))).join('\n')
 assert.match(publicJavaScript,/https:\/\/backoffice\.greenviewtour\.com\/login/)
 checks.push('Public Worker reaches real staff API: approved company contact, empty fresh catalog, private API denial, canonical www redirect and built Staff Login URL')
 const invitationCode=new URLSearchParams(new URL(bootstrap.onboardingLink).hash.slice(1)).get('invitation')
 const invitation=await call('/api/auth/invitation',{data:{invitationCode}});assert.equal(JSON.parse(invitation.body).email,'owner@example.test')
 await call('/__fixture',{headers:{'x-fixture':fixtureKey}})
 await call('/api/me',{expected:401})
 await call('/api/me',{base:'https://attacker.invalid',expected:403})
 await call('/api/me',{headers:{origin:'https://attacker.invalid'},expected:403})
 await call('/health/db',{expected:404})
 await call('/api/member/profile',{expected:503})
 checks.push('unauthenticated, wrong-host, wrong-origin, health diagnostics and paused Member denied')
 const sessions=[]
 for(let i=0;i<4;i++){
  const result=await call('/api/auth/login',{data:{email:'pilot'+i+'@example.test',password:'Fixture-Password-12345'}})
  assert.match(result.headers.get('set-cookie'),/Secure/);assert.match(result.headers.get('set-cookie'),/HttpOnly/);sessions.push(result.cookie)
 }
 await Promise.all(sessions.map(async cookie=>{await call('/api/me',{cookie});await call('/api/dashboard',{cookie})}))
 await call('/api/users',{cookie:sessions[1],expected:403})
 checks.push('four separate real password sessions use Secure cookies; concurrent profile/dashboard reads and role denial pass')
 const unknown=await call('/api/does-not-exist',{cookie:sessions[0],expected:404});assert.doesNotMatch(unknown.body,/<html>/)
 const asset=await call('/login');assert.match(asset.body,/fixture asset/);assert.equal(asset.headers.get('x-frame-options'),'DENY')
 await call('/api/auth/logout',{data:{},cookie:sessions[0]});await call('/api/me',{cookie:sessions[0],expected:401})
 checks.push('API 404 does not fall back to SPA; assets have security headers; logout revokes session')
 await mf.setOptions(convertV4MiniflareOptions({...options,bindings:{...options.bindings,PRODUCTION_ENABLED:'false'}}))
 await call('/api/me',{expected:503})
 checks.push('explicit production enable switch fails closed')
 console.log(JSON.stringify({status:'PASS',checks,remoteAccess:false,activeLocalDataChanged:false,emailSent:false,scope:'Local workerd running production settings; not deployed acceptance or provider quota evidence'},null,2))
}finally{await mf?.dispose();await rm(directory,{recursive:true,force:true})}
