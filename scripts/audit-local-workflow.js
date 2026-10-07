// Static audit: no credentials, network, database changes or deployment; Windows secret ACL check uses local read-only icacls.
import {readFile,readdir,lstat} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {root,validateLocalConfig} from './local-cloudflare-policy.js'
function localSecretPrivate(secret){
 if(!secret?.isFile()||secret.isSymbolicLink())return false
 if(process.platform!=='win32')return (secret.mode&0o077)===0
 const domain=String(process.env.USERDOMAIN||'').trim(),username=String(process.env.USERNAME||'').trim()
 if(!domain||!username)return false
 try{
  const windowsRoot=process.env.SystemRoot||path.join(process.env.SystemDrive||'C:','Windows')
  const executable=path.join(windowsRoot,'System32','icacls.exe')
  const acl=execFileSync(executable,[path.join(root,'.local/auth.secret')],{encoding:'utf8',windowsHide:true}).toLowerCase()
  const identity=(domain+'\\'+username).toLowerCase()
  return acl.includes(identity)&&!['everyone','builtin\\users','nt authority\\authenticated users'].some(name=>acl.includes(name))
 }catch{return false}
}
export async function auditLocalWorkflow(){
 const failures=[],checks=[],json=async name=>JSON.parse(await readFile(path.join(root,name),'utf8'))
 const check=(condition,name)=>{if(!condition)failures.push(name);else checks.push(name)}
 const packages=['package.json','backend/package.json',...['public-web','backoffice','member'].map(app=>'frontend/'+app+'/package.json')]
 for(const file of packages){
  const pkg=await json(file),dependencies={...pkg.dependencies,...pkg.devDependencies}
  check(!['pg','@prisma/adapter-pg','@supabase/supabase-js'].some(name=>name in dependencies),'no retired provider dependencies: '+file)
  check(!Object.keys(pkg.scripts||{}).some(name=>/^preview(?::|$)/.test(name)),'no hosted-Preview command names: '+file)
  for(const command of Object.values(pkg.scripts||{}))check(!/--remote|migrate deploy|SUPABASE|wrangler\s+deploy(?!.*--dry-run)/.test(command),'reviewed package command: '+command)
 }
 validateLocalConfig(await json('backend/wrangler.jsonc'));checks.push('Local bindings and publication gates')
 const production=await json('backend/wrangler.production.jsonc.example')
 check(production.vars.APP_ENV==='production'&&production.workers_dev===false&&production.preview_urls===false&&production.d1_databases.every(db=>db.database_id.includes('SET_ONLY_AFTER_PRODUCTION_RELEASE_APPROVAL')),'Production template is unbound')
 const retirement=await json('scripts/retired-commands.json')
 for(const item of retirement){
  const text=await readFile(path.join(root,item.path),'utf8')
  const target=path.relative(path.dirname(item.path),'scripts/retired-source-command.js').split(path.sep).join('/')
  check(text.trim().split('\n').length===2&&text.includes('import '+JSON.stringify(target.startsWith('.')?target:'./'+target)),'retired entrypoint: '+item.path)
 }
 const config=await readFile(path.join(root,'backend/prisma.config.ts'),'utf8')
 check(!/loadEnvFile|process\.env|SUPABASE|PGPASSWORD/.test(config)&&config.includes('127.0.0.1:1/')&&config.includes('REFERENCE_DATABASE_COMMAND_RETIRED'),'reference Prisma cannot load source credentials')
 for(const relative of ['', 'backend', 'frontend/public-web', 'frontend/backoffice', 'frontend/member']){
  const files=await readdir(path.join(root,relative))
  check(!files.some(name=>(name==='.env'||name.startsWith('.env.')||name==='.dev.vars'||name.startsWith('.dev.vars.'))&&!name.endsWith('.example')),'no active legacy env files: '+(relative||'root'))
  check(!files.some(name=>/^wrangler\.(?:preview|production)\.(?:json|jsonc|toml)$/.test(name)),'no enabled hosted configs: '+(relative||'root'))
 }
 const ci=await readFile(path.join(root,'.github/workflows/ci.yml'),'utf8')
 check(!/CLOUDFLARE_API_TOKEN|wrangler deploy|pages deploy|railway up/.test(ci),'CI has no publication step or cloud credentials')
 for(const filename of ['backend/src/platform/auth/provider.js','backend/src/platform/database/pool.js','backend/src/platform/database/prisma.js','backend/src/platform/database/config.js']){
  const source=await readFile(path.join(root,filename),'utf8')
  check(source.includes('retiredSource as')&&!/from ['"](?:pg|@supabase|@prisma)/.test(source),'remote adapter retired: '+filename)
 }
 const worker=await readFile(path.join(root,'backend/src/cloudflare/worker.ts'),'utf8')
 const environment=await readFile(path.join(root,'backend/src/cloudflare/environment.js'),'utf8')
 check(worker.includes('requestEnvironment(request,env)')&&environment.includes("env.PRODUCTION_ENABLED!=='true'")&&environment.includes('PRODUCTION_NOT_ENABLED'),'Worker hosted execution requires explicit release opt-in')
 const secret=await lstat(path.join(root,'.local/auth.secret')).catch(error=>{if(error.code!=='ENOENT')throw error;return null})
 if(secret)check(localSecretPrivate(secret),'Local auth secret is private')
 return {status:failures.length?'FAIL':'PASS',checks:checks.length,retiredEntrypoints:retirement.length,failures}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await auditLocalWorkflow();console.log('LOCAL_WORKFLOW_AUDIT',JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1}
 catch(error){console.error('LOCAL_WORKFLOW_AUDIT_FAILED',error.code||error.message);process.exitCode=1}
}
