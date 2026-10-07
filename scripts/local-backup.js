// Back up Local state, then prove a restore in an isolated directory. Never replaces active data.
import {readFile,writeFile,mkdir,mkdtemp,cp,lstat} from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'
import {root,statePath,localEnvironment} from './local-cloudflare-policy.js'
import {localPreflight,acquireStateLock} from './local-cloudflare-safety.js'
import {backupArguments,backupDestination,fileInventory,assertBackupInventory} from './local-backup-files.js'
import {proveLocalBackup} from './local-backup-runtime.js'
let release,evidence
const run=promisify(execFile)
async function notOpen(){
 try{const result=await run('/usr/sbin/lsof',['-t','+D',statePath],{env:localEnvironment(),timeout:10000});if(result.stdout.trim())throw new Error('LOCAL_STATE_IN_USE')}
 catch(error){if(error.code!==1)throw error}
}
try{
 const {mode,directory:requested}=backupArguments(process.argv.slice(2))
 await localPreflight();release=await acquireStateLock('backup-'+mode);await notOpen()
 const directory=await backupDestination(requested,root),payload=path.join(directory,'payload')
 if(mode==='create'){
  // Exclusive creation refuses every existing destination, including symlinks.
  await mkdir(directory,{mode:0o700})
  await fileInventory(statePath)
  const secretPath=path.join(root,'.local/auth.secret'),info=await lstat(secretPath)
  if(!info.isFile()||info.isSymbolicLink())throw new Error('LOCAL_BACKUP_SECRET_INVALID')
  const secret=await readFile(secretPath,'utf8')
  if(!/^[a-f0-9]{96}$/.test(secret.trim()))throw new Error('LOCAL_BACKUP_SECRET_INVALID')
  await mkdir(payload,{mode:0o700});await cp(statePath,path.join(payload,'state'),{recursive:true,errorOnExist:true,force:false})
  await writeFile(path.join(payload,'auth.secret'),secret,{mode:0o600,flag:'wx'})
 }
 const manifestFile=path.join(directory,'manifest.json')
 let manifest
 if(mode==='create')manifest={format:1,environment:'local',createdAt:new Date().toISOString(),files:await fileInventory(payload)}
 else{
  if((await lstat(directory)).isSymbolicLink()||(await lstat(manifestFile)).isSymbolicLink())throw new Error('BACKUP_SYMLINK_FORBIDDEN')
  manifest=JSON.parse(await readFile(manifestFile,'utf8'))
 }
 assertBackupInventory(manifest,await fileInventory(payload))
 if(!/^[a-f0-9]{96}$/.test((await readFile(path.join(payload,'auth.secret'),'utf8')).trim()))throw new Error('LOCAL_BACKUP_SECRET_INVALID')
 evidence=await mkdtemp(path.join(root,'.local/restore-check-'))
 const restored=path.join(evidence,'payload')
 await cp(payload,restored,{recursive:true,force:false,errorOnExist:true})
 assertBackupInventory(manifest,await fileInventory(restored))
 const proof=await proveLocalBackup(path.join(restored,'state'))
 if(mode==='verify'&&JSON.stringify(proof)!==JSON.stringify(manifest.restoreProof))throw new Error('LOCAL_RESTORE_PROOF_MISMATCH')
 if(mode==='create'){
  manifest.restoreProof=proof
  await writeFile(manifestFile,JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'})
 }
 assertBackupInventory(manifest,await fileInventory(payload))
 const report={status:'PASS',mode,environment:'local',directory,evidence,files:manifest.files.length,tables:proof.tables.length,r2Objects:proof.files.length,activeDataChanged:false,restoredCopyVerified:true}
 await writeFile(path.join(evidence,'result.json'),JSON.stringify(report,null,2),{mode:0o600})
 console.log('LOCAL_BACKUP_PASS',JSON.stringify(report))
}catch(error){if(evidence)await writeFile(path.join(evidence,'failure.private.json'),JSON.stringify({message:error.message,stack:error.stack}),{mode:0o600});console.error('LOCAL_BACKUP_FAILED',/^[A-Z_]+$/.test(error.message)?error.message:(error.code||'PRIVATE_BACKUP_DIAGNOSTIC_REQUIRED'),'EVIDENCE='+String(evidence||''));process.exitCode=1}
finally{await release?.()}
