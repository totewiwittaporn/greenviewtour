import {d1FilesFor} from '../database/d1-runtime.js'
import {R2FileStore} from './r2.js'

const stores=new WeakMap()

export function d1FileStoreFor(client){
  const bucket=d1FilesFor(client)
  if(!bucket)return null
  if(!stores.has(bucket))stores.set(bucket,new R2FileStore(bucket))
  return stores.get(bucket)
}

export async function readD1File(client,objectKey,{size=null,sha256=null}={}){
  const store=d1FileStoreFor(client)
  if(!store)throw new Error('R2_BUCKET_REQUIRED')
  const file=await store.get(objectKey)
  if(!file)throw new Error('R2_OBJECT_MISSING')
  if(size!==null&&file.size!==size)throw new Error('R2_OBJECT_SIZE_MISMATCH')
  if(sha256&&file.sha256!==sha256)throw new Error('R2_OBJECT_DIGEST_MISMATCH')
  return file
}
