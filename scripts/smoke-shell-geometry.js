// Intercepted fixture geometry: no live accounts or database changes.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
import {bookingSummary} from '../backend/src/backoffice/dashboard/overview/booking-summary.js'
import {customerCalendar} from '../backend/src/backoffice/dashboard/overview/service.js'
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5274'
const output=process.env.GREENVIEW_SHELL_SCREENSHOTS||'/tmp/greenview-shell-geometry'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message))
 let role='ADMIN_MANAGER',locale='en'
 const bookingRows=[{id:'geometry-booking',code:'GV-FIXTURE-1',status:'CONFIRMED',assigneeId:'geometry',createdById:'geometry',adults:18,children:2,outboundDate:'2026-09-22',programSnapshot:{tourId:'surin',name:'Surin Islands'}}]
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/me')return route.fulfill({json:{user:{id:'geometry',displayName:locale==='th'?'คุณผู้ดูแลระบบและประสานงานการท่องเที่ยวชื่อยาวสำหรับทดสอบ':'Alexandria Longnamed Administrator and Operations Coordinator',status:'ACTIVE',roles:[{code:role,scope:'COMPANY'}],management:{company:true},operations:{booking:true,islandBooking:true},companyAccess:{}}}})
  if(path==='/api/dashboard')return route.fulfill({json:{scope:'Company',today:'2026-09-22',generatedAt:'2026-09-22T03:00:00Z',timezone:'Asia/Bangkok',calendar:null,widgets:[],bookingOverview:await bookingSummary({tourBooking:{findMany:async()=>bookingRows},userProfile:{findMany:async()=>[{id:'geometry',displayName:'Booking team member'}]}},{id:'geometry',status:'ACTIVE',roles:[{code:role,scope:'COMPANY'}]},'2026-09-22',customerCalendar)}})
  return route.fulfill({json:{}})
 })
 const geometry=async()=>page.evaluate(()=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}
  const header=document.querySelector('.topbar'),account=header.querySelector('.account-menu'),button=account.querySelector('button'),name=button.querySelector('.account-name'),role=button.querySelector('.reference-account-role')
  const controls=['.reference-brand-wrap','.reference-search','.workspace-notifications','.workspace-help','.account-menu'].map(selector=>rect(header.querySelector(selector)))
  const overlaps=controls.some((a,i)=>controls.some((b,j)=>j>i&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1))
  return {main:rect(document.querySelector('main')),hero:rect(document.querySelector('.reference-hero')),header:rect(header),account:rect(account),button:rect(button),name:rect(name),role:rect(role),overlaps,overflow:document.documentElement.scrollWidth>innerWidth,paddingRight:parseFloat(getComputedStyle(header).paddingRight),timeColor:getComputedStyle(document.querySelector('.reference-hero-updated time')).color,logo:header.querySelector('.reference-brand img').getAttribute('src')}
 })
 for(role of ['ADMIN_MANAGER','MANAGER','HEAD_BOOKING','BOOKING'])for(locale of ['en','th']){
  await page.addInitScript(value=>localStorage.setItem('greenview.locale',value),locale)
  await page.goto(origin+'/dashboard');await page.locator('.reference-hero-updated time').waitFor()
  for(const width of [320,390,760,834,1024,1440]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>window.scrollTo(0,0));const g=await geometry();const label=role+' '+locale+' '+width
   assert.ok(g.main.top-g.header.bottom<=12,label+' unnecessary gap below navbar');
   assert.ok(g.header.bottom<=g.main.top+.5,label+' navbar overlaps main');assert.ok(g.header.bottom<=g.hero.top+.5,label+' navbar overlaps Hero')
   assert.equal(g.overlaps,false,label+' toolbar controls overlap');assert.equal(g.overflow,false,label+' page overflow')
   for(const box of [g.name,g.role]){assert.ok(box.left>=g.button.left&&box.right<=g.button.right+.5,label+' identity outside button horizontally');assert.ok(box.top>=g.button.top&&box.bottom<=g.button.bottom+.5,label+' identity outside button vertically')}
   assert.ok(g.account.width<=180.5,label+' account exceeds compact width')
   assert.equal(await page.locator('.account-name').evaluate(el=>getComputedStyle(el).textOverflow),'ellipsis')
   await page.evaluate(()=>window.scrollTo(0,300));assert.ok(Math.abs((await geometry()).header.top)<=1,label+' navbar scrolls away');await page.evaluate(()=>window.scrollTo(0,0))
   assert.ok(g.account.bottom<=g.header.bottom+.5,label+' account outside navbar');assert.ok(Math.abs(g.header.right-g.paddingRight-g.account.right)<=1,label+' account not right aligned');assert.equal(g.timeColor,'rgb(255, 255, 255)',label+' hero time not white');assert.equal(g.logo,'/images/brand/greenview-logo.png')
   await page.locator('.account-menu button').click();await page.getByRole('menu').waitFor();const menuGeometry=await geometry();assert.ok(menuGeometry.header.bottom<=menuGeometry.main.top+.5,label+' open account shifts navbar over main');await page.keyboard.press('Escape')
   if(width<=760){await page.locator('.menu-toggle').click();const openGeometry=await geometry();assert.ok(openGeometry.header.bottom<=openGeometry.main.top+.5,label+' open navigation overlaps main');assert.ok(openGeometry.header.bottom<=openGeometry.hero.top+.5,label+' open navigation overlaps Hero');await page.locator('.menu-toggle').click()}
   if((width===390&&locale==='th')||(width===1440&&locale==='en'))await page.screenshot({path:`${output}/${role}-${locale}-${width}.png`})
  }
  await page.locator('.account-menu button').click()
  await page.getByRole('menu').waitFor();await page.keyboard.press('Escape')
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',roles:4,locales:['en','th'],widths:[320,390,760,834,1024,1440],checks:['no toolbar overlap','navbar stays above main and Hero with menus open','name and role inside UserInfo','right alignment','no horizontal overflow','white Hero time','original logo','UserInfo opens'],screenshots:output,liveAccounts:false}))
}finally{await browser.close()}
