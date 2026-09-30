// Isolated workerd regression: copies Local state; never changes active data.
import {readFile,writeFile,mkdtemp,cp} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import {spawn,execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createServer} from 'node:net'
import path from 'node:path'
import {root,statePath,configPath,localEnvironment,validateLocalConfig,localPlan} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock} from './local-cloudflare-safety.js'
const execute=promisify(execFile),suites=process.argv.slice(2)
if(!suites.length)suites.push('core')
if(suites.some(suite=>!['core','capacity','operations','dispatch','reports','finance','identity','member','catalog','attendance','demo'].includes(suite)))throw new Error('UNKNOWN_LOCAL_SUITE')
let release,child,exited,directory
const environment=localEnvironment()
function kill(signal){if(!child?.pid)return;try{process.kill(-child.pid,signal)}catch(error){if(error.code!=='ESRCH')throw error}}
try{
 await localPreflight();release=await acquireStateLock('business-regression')
 for(const key of Object.keys(process.env))delete process.env[key]
 Object.assign(process.env,environment)
 try{const opened=await execute('/usr/sbin/lsof',['-t','+D',statePath],{timeout:10000});if(opened.stdout.trim())throw new Error('LOCAL_STATE_IN_USE')}catch(error){if(error.code!==1)throw error}
 directory=await mkdtemp(path.join(root,'.local/item3-tests-'))
 const state=path.join(directory,'state');await cp(statePath,state,{recursive:true,errorOnExist:true,force:false})
 for(const args of localPlan('migrate',state)){
  const result=await execute(process.execPath,args,{cwd:root,env:environment,timeout:45000,maxBuffer:4194304})
  await writeFile(path.join(directory,'migrations.log'),result.stdout+result.stderr,{mode:0o600})
 }
 const config=validateLocalConfig(JSON.parse(await readFile(configPath,'utf8'))),token=randomBytes(32).toString('hex')
 config.main=path.join(root,'backend/src/cloudflare/atomic-check.ts');config.$schema=path.join(root,'node_modules/wrangler/config-schema.json')
 config.vars.VERIFY_TOKEN=token;config.d1_databases[0].migrations_dir=path.join(root,'backend/prisma-d1/migrations')
 const configFile=path.join(directory,'worker.jsonc');await writeFile(configFile,JSON.stringify(config,null,2),{mode:0o600})
 const port=await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})})
 const args=[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--local','--ip','127.0.0.1','--port',String(port),'--persist-to',state,'--config',configFile,'--env-file',path.join(root,'backend/cloudflare.env')]
 const fd=openSync(path.join(directory,'worker.log'),'a',0o600)
 child=spawn(process.execPath,args,{cwd:root,env:environment,stdio:['ignore',fd,fd],detached:true});closeSync(fd)
 exited=new Promise(resolve=>{child.once('exit',resolve);child.once('error',resolve)})
 const origin=`http://127.0.0.1:${port}`,headers={'x-greenview-audit':token}
 let ready=false
 for(const end=Date.now()+30000;Date.now()<end;){
  if(child.exitCode!==null)throw new Error('WORKER_START_FAILED')
  try{ready=(await fetch(origin+'/health/live',{headers,signal:AbortSignal.timeout(1000)})).ok}catch{ /* startup */ }
  if(ready)break
  await new Promise(resolve=>setTimeout(resolve,200))
 }
 if(!ready)throw new Error('WORKER_START_TIMEOUT')
 const reports=[];let failed=false
 for(const suite of suites){
  const response=await fetch(origin+'/'+suite,{method:'POST',headers,signal:AbortSignal.timeout(90000)})
  const report=await response.json();reports.push(report)
  await writeFile(path.join(directory,'result.json'),JSON.stringify({environment:'local',activeDataChanged:false,reports},null,2),{mode:0o600})
  console.log('D1_BUSINESS_SUITE',JSON.stringify(report))
  if(!response.ok||report.status!=='PASS')failed=true
 }
 if(failed)throw new Error('D1_BUSINESS_SUITE_FAILED')
 console.log('D1_BUSINESS_PASS',directory)
}catch(error){console.error('D1_BUSINESS_FAILED',error.message,'EVIDENCE='+directory);process.exitCode=1}
finally{
 if(child){kill('SIGTERM');const timer=setTimeout(()=>kill('SIGKILL'),5000);timer.unref();await exited;clearTimeout(timer)}
 await release?.()
}
