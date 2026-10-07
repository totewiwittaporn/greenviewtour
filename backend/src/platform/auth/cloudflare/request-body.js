import {AccessError} from '../../../modules/identity-access/membership.js'
export async function boundedAuthBody(request,maximum=8192){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AccessError('JSON_REQUIRED',415)
 if(Number(request.headers.get('content-length')||0)>maximum)throw new AccessError('REQUEST_TOO_LARGE',413)
 const chunks=[];let length=0
 const reader=request.body?.getReader()
 try{
  if(reader)for(;;){
   const {done,value}=await reader.read();if(done)break
   length+=value.byteLength
   if(length>maximum){await reader.cancel();throw new AccessError('REQUEST_TOO_LARGE',413)}
   chunks.push(value)
  }
 }finally{reader?.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 let input
 try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw new AccessError('INVALID_REQUEST',400)}
 if(!input||Array.isArray(input)||typeof input!=='object')throw new AccessError('INVALID_REQUEST',400)
 return {input,bytes}
}
