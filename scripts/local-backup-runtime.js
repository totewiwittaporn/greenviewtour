import path from 'node:path'
import {fileHash} from './local-backup-files.js'
import {configPath,localEnvironment} from './local-cloudflare-policy.js'
// Opens only a restored copy through real Local workerd bindings, never a cloud API.
export async function proveLocalBackup(state){
 const environment=localEnvironment()
 for(const key of Object.keys(process.env))delete process.env[key]
 Object.assign(process.env,environment)
 const {getPlatformProxy}=await import('wrangler')
 const platform=await getPlatformProxy({configPath,persist:{path:path.join(state,'v3')},remoteBindings:false})
 try{
  if(platform.env.APP_ENV!=='local')throw new Error('LOCAL_BACKUP_RUNTIME_REQUIRED')
  const db=platform.env.DB,storage=platform.env.FILES
  const quick=(await db.prepare('PRAGMA quick_check').all()).results
  if(quick.length!==1||Object.values(quick[0])[0]!=='ok')throw new Error('BACKUP_DATABASE_INTEGRITY_FAILED')
  if((await db.prepare('PRAGMA foreign_key_check').all()).results.length)throw new Error('BACKUP_FOREIGN_KEY_FAILED')
  const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()).results
  const tables=[]
  for(const {name} of names){
   if(name.startsWith('_cf_'))continue // D1 internal metadata is not an application table and is not queryable.
   const rows=[],table='"'+name.replaceAll('"','""')+'"'
   for(let offset=0;;offset+=250){const page=(await db.prepare('SELECT * FROM '+table+' LIMIT 250 OFFSET ?').bind(offset).all()).results;rows.push(...page);if(page.length<250)break}
   tables.push({name,rows:rows.length,sha256:fileHash(rows.map(row=>JSON.stringify(row)).sort().join('\n'))})
  }
  const files=[];let cursor
  do{
   const batch=await storage.list({limit:1000,cursor})
   for(const object of batch.objects){const value=await storage.get(object.key);files.push({key:object.key,size:object.size,sha256:fileHash(new Uint8Array(await value.arrayBuffer()))})}
   cursor=batch.truncated?batch.cursor:undefined
  }while(cursor)
  if(!tables.some(table=>table.name==='TourBooking')||!tables.some(table=>table.name==='AuthUser'))throw new Error('GREENVIEW_BACKUP_TABLES_REQUIRED')
  return {runtime:'local-workerd',tables:tables.filter(table=>table.name!=='_cf_METADATA'),files:files.sort((a,b)=>a.key.localeCompare(b.key)),quickCheck:'ok',foreignKeyIssues:0}
 }finally{await platform.dispose()}
}
