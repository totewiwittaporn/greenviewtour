// Offline migration of account IDs/password hashes only; no provider sessions/tokens.
import {readFile,writeFile,realpath,mkdtemp} from 'node:fs/promises'
import {randomUUID,createHash} from 'node:crypto'
import path from 'node:path'
import {sourceAuthDate,sourceAuthAccess} from './local-auth-source.js'
import {root,statePath,configPath,localEnvironment} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock} from './local-cloudflare-safety.js'
const args=process.argv.slice(2),digest=value=>createHash('sha256').update(value).digest('hex')
let release,platform,directory
try{
 if(args.length!==3||!['plan','apply','verify'].includes(args[0])||args[1]!=='--source'||!path.isAbsolute(args[2]))throw new Error('LOCAL_AUTH_IMPORT_COMMAND_REQUIRED')
 await localPreflight();release=await acquireStateLock('auth-import')
 const environment=localEnvironment();for(const key of Object.keys(process.env))delete process.env[key];Object.assign(process.env,environment)
 const source=await realpath(args[2]);if(source.startsWith(root+path.sep)||source===root)throw new Error('PRIVATE_BACKUP_OUTSIDE_REPOSITORY_REQUIRED')
 const manifest=JSON.parse(await readFile(path.join(source,'manifest.json'),'utf8'))
 if(manifest.sourceRef!=='qplzgpyidszxbtbyknjc'||!manifest.readOnly||!manifest.consistentSnapshot)throw new Error('SOURCE_SNAPSHOT_NOT_VERIFIED')
 const table=manifest.tables.find(row=>row.schema==='auth'&&row.name==='users')
 if(!table||table.file!=='auth/users.jsonl')throw new Error('SOURCE_AUTH_NOT_FOUND')
 const bytes=await readFile(path.join(source,table.file));if(digest(bytes)!==table.sha256)throw new Error('SOURCE_AUTH_CHECKSUM_MISMATCH')
 const records=bytes.toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line))
 const stamp=new Date().toISOString().replace('Z','+00:00')
 const date=sourceAuthDate
 const rows=records.map(row=>{
  if(!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(row.id)||typeof row.email!=='string'||!row.email.includes('@'))throw new Error('SOURCE_AUTH_IDENTITY_INVALID')
  const password=row.encrypted_password||null
  if(password&&!/^\$2[aby]\$(0[4-9]|1[0-6])\$[./A-Za-z0-9]{53}$/.test(password))throw new Error('SOURCE_PASSWORD_FORMAT_NOT_SUPPORTED')
  return {id:row.id.toLowerCase(),email:row.email.trim().toLowerCase(),name:row.email.split('@')[0],emailVerified:Boolean(row.email_confirmed_at),createdAt:date(row.created_at)||stamp,updatedAt:date(row.updated_at)||stamp,sourceCreatedAt:date(row.created_at),...sourceAuthAccess(row),password}
 })
 if(rows.length!==table.rows||new Set(rows.map(row=>row.id)).size!==rows.length||new Set(rows.map(row=>row.email)).size!==rows.length)throw new Error('SOURCE_AUTH_UNIQUENESS_FAILED')
 const summary={users:rows.length,credentials:rows.filter(row=>row.password).length,unverified:rows.filter(row=>!row.emailVerified).length,disabled:rows.filter(row=>row.disabled).length,permanentlyBanned:rows.filter(row=>row.permanentlyBanned).length,sourceCreatedAtMissing:rows.filter(row=>!row.sourceCreatedAt).length,passwordsReplaced:false,sessionsImported:0}
 if(args[0]==='plan')console.log('LOCAL_AUTH_IMPORT_PLAN',JSON.stringify(summary))
 else{
  directory=await mkdtemp(path.join(root,'.local/auth-import-'))
  const {getPlatformProxy}=await import('wrangler')
  platform=await getPlatformProxy({configPath,persist:{path:path.join(statePath,'v3')},remoteBindings:false})
  if(platform.env.APP_ENV!=='local')throw new Error('LOCAL_ONLY')
  const db=platform.env.DB,existing=(await db.prepare('SELECT count(*) AS n FROM AuthUser').first()).n
  const markerPath=path.join(statePath,'auth-import.json')
  if(args[0]==='apply'&&!existing){
   const statements=[]
   for(const row of rows){
    statements.push(db.prepare('INSERT INTO AuthUser(id,name,email,emailVerified,createdAt,updatedAt,sourceCreatedAt,disabled,bannedUntil) VALUES(?,?,?,?,?,?,?,?,?)').bind(row.id,row.name,row.email,Number(row.emailVerified),row.createdAt,row.updatedAt,row.sourceCreatedAt,Number(row.disabled),row.bannedUntil))
    if(row.password)statements.push(db.prepare('INSERT INTO AuthAccount(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)').bind(randomUUID(),row.id,'credential',row.id,row.password,row.createdAt,row.updatedAt))
   }
   await db.batch(statements)
   await writeFile(markerPath,JSON.stringify({sourceSha256:table.sha256,completedAt:stamp,...summary},null,2),{mode:0o600,flag:'wx'})
  }
  const marker=JSON.parse(await readFile(markerPath,'utf8'))
  if(marker.sourceSha256!==table.sha256)throw new Error('AUTH_SOURCE_MISMATCH_NO_OVERWRITE')
  const stored=(await db.prepare('SELECT id,email,emailVerified,sourceCreatedAt,disabled,bannedUntil FROM AuthUser ORDER BY id').all()).results
  if(stored.length!==rows.length)throw new Error('AUTH_USER_COUNT_MISMATCH')
  const accounts=(await db.prepare("SELECT userId,password FROM AuthAccount WHERE providerId='credential'").all()).results
  if(accounts.length!==summary.credentials)throw new Error('AUTH_ACCOUNT_COUNT_MISMATCH')
  const passwords=new Map(accounts.map(row=>[row.userId,row.password]))
  for(const row of stored){
   const expected=rows.find(item=>item.id===row.id)
   if(!expected||row.email!==expected.email||Boolean(row.emailVerified)!==expected.emailVerified||Boolean(row.disabled)!==expected.disabled||row.sourceCreatedAt!==expected.sourceCreatedAt||row.bannedUntil!==expected.bannedUntil||((passwords.get(row.id)||null)!==expected.password))throw new Error('AUTH_SOURCE_VALUE_MISMATCH')
  }
  const report={status:'PASS',environment:'local',...summary,sourceSha256:table.sha256,sourceModified:false}
  await writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2),{mode:0o600})
  console.log('LOCAL_AUTH_IMPORT_PASS',JSON.stringify(report))
 }
}catch(error){console.error('LOCAL_AUTH_IMPORT_FAILED',/^[A-Z_]+$/.test(error.message)?error.message:'SEE_PRIVATE_DIAGNOSTIC');process.exitCode=1}
finally{if(platform)await platform.dispose();await release?.()}
