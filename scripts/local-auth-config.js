import {readFile,writeFile,mkdir,lstat,chmod} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
import path from 'node:path'
import {root,configPath,validateLocalConfig} from './local-cloudflare-policy.js'
export async function localRuntimeConfig(){
 const config=validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
 const secretPath=path.join(root,'.local/auth.secret')
 const existing=await lstat(secretPath).catch(error=>{if(error.code!=='ENOENT')throw error;return null})
 if(existing?.isSymbolicLink())throw new Error('AUTH_SECRET_SYMLINK_FORBIDDEN')
 if(!existing)await writeFile(secretPath,randomBytes(48).toString('hex'),{mode:0o600,flag:'wx'})
 await chmod(secretPath,0o600)
 const secret=(await readFile(secretPath,'utf8')).trim()
 if(!/^[a-f0-9]{96}$/.test(secret))throw new Error('LOCAL_AUTH_SECRET_INVALID')
 const token=randomBytes(32).toString('hex')
 config.main=path.join(root,'backend/src/cloudflare/worker.ts')
 config.$schema=path.join(root,'node_modules/wrangler/config-schema.json')
 config.d1_databases[0].migrations_dir=path.join(root,'backend/prisma-d1/migrations')
 Object.assign(config.vars,{AUTH_SECRET:secret,LOCAL_API_TOKEN:token,BACKOFFICE_ORIGIN:'http://localhost:5174',MEMBER_ORIGIN:'http://localhost:5175',PUBLIC_ORIGIN:'http://localhost:5173'})
 const directory=path.join(root,'.local/runtime');await mkdir(directory,{recursive:true,mode:0o700})
 const file=path.join(directory,'worker.private.jsonc')
 await writeFile(file,JSON.stringify(config,null,2),{mode:0o600})
 return {file,token}
}
