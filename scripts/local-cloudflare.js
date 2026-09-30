import {readFile,mkdir,readdir,lstat} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawn} from 'node:child_process'
import path from 'node:path'
import {root,configPath,statePath,validateCommand,validateLocalConfig,localEnvironment,localPlan} from './local-cloudflare-policy.js'
let child=null,stopping=false
function run(args){
  return new Promise((resolve,reject)=>{
    child=spawn(process.execPath,args,{cwd:root,env:localEnvironment(),stdio:'inherit',shell:false})
    child.once('error',reject)
    child.once('exit',(code,signal)=>{child=null;(stopping||code===0)?resolve():reject(new Error(`LOCAL_STEP_FAILED: ${code??signal}`))})
  })
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{stopping=true;if(child)child.kill(signal);else process.exit(0)})
try{
  const command=validateCommand(process.argv.slice(2))
  if(process.env.APP_ENV==='production'||process.env.NODE_ENV==='production')throw new Error('PRODUCTION_CONTEXT_FORBIDDEN')
  validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
  for(const directory of [root,path.join(root,'backend')]){
    if((await readdir(directory)).some(name=>name==='.dev.vars'||name.startsWith('.dev.vars.')))throw new Error('LOCAL_SECRET_FILE_REVIEW_REQUIRED')
  }
  const environmentFile=await readFile(path.join(root,'backend/cloudflare.env'),'utf8')
  if(environmentFile.split(/\r?\n/).some(line=>line.trim()&&!line.trim().startsWith('#')))throw new Error('LOCAL_ENV_FILE_MUST_BE_EMPTY')
  const checksums=JSON.parse(await readFile(path.join(root,'backend/prisma-d1/migration-checksums.json'),'utf8'))
  for(const [name,expected] of Object.entries(checksums)){
    const sql=await readFile(path.join(root,'backend/prisma-d1/migrations',name))
    if(createHash('sha256').update(sql).digest('hex')!==expected)throw new Error('APPLIED_MIGRATION_MODIFIED: '+name)
  }
  process.umask(0o077)
  for(const directory of [path.join(root,'.local'),statePath]){
    const existing=await lstat(directory).catch(error=>{if(error.code!=='ENOENT')throw error;return null})
    if(existing?.isSymbolicLink())throw new Error('LOCAL_STATE_SYMLINK_FORBIDDEN')
    await mkdir(directory,{recursive:true,mode:0o700})
  }
  console.log(`LOCAL_ONLY ${command}: no remote bindings, no deployment, no inherited provider credentials`)
  for(const args of localPlan(command)){if(stopping)break;await run(args)}
}catch(error){
  console.error(error.message)
  process.exitCode=1
}
