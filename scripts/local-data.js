// Offline snapshot -> isolated Local D1/R2 -> verified promotion. No remote API.
import {readFile,writeFile,mkdtemp,rename,unlink,lstat} from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'
import {verifySourceCheckpoint} from './local-import/checkpoint.js'
import {root,statePath,configPath,localEnvironment,localPlan} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock,promotionJournal} from './local-cloudflare-safety.js'
const run=promisify(execFile)
let release,platform,directory
const args=process.argv.slice(2),environment=localEnvironment()
const absent=async file=>!(await lstat(file).catch(error=>{if(error.code!=='ENOENT')throw error;return null}))
async function privateJSON(name,value){await writeFile(path.join(directory,name),JSON.stringify(value,null,2)+'\n',{mode:0o600})}
async function assertNoOpenState(){
  if(await absent(statePath))return
  try{
    const result=await run('/usr/sbin/lsof',['-t','+D',statePath],{env:environment,timeout:10000,maxBuffer:1048576})
    if(result.stdout.trim())throw new Error('LOCAL_STATE_IN_USE')
  }catch(error){if(error.code!==1)throw error}
}
async function openRuntime(persist){
  const {getPlatformProxy}=await import('wrangler')
  platform=await getPlatformProxy({configPath,persist:{path:path.join(persist,'v3')},remoteBindings:false})
  if(platform.env.APP_ENV!=='local'||Object.keys(platform.env).some(key=>!['DB','FILES','APP_ENV','D1_LOCATION_HINT'].includes(key)))throw new Error('LOCAL_BINDINGS_ONLY')
  return platform.env
}
async function closeRuntime(){if(platform){await platform.dispose();platform=null}}
try{
  if(args.length!==3||!['plan','apply','verify'].includes(args[0])||args[1]!=='--source'||!path.isAbsolute(args[2]))throw new Error('LOCAL_DATA_COMMAND_REQUIRED')
  await localPreflight();release=await acquireStateLock('data-'+args[0])
  for(const key of Object.keys(process.env))delete process.env[key]
  Object.assign(process.env,environment)
  directory=await mkdtemp(path.join(root,'.local/data-import-'))
  console.log('LOCAL_DATA_SOURCE_CHECK')
  const {loadSource}=await import('./local-import/source.js')
  const source=await loadSource(args[2],directory)
  await privateJSON('plan.private.json',source.summary)
  console.log('LOCAL_DATA_SOURCE_READY',JSON.stringify(source.summary))
  if(args[0]==='plan')console.log('LOCAL_DATA_PLAN_ONLY',directory)
  else{
    await assertNoOpenState()
    if(await absent(statePath))throw new Error('RUN_LOCAL_SETUP_FIRST')
    console.log('LOCAL_DATA_OPEN_EXISTING')
    const existing=await openRuntime(statePath)
    const {importData,verifyData}=await import('./local-import/transfer.js')
    const {quote}=await import('./local-import/values.js')
    const {verifyPrismaRuntime}=await import('./local-import/prisma-runtime.js')
    if(args[0]==='verify'){
      const marker=JSON.parse(await readFile(path.join(statePath,'import-checkpoint.json'),'utf8'))
      const checkpointProof=verifySourceCheckpoint(marker,source.summary)
      const report=await verifyData(source,existing)
      report.checkpointProof=checkpointProof
      await closeRuntime()
      report.prismaProof=await verifyPrismaRuntime(source,statePath,directory)
      report.prismaReadableModels=report.prismaProof.modelsVerified
      await privateJSON('verification.private.json',report)
      console.log('LOCAL_DATA_VERIFY_PASS',JSON.stringify({tables:report.tables.length,rows:source.summary.rows,files:report.files.length,moneyFields:report.money.length,evidence:directory}))
    }else{
      for(const table of source.tables){
        if((await existing.DB.prepare(`SELECT COUNT(*) AS n FROM ${quote(table.name)}`).first()).n!==0)throw new Error('TARGET_NOT_EMPTY:'+table.name)
      }
      if((await existing.FILES.list({limit:1})).objects.length)throw new Error('TARGET_R2_NOT_EMPTY')
      await closeRuntime()
      const stage=path.join(directory,'state'),previous=path.join(directory,'previous-local-state')
      console.log('LOCAL_DATA_PREPARE_ISOLATED_DATABASE')
      for(const command of localPlan('migrate',stage)){
        const result=await run(process.execPath,command,{cwd:root,env:environment,timeout:45000,maxBuffer:4194304})
        await writeFile(path.join(directory,'migrations.log'),result.stdout+result.stderr,{mode:0o600})
      }
      console.log('LOCAL_DATA_IMPORT_ISOLATED')
      const staged=await openRuntime(stage),result=await importData(source,staged)
      console.log('LOCAL_DATA_ROWS_IMPORTED',JSON.stringify(result))
      let report=await verifyData(source,staged)
      await closeRuntime()
      console.log('LOCAL_DATA_VERIFY_PRISMA_IN_WORKER')
      const prismaProof=await verifyPrismaRuntime(source,stage,directory)
      console.log('LOCAL_DATA_VERIFY_RESTART_PERSISTENCE')
      const restarted=await openRuntime(stage)
      report=await verifyData(source,restarted);report.restartVerified=true;report.prismaProof=prismaProof;report.prismaReadableModels=prismaProof.modelsVerified
      await closeRuntime()
      await privateJSON('reconciliation.private.json',report)
      await privateJSON('source-identity-issues.private.json',source.identityIssues)
      await writeFile(path.join(stage,'import-checkpoint.json'),JSON.stringify({...source.summary,verifiedAt:new Date().toISOString(),report:path.relative(root,path.join(directory,'reconciliation.private.json'))},null,2),{mode:0o600})
      await localPreflight();await assertNoOpenState()
      await writeFile(promotionJournal,JSON.stringify({stage,previous,active:statePath,fingerprint:source.summary.fingerprint}),{mode:0o600,flag:'wx'})
      await rename(statePath,previous)
      try{await rename(stage,statePath)}catch(error){await rename(previous,statePath);await unlink(promotionJournal);throw error}
      await privateJSON('promotion.json',{status:'COMPLETE',active:statePath,previousStateRetained:previous,sourceFingerprint:source.summary.fingerprint})
      await unlink(promotionJournal)
      console.log('LOCAL_DATA_IMPORT_PASS',JSON.stringify({tables:report.tables.length,rows:source.summary.rows,files:report.files.length,moneyFields:report.money.length,foreignKeys:report.foreignKeysChecked,prismaModels:report.prismaReadableModels,sourceIdentityIssues:source.summary.identity.missingCustomerAuth+source.summary.identity.missingStaffAuth,active:statePath,evidence:directory}))
    }
  }
}catch(error){
  if(directory)await privateJSON('failure.private.json',{message:error.message,stack:error.stack}).catch(()=>{})
  const code=/^[A-Za-z0-9_.:-]{1,160}$/.test(error.message)?error.message:'SEE_PRIVATE_FAILURE_REPORT'
  console.error('LOCAL_DATA_FAILED',code,directory||'')
  process.exitCode=1
}finally{await closeRuntime();await release?.()}
