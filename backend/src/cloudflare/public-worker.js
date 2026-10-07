const json=(code,status)=>new Response(JSON.stringify({code}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const validOrigin=value=>{
 try{const url=new URL(value);return url.origin===value&&url.protocol==='https:'&&!url.username&&!url.password&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname)}catch{return false}
}
function secure(response){
 const headers=new Headers(response.headers)
 headers.delete('set-cookie')
 headers.set('x-content-type-options','nosniff')
 headers.set('referrer-policy','strict-origin-when-cross-origin')
 headers.set('x-frame-options','DENY')
 headers.set('strict-transport-security','max-age=31536000')
 return new Response(response.body,{status:response.status,headers})
}
export default {
 async fetch(request,env){
  if(env.APP_ENV!=='production'||env.PRODUCTION_ENABLED!=='true')return json('PRODUCTION_NOT_ENABLED',503)
  if(!validOrigin(env.PUBLIC_ORIGIN)||!validOrigin(env.BACKOFFICE_ORIGIN)||env.PUBLIC_ORIGIN===env.BACKOFFICE_ORIGIN)return json('PRODUCTION_CONFIGURATION_REQUIRED',503)
  const url=new URL(request.url)
  if(env.PUBLIC_ALIAS_ORIGIN){
   if(!validOrigin(env.PUBLIC_ALIAS_ORIGIN)||env.PUBLIC_ALIAS_ORIGIN===env.PUBLIC_ORIGIN||env.PUBLIC_ALIAS_ORIGIN===env.BACKOFFICE_ORIGIN)return json('PRODUCTION_CONFIGURATION_REQUIRED',503)
   if(url.origin===env.PUBLIC_ALIAS_ORIGIN){
    if(!['GET','HEAD'].includes(request.method))return json('METHOD_NOT_ALLOWED',405)
    return secure(Response.redirect(env.PUBLIC_ORIGIN+url.pathname+url.search,308))
   }
  }
  if(url.origin!==env.PUBLIC_ORIGIN)return json('HOST_DENIED',403)
  const origin=request.headers.get('origin')
  if(origin&&origin!==env.PUBLIC_ORIGIN)return json('ORIGIN_DENIED',403)
  // Never let private API requests reach the SPA or the staff service.
  if(url.pathname==='/api'||url.pathname.startsWith('/api/')){
   if(!url.pathname.startsWith('/api/public/'))return json('NOT_FOUND',404)
   if(request.method!=='GET')return json('METHOD_NOT_ALLOWED',405)
   if(!env.API)return json('SERVICE_UNAVAILABLE',503)
   const target=new URL(url.pathname+url.search,env.BACKOFFICE_ORIGIN)
   // Construct a clean request: no browser sessions, Authorization, or forwarding headers.
   const upstream=new Request(target,{method:'GET',headers:{accept:'application/json',origin:env.PUBLIC_ORIGIN},redirect:'manual'})
   try{return secure(await env.API.fetch(upstream))}catch{return json('SERVICE_UNAVAILABLE',503)}
  }
  if(!['GET','HEAD'].includes(request.method))return json('METHOD_NOT_ALLOWED',405)
  if(!env.ASSETS)return json('SERVICE_UNAVAILABLE',503)
  return secure(await env.ASSETS.fetch(request))
 },
}
