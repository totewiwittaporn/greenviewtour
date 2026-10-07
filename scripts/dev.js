// The only application dev workflow: Local workerd/D1/R2 + all three Vite apps.
import {spawn,execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createServer} from 'node:net'
import path from 'node:path'
import {root,statePath,localEnvironment} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock} from './local-cloudflare-safety.js'
import {localRuntimeConfig} from './local-auth-config.js'
const execute=promisify(execFile),children=[],workerOnly=process.argv.slice(2).join(' ')==='--worker-only'
let release,stopping=false,finish
const done=new Promise(resolve=>{finish=resolve})
function stop(code=0){if(stopping)return;stopping=true;process.exitCode=code;finish()}
function launch(args,cwd,env){
 const child=spawn(process.execPath,args,{cwd,env,stdio:'inherit',detached:true,shell:false})
 const exited=new Promise(resolve=>{child.once('exit',resolve);child.once('error',resolve)})
 children.push({child,exited})
 child.once('error',()=>stop(1));child.once('exit',code=>{if(!stopping)stop(code||1)})
 return child
}
async function portFree(port){await new Promise((resolve,reject)=>{const server=createServer();server.once('error',()=>reject(new Error('LOCAL_PORT_IN_USE:'+port)));server.listen(port,'127.0.0.1',()=>server.close(resolve))})}
async function ready(url){for(const deadline=Date.now()+30000;Date.now()<deadline&&!stopping;){try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)return}catch{ /* optional readiness or already-exited process */ }await new Promise(resolve=>setTimeout(resolve,200))}throw new Error('LOCAL_STARTUP_FAILED')}
process.once('SIGINT',()=>stop());process.once('SIGTERM',()=>stop())
try{
 if(process.argv.length>2&&!workerOnly)throw new Error('LOCAL_DEV_ARGUMENTS_INVALID')
 await localPreflight()
 const environment=localEnvironment()
 await execute(process.execPath,[path.join(root,'scripts/local-cloudflare.js'),'setup'],{cwd:root,env:environment,timeout:45000,maxBuffer:4194304})
 release=await acquireStateLock('application-dev')
 for(const port of workerOnly?[8787]:[8787,5173,5174,5175])await portFree(port)
 const {file,token}=await localRuntimeConfig()
 launch([path.join(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--local','--ip','127.0.0.1','--port','8787','--persist-to',statePath,'--config',file,'--env-file',path.join(root,'backend/cloudflare.env'),'--log-level','error'],root,environment)
 await ready('http://127.0.0.1:8787/health/live')
 if(!workerOnly){
  const env={...environment,LOCAL_API_PORT:'8787',LOCAL_API_TOKEN:token,VITE_STAFF_LOGIN_URL:'http://localhost:5174/login'}
  for(const [app,port] of [['public-web',5173],['backoffice',5174],['member',5175]])launch([path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],path.join(root,'frontend',app),env)
  await Promise.all([5173,5174,5175].map(port=>ready('http://127.0.0.1:'+port)))
 }
 console.log('\nGREENVIEW LOCAL READY\nPublic: http://localhost:5173\nBackoffice: http://localhost:5174\nMember: http://localhost:5175\nAPI: http://127.0.0.1:8787\nDatabase/files/auth: Local only. Ctrl+C stops this launcher.\n')
 await done
}catch(error){console.error(error.message);stop(1)}
finally{
 stopping=true
 for(const {child} of children)if(child.pid)try{process.kill(-child.pid,'SIGTERM')}catch{ /* optional readiness or already-exited process */ }
 const timer=setTimeout(()=>{for(const {child} of children)if(child.pid)try{process.kill(-child.pid,'SIGKILL')}catch{ /* optional readiness or already-exited process */ }},5000);timer.unref()
 await Promise.all(children.map(value=>value.exited));clearTimeout(timer)
 await release?.()
}
