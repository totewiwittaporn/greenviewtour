import {registerAtomicFactory} from '../src/platform/database/atomic/executor.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {registerD1Client,d1FilesFor} from '../src/platform/database/d1-runtime.js'
import {readTransaction} from '../src/platform/database/read-transaction.js'
import {d1FileStoreFor,readD1File} from '../src/platform/files/bound-store.js'

class Bucket{
 objects=new Map()
 async put(key,body,options={}){
  const data=new Uint8Array(body)
  this.objects.set(key,{data,httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}})
  return {size:data.byteLength}
 }
 async get(key){
  const row=this.objects.get(key);if(!row)return null
  return {size:row.data.byteLength,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata,arrayBuffer:async()=>row.data.buffer.slice(row.data.byteOffset,row.data.byteOffset+row.data.byteLength)}
 }
 async head(key){const row=this.objects.get(key);return row?{size:row.data.byteLength,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata}:null}
 async delete(key){this.objects.delete(key)}
}
test('D1 reads validate a stable atomic snapshot while PostgreSQL retains its transaction',async()=>{
 const d1={value:7,$transaction:async()=>{throw new Error('raw Prisma transaction must not run')}}
 let revisionReads=0,closed=0
 registerD1Client(d1,{prepare(sql){assert.match(sql,/SELECT version FROM D1TxnRevision/);return {first:async()=>{revisionReads++;return {version:4}}}}})
 registerAtomicFactory(d1,planner=>{assert.equal(planner.readOnly,true);return {value:7,$disconnect:async()=>{closed++}}})
 assert.equal(await readTransaction(d1,db=>db.value),7)
 assert.equal(revisionReads,2);assert.equal(closed,1)
 let calls=0
 const pg={value:9,$transaction:async fn=>{calls++;return fn(pg)}}
 assert.equal(await readTransaction(pg,db=>db.value),9)
 assert.equal(calls,1)
})

test('D1 client exposes its bound R2 store and verifies stored object integrity',async()=>{
 const bucket=new Bucket(),client={}
 registerD1Client(client,{prepare(){}},{files:bucket})
 assert.equal(d1FilesFor(client),bucket)
 const store=d1FileStoreFor(client)
 await store.put('website-images/example',new Uint8Array([1,2,3]),{mimeType:'image/png',sha256:'a'.repeat(64)})
 const file=await readD1File(client,'website-images/example',{size:3,sha256:'a'.repeat(64)})
 assert.deepEqual([...file.body],[1,2,3])
 await assert.rejects(()=>readD1File(client,'website-images/example',{size:4}),/R2_OBJECT_SIZE_MISMATCH/)
 await assert.rejects(()=>readD1File(client,'website-images/example',{sha256:'b'.repeat(64)}),/R2_OBJECT_DIGEST_MISMATCH/)
})
