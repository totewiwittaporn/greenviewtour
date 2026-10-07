import {createHash} from 'node:crypto'
const localHosts=['localhost','127.0.0.1','[::1]']
export function requestEnvironment(request,env){
 const url=new URL(request.url)
 if(env.APP_ENV==='local')return localHosts.includes(url.hostname)?{local:true}:{code:'LOCAL_HOST_REQUIRED',status:403}
 if(env.APP_ENV!=='production'||env.PRODUCTION_ENABLED!=='true')return {code:'PRODUCTION_NOT_ENABLED',status:503}
 try{
  for(const value of [env.BACKOFFICE_ORIGIN,env.PUBLIC_ORIGIN,env.MEMBER_ORIGIN]){
   const origin=new URL(value)
   if(origin.origin!==value||origin.protocol!=='https:'||origin.username||origin.password||localHosts.includes(origin.hostname))throw new Error()
  }
  if(typeof env.AUTH_SECRET!=='string'||env.AUTH_SECRET.length<48)throw new Error()
 }catch{return {code:'PRODUCTION_CONFIGURATION_REQUIRED',status:503}}
 if(url.origin!==env.BACKOFFICE_ORIGIN)return {code:'HOST_DENIED',status:403}
 return {local:false}
}
export function requestAddress(request,local){
 if(local)return 'local-browser'
 // Cloudflare overwrites this header at the ingress edge. Never use forwarded-for or cookies.
 const address=request.headers.get('cf-connecting-ip')
 return address&&address.length<=64&&/^[a-fA-F0-9:.]+$/.test(address)?address:'unknown-edge-client'
}
export async function mutationRateKeys(req,sessions,address){
 const keys=['mutations:ip:'+address]
 try{
  const auth=await sessions.authenticated(req)
  if(auth.entry.purpose==='workspace')keys.push('mutations:session:'+createHash('sha256').update(auth.id).digest('hex'))
 }catch{/* Invalid/forged sessions remain subject to the shared IP cap. */}
 return keys
}
