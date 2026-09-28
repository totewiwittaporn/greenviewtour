import test from 'node:test'
import assert from 'node:assert/strict'
import {readPrivateFile} from '../src/core/auth/download.js'

test('private document reads preserve authentication and accept supported file signatures',async()=>{
 const original=globalThis.fetch
 try{
  let request
  globalThis.fetch=async(path,options)=>{request={path,options};return new Response('%PDF-1.4\n',{headers:{'Content-Type':'application/pdf'}})}
  const file=await readPrivateFile('/api/evidence/test')
  assert.equal(file.type,'application/pdf');assert.equal(request.options.credentials,'same-origin');assert.ok(request.options.signal)
 }finally{globalThis.fetch=original}
})
test('HTML errors and mismatched content cannot become document previews',async()=>{
 const original=globalThis.fetch
 try{
  for(const type of ['text/html','image/png','application/pdf']){
   globalThis.fetch=async()=>new Response('<html>not a document</html>',{headers:{'Content-Type':type}})
   await assert.rejects(readPrivateFile('/api/evidence/test'),/INVALID_DOCUMENT/)
  }
  globalThis.fetch=async()=>new Response(JSON.stringify({code:'PERMISSION_DENIED'}),{status:403,headers:{'Content-Type':'application/json'}})
  await assert.rejects(readPrivateFile('/api/evidence/test'),/PERMISSION_DENIED/)
 }finally{globalThis.fetch=original}
})
