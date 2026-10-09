// Real Public Worker routing + built frontend, using isolated assets/API fixtures only.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve,extname,join} from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import worker from '../backend/src/cloudflare/public-worker.js'
const root=fileURLToPath(new URL('../frontend/public-web/dist/',import.meta.url))
const evidence=join(tmpdir(),'greenview-public-not-found')
let mode='missing'
const errors=[],mutations=[]
const env={APP_ENV:'production',PRODUCTION_ENABLED:'true',PUBLIC_ORIGIN:'https://greenviewtour.test',BACKOFFICE_ORIGIN:'https://backoffice.greenviewtour.test',
 ASSETS:{async fetch(request){
  const pathname=new URL(request.url).pathname
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname))
  if(!path.startsWith(root))return new Response(null,{status:404})
  try{const bytes=await readFile(path);return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream'}})}catch{return new Response(null,{status:404})}
 }},
 API:{async fetch(request){
  assert.equal(request.method,'GET')
  const url=new URL(request.url)
  if(url.pathname==='/api/public/company')return Response.json({company:null})
  if(url.searchParams.has('slug')&&mode==='unavailable')return new Response('',{status:503})
  if(url.searchParams.has('slug')&&mode==='malformed')return Response.json({rows:[],total:1})
  if(url.searchParams.has('slug')&&mode==='mismatch')return Response.json({rows:[{slug:'different'}],total:1})
  if(url.searchParams.has('slug')&&mode==='valid')return Response.json({rows:[{slug:url.searchParams.get('slug')}],total:1})
  return Response.json({rows:[],total:0,page:1,pageSize:12})
 }}
}
const server=createServer(async(req,res)=>{
 try{
  const response=await worker.fetch(new Request(env.PUBLIC_ORIGIN+req.url,{method:req.method}),env)
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))
 }catch(error){res.writeHead(500);res.end(String(error));errors.push(String(error))}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin=`http://127.0.0.1:${server.address().port}`
let browser
try{
 await mkdir(evidence,{recursive:true})
 browser=await chromium.launch({headless:true,...(process.env.GREENVIEW_CHROMIUM_EXECUTABLE?{executablePath:process.env.GREENVIEW_CHROMIUM_EXECUTABLE}:{})})
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 await context.route('**/*',route=>{
  const req=route.request()
  if(!['GET','HEAD'].includes(req.method())){mutations.push(req.url());return route.abort()}
  if(!req.url().startsWith(origin+'/'))return route.fulfill({contentType:'text/css',body:''})
  return route.continue()
 })
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message))
 for(const path of ['/not-a-page','/surin-islands/not-a-page']){
  assert.equal((await page.goto(origin+path)).status(),404)
  await page.getByRole('heading',{name:'ไม่พบหน้าที่คุณต้องการ'}).waitFor()
  assert.equal(await page.title(),'ไม่พบหน้าที่คุณต้องการ | Greenview Tour')
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex')
 }
 await page.locator('.language-selector > button').click()
 await page.locator('.language-options button').filter({hasText:'EN'}).click()
 await page.getByRole('heading',{name:'Page not found'}).waitFor()
 await page.screenshot({path:join(evidence,'desktop.png')})
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:join(evidence,'mobile.png')})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.locator('main a[href="/information"]').click()
 await page.getByRole('heading',{name:'Information',exact:true}).waitFor()
 assert.equal(await page.locator('meta[name="robots"]').count(),0)
 assert.equal((await page.goto(origin+'/surin-islands/getting-there')).status(),200)
 await page.getByRole('heading',{name:'How to get to the Surin Islands',exact:true}).waitFor()
 await page.locator('.editorial-related a').first().click()
 await page.waitForURL('**/surin-islands/piers')
 await page.goBack();await page.waitForURL('**/surin-islands/getting-there')
 for(const path of ['/tours','/promotions']){
 mode='missing'
 assert.equal((await page.goto(origin+path+'?tour=absent')).status(),404)
 await page.getByRole('heading',{name:'Page not found'}).waitFor()
 for(const failureMode of ['unavailable','malformed','mismatch']){
 mode=failureMode
 assert.equal((await page.goto(origin+path+'?tour=absent')).status(),503)
 await page.getByRole('alert').waitFor()
 assert.equal(await page.getByRole('heading',{name:'Page not found'}).count(),0)
 }
 }
 for(const method of ['GET','HEAD']){
  for(const path of ['/not-a-page','/assets/missing.js'])assert.equal((await fetch(origin+path,{method})).status,404)
  for(const path of ['/tours','/promotions'])for(const [testMode,status] of [['missing',404],['unavailable',503],['malformed',503],['mismatch',503]]){mode=testMode;assert.equal((await fetch(origin+path+'?tour=absent',{method})).status,status)}
  mode='valid';for(const path of ['/tours','/promotions'])assert.equal((await fetch(origin+path+'?tour=live&date=2026-10-10&pax=2',{method})).status,200)
 }
 assert.equal((await fetch(origin+'/api/private')).status,404)
 const robots=await fetch(origin+'/robots.txt');assert.match(robots.headers.get('content-type'),/text\/plain/)
 const sitemap=await fetch(origin+'/sitemap.xml');assert.match(sitemap.headers.get('content-type'),/application\/xml/)
 assert.doesNotMatch(await sitemap.text(),/member\.|backoffice\./)
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[])
 console.log('PASS: Worker HTTP status, built TH/EN 404, mobile, deep links, navigation/back, missing vs unavailable tour, assets and crawler files; no runtime errors or writes. '+evidence)
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
