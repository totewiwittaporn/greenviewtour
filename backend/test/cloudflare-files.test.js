import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileObjectKey} from '../src/platform/files/keys.js'
import {R2FileStore} from '../src/platform/files/r2.js'

class FakeBucket{
  objects=new Map()
  async put(key,body,options={}){
    if(options.onlyIf?.etagDoesNotMatch==='*'&&this.objects.has(key))return null
    const data=new Uint8Array(body)
    const row={data,httpMetadata:options.httpMetadata||{},customMetadata:options.customMetadata||{}}
    this.objects.set(key,row)
    return {size:data.byteLength,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata}
  }
  async get(key){
    const row=this.objects.get(key)
    if(!row)return null
    return {size:row.data.byteLength,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata,arrayBuffer:async()=>row.data.buffer.slice(row.data.byteOffset,row.data.byteOffset+row.data.byteLength)}
  }
  async head(key){
    const row=this.objects.get(key)
    return row?{size:row.data.byteLength,httpMetadata:row.httpMetadata,customMetadata:row.customMetadata}:null
  }
  async delete(key){this.objects.delete(key)}
}

test('Cloudflare file keys are deterministic and cannot escape their R2 namespace',()=>{
  assert.equal(fileObjectKey('websiteImage','00000000-0000-0000-0000-000000000001'),'website-images/00000000-0000-0000-0000-000000000001')
  assert.equal(fileObjectKey('documentAsset','company-logo'),'document-assets/company-logo')
  assert.throws(()=>fileObjectKey('websiteImage','../secret'),/INVALID_FILE_OBJECT_KEY/)
  assert.throws(()=>fileObjectKey('unknown','id'),/INVALID_FILE_OBJECT_KEY/)
})

test('R2 file store preserves bytes and trusted metadata without database blobs',async()=>{
  const bucket=new FakeBucket(),store=new R2FileStore(bucket),key=fileObjectKey('evidenceAttachment','fixture')
  const input=new Uint8Array([0,1,2,253,254,255])
  assert.deepEqual(await store.put(key,input,{mimeType:'application/pdf',sha256:'a'.repeat(64)}),{key,size:6,mimeType:'application/pdf',sha256:'a'.repeat(64)})
  const head=await store.head(key)
  assert.deepEqual(head,{key,size:6,mimeType:'application/pdf',sha256:'a'.repeat(64)})
  const file=await store.get(key)
  assert.deepEqual([...file.body],[...input])
  await store.delete(key)
  assert.equal(await store.get(key),null)
})

test('D1 schema stores object keys instead of binary payloads',()=>{
  const schema=readFileSync(new URL('../prisma-d1/schema.prisma',import.meta.url),'utf8')
  for(const model of ['DocumentAsset','EvidenceAttachment','WebsiteImage']){
    const block=schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1]||''
    assert.match(block,/objectKey String @unique/)
    assert.doesNotMatch(block,/content Bytes/)
  }
})

test('R2 conditional put never overwrites an existing object key',async()=>{
  const bucket=new FakeBucket(),store=new R2FileStore(bucket),key=fileObjectKey('evidenceAttachment','same-id')
  const first=await store.putIfAbsent(key,new Uint8Array([1,2,3]),{mimeType:'application/pdf',sha256:'a'.repeat(64)})
  const second=await store.putIfAbsent(key,new Uint8Array([9,9,9,9]),{mimeType:'image/png',sha256:'b'.repeat(64)})
  assert.equal(first.created,true)
  assert.deepEqual(second,{created:false,key,size:3,mimeType:'application/pdf',sha256:'a'.repeat(64)})
  assert.deepEqual([...(await store.get(key)).body],[1,2,3])
})
