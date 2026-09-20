// Preserve already-efficient PNG pixel compression while dropping private metadata.
export function stripPngMetadata(bytes) {
 const header=[137,80,78,71,13,10,26,10]
 if(bytes.length<8||header.some((n,i)=>bytes[i]!==n))return null
 const chunks=[bytes.slice(0,8)],view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
 let offset=8,ended=false
 while(offset+12<=bytes.length){
  const size=view.getUint32(offset),end=offset+12+size
  if(end>bytes.length)return null
  const type=String.fromCharCode(...bytes.slice(offset+4,offset+8))
  // Animated or oriented PNG needs canvas decoding to preserve the displayed frame/orientation.
  if(['acTL','eXIf'].includes(type))return null
  if(['IHDR','PLTE','tRNS','IDAT','IEND','sRGB','gAMA','cHRM'].includes(type))chunks.push(bytes.slice(offset,end))
  offset=end
  if(type==='IEND'){ended=true;break}
 }
 return ended?new Blob(chunks,{type:'image/png'}):null
}
// Re-encode photos locally: bounded dimensions, no EXIF, no original upload.
export async function prepareDocumentImage(file) {
  if (!file || !file.size) throw new Error('Choose a non-empty document.')
  if (file.type === 'application/pdf') {
    if (file.size > 5 * 1024 * 1024) throw new Error('Choose a PDF up to 5 MB.')
    return file
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)) throw new Error('Choose a photo or PDF. If this photo cannot open, export it as JPEG.')
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a photo up to 25 MB.')
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode().catch(() => { throw new Error('This photo format cannot open in this browser. Export it as JPEG and retry.') })
    const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Photo preparation is unavailable. Try another browser.')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const encode = (type, quality) => new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Unable to prepare this photo.')), type, quality))
    const candidates = []
    if(file.type==='image/png'&&scale===1){const stripped=stripPngMetadata(new Uint8Array(await file.arrayBuffer()));if(stripped)candidates.push(stripped)}
    for (const quality of [0.82, 0.72]) candidates.push(await encode('image/jpeg', quality))
    // Lossless PNG often beats JPEG for screenshots/receipts with flat backgrounds.
    if (file.type === 'image/png') candidates.push(await encode('image/png'))
    const result = candidates.sort((a, b) => a.size - b.size)[0]
    if (result.size > 5 * 1024 * 1024) throw new Error('Prepared photo is still over 5 MB. Crop to the document and retry.')
    const extension = result.type === 'image/png' ? 'png' : 'jpg'
    return new File([result], `${file.name.replace(/\.[^.]+$/, '').slice(0, 180)}.${extension}`, {type: result.type})
  } finally { URL.revokeObjectURL(url) }
}
