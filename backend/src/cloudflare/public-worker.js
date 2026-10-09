import {ownsPublicPath, normalizePublicPath, publicInfoRoutes} from '../../../packages/contracts/public-routes.js'

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
// Reuse the pure frontend route registry; never admit arbitrary path prefixes.
const publicPaths=['/', '/tours', '/promotions', ...Object.keys(publicInfoRoutes)]
async function shell(request,env,status=200){
 const response=await env.ASSETS.fetch(new Request(new URL('/',request.url),{method:request.method}))
 if(!response.ok)return secure(response)
 const headers=new Headers(response.headers)
 if(status!==200){headers.set('cache-control','no-store');headers.set('x-robots-tag','noindex')}
 return secure(new Response(request.method==='HEAD'?null:response.body,{status,headers}))
}
async function tourStatus(slug,env){
 if(!env.API)return 503
 try{
  const target=new URL('/api/public/tours',env.BACKOFFICE_ORIGIN)
  target.search=new URLSearchParams({slug,view:'detail'}).toString()
  const response=await env.API.fetch(new Request(target,{headers:{accept:'application/json',origin:env.PUBLIC_ORIGIN},redirect:'manual',signal:AbortSignal.timeout(10000)}))
  if(!response.ok)return 503
  const data=await response.json()
  if(!Array.isArray(data.rows)||!Number.isInteger(data.total)||data.total<0)return 503
  if(data.rows.length===0)return data.total===0?404:503
  return data.rows.some(row=>row.slug===slug)?200:503
 }catch{return 503}
}
function crawlerFile(request,env){
 const path=new URL(request.url).pathname
 if(path==='/robots.txt')return secure(new Response(request.method==='HEAD'?null:`User-agent: *\nAllow: /\nSitemap: ${env.PUBLIC_ORIGIN}/sitemap.xml\n`,{headers:{'content-type':'text/plain; charset=utf-8'}}))
 if(path==='/sitemap.xml'){
  // Only canonical public routes. Private hosts and unverified dynamic slugs are excluded.
  const escape=value=>value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]))
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths.map(path=>`<url><loc>${escape(env.PUBLIC_ORIGIN+path)}</loc></url>`).join('')}</urlset>\n`
  return secure(new Response(request.method==='HEAD'?null:xml,{headers:{'content-type':'application/xml; charset=utf-8'}}))
 }
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
  const crawler=crawlerFile(request,env)
  if(crawler)return crawler
  const path=normalizePublicPath(url.pathname)
  if(ownsPublicPath(path)){
   const slug=url.searchParams.get('tour')
   const status=path==='/tours'&&slug?await tourStatus(slug,env):200
   return shell(request,env,status)
  }
  const asset=await env.ASSETS.fetch(request)
  if(asset.status!==404)return secure(asset)
  // Missing files retain the asset 404; missing page paths get the bilingual app UI.
  if(/\.(?:js|css|json|xml|txt|png|jpe?g|webp|svg|ico|woff2?)$/i.test(path)||path.startsWith('/assets/')||path.startsWith('/images/'))return secure(asset)
  return shell(request,env,404)
 },
}
