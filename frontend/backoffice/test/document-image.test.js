import {Buffer} from 'node:buffer'
import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareDocumentImage,stripPngMetadata} from '../src/core/ui/prepareDocumentImage.js'

test('PDFs remain byte-for-byte unchanged and oversized inputs fail before decoding',async()=>{
 const pdf=new File(['%PDF-1.4'], 'document.pdf',{type:'application/pdf'})
 assert.equal(await prepareDocumentImage(pdf),pdf)
 await assert.rejects(prepareDocumentImage(new File([new Uint8Array(5*1024*1024+1)],'large.pdf',{type:'application/pdf'})),/5 MB/)
 await assert.rejects(prepareDocumentImage(new File(['<svg/>'],'script.svg',{type:'image/svg+xml'})),/Choose a photo/)
})
test('document preparation bounds resolution and re-encodes pixels without original metadata',async()=>{
 const previous={Image:globalThis.Image,document:globalThis.document}
 let drawn=false,filled=false,canvas
 globalThis.Image=class{naturalWidth=4000;naturalHeight=3000;async decode(){}}
 globalThis.document={createElement(){canvas={width:0,height:0,getContext(){return {fillRect(){filled=true},drawImage(){drawn=true}}},toBlob(callback,type,quality){callback(new Blob([new Uint8Array(quality===0.72?200:300)],{type}))}};return canvas}}
 try{
  const original=new File(['PRIVATE EXIF',new Uint8Array(2000)],'camera.jpeg',{type:'image/jpeg'})
  const prepared=await prepareDocumentImage(original)
  assert.equal(canvas.width,2400);assert.equal(canvas.height,1800)
  assert.ok(drawn&&filled);assert.equal(prepared.type,'image/jpeg');assert.equal(prepared.name,'camera.jpg')
  assert.ok(prepared.size<original.size);assert.ok(!(await prepared.text()).includes('PRIVATE EXIF'))
 }finally{globalThis.Image=previous.Image;globalThis.document=previous.document}
})
test('unsupported photo decoders provide a conversion message instead of uploading originals',async()=>{
 const previous=globalThis.Image;globalThis.Image=class{async decode(){throw new Error('decoder')}}
 try{await assert.rejects(prepareDocumentImage(new File(['heic'],'phone.heic',{type:'image/heic'})),/Export it as JPEG/)}finally{globalThis.Image=previous}
})

test('efficient PNG pixels are retained while private text metadata is removed',()=>{
 const header=Buffer.from([137,80,78,71,13,10,26,10])
 const chunk=(type,text)=>{const content=Buffer.from(text),length=Buffer.alloc(4);length.writeUInt32BE(content.length);return Buffer.concat([length,Buffer.from(type),content,Buffer.alloc(4)])}
 const bytes=Buffer.concat([header,chunk('IHDR','dimensions'),chunk('tEXt','private location'),chunk('IDAT','compressed pixels'),chunk('IEND','')])
 const safe=stripPngMetadata(bytes)
 assert.equal(safe.size,bytes.length-chunk('tEXt','private location').length)
 assert.equal(stripPngMetadata(Buffer.concat([header,chunk('eXIf','orientation'),chunk('IEND','')])),null)
 assert.equal(stripPngMetadata(bytes.subarray(0,12)),null)
})
