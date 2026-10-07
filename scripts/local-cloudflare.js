import {mkdir} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import {root,statePath,validateCommand,localEnvironment,localPlan} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock} from './local-cloudflare-safety.js'
let child=null,stopping=false,release
function run(args){
  return new Promise((resolve,reject)=>{
    child=spawn(process.execPath,args,{cwd:root,env:localEnvironment(),stdio:'inherit',shell:false})
    child.once('error',reject)
    child.once('exit',(code,signal)=>{child=null;(stopping||code===0)?resolve():reject(new Error(`LOCAL_STEP_FAILED: ${code??signal}`))})
  })
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;child?.kill(signal)})
try{
  const command=validateCommand(process.argv.slice(2))
  await localPreflight()
  release=await acquireStateLock(command)
  await mkdir(statePath,{recursive:true,mode:0o700})
  console.log(`LOCAL_ONLY ${command}: no remote bindings, no deployment, no inherited provider credentials`)
  for(const args of localPlan(command)){if(stopping)break;await run(args)}
}catch(error){
  console.error(error.message)
  process.exitCode=1
}finally{await release?.()}
