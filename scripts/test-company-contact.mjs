// Real HTTP auth tests on an isolated copy of Local D1/R2.
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp,cp} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
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
 await localPreflight();release=await acquireStateLock('company-contact-regression')
 directory=await mkdtemp(path.join(root,'.local/company-contact-tests-'))
 const state=path.join(directory,'state');await cp(statePath,state,{recursive:true,errorOnExist:true,force:false})
 for(const args of localPlan('migrate',state))await execute(process.execPath,args,{cwd:root,env:environment,timeout:45000,maxBuffer:4194304})
 const config=validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
 config.main=path.join(root,'backend/src/cloudflare/auth-check.ts');config.$schema=path.join(root,'node_modules/wrangler/config-schema.json')
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
 const email='contact-manager-'+Date.now()+'@example.test',password='Contact-Fixture-12345'
 await operator('seed',{email,password})
 const login=await call('/api/auth/login',{data:{email,password}}),cookie=login.cookie
 const before=(await call('/api/settings/company',{cookie})).body.rows[0]
 assert.ok(before,'copied Local company is required')
 const published=(await call('/api/public/company')).body.company
 assert.equal(published.phone,'+66954266847');assert.equal(published.lineId,'@greenviewtour')
 assert.equal(published.instagramUrl,'https://www.instagram.com/greenviewtour/');assert.equal(published.email,null)
 for(const key of ['taxId','bankAccountNumber','bankName','paymentInstructions','id','version'])assert.equal(key in published,false)
 await call('/api/settings/company',{expected:401})
 const {initialValues}=await import('../packages/contracts/catalog.js')
 const input={...initialValues('company',before),id:before.id,version:before.version,phone:'095-426-6848',lineId:'@contact_test',instagramUrl:'https://instagram.com/contact_test',email:''}
 await call('/api/settings/company',{cookie,data:input})
 const updated=(await call('/api/public/company')).body.company
 assert.equal(updated.phone,'+66954266848');assert.equal(updated.lineId,'@contact_test');assert.equal(updated.instagramUrl,'https://www.instagram.com/contact_test/');assert.equal(updated.email,null)
 const after=(await call('/api/settings/company',{cookie})).body.rows[0]
 for(const key of ['name','taxId','bankName','bankAccountName','bankAccountNumber','paymentInstructions','address'])assert.equal(after[key],before[key])
 await call('/api/settings/company',{cookie,data:input,expected:409})
 await call('/api/settings/company',{cookie,data:{...input,version:after.version,instagramUrl:'https://evil.test/profile'},expected:400})
 await operator('suspend',{email})
 await call('/api/settings/company',{cookie,data:{...input,version:after.version},expected:401})
 await stop();await start()
 assert.deepEqual((await call('/api/public/company')).body.company,updated)
 checks.push('reviewed migration seeds latest contacts on copied Local company; private fields stay unpublished','authorized settings update is reflected in Public API and survives Worker restart','unauthenticated read, stale update, unsafe URL and suspended actor are rejected','existing private company fields preserved; email empty is null')
 const report={status:'PASS',checks,environment:'local',activeDataChanged:false,evidence:directory}
 await writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2),{mode:0o600});console.log('COMPANY_CONTACT_PASS',JSON.stringify(report))
}catch(error){console.error('COMPANY_CONTACT_FAILED',error.message,'EVIDENCE='+directory);process.exitCode=1}
finally{await stop();await release?.()}
