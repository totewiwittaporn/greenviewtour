// Real HTTP auth tests on an isolated copy of Local D1/R2.
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp,cp} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {randomBytes,randomUUID} from 'node:crypto'
import {execFile,spawn} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'
import {createServer} from 'node:net'
import {root,statePath,configPath,localEnvironment,localPlan,validateLocalConfig} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock} from './local-cloudflare-safety.js'
const execute=promisify(execFile),environment=localEnvironment(),checks=[]
let release,child,exited,directory,origin
const token=randomBytes(32).toString('hex'),audit=randomBytes(32).toString('hex')
async function stop(){
 if(!child?.pid)return
 if(process.platform==='win32'){
  const pid=child.pid
  await execute('taskkill',['/PID',String(pid),'/T','/F'],{timeout:10000,windowsHide:true}).catch(()=>{})
  await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(new Error('WORKER_STOP_TIMEOUT')),10000))])
  child=null
  return
 }
 try{process.kill(-child.pid,'SIGTERM')}catch{ /* optional readiness or already-exited process */ }
 const timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL')}catch{ /* optional readiness or already-exited process */ }},5000)
 timer.unref()
 await exited
 clearTimeout(timer)
 child=null
}
try{
 if(process.argv.length!==2)throw new Error('LOCAL_TEST_ARGUMENTS_FORBIDDEN')
 await localPreflight();release=await acquireStateLock('staff-digest-regression')
 directory=await mkdtemp(path.join(root,'.local/staff-digest-tests-'))
 const state=path.join(directory,'state');await cp(statePath,state,{recursive:true,errorOnExist:true,force:false})
 for(const args of localPlan('migrate',state))await execute(process.execPath,args,{cwd:root,env:environment,timeout:45000,maxBuffer:4194304})
 const config=validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
 config.main=path.join(root,'backend/src/cloudflare/staff-digest-check.ts');config.$schema=path.join(root,'node_modules/wrangler/config-schema.json')
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
 const stamp=Date.now(),email='digest-manager-'+stamp+'@example.test',staffEmail='digest-staff-'+stamp+'@example.test',password='Digest-Fixture-12345',serviceDate='2026-11-02'
 await operator('seed',{email,password});await operator('seed',{email:staffEmail,password})
 const job=await operator('digest-job',{email:staffEmail,serviceDate})
 const login=await call('/api/auth/login',{data:{email,password}}),cookie=login.cookie
 const endpoint='/api/operations/staff-digests'
 await call(endpoint+'?date='+serviceDate,{expected:401})
 const staffLogin=await call('/api/auth/login',{data:{email:staffEmail,password}})
 await call(endpoint+'?date='+serviceDate,{cookie:staffLogin.cookie,expected:403})
 const preview=(await call(endpoint+'?date='+serviceDate,{cookie})).body
 const row=preview.rows.find(r=>r.userId===job.userId)
 assert.ok(row,'STAFF_PREVIEW_ROW_REQUIRED '+JSON.stringify(preview));assert.ok(row.jobs.length);assert.equal(row.reason,'NOT_LINKED');assert.match(row.messages[0].text,/Cleaning/)
 assert.doesNotMatch(JSON.stringify(preview),/PRIVATE CUSTOMER|SECRET NOTE|lineUserId|accessToken/)
 const concurrent=await Promise.all([call(endpoint,{cookie,data:{action:'prepare',serviceDate}}),call(endpoint,{cookie,data:{action:'prepare',serviceDate}})])
 const prepared=concurrent[0].body
 const item=prepared.rows.find(r=>r.userId===job.userId);assert.ok(item.id)
 assert.equal(concurrent[1].body.rows.find(r=>r.userId===job.userId).id,item.id)
 const duplicate=(await call(endpoint,{cookie,data:{action:'prepare',serviceDate}})).body
 assert.equal(duplicate.rows.find(r=>r.userId===job.userId).id,item.id)
 const simulated=(await call(endpoint,{cookie,data:{action:'simulate',id:item.id}})).body
 assert.equal(simulated.status,'SIMULATED');assert.equal(simulated.accepted,false)
 const again=(await call(endpoint,{cookie,data:{action:'simulate',id:item.id}})).body
 assert.equal(again.status,'SIMULATED');assert.equal(again.attempts,simulated.attempts)
 const commandId=randomUUID()
 const resend=(await call(endpoint,{cookie,data:{action:'resend',id:item.id,commandId}})).body
 assert.notEqual(resend.id,item.id);assert.equal(resend.status,'PREPARED')
 const repeatResend=(await call(endpoint,{cookie,data:{action:'resend',id:item.id,commandId}})).body
 assert.equal(repeatResend.id,resend.id)
 assert.equal((await call(endpoint,{cookie,data:{action:'simulate',id:resend.id}})).body.status,'SIMULATED')
 await call(endpoint,{cookie,data:{action:'live',id:item.id},expected:400})
 await call(endpoint,{cookie,data:{action:'simulate',id:item.id,to:'U'+'a'.repeat(32)},expected:400})
 await operator('digest-change',{email:staffEmail,id:job.id})
 const changed=(await call(endpoint,{cookie,data:{action:'prepare',serviceDate}})).body.rows.find(r=>r.userId===job.userId)
 assert.notEqual(changed.id,item.id)
 await operator('digest-change',{email:staffEmail,id:job.id})
 const blocked=(await call(endpoint,{cookie,data:{action:'simulate',id:changed.id}})).body
 assert.equal(blocked.status,'BLOCKED')
 const before=await operator('digest-tick',{email,localTime:'23:00',now:'2026-11-01T15:59:59Z'})
 assert.equal(before.status,'NOT_DUE')
 const tick=await operator('digest-tick',{email,localTime:'23:00',now:'2026-11-01T16:00:00Z'})
 const secondTick=await operator('digest-tick',{email,localTime:'23:00',now:'2026-11-01T16:01:00Z'})
 assert.equal(tick.serviceDate,serviceDate);assert.deepEqual(tick.result.rows.map(r=>r.id),secondTick.result.rows.map(r=>r.id))
 await stop();await start()
 assert.equal((await call(endpoint,{cookie,data:{action:'simulate',id:item.id}})).body.status,'SIMULATED')
 await operator('digest-remove-role',{email:staffEmail})
 const removed=(await call(endpoint+'?date='+serviceDate,{cookie})).body.rows.find(r=>r.userId===job.userId)
 assert.equal(removed,undefined)
 checks.push('actual D1/HTTP manager authorization and staff rejection; private job details omitted','prepare deduplicates; manual simulation persists once without provider calls; arbitrary live/recipient commands rejected','changed work blocks stale prepared payload; Local tick selects tomorrow and deduplicates across ticks','restart preserves outbox; removed role removes recipient eligibility')
 const report={status:'PASS',checks,environment:'local',activeDataChanged:false,evidence:directory}
 await writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2),{mode:0o600});console.log('STAFF_DIGEST_PASS',JSON.stringify(report))
}catch(error){console.error('STAFF_DIGEST_FAILED',error.message,'EVIDENCE='+directory);process.exitCode=1}
finally{await stop();await release?.()}
