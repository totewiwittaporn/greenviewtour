// Real HTTP auth tests on an isolated copy of Local D1/R2.
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp,cp} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {randomBytes,randomUUID,createHmac} from 'node:crypto'
import {execFile,spawn} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'
import {createServer} from 'node:net'
import {root,statePath,configPath,localEnvironment,localPlan,validateLocalConfig} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock} from './local-cloudflare-safety.js'
const execute=promisify(execFile),environment=localEnvironment(),checks=[]
let release,child,exited,directory,origin
const token=randomBytes(32).toString('hex'),audit=randomBytes(32).toString('hex')
async function stop(){if(!child?.pid)return;try{process.kill(-child.pid,'SIGTERM')}catch{ /* optional readiness or already-exited process */ }const timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL')}catch{ /* optional readiness or already-exited process */ }},5000);timer.unref();await exited;clearTimeout(timer);child=null}
try{
 if(process.argv.length!==2)throw new Error('LOCAL_TEST_ARGUMENTS_FORBIDDEN')
 await localPreflight();release=await acquireStateLock('staff-line-regression')
 directory=await mkdtemp(path.join(root,'.local/staff-line-tests-'))
 const state=path.join(directory,'state');await cp(statePath,state,{recursive:true,errorOnExist:true,force:false})
 for(const args of localPlan('migrate',state))await execute(process.execPath,args,{cwd:root,env:environment,timeout:45000,maxBuffer:4194304})
 const config=validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
 config.main=path.join(root,'backend/src/cloudflare/staff-line-check.ts');config.$schema=path.join(root,'node_modules/wrangler/config-schema.json')
 config.d1_databases[0].migrations_dir=path.join(root,'backend/prisma-d1/migrations')
 Object.assign(config.vars,{AUTH_SECRET:randomBytes(48).toString('hex'),LOCAL_API_TOKEN:token,VERIFY_TOKEN:audit})
 const file=path.join(directory,'worker.jsonc');await writeFile(file,JSON.stringify(config),{mode:0o600})
 const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value))})})
 origin=`http://127.0.0.1:${port}`
 async function start(){
  const fd=openSync(path.join(directory,'worker.log'),'a',0o600)
  child=spawn(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--local','--ip','127.0.0.1','--port',String(port),'--persist-to',state,'--config',file,'--env-file',path.join(root,'backend/cloudflare.env'),'--log-level','error'],{cwd:root,env:environment,stdio:['ignore',fd,fd],detached:true});closeSync(fd)
  exited=new Promise(resolve=>{child.once('exit',resolve);child.once('error',resolve)})
  let ready=false
  for(const deadline=Date.now()+30000;Date.now()<deadline;){if(child.exitCode!==null)throw new Error('WORKER_START_FAILED');try{ready=(await fetch(origin+'/health/live',{signal:AbortSignal.timeout(1000)})).ok}catch{ /* optional readiness or already-exited process */ }if(ready)break;await new Promise(resolve=>setTimeout(resolve,200))}
  assert.ok(ready,'WORKER_START_TIMEOUT')
 }
 async function call(route,{data,scope='workspace',cookie='',expected=200,headers={}}={}){
  const response=await fetch(origin+route,{method:data===undefined?'GET':'POST',headers:{'x-greenview-local-token':token,...(data!==undefined?{'content-type':'application/json',origin:scope==='customer'?'http://localhost:5175':'http://localhost:5174'}:{}),...(cookie?{cookie}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)})
  const body=await response.json();assert.equal(response.status,expected,route+': '+response.status+' '+(body.code||''))
  return {body,cookie:response.headers.get('set-cookie')?.split(';')[0]||cookie,headers:response.headers}
 }
 async function operator(name,data){const response=await fetch(origin+'/__audit/'+name,{method:'POST',headers:{'x-greenview-audit':audit,'content-type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,'FIXTURE_'+name);return response.json()}
 await start()
 const password='Local-Line-Test-12345',users=[]
 for(let index=0;index<5;index++){
  const email='staff-line-'+Date.now()+'-'+index+'@example.test'
  await operator('seed',{email,password})
  const login=await call('/api/auth/login',{data:{email,password}})
  users.push({email,cookie:login.cookie})
 }
 const lineA='U'+'a'.repeat(32),lineB='U'+'b'.repeat(32),lineC='U'+'c'.repeat(32)
 const message=(line,text='LINK STAFF')=>({type:'message',mode:'active',webhookEventId:randomUUID(),timestamp:Date.now(),source:{type:'user',userId:line},replyToken:'fixture-reply-'+randomUUID(),message:{id:randomUUID(),type:'text',text}})
 async function hook(events,{expected=200,signature,raw}={}){
  const body=raw??JSON.stringify({destination:'U'+'0'.repeat(32),events})
  const response=await fetch(origin+'/api/line/staff/webhook',{method:'POST',headers:{'content-type':'application/json','x-line-signature':signature??createHmac('sha256',audit).update(body).digest('base64')},body,signal:AbortSignal.timeout(30000)})
  const result=await response.json();assert.equal(response.status,expected,'WEBHOOK '+(result.code||''));return result
 }
 async function offer(line){
  await hook([message(line)])
  const {replies}=await operator('line-replies',{})
  const link=replies.at(-1).messages[0].text.split('\n').at(-1),params=new URLSearchParams(new URL(link).hash.slice(1))
  return Object.fromEntries(params)
 }
 const confirm=async(user,ticket,expected=200,extra={})=>call('/api/me/line',{cookie:user.cookie,data:{action:'confirm',...ticket,password,accepted:true,...extra},expected})
 const complete=(line,result,extra={})=>({type:'accountLink',mode:'active',webhookEventId:randomUUID(),timestamp:Date.now(),source:{type:'user',userId:line},link:{result:'ok',nonce:new URL(result.body.redirectUrl).searchParams.get('nonce')},...extra})
 await call('/api/me/line',{expected:401})
 const initial=await call('/api/me/line',{cookie:users[0].cookie})
 assert.equal(initial.body.status,'UNLINKED');assert.equal(initial.body.mode,'test');assert.equal(initial.body.notificationDeliveryEnabled,false)
 await call('/api/me/line',{cookie:users[0].cookie,data:{action:'unlink',userId:'another',version:0,confirmed:true},expected:400})
 await call('/api/me/line',{cookie:users[0].cookie,data:{action:'constructor'},expected:400})
 await hook([],{signature:'a'.repeat(43)+'=',expected:401});await hook([], {raw:JSON.stringify({destination:lineA,events:[]}),expected:400})
 const memberEmail='staff-line-customer-'+Date.now()+'@example.test'
 await call('/api/member/register',{scope:'customer',data:{email:memberEmail,password}})
 const mail=await operator('mail',{email:memberEmail,kind:'verify'})
 await call('/api/member/verify-email',{scope:'customer',data:{token:new URLSearchParams(new URL(mail.mail.link).hash.slice(1)).get('verify')}})
 const member=await call('/api/member/login',{scope:'customer',data:{email:memberEmail,password}})
 await call('/api/me/line',{cookie:member.cookie,expected:401})
 checks.push('staff session required, customer sessions denied, payload cannot choose another user, raw signature and destination enforced')
 const group=message(lineA);group.source={type:'group',groupId:'C'+'0'.repeat(32),userId:lineA}
 const beforeGroup=await operator('line-counts',{});await hook([group]);assert.deepEqual(await operator('line-counts',{}),beforeGroup)
 let ticket=await offer(lineA)
 const inspected=await call('/api/me/line',{cookie:users[0].cookie,data:{action:'inspect',...ticket}})
 assert.equal(inspected.body.displayName,'Local LINE test account')
 await confirm(users[0],ticket,400,{password:'wrong'})
 let result=await confirm(users[0],ticket)
 await hook([complete(lineB,result)])
 assert.equal((await call('/api/me/line',{cookie:users[0].cookie})).body.status,'UNLINKED')
 checks.push('group messages cannot link; step-up password required; a different LINE identity cannot complete a nonce')
 ticket=await offer(lineA);result=await confirm(users[0],ticket)
 const success=complete(lineA,result);await hook([success]);await hook([{...success,deliveryContext:{isRedelivery:true}}])
 let linkState=(await call('/api/me/line',{cookie:users[0].cookie})).body
 assert.equal(linkState.status,'LINKED');assert.equal(linkState.version,1)
 assert.ok(!JSON.stringify(linkState).includes(lineA));assert.ok(!JSON.stringify(linkState).includes(ticket.linkToken))
 await stop();await start()
 linkState=(await call('/api/me/line',{cookie:users[0].cookie})).body;assert.equal(linkState.status,'LINKED')
 checks.push('verified link is durable across Worker restart; duplicate webhook is idempotent and status never leaks identifiers/tokens')
 await call('/api/me/line',{cookie:users[0].cookie,data:{action:'unlink',version:0,confirmed:true},expected:409})
 await call('/api/me/line',{cookie:users[0].cookie,data:{action:'unlink',version:linkState.version,confirmed:true}})
 await hook([{...success,webhookEventId:randomUUID()}])
 assert.equal((await call('/api/me/line',{cookie:users[0].cookie})).body.status,'UNLINKED')
 ticket=await offer(lineA);result=await confirm(users[0],ticket)
 await call('/api/me/line',{cookie:users[0].cookie,data:{action:'cancel'}})
 await hook([complete(lineA,result)])
 assert.equal((await call('/api/me/line',{cookie:users[0].cookie})).body.status,'UNLINKED')
 checks.push('unlink requires current version; unlink/cancel invalidate pending callbacks and prevent resurrection')
 ticket=await offer(lineB);result=await confirm(users[1],ticket)
 await call('/api/auth/logout',{cookie:users[1].cookie,data:{}})
 await hook([complete(lineB,result)])
 assert.equal((await operator('line-counts',{})).bindings,0)
 ticket=await offer(lineB);result=await confirm(users[2],ticket)
 await operator('suspend',{email:users[2].email});await hook([complete(lineB,result)])
 assert.equal((await operator('line-counts',{})).bindings,0)
 checks.push('session revocation and account suspension before callback prevent linking')
 ticket=await offer(lineA);result=await confirm(users[0],ticket);await hook([complete(lineA,result)])
 const beforeRepeat=await operator('line-replies',{})
 await hook([message(lineA)])
 const afterRepeat=await operator('line-replies',{}),repeatText=afterRepeat.replies.at(-1).messages[0].text
 assert.equal(afterRepeat.issues,beforeRepeat.issues,'already-bound LINE must not issue another link token')
 assert.equal(afterRepeat.replies.length,beforeRepeat.replies.length+1)
 assert.match(repeatText,/เชื่อมบัญชีพนักงานแล้ว/);assert.match(repeatText,/Local audit manager/);assert.match(repeatText,/Admin Manager/)
 assert.ok(repeatText.endsWith('http://localhost:5174/login'));assert.ok(!repeatText.includes('/line/connect#'))
 await confirm(users[0],await offer(lineB),409)
 const left=await confirm(users[3],await offer(lineC)),right=await confirm(users[4],await offer(lineC))
 await Promise.all([hook([complete(lineC,left)]),hook([complete(lineC,right)])])
 const states=await Promise.all([users[3],users[4]].map(user=>call('/api/me/line',{cookie:user.cookie})))
 assert.equal(states.filter(value=>value.body.status==='LINKED').length,1)
 checks.push('one employee/one LINE per channel; concurrent callbacks cannot link one LINE to two staff')
 const expire=await offer(lineB);await operator('line-expire',expire)
 await call('/api/me/line',{cookie:users[4].cookie,data:{action:'inspect',...expire},expected:400})
 const failedReply=message('U'+'d'.repeat(32));await operator('line-fail-reply',{})
 const issuesBefore=(await operator('line-replies',{})).issues
 await hook([failedReply],{expected:503});await hook([failedReply]);await hook([failedReply])
 assert.equal((await operator('line-replies',{})).issues,issuesBefore+1)
 checks.push('expired tickets rejected; transient provider reply retries reuse encrypted ticket without duplicate issuance')
 const unfollow={type:'unfollow',mode:'active',webhookEventId:randomUUID(),timestamp:Date.now()-60000,source:{type:'user',userId:lineA}}
 await hook([unfollow]);assert.equal((await call('/api/me/line',{cookie:users[0].cookie})).body.status,'LINKED')
 await hook([{...unfollow,webhookEventId:randomUUID(),timestamp:Date.now()}]);assert.equal((await call('/api/me/line',{cookie:users[0].cookie})).body.status,'BLOCKED')
 checks.push('stale unfollow cannot overwrite a newer link; current unfollow blocks the verified recipient')
 await hook([message(lineA,'UNLINK STAFF')])
 assert.equal((await call('/api/me/line',{cookie:users[0].cookie})).body.status,'UNLINKED')
 checks.push('verified private LINE unlink works without treating LINE as a staff login')
 const report={status:'PASS',checks,environment:'local',provider:'signed local fixture; no live LINE calls',activeDataChanged:false,evidence:directory}
 await writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2),{mode:0o600});console.log('STAFF_LINE_PASS',JSON.stringify(report))
}catch(error){console.error('STAFF_LINE_FAILED',error.message,'EVIDENCE='+directory);process.exitCode=1}
finally{await stop();await release?.()}
