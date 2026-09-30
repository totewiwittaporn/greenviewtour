// Read-only backup of the Greenview migration source. Never writes remote rows.
import {loadEnvFile} from 'node:process'
import {readFile,writeFile,mkdir,chmod,rename,realpath,stat} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import pg from 'pg'
import {databaseConfig,PREVIEW_PROJECT_REF} from '../backend/src/platform/database/config.js'
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)))
const run=promisify(execFile)
const quote=value=>'"'+value.replaceAll('"','""')+'"'
const schemas=['app_private','auth','storage','public']
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const args=process.argv.slice(2)
let client,directory
process.umask(0o077)
try{
  if(args.length!==4||args[0]!=='--source-ref'||args[1]!==PREVIEW_PROJECT_REF||args[2]!=='--directory')throw new Error('EXPLICIT_VERIFIED_SOURCE_AND_BACKUP_DIRECTORY_REQUIRED')
  if(process.env.NODE_ENV==='production')throw new Error('PRODUCTION_BACKUP_NOT_AUTHORIZED')
  directory=await realpath(args[3])
  if(directory===root||directory.startsWith(root+path.sep))throw new Error('BACKUP_MUST_BE_OUTSIDE_REPOSITORY')
  await chmod(directory,0o700)
  for(const name of ['source-database.private.dump','source-database.private.dump.partial','migration-export.private']){
    const exists=await stat(path.join(directory,name)).catch(error=>{if(error.code!=='ENOENT')throw error;return null})
    if(exists)throw new Error('SOURCE_BACKUP_ALREADY_EXISTS_USE_NEW_DIRECTORY')
  }
  loadEnvFile(path.join(root,'backend/.env'))
  const config=databaseConfig(process.env)
  const ca=await readFile(process.env.PGSSLROOTCERT,'utf8')
  client=new pg.Client({...config,ssl:{rejectUnauthorized:true,ca},statement_timeout:20000,query_timeout:25000,application_name:'greenview-source-readonly-backup'})
  await client.connect()
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  const {rows:[state]}=await client.query("SELECT current_setting('transaction_read_only') AS read_only, pg_export_snapshot() AS snapshot, current_setting('server_version') AS version")
  if(state.read_only!=='on')throw new Error('READ_ONLY_TRANSACTION_REQUIRED')
  const tools='/opt/homebrew/opt/libpq/bin/'
  const dump=path.join(directory,'source-database.private.dump')
  const environment={...process.env,PGSSLMODE:'verify-full',PGCONNECT_TIMEOUT:'10',PGAPPNAME:'greenview-source-readonly-pgdump'}
  const dumpArgs=['--format=custom','--no-password','--lock-wait-timeout=10000',`--snapshot=${state.snapshot}`,`--file=${dump}.partial`,...schemas.map(schema=>`--schema=${schema}`)]
  await run(tools+'pg_dump',dumpArgs,{env:environment,timeout:120000,maxBuffer:1048576})
  await rename(dump+'.partial',dump)
  const exportDir=path.join(directory,'migration-export.private')
  await mkdir(exportDir,{mode:0o700})
  const tables=(await client.query("SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema=ANY($1::text[]) AND table_type='BASE TABLE' ORDER BY table_schema,table_name",[schemas])).rows
  const columns=(await client.query("SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema=ANY($1::text[]) ORDER BY table_schema,table_name,ordinal_position",[schemas])).rows
  const manifest={formatVersion:1,sourceRef:PREVIEW_PROJECT_REF,schemas,startedAt:new Date().toISOString(),serverVersion:state.version,readOnly:true,consistentSnapshot:true,tables:[]}
  for(const table of tables){
    const schema=table.table_schema,name=table.table_name
    const records=(await client.query(`SELECT row_to_json(t)::text AS record FROM ${quote(schema)}.${quote(name)} AS t`)).rows
    // Preserve PostgreSQL decimals and bigint: never parse records through JS Number.
    const content=records.map(row=>row.record).join('\n')+(records.length?'\n':'')
    const sub=path.join(exportDir,schema);await mkdir(sub,{mode:0o700,recursive:true})
    const filename=path.join(sub,name+'.jsonl');await writeFile(filename,content,{mode:0o600,flag:'wx'})
    manifest.tables.push({schema,name,rows:records.length,sha256:digest(content),file:path.relative(exportDir,filename)})
  }
  await client.query('COMMIT');await client.end();client=null
  await writeFile(path.join(exportDir,'columns.json'),JSON.stringify(columns,null,2)+'\n',{mode:0o600})
  const listed=await run(tools+'pg_restore',['--list',dump],{timeout:30000,maxBuffer:8388608})
  await writeFile(path.join(directory,'dump-contents.private.txt'),listed.stdout,{mode:0o600})
  await run(tools+'pg_restore',['--file=/dev/null',dump],{timeout:30000,maxBuffer:1048576})
  manifest.archiveSha256=digest(await readFile(dump))
  manifest.archiveReadable=true;manifest.restoreTested=false
  manifest.storageObjectCount=manifest.tables.find(t=>t.schema==='storage'&&t.name==='objects')?.rows??null
  manifest.storageFilesBackedUp=manifest.storageObjectCount===0
  manifest.fileBytesIncludedInBusinessRows=true
  manifest.completedAt=new Date().toISOString()
  await writeFile(path.join(exportDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600})
  const summary={sourceRef:manifest.sourceRef,schemas,completedAt:manifest.completedAt,archiveReadable:true,restoreTested:false,consistentSnapshot:true,readOnly:true,tableCount:tables.length,applicationTables:manifest.tables.filter(t=>t.schema==='app_private'&&t.name!=='_prisma_migrations').length,authUsers:manifest.tables.find(t=>t.schema==='auth'&&t.name==='users')?.rows,storageObjectCount:manifest.storageObjectCount,storageFilesBackedUp:manifest.storageFilesBackedUp}
  await writeFile(path.join(directory,'source-backup-summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600})
  console.log('SOURCE_BACKUP_OK '+JSON.stringify({directory,...summary}))
}catch(error){
  if(client){await client.query('ROLLBACK').catch(()=>{});await client.end().catch(()=>{})}
  console.error('SOURCE_BACKUP_FAILED',error.code||(/^[A-Z_]+$/.test(error.message)?error.message:'PRIVATE_DIAGNOSTIC_REQUIRED'))
  process.exitCode=1
}
