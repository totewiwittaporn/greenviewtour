import {readFile,mkdir,readdir,lstat,writeFile,unlink,rmdir} from 'node:fs/promises'
import {randomUUID,createHash} from 'node:crypto'
import path from 'node:path'
import {root,configPath,statePath,validateLocalConfig} from './local-cloudflare-policy.js'
const exists=async file=>lstat(file).catch(error=>{if(error.code!=='ENOENT')throw error;return null})
export const promotionJournal=path.join(root,'.local/promotion.pending.json')
export async function localPreflight(){
  if(process.env.APP_ENV==='production'||process.env.NODE_ENV==='production')throw new Error('PRODUCTION_CONTEXT_FORBIDDEN')
  validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
  for(const directory of [root,path.join(root,'backend')]){
    if((await readdir(directory)).some(name=>name==='.dev.vars'||name.startsWith('.dev.vars.')))throw new Error('LOCAL_SECRET_FILE_REVIEW_REQUIRED')
  }
  const environment=await readFile(path.join(root,'backend/cloudflare.env'),'utf8')
  if(environment.split(/\r?\n/).some(line=>line.trim()&&!line.trim().startsWith('#')))throw new Error('LOCAL_ENV_FILE_MUST_BE_EMPTY')
  const checksums=JSON.parse(await readFile(path.join(root,'backend/prisma-d1/migration-checksums.json'),'utf8'))
  for(const [name,expected] of Object.entries(checksums)){
    const sql=await readFile(path.join(root,'backend/prisma-d1/migrations',name))
    if(createHash('sha256').update(sql).digest('hex')!==expected)throw new Error('APPLIED_MIGRATION_MODIFIED:'+name)
  }
  process.umask(0o077)
  for(const directory of [path.join(root,'.local'),statePath]){
    if((await exists(directory))?.isSymbolicLink())throw new Error('LOCAL_STATE_SYMLINK_FORBIDDEN')
  }
  await mkdir(path.join(root,'.local'),{recursive:true,mode:0o700})
  if(await exists(promotionJournal))throw new Error('LOCAL_PROMOTION_RECOVERY_REQUIRED')
}
export async function acquireLock(directory,purpose){
  try{await mkdir(directory,{mode:0o700})}catch(error){if(error.code==='EEXIST')throw new Error('LOCAL_STATE_BUSY');throw error}
  const token=randomUUID(),owner=path.join(directory,'owner.json')
  await writeFile(owner,JSON.stringify({pid:process.pid,token,purpose,startedAt:new Date().toISOString()}),{mode:0o600,flag:'wx'})
  return async()=>{
    const current=JSON.parse(await readFile(owner,'utf8'))
    if(current.token!==token)throw new Error('LOCAL_LOCK_OWNER_CHANGED')
    await unlink(owner);await rmdir(directory)
  }
}
export const acquireStateLock=purpose=>acquireLock(path.join(root,'.local/cloudflare.lock'),purpose)
