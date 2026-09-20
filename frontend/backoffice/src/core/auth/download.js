// Save fetched content without navigating away from the authenticated workspace.
export function saveDownload(blob,filename){
 const url=URL.createObjectURL(blob),link=document.createElement('a')
 link.href=url;link.download=filename;document.body.append(link);link.click();link.remove()
 setTimeout(()=>URL.revokeObjectURL(url),1000)
}
export async function readPrivateDocument(path,options={}){
 const response=await fetch(path,{credentials:'same-origin',signal:AbortSignal.any([AbortSignal.timeout(15000),...(options.signal?[options.signal]:[])])})
 if(!response.ok){
  const data=await response.json().catch(()=>({}));throw new Error(data.code||'DOWNLOAD_FAILED')
 }
 const blob=await response.blob()
 if(!['image/jpeg','image/png','application/pdf'].includes(blob.type)||!blob.size||blob.size>5*1024*1024)throw new Error('INVALID_DOCUMENT')
 const bytes=new Uint8Array(await blob.slice(0,8).arrayBuffer())
 const valid=blob.type==='application/pdf'?String.fromCharCode(...bytes.slice(0,5))==='%PDF-':blob.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)
 if(!valid)throw new Error('INVALID_DOCUMENT')
 let filename='Document'
 const disposition=response.headers?.get('content-disposition')||''
 const match=disposition.match(/filename\*=UTF-8''([^;]+)/i)
 if(match){try{filename=decodeURIComponent(match[1])}catch{/* keep safe fallback */}}
 return {blob,filename}
}

export async function downloadPrivateFile(path,filename){saveDownload(await readPrivateFile(path),filename)}

export async function readPrivateFile(path,options={}){return (await readPrivateDocument(path,options)).blob}
