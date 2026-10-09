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
const evidence=join(tmpdir(),'greenview-public-discovery')
let empty=false
const rows=Array.from({length:54},(_,i)=>({id:String(i),slug:'tour-'+i,name:'Tour '+i,ownership:i<27?'GREENVIEW':'PARTNER',durationDays:1,publicContent:[],publicMedia:[],promotions:[]}))
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
  if(url.pathname==='/api/public/popups')return Response.json({rows:[]})
  const p=url.searchParams,ownership=p.get('ownership')
  const selected=(empty?[]:rows).filter(row=>!ownership||row.ownership===ownership)
  const page=Math.min(Math.max(1,Number(p.get('page')||1)),Math.max(1,Math.ceil(selected.length/12)))
  return Response.json({rows:selected.slice((page-1)*12,page*12),total:selected.length,page,pageSize:12})
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
 const first=await page.goto(origin+'/tours?page=2')
 assert.equal(first.status(),200);assert.equal(first.headers()['x-robots-tag'],undefined)
 await page.getByRole('heading',{name:'Tour 12',exact:true}).waitFor()
 assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),origin+'/tours?page=2')
 assert.equal(await page.locator('meta[name="robots"]').count(),0)
 await page.locator('.public-pagination-nav[href]').last().click()
 await page.waitForURL('**/tours?page=3');await page.getByRole('heading',{name:'Tour 24',exact:true}).waitFor()
 await page.goBack();await page.waitForURL('**/tours?page=2');await page.getByRole('heading',{name:'Tour 12',exact:true}).waitFor()
 await page.goForward();await page.waitForURL('**/tours?page=3');await page.getByRole('heading',{name:'Tour 24',exact:true}).waitFor()
 const search='ownership=PARTNER&duration=day&date=2026-11-01&pax=3&page=2'
 const filtered=await page.goto(origin+'/tours?'+search)
 assert.equal(filtered.headers()['x-robots-tag'],'noindex, follow')
 await page.getByRole('heading',{name:'Tour 39',exact:true}).waitFor()
 assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),origin+'/tours?ownership=PARTNER&duration=day&page=2')
 const next=page.locator('.public-pagination-nav[href]').last()
 assert.equal(await next.getAttribute('href'),'/tours?ownership=PARTNER&duration=day&date=2026-11-01&pax=3&page=3')
 await next.click();await page.getByRole('heading',{name:'Tour 51',exact:true}).waitFor()
 await page.reload();await page.getByRole('heading',{name:'Tour 51',exact:true}).waitFor()
 assert.equal(new URL(page.url()).searchParams.get('pax'),'3')
 await page.screenshot({path:join(evidence,'desktop.png')})
 await page.setViewportSize({width:390,height:844});await page.locator('.public-pagination').scrollIntoViewIfNeeded();await page.screenshot({path:join(evidence,'mobile.png')})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.goto(origin+'/promotions?page=2');await page.getByRole('heading',{name:'Tour 12',exact:true}).waitFor()
 await page.locator('.public-pagination-nav[href]').last().click();await page.waitForURL('**/promotions?page=3');await page.getByRole('heading',{name:'Tour 24',exact:true}).waitFor()
 await page.goto(origin+'/tours?page=999');await page.getByRole('heading',{name:'Tour 24',exact:true}).waitFor()
 assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),origin+'/tours?page=3')
 assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, follow')
 const sitemap=await fetch(origin+'/sitemap.xml');assert.equal(sitemap.status,200)
 const xml=await sitemap.text();assert.equal([...xml.matchAll(/<loc>/g)].length,81)
 for(const row of rows)assert.ok(xml.includes('/tours?tour='+row.slug+'<'))
 assert.doesNotMatch(xml,/ownership=|date=|pax=|backoffice\.|member\./)
 empty=true
 await page.goto(origin+'/tours');await page.getByText('ยังไม่มีทัวร์เปิดเผยแพร่ กรุณาติดต่อบริษัทเพื่อสอบถาม',{exact:true}).waitFor()
 assert.equal(await page.locator('.catalog-trip').count(),0)
 const emptyXml=await (await fetch(origin+'/sitemap.xml')).text();assert.equal([...emptyXml.matchAll(/<loc>/g)].length,27);assert.doesNotMatch(emptyXml,/\?tour=/)
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[])
 console.log('PASS: complete own/Partner sitemap, crawlable pagination, direct/reload/back/forward, preserved filters, canonical/noindex policy, mobile, no runtime errors/writes. '+evidence)
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
