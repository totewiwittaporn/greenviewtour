import {readFile,writeFile} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
import path from 'node:path'
import {root,configPath,localEnvironment,validateLocalConfig} from '../local-cloudflare-policy.js'
import {fail} from './values.js'
export async function verifyPrismaRuntime(source,persist,directory){
  const config=validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
  if(!path.resolve(persist).startsWith(path.join(root,'.local')+path.sep))fail('LOCAL_STATE_PATH_REQUIRED')
  const token=randomBytes(32).toString('hex')
  config.main=path.join(root,'backend/src/cloudflare/migration-check.ts')
  config.$schema=path.join(root,'node_modules/wrangler/config-schema.json')
  config.vars.VERIFY_TOKEN=token
  config.d1_databases[0].migrations_dir=path.join(root,'backend/prisma-d1/migrations')
  const stamp=Date.now(),file=path.join(directory,`prisma-check-${stamp}.jsonc`)
  await writeFile(file,JSON.stringify(config,null,2),{mode:0o600})
  const port=await new Promise((resolve,reject)=>{
    const server=createServer();server.once('error',reject)
    server.listen(0,'127.0.0.1',()=>{const selected=server.address().port;server.close(()=>resolve(selected))})
  })
  const args=[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--local','--ip','127.0.0.1','--port',String(port),'--persist-to',persist,'--config',file,'--env-file',path.join(root,'backend/cloudflare.env')]
  const fd=openSync(path.join(directory,`prisma-worker-${stamp}.log`),'a',0o600)
  const child=spawn(process.execPath,args,{cwd:root,env:localEnvironment(),stdio:['ignore',fd,fd],detached:process.platform!=='win32'})
  closeSync(fd)
  let startupError;child.once('error',error=>{startupError=error})
  const exited=new Promise(resolve=>{child.once('exit',resolve);child.once('error',resolve)})
  const kill=signal=>{
    if(!child.pid)return
    try{if(process.platform==='win32')child.kill(signal);else process.kill(-child.pid,signal)}catch(error){if(error.code!=='ESRCH')throw error}
  }
  try{
    const origin=`http://127.0.0.1:${port}`,headers={'x-greenview-audit':token}
    let ready=false
    for(const end=Date.now()+30000;Date.now()<end;){
      if(startupError)throw startupError
      if(child.exitCode!==null)fail('PRISMA_WORKER_EXITED')
      try{ready=(await fetch(origin+'/health/live',{headers,signal:AbortSignal.timeout(1000)})).ok}catch{ /* startup */ }
      if(ready)break
      await new Promise(resolve=>setTimeout(resolve,200))
    }
    if(!ready)fail('PRISMA_WORKER_START_TIMEOUT')
    const models=source.tables.map(table=>({name:table.name,columns:table.columns,primary:table.primary,fields:table.fields.map(({name,type,array,scale})=>({name,type,array,scale})),rows:table.rows.length}))
    const response=await fetch(origin+'/verify',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({models}),signal:AbortSignal.timeout(30000)})
    const proof=await response.json()
    await writeFile(path.join(directory,`prisma-proof-${stamp}.json`),JSON.stringify(proof,null,2),{mode:0o600})
    if(!response.ok||proof.status!=='PASS'||proof.modelsVerified!==models.length||proof.rows!==source.summary.rows||proof.transactionGuardVerified!==true)fail('PRISMA_WORKER_VERIFICATION_FAILED:'+String(proof.model||'contract')+':'+String(proof.column||'')+':'+String(proof.reason||''))
    return proof
  }finally{
    kill('SIGTERM');const timer=setTimeout(()=>kill('SIGKILL'),4000);timer.unref()
    await exited;clearTimeout(timer)
  }
}
