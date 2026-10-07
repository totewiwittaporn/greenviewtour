import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {backupArguments,backupDestination,fileInventory,assertBackupInventory} from '../../scripts/local-backup-files.js'
test('Local backup arguments reject remote flags and ambiguous destinations',()=>{
 const directory=path.join(os.tmpdir(),'local-backup')
 assert.deepEqual(backupArguments(['create','--directory',directory]),{mode:'create',directory:path.resolve(directory)})
 for(const args of [[],['create','--directory','relative'],['create','--remote',directory],['restore','--directory',directory],['verify','--directory',directory,'--force']])assert.throws(()=>backupArguments(args))
})
test('inventory verifies exact files, sizes and hashes, rejecting altered or additional data',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'greenview-backup-test-'))
 try{
  await mkdir(path.join(directory,'state'));await writeFile(path.join(directory,'state','data'),'fixture')
  const files=await fileInventory(directory),manifest={format:1,environment:'local',files}
  assert.doesNotThrow(()=>assertBackupInventory(manifest,files))
  await writeFile(path.join(directory,'state','data'),'changed')
  const changed=await fileInventory(directory)
  assert.throws(()=>assertBackupInventory(manifest,changed),/LOCAL_BACKUP_CHECKSUM_MISMATCH/)
  await writeFile(path.join(directory,'state','data'),'fixture')
  await writeFile(path.join(directory,'extra'),'unexpected')
  assert.throws(()=>assertBackupInventory(manifest,files.concat({path:'extra',bytes:10,sha256:'a'.repeat(64)})),/LOCAL_BACKUP_CHECKSUM_MISMATCH/)
 }finally{await rm(directory,{recursive:true,force:true})}
})
test('backup manifests reject traversal, duplicate entries and wrong environments',()=>{
 const entry={path:'state/file',bytes:1,sha256:'a'.repeat(64)},valid={format:1,environment:'local',files:[entry]}
 for(const manifest of [{...valid,environment:'production'},{...valid,files:[entry,entry]},{...valid,files:[{...entry,path:'../file'}]},{...valid,files:[{...entry,path:'/file'}]},{...valid,files:[{...entry,sha256:'wrong'}]}])assert.throws(()=>assertBackupInventory(manifest,manifest.files),/LOCAL_BACKUP_MANIFEST_INVALID/)
})
test('backup refuses symlinked payloads and repository destinations',async()=>{
 const temporary=await mkdtemp(path.join(os.tmpdir(),'greenview-backup-path-'))
 try{
  const {realpath}=await import('node:fs/promises'),directory=await realpath(temporary),repo=path.join(directory,'repo'),original=path.join(directory,'original')
  await mkdir(repo)
  if(process.platform==='win32'){await mkdir(original);await writeFile(path.join(original,'data'),'fixture');await symlink(original,path.join(repo,'link'),'junction')}
  else{await writeFile(original,'fixture');await symlink(original,path.join(repo,'link'))}
  await assert.rejects(()=>fileInventory(repo),/BACKUP_SYMLINK_FORBIDDEN/)
  await assert.rejects(()=>backupDestination(path.join(repo,'backup'),repo),/PRIVATE_BACKUP_OUTSIDE_REPOSITORY_REQUIRED/)
  assert.equal(await backupDestination(path.join(directory,'private-copy'),repo),path.join(directory,'private-copy'))
 }finally{await rm(temporary,{recursive:true,force:true})}
})
