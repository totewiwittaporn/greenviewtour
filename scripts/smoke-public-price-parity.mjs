// Public standard fare regression: no visitor or departure pricing selectors.
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
   assert.ok(prices,'standard fare quote context missing')
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

  await page.goto(origin+'/tours?tour=fixture&date=2026-11-20&pax=2')
  await page.locator('.tour-direct-prices').waitFor()
  assert.equal(await page.locator('.tour-direct-prices tbody tr').count(),1)
  assert.equal(await page.locator('.tour-direct-prices select').count(),0)
  const table=await page.locator('.tour-direct-prices').innerText()
  assert.match(table,/2,500/);assert.match(table,/1,900/)
  assert.doesNotMatch(table,/Thai|Foreign|Khao Lak|Khura Buri|คนไทย|ต่างชาติ|เขาหลัก|คุระบุรี/)
  await page.waitForFunction(()=>document.querySelector('.tour-quote-total strong')?.textContent.includes('5,000'))
  assert.equal(quotes.at(-1).priceZone,'Khaolak');assert.equal(quotes.at(-1).priceNationality,'FOREIGN')
  await page.locator('.capacity-public-counts input').nth(1).fill('1')
  await page.waitForFunction(()=>document.querySelector('.tour-quote-total strong')?.textContent.includes('6,900'))
  await page.locator('.tour-availability > button').last().click()
  const text=await page.locator('dialog textarea').inputValue()
  assert.doesNotMatch(text,/Khao Lak|Foreign visitor|เขาหลัก|ต่างชาติ/);assert.match(text,/Surin fixture/)
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('dialog[open]').count(),0)
  await page.locator('.capacity-public-counts input').nth(0).fill('')
  await page.waitForTimeout(450);assert.equal(await page.locator('.tour-quote-total').count(),0)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'pricing overflow')

  if(process.env.GREENVIEW_QA_SCREENSHOTS){
    await page.locator('.tour-booking-panel').screenshot({path:process.env.GREENVIEW_QA_SCREENSHOTS+'/detail-'+lang+'-'+width+'.png'})
  }
  for(const [path,selector] of [['/','.featured-tour-bottom'],['/tours','.catalog-trip-price']]){
   await page.goto(origin+path)
   await page.locator(selector).first().waitFor()
   const priceText=await page.locator(selector).first().innerText()
   assert.match(priceText,/2,500/);assert.match(priceText,/1,900/)
   assert.doesNotMatch(priceText,/1,500|9999|8,888|Foreign|Thai|Khao Lak|ต่างชาติ|คนไทย|เขาหลัก/)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'card price overflow')
   if(process.env.GREENVIEW_QA_SCREENSHOTS)await page.locator(selector).first().screenshot({path:process.env.GREENVIEW_QA_SCREENSHOTS+'/'+(path==='/'?'home':'catalog')+'-'+lang+'-'+width+'.png'})
  }
  await context.close()
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[])
 console.log('PASS: single standard public fare, adult and child labels, automatic quote context, re-quote and stale-total removal, neutral enquiry, TH/EN at 1440/834/390; zero mutations.')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
