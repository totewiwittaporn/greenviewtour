import test from 'node:test'
import assert from 'node:assert/strict'
import {publicSitemap} from '../src/cloudflare/public-sitemap.js'
const request=method=>new Request('https://greenviewtour.test/sitemap.xml',{method})
const tours=Array.from({length:29},(_,i)=>({id:String(i),slug:i===0?'reef & boats':`tour-${i}`,ownership:i%2?'PARTNER':'GREENVIEW'}))
function fixture(rows=tours,alter=data=>data){
 const reads=[]
 const env={PUBLIC_ORIGIN:'https://greenviewtour.test',BACKOFFICE_ORIGIN:'https://backoffice.greenviewtour.test',API:{fetch:async req=>{
  const url=new URL(req.url),page=Number(url.searchParams.get('page'));reads.push(req)
  assert.equal(url.searchParams.get('view'),'cards');assert.equal(url.searchParams.has('ownership'),false)
  return Response.json(alter({rows:rows.slice((page-1)*12,page*12),total:rows.length,page,pageSize:12}))
 }}}
 return {env,reads}
}
test('Sitemap enumerates every catalog page, both ownerships, canonical escaped URLs and no private hosts',async()=>{
 const {env,reads}=fixture([...tours,{id:'extra-id',slug:'tour-1',ownership:'PARTNER'}])
 const response=await publicSitemap(request('GET'),env,null),xml=await response.text()
 assert.equal(response.status,200);assert.equal(reads.length,3)
 assert.equal([...xml.matchAll(/<loc>/g)].length,27+29)
 assert.match(xml,/tours\?tour=reef%20%26%20boats/)
 for(const row of tours)assert.ok(xml.includes('/tours?tour='+encodeURIComponent(row.slug)))
 assert.doesNotMatch(xml,/backoffice\.|member\.|ownership=|date=|pax=/)
 for(const req of reads){assert.equal(req.method,'GET');assert.equal(req.redirect,'manual');assert.deepEqual([...req.headers],[['accept','application/json'],['origin',env.PUBLIC_ORIGIN]])}
 const escaped=await publicSitemap(request('GET'),{...env,PUBLIC_ORIGIN:'https://greenviewtour.test?x=1&y=2'},null)
 assert.match(await escaped.text(),/&amp;y=2/)
})
test('Incomplete, changing, malformed, oversized and failed catalogs never yield partial sitemap200',async()=>{
 for(const alter of [d=>({...d,total:1201}),d=>({...d,page:1}),d=>({...d,total:d.page===2?30:d.total}),d=>({...d,rows:d.page===2?[]:d.rows}),d=>({...d,rows:d.rows.map(row=>({...row,id:'duplicate'}))}),d=>({...d,rows:d.rows.map(row=>({...row,slug:null}))})]){
  const {env}=fixture(tours,alter);const response=await publicSitemap(request('GET'),env,null)
  assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');assert.doesNotMatch(await response.text(),/<urlset/)
 }
 for(const fetch of [async()=>new Response('',{status:500}),async()=>new Response('broken JSON'),async()=>{throw Error('timeout')}])assert.equal((await publicSitemap(request('HEAD'),{...fixture().env,API:{fetch}},null)).status,503)
})
test('Only complete success is cached for60seconds; HEAD preserves status/MIME with no body',async()=>{
 const {env,reads}=fixture();let stored
 const cache={match:async()=>stored?.clone(),put:async(key,response)=>{assert.equal(key.url,env.PUBLIC_ORIGIN+'/sitemap.xml?__public_catalog=v1');stored=response}}
 const head=await publicSitemap(request('HEAD'),env,cache)
 assert.equal(head.status,200);assert.equal(await head.text(),'');assert.match(head.headers.get('content-type'),/application\/xml/)
 assert.equal(head.headers.get('cache-control'),'public, max-age=60')
 assert.match(await (await publicSitemap(request('GET'),env,cache)).text(),/<urlset/);assert.equal(reads.length,3)
 let puts=0
 await publicSitemap(request('GET'),{...env,API:null},{match:async()=>null,put:async()=>puts++})
 assert.equal(puts,0)
})

test('Zero published tours yields the valid static-only sitemap without fabricated detail URLs',async()=>{
 const {env,reads}=fixture([])
 const response=await publicSitemap(request('GET'),env,null),xml=await response.text()
 assert.equal(response.status,200);assert.equal(reads.length,1)
 assert.equal([...xml.matchAll(/<loc>/g)].length,27)
 assert.doesNotMatch(xml,/\?tour=/)
})

test('Cache-hit GET and HEAD restore60second freshness without extending the stored entry',async()=>{
 const {env,reads}=fixture([]);let stored,puts=0
 const cache={
  put:async(_key,response)=>{stored=response;puts++},
  match:async()=>{
   if(!stored)return
   const response=stored.clone(),headers=new Headers(response.headers)
   headers.set('cache-control','public, max-age=14400');headers.set('age','17')
   return new Response(response.body,{status:response.status,headers})
  },
 }
 const fresh=await publicSitemap(request('GET'),env,cache),xml=await fresh.text()
 assert.equal(fresh.headers.get('cache-control'),'public, max-age=60')
 assert.equal(stored.headers.get('cache-control'),'public, max-age=60')
 for(const method of ['GET','HEAD']){
  const hit=await publicSitemap(request(method),env,cache)
  assert.equal(hit.status,200);assert.equal(hit.headers.get('content-type'),'application/xml; charset=utf-8')
  assert.equal(hit.headers.get('cache-control'),'public, max-age=60');assert.equal(hit.headers.get('age'),'17')
  assert.equal(await hit.text(),method==='HEAD'?'':xml)
 }
 assert.equal(reads.length,1);assert.equal(puts,1)
 for(const method of ['GET','HEAD']){
  const failed=await publicSitemap(request(method),{...env,API:null},null)
  assert.equal(failed.status,503);assert.equal(failed.headers.get('cache-control'),'no-store')
  if(method==='HEAD')assert.equal(await failed.text(),'')
 }
})
