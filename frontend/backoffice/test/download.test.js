import test from 'node:test'
import assert from 'node:assert/strict'
import {downloadPrivateFile} from '../src/core/auth/download.js'
test('private download preserves bytes and filename; failed authorization cannot produce a saved error document',async()=>{
 const original={fetch:globalThis.fetch,document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL}
 const saved=[],link={click(){saved.push({filename:this.download,url:this.href})},remove(){}}
 let blob
 try{
  globalThis.document={body:{append(){}},createElement:()=>link};URL.createObjectURL=value=>{blob=value;return 'blob:test'};URL.revokeObjectURL=()=>{}
  globalThis.fetch=async(path,options)=>{assert.equal(path,'/api/evidence/demo');assert.equal(options.credentials,'same-origin');return {ok:true,blob:async()=>new Blob([new Uint8Array([137,80,78,71,13,10,26,10]),'test document'],{type:'image/png'})}}
  await downloadPrivateFile('/api/evidence/demo','เอกสาร.png')
  assert.equal(await blob.slice(8).text(),'test document');assert.equal(saved[0].filename,'เอกสาร.png')
  for(const code of ['PERMISSION_DENIED','LOGIN_REQUIRED']){
   globalThis.fetch=async()=>({ok:false,json:async()=>({code})})
   await assert.rejects(downloadPrivateFile('/api/evidence/demo','bad.png'),{message:code})
  }
  assert.equal(saved.length,1)
 }finally{globalThis.fetch=original.fetch;globalThis.document=original.document;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke}
})
