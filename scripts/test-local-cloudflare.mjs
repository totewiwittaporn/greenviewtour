// Real local workerd/D1/R2 integration; isolated scratch state, never the user's DB.
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {execFile,spawn} from 'node:child_process'
import {promisify} from 'node:util'
import {createServer} from 'node:net'
import path from 'node:path'
import {root,configPath,validateLocalConfig,localEnvironment,localPlan} from './local-cloudflare-policy.js'
const run=promisify(execFile),environment=localEnvironment()
for(const key of Object.keys(process.env))delete process.env[key]
Object.assign(process.env,environment)
process.umask(0o077)
validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
await mkdir(path.join(root,'.local'),{recursive:true,mode:0o700})
const directory=await mkdtemp(path.join(root,'.local/runtime-check-'))
const checks=[]
let platform,worker,exited
async function stopWorker(){
  if(!worker||worker.exitCode!==null||worker.signalCode)return
  worker.kill('SIGTERM')
  const timer=setTimeout(()=>worker.kill('SIGKILL'),5000);timer.unref()
  await exited;clearTimeout(timer)
}
try{
  for(const args of localPlan('migrate',directory)){
    const result=await run(process.execPath,args,{cwd:root,env:environment,timeout:60000,maxBuffer:4194304})
    await writeFile(path.join(directory,'migrations.log'),result.stdout+result.stderr,{mode:0o600})
  }
  const {getPlatformProxy}=await import('wrangler')
  const proxyOptions={configPath,persist:{path:path.join(directory,'v3')},remoteBindings:false}
  platform=await getPlatformProxy(proxyOptions)
  assert.equal(platform.env.APP_ENV,'local')
  assert.ok(Object.keys(platform.env).every(key=>['APP_ENV','D1_LOCATION_HINT','DB','FILES'].includes(key)))
  const db=platform.env.DB,bucket=platform.env.FILES
  const migrated=(await db.prepare('SELECT name FROM d1_migrations ORDER BY id').all()).results.map(row=>row.name)
  assert.deepEqual(migrated,['0001_baseline.sql','0002_scalar_array_lookups.sql','0003_json_range_projections.sql'])
  assert.equal((await db.prepare('SELECT count(*) AS n FROM "TourBooking"').first()).n,0)
  assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length,0)
  checks.push('fresh schema / three migrations / foreign keys')
  await db.prepare('CREATE TABLE _local_runtime_probe(id TEXT PRIMARY KEY, amount INTEGER NOT NULL CHECK(amount>=0))').run()
  await db.prepare('INSERT INTO _local_runtime_probe VALUES (?, ?)').bind('balance',100).run()
  await assert.rejects(()=>db.batch([
    db.prepare('UPDATE _local_runtime_probe SET amount=80 WHERE id=?').bind('balance'),
    db.prepare('INSERT INTO _local_runtime_probe VALUES (?, ?)').bind('balance',999),
  ]))
  assert.equal((await db.prepare('SELECT amount FROM _local_runtime_probe WHERE id=?').bind('balance').first()).amount,100)
  checks.push('D1 batch rollback after a failed statement')
  const json=await db.prepare("SELECT json_extract(?, '$.nested.value') AS value").bind(JSON.stringify({nested:{value:true}})).first()
  assert.equal(json.value,1);checks.push('D1 JSON round-trip')
  const key='local-runtime-proof.txt',body='Greenview Local R2 proof'
  assert.ok(await bucket.put(key,body,{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'text/plain'}}))
  assert.equal(await bucket.put(key,'must not overwrite',{onlyIf:{etagDoesNotMatch:'*'}}),null)
  assert.equal(await (await bucket.get(key)).text(),body)
  checks.push('R2 write/read and conditional overwrite protection')
  await platform.dispose();platform=null
  platform=await getPlatformProxy(proxyOptions)
  assert.equal((await platform.env.DB.prepare('SELECT amount FROM _local_runtime_probe WHERE id=?').bind('balance').first()).amount,100)
  assert.equal(await (await platform.env.FILES.get(key)).text(),body)
  checks.push('D1 and R2 persist across runtime restart')
  await platform.dispose();platform=null
  const port=await new Promise((resolve,reject)=>{
    const server=createServer();server.once('error',reject)
    server.listen(0,'127.0.0.1',()=>{const number=server.address().port;server.close(()=>resolve(number))})
  })
  const [args]=localPlan('dev',directory);args[args.indexOf('--port')+1]=String(port)
  const logPath=path.join(directory,'worker.log'),fd=openSync(logPath,'a',0o600)
  worker=spawn(process.execPath,args,{cwd:root,env:environment,stdio:['ignore',fd,fd],shell:false});closeSync(fd)
  let startError;worker.once('error',error=>{startError=error})
  exited=new Promise(resolve=>worker.once('exit',resolve))
  const origin=`http://127.0.0.1:${port}`
  let ready=false
  for(const end=Date.now()+30000;Date.now()<end;){
    if(startError)throw startError
    if(worker.exitCode!==null)throw new Error('LOCAL_WORKER_EXITED_BEFORE_READY')
    try{ready=(await fetch(origin+'/health/live',{signal:AbortSignal.timeout(1000)})).ok}catch{ /* startup */ }
    if(ready)break
    await new Promise(resolve=>setTimeout(resolve,200))
  }
  assert.ok(ready,'Local Worker must become ready')
  for(const endpoint of ['/health/live','/health/db','/health/storage']){
    const response=await fetch(origin+endpoint,{signal:AbortSignal.timeout(5000)})
    assert.equal(response.status,200);const result=await response.json();assert.equal(result.status,'UP')
    if(endpoint==='/health/live')assert.equal(result.environment,'local')
  }
  assert.equal((await fetch(origin+'/health/live',{method:'POST',signal:AbortSignal.timeout(5000)})).status,405)
  assert.equal((await fetch(origin+'/api/member/login',{signal:AbortSignal.timeout(5000)})).status,404)
  checks.push('actual Worker HTTP + Prisma D1 health + R2 health; app cutover still pending')
  await stopWorker()
  const report={status:'PASS',environment:'local',remoteBindings:false,fixtureDirectory:directory,checks,fullApplicationReady:false}
  await writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600})
  console.log('LOCAL_RUNTIME_PASS '+JSON.stringify(report))
}catch(error){
  console.error('LOCAL_RUNTIME_FAILED',error.message,'EVIDENCE='+directory)
  process.exitCode=1
}finally{
  if(platform)await platform.dispose()
  await stopWorker()
}
