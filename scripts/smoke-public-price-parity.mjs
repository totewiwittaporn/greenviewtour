// Read-only browser fixtures for the pricing behavior already deployed on 10 October.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {extname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
const root=fileURLToPath(new URL('../frontend/public-web/dist/',import.meta.url))
const tour={id:'fixture',slug:'fixture',name:'Surin fixture',ownership:'GREENVIEW',durationDays:1,tourType:'DAY_TRIP',adultPrice:'9999',childPrice:'8888',promotions:[],seasons:[],publicContent:[],publicMedia:[],directPriceMatrix:{Kuraburi:{TH:{adult:'1500',child:'900'},FOREIGN:{adult:'2200',child:'1600'}},Khaolak:{TH:{adult:'1800',child:'1200'},FOREIGN:{adult:'2500',child:'1900'}}}}
const quotes=[],errors=[],writes=[]
const server=createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'){writes.push(req.url);res.writeHead(405);return res.end()}
  const url=new URL(req.url,'http://fixture.test')
  let data
  if(url.pathname==='/api/public/company')data={company:null}
  else if(url.pathname==='/api/public/popups')data={rows:[]}
  else if(url.pathname==='/api/public/tours')data={rows:[tour],total:1,page:1,pageSize:12}
  else if(url.pathname==='/api/public/quote'){
   const p=url.searchParams;quotes.push(Object.fromEntries(p))
   const prices=tour.directPriceMatrix[p.get('priceZone')]?.[p.get('priceNationality')]
   assert.ok(prices,'quote before both price selectors')
   data={packageTotal:String(Number(prices.adult)*Number(p.get('adults'))+Number(prices.child)*Number(p.get('children'))),availability:{legs:[],groupSize:Number(p.get('adults'))+Number(p.get('children')),canConfirm:true}}
  }
  if(data){res.setHeader('content-type','application/json');return res.end(JSON.stringify(data))}
  const path=url.pathname.startsWith('/assets/')||url.pathname.startsWith('/images/')?url.pathname:'/index.html'
  const bytes=await readFile(root+path);res.setHeader('content-type',({'.js':'application/javascript','.css':'text/css','.webp':'image/webp','.html':'text/html'})[extname(path)]||'application/octet-stream');res.end(bytes)
 }catch(error){errors.push(error.message);res.writeHead(500);res.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({headless:true,...(process.env.GREENVIEW_CHROMIUM_EXECUTABLE?{executablePath:process.env.GREENVIEW_CHROMIUM_EXECUTABLE}:{})})
try{
 for(const lang of ['th','en'])for(const width of [1440,834,390]){
  const context=await browser.newContext({viewport:{width,height:1000}})
  await context.addInitScript(lang=>localStorage.setItem('greenview.locale',lang),lang)
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort())
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message))
  const prior=quotes.length
  await page.goto(origin+'/tours?tour=fixture&date=2026-11-20&pax=2')
  await page.locator('.tour-direct-prices').waitFor()
  assert.equal(await page.locator('.tour-direct-prices tbody tr').count(),4)
  await page.waitForTimeout(450);assert.equal(quotes.length,prior)
  const selectors=page.locator('.tour-direct-prices select')
  await selectors.nth(0).selectOption('Kuraburi')
  await page.waitForTimeout(450);assert.equal(quotes.length,prior)
  await selectors.nth(1).selectOption('TH')
  await page.waitForFunction(()=>document.querySelector('.tour-quote-total strong')?.textContent.includes('3,000'))
  assert.equal(quotes.at(-1).priceZone,'Kuraburi');assert.equal(quotes.at(-1).priceNationality,'TH')
  await selectors.nth(0).selectOption('Khaolak');await selectors.nth(1).selectOption('FOREIGN')
  await page.waitForFunction(()=>document.querySelector('.tour-quote-total strong')?.textContent.includes('5,000'))
  assert.equal(quotes.at(-1).priceZone,'Khaolak');assert.equal(quotes.at(-1).priceNationality,'FOREIGN')
  await page.locator('.tour-availability > button').last().click()
  const text=await page.locator('dialog textarea').inputValue()
  assert.match(text,lang==='en'?/Khao Lak/:/เขาหลัก/);assert.match(text,lang==='en'?/Foreign visitor/:/ต่างชาติ/)
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('dialog[open]').count(),0)
  await selectors.nth(1).selectOption('')
  await page.waitForTimeout(450);assert.equal(await page.locator('.tour-quote-total').count(),0)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'pricing overflow')
  await context.close()
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[])
 console.log('PASS: live pricing parity, four matrix fares, no quote until both selectors, re-quote and stale-total removal, inquiry fields, TH/EN at 1440/834/390; zero mutations.')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
