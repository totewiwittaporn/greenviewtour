import {publicInfoRoutes} from '../../../packages/contracts/public-routes.js'
const paths=['/','/tours','/promotions',...Object.keys(publicInfoRoutes)]
const escape=value=>value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]))
// Bound one sitemap build to 100 existing 12-row catalog pages and a shared deadline.
// Exceeding the bound is an explicit failure, never a truncated successful sitemap.
export async function publicSitemap(request,env,cache=globalThis.caches?.default){
 const key=new Request(env.PUBLIC_ORIGIN+'/sitemap.xml?__public_catalog=v1')
 try{
  const hit=await cache?.match(key)
  if(hit?.status===200&&hit.headers.get('content-type')?.startsWith('application/xml')){
   // Cache hits can expose Cloudflare's browser TTL instead of the stored TTL.
   const headers=new Headers(hit.headers)
   headers.set('cache-control','public, max-age=60')
   return new Response(request.method==='HEAD'?null:hit.body,{status:hit.status,headers})
  }
 }catch{/* Cache availability must not prevent a fresh complete build. */}
 try{
  if(!env.API)throw Error('Catalog unavailable')
  const slugs=new Set(),ids=new Set(),signal=AbortSignal.timeout(10000)
  let total,pages=1
  for(let page=1;page<=pages;page++){
   const url=new URL('/api/public/tours',env.BACKOFFICE_ORIGIN)
   url.search=new URLSearchParams({view:'cards',page:String(page)}).toString()
   const response=await env.API.fetch(new Request(url,{headers:{accept:'application/json',origin:env.PUBLIC_ORIGIN},redirect:'manual',signal}))
   if(!response.ok)throw Error('Catalog unavailable')
   const data=await response.json()
   if(!Number.isInteger(data.total)||data.total<0||data.page!==page||data.pageSize!==12||!Array.isArray(data.rows))throw Error('Invalid catalog page')
   if(page===1){total=data.total;pages=Math.max(1,Math.ceil(total/12));if(pages>100)throw Error('Sitemap size limit')}
   if(data.total!==total||data.rows.length!==Math.min(12,Math.max(0,total-(page-1)*12)))throw Error('Incomplete catalog')
   for(const row of data.rows){
    if(typeof row.id!=='string'||!row.id||ids.has(row.id)||typeof row.slug!=='string'||!row.slug.trim()||!['GREENVIEW','PARTNER'].includes(row.ownership))throw Error('Invalid catalog row')
    ids.add(row.id);slugs.add(row.slug)
   }
  }
  const urls=[...paths.map(path=>env.PUBLIC_ORIGIN+path),...[...slugs].sort().map(slug=>env.PUBLIC_ORIGIN+'/tours?tour='+encodeURIComponent(slug))]
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${escape(url)}</loc></url>`).join('')}</urlset>\n`
  const response=new Response(xml,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=60'}})
  try{await cache?.put(key,response.clone())}catch{/* Serve the complete fresh response even if caching fails. */}
  return new Response(request.method==='HEAD'?null:response.body,response)
 }catch{return new Response(request.method==='HEAD'?null:'Sitemap temporarily unavailable\n',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','retry-after':'60'}})}
}
