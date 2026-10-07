import {readdir,lstat,readFile,realpath} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import path from 'node:path'
export const fileHash=bytes=>createHash('sha256').update(bytes).digest('hex')
export function backupArguments(args){
 if(args.length!==3||!['create','verify'].includes(args[0])||args[1]!=='--directory'||!path.isAbsolute(args[2]))throw new Error('LOCAL_BACKUP_ARGUMENTS_REQUIRED')
 return {mode:args[0],directory:path.resolve(args[2])}
}
export async function backupDestination(directory,root){
 const parent=await realpath(path.dirname(directory)),target=path.join(parent,path.basename(directory))
 if(target===root||target.startsWith(root+path.sep)||root.startsWith(target+path.sep))throw new Error('PRIVATE_BACKUP_OUTSIDE_REPOSITORY_REQUIRED')
 if(parent!==path.dirname(directory))throw new Error('BACKUP_PARENT_SYMLINK_FORBIDDEN')
 return target
}
export async function fileInventory(root,relative=''){
 const directory=path.join(root,relative),info=await lstat(directory)
 if(info.isSymbolicLink()||!info.isDirectory())throw new Error('BACKUP_DIRECTORY_INVALID')
 const result=[]
 for(const name of (await readdir(directory)).sort()){
  const local=path.join(relative,name),file=path.join(root,local),entry=await lstat(file)
  if(entry.isSymbolicLink())throw new Error('BACKUP_SYMLINK_FORBIDDEN')
  if(entry.isDirectory())result.push(...await fileInventory(root,local))
  else if(entry.isFile()){const bytes=await readFile(file);result.push({path:local.split(path.sep).join('/'),bytes:bytes.length,sha256:fileHash(bytes)})}
  else throw new Error('BACKUP_FILE_TYPE_INVALID')
 }
 return result
}
export function assertBackupInventory(manifest,actual){
 if(manifest?.format!==1||manifest.environment!=='local'||!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('LOCAL_BACKUP_MANIFEST_INVALID')
 const paths=new Set()
 for(const entry of manifest.files){
  if(typeof entry.path!=='string'||entry.path!==path.posix.normalize(entry.path)||path.posix.isAbsolute(entry.path)||entry.path.split('/').includes('..'))throw new Error('LOCAL_BACKUP_MANIFEST_INVALID')
  if(paths.has(entry.path)||!Number.isSafeInteger(entry.bytes)||entry.bytes<0||!/^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('LOCAL_BACKUP_MANIFEST_INVALID')
  paths.add(entry.path)
 }
 if(JSON.stringify(manifest.files)!==JSON.stringify(actual))throw new Error('LOCAL_BACKUP_CHECKSUM_MISMATCH')
}
