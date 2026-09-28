// Isolated intercepted fixtures. No credentials, database or external mutations.
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import {fileURLToPath} from 'node:url'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url))
const server=await createServer({root,configFile:root+'vite.config.js',server:{port:5294,strictPort:true}})
await server.listen()
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
let snapshot={status:'CALCULATED',amount:'26.80',adultRate:'12.35',childRate:'2.10',beneficiaryId:'owner'}
const booking=()=>({id:'booking',code:'BK-COMMISSION',name:'Commission fixture',status:'DRAFT',version:1,adults:2,children:1,adultPrice:'100',childPrice:'50',trip:{name:'Fixture tour',startsAt:'2026-11-10T00:00:00Z',endsAt:'2026-11-10T10:00:00Z'},programSnapshot:{},lines:[],commissionSnapshot:snapshot})
await page.route('**/api/**',route=>{const p=new URL(route.request().url()).pathname;return route.fulfill({json:p==='/api/me'?{user:{id:'owner',displayName:'Tee',status:'ACTIVE',roles:[{code:'ADMIN_MANAGER',scope:'COMPANY'}],management:{company:true,users:true},operations:{booking:true,islandBooking:true},permissions:[]}}:p==='/api/operations/bookings'?{rows:[booking()],summary:{total:1,draft:1},total:1,page:1,pages:1}: {rows:[],total:0,page:1,pages:1,summary:{}}})})
try{
 for(const entity of ['partners','tours']){
  await page.goto('http://localhost:5294/settings/'+entity)
  await page.getByRole('button',{name:entity==='partners'?'+ Add partner':'+ Add tour program',exact:true}).click()
  const field=page.getByRole('combobox',{name:'Booking staff commission',exact:true})
  assert.match(await field.innerText(),/^No commission/)
  if(entity==='tours')assert.equal(await page.getByLabel('Booking staff commission per adult (THB)',{exact:true}).count(),0)
  await field.click();await page.getByRole('option',{name:'Commission enabled',exact:true}).click()
  if(entity==='tours'){await page.getByLabel('Booking staff commission per adult (THB)',{exact:true}).fill('12.35');await page.getByLabel('Booking staff commission per child (THB)',{exact:true}).fill('2.10')}
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.screenshot({path:'/tmp/greenview-commission-'+entity+'.png',fullPage:true})
  await page.reload();await page.setViewportSize({width:1440,height:1000})
 }
 for(const status of ['CALCULATED','NO_COMMISSION','RATE_NOT_CONFIGURED']){
  snapshot={...snapshot,status,amount:status==='NO_COMMISSION'?'0.00':status==='RATE_NOT_CONFIGURED'?null:'26.80'}
  await page.goto('http://localhost:5294/operations/bookings');await page.getByRole('button',{name:'Actions for BK-COMMISSION',exact:true}).click();await page.getByRole('menuitem',{name:'View',exact:true}).click()
  await page.locator('.booking-commission').waitFor();assert.match(await page.locator('.booking-commission').innerText(),status==='CALCULATED'?/26.80/:status==='NO_COMMISSION'?/No commission/:/rate not configured/)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})))
  await page.waitForFunction(()=>document.documentElement.lang==='th');assert.match(await page.locator('.booking-commission').innerText(),/ค่าคอมมิชชั่น/)
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.locator('.booking-commission').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/greenview-commission-'+status+'.png',fullPage:true})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})));await page.setViewportSize({width:1440,height:1000})
 }
 assert.deepEqual(errors,[]);console.log('PASS commission settings toggles/rates, three summary states, English/Thai, desktop/mobile; intercepted fixtures only')
}finally{await browser.close();await server.close()}
