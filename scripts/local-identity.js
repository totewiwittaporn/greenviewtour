// Local-only identity directory projection. Never imports password/session fields.
import {readFile,realpath,writeFile,mkdtemp} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {root,statePath,configPath,localEnvironment} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock} from './local-cloudflare-safety.js'
import {migratedDirectoryExpected} from './local-import/directory.js'
const args=process.argv.slice(2),hash=bytes=>createHash('sha256').update(bytes).digest('hex')
let release,platform,directory
try{
 if(args.length!==3||!['plan','apply','verify'].includes(args[0])||args[1]!=='--source'||!path.isAbsolute(args[2]))throw new Error('LOCAL_IDENTITY_COMMAND_REQUIRED')
 await localPreflight();release=await acquireStateLock('identity-directory')
 const environment=localEnvironment();for(const key of Object.keys(process.env))delete process.env[key];Object.assign(process.env,environment)
 const source=await realpath(args[2]);if(source===root||source.startsWith(root+path.sep))throw new Error('PRIVATE_SOURCE_OUTSIDE_REPOSITORY_REQUIRED')
 const manifest=JSON.parse(await readFile(path.join(source,'manifest.json'),'utf8'))
 if(manifest.sourceRef!=='qplzgpyidszxbtbyknjc'||!manifest.readOnly||!manifest.consistentSnapshot)throw new Error('VERIFIED_GREENVIEW_SOURCE_REQUIRED')
 const table=manifest.tables.find(row=>row.schema==='auth'&&row.name==='users')
 if(!table||table.file!=='auth/users.jsonl')throw new Error('SOURCE_IDENTITY_TABLE_REQUIRED')
 const bytes=await readFile(path.join(source,table.file));if(hash(bytes)!==table.sha256)throw new Error('SOURCE_CHECKSUM_MISMATCH')
 const date=value=>{if(value===null||value===undefined)return null;const parsed=new Date(value);if(!Number.isFinite(+parsed))throw new Error('SOURCE_IDENTITY_DATE_INVALID');return parsed.toISOString().replace('Z','+00:00')}
 const rows=bytes.toString('utf8').split('\n').filter(Boolean).map(line=>{
  const value=JSON.parse(line)
  if(!/^[a-f0-9-]{36}$/i.test(value.id)||typeof value.email!=='string'||!value.email.includes('@'))throw new Error('SOURCE_IDENTITY_INVALID')
  return {id:value.id.toLowerCase(),email:value.email.trim().toLowerCase(),email_confirmed_at:date(value.email_confirmed_at),created_at:date(value.created_at),last_sign_in_at:date(value.last_sign_in_at),provider:'supabase-source'}
 }).sort((a,b)=>a.id.localeCompare(b.id))
 if(rows.length!==table.rows||new Set(rows.map(row=>row.id)).size!==rows.length||new Set(rows.map(row=>row.email)).size!==rows.length)throw new Error('SOURCE_IDENTITY_COUNT_OR_UNIQUENESS_INVALID')
 directory=await mkdtemp(path.join(root,'.local/identity-projection-'))
 const fingerprint=hash(JSON.stringify(rows))
 if(args[0]==='plan'){console.log('LOCAL_IDENTITY_PLAN',JSON.stringify({rows:rows.length,sourceSnapshotAt:manifest.completedAt,passwordsImported:false,sessionsImported:false}));}
 else{
  const {getPlatformProxy}=await import('wrangler')
  platform=await getPlatformProxy({configPath,persist:{path:path.join(statePath,'v3')},remoteBindings:false})
  if(platform.env.APP_ENV!=='local')throw new Error('LOCAL_BINDINGS_REQUIRED')
  const db=platform.env.DB,existing=(await db.prepare('SELECT id,email,email_confirmed_at,created_at,last_sign_in_at,provider FROM D1Identity ORDER BY id').all()).results
  if(args[0]==='apply'&&!existing.length)await db.batch(rows.map(row=>db.prepare('INSERT INTO D1Identity(id,email,email_confirmed_at,created_at,last_sign_in_at,provider) VALUES(?,?,?,?,?,?)').bind(row.id,row.email,row.email_confirmed_at,row.created_at,row.last_sign_in_at,row.provider)))
  const stored=(await db.prepare('SELECT id,email,email_confirmed_at,created_at,last_sign_in_at,provider FROM D1Identity ORDER BY id').all()).results
  const migrated=(await db.prepare('SELECT id,email FROM AuthUser').all()).results
  const expected=migratedDirectoryExpected(rows,migrated)
  if(hash(JSON.stringify(stored))!==hash(JSON.stringify(expected)))throw new Error('IDENTITY_DIRECTORY_DIFFERS_NO_OVERWRITE_ALLOWED')
  const staffMissing=(await db.prepare('SELECT COUNT(*) AS n FROM UserProfile p LEFT JOIN D1Identity i ON i.id=p.id WHERE i.id IS NULL').first()).n
  const customerMissing=(await db.prepare('SELECT COUNT(*) AS n FROM CustomerProfile p LEFT JOIN D1Identity i ON i.id=p.authUserId WHERE p.authUserId IS NOT NULL AND i.id IS NULL').first()).n
  const report={status:'PASS',environment:'local',rows:stored.length,fingerprint,providerLabelsVerified:true,migratedAccounts:migrated.length,staffMissing,customerMissing,passwordsImported:false,sessionsImported:false,sourceModified:false}
  await writeFile(path.join(directory,'result.json'),JSON.stringify(report,null,2),{mode:0o600})
  console.log('LOCAL_IDENTITY_DIRECTORY_PASS',JSON.stringify(report))
 }
}catch(error){console.error('LOCAL_IDENTITY_FAILED',/^[A-Z_]+$/.test(error.message)?error.message:'SEE_PRIVATE_DIAGNOSTICS');process.exitCode=1}
finally{if(platform)await platform.dispose();await release?.()}
