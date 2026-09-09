// Browser fixtures: exercise Booking intake without writing application data.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { bookingJourney } from '../packages/contracts/booking-plan.js'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url)),out=fileURLToPath(new URL('../screenshots.local/',import.meta.url))
const vite=await createServer({root,server:{port:5289,strictPort:true},configFile:`${root}vite.config.js`});await vite.listen()
const browser=await chromium.launch({headless:true,...(process.env.GV_BROWSER_PATH?{executablePath:process.env.GV_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})})
try{
 await mkdir(out,{recursive:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],posts=[]
 page.on('pageerror',e=>errors.push(e.message))
 const id=n=>`70000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 const programs=[{id:id(1),name:'Surin day trip',journeyMode:'FIXED',durationDays:1},{id:id(2),name:'Open return boat ticket',journeyMode:'OPEN_RETURN',durationDays:1},{id:id(3),name:'Island return ticket',journeyMode:'RETURN_ONLY',durationDays:1}]
 const list=rows=>({rows,total:rows.length,page:1,pageSize:25,pages:1})
 let quoteFailure=false
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),entity=url.pathname.split('/').at(-1)
  if(request.method()==='POST'){assert.equal(entity,'bookings');posts.push(request.postDataJSON());return route.fulfill({json:{row:{id:id(30)}}})}
  if(entity==='me')return route.fulfill({json:{user:{id:id(99),displayName:'Fixture manager',roles:[],management:{company:true},operations:{booking:true,guide:true,driver:true}}}})
  if(entity==='bookings')return route.fulfill({json:{...list([]),summary:{total:0,draft:0,confirmed:0,completed:0}}})
  if(entity==='booking-options'){const type=url.searchParams.get('entity');return route.fulfill({json:list(type==='tours'?programs:type==='agents'?[{id:id(4),name:'Fixture agent'}]:[])})}
  if(entity==='blueprint'){
   if(quoteFailure)return route.fulfill({status:503,json:{code:'QUOTE_UNAVAILABLE'}})
   const program=programs.find(p=>p.id===url.searchParams.get('tourId')),adults=Number(url.searchParams.get('adults')),children=Number(url.searchParams.get('children'))
   let journey;try{journey=bookingJourney(program,url.searchParams.get('serviceDate'),url.searchParams.get('returnStatus'),url.searchParams.get('returnDate'))}catch{return route.fulfill({status:400,json:{code:'INVALID_RETURN_DATE'}})}
   return route.fulfill({json:{program,journey,trip:{},adultPrice:url.searchParams.get('agentId')?'800.00':'1000.00',childPrice:'500.00',allowedPaymentTerms:['PREPAID','COUNTER','AGENT_CREDIT'],defaultPaymentTerms:'COUNTER',lines:program.journeyMode==='FIXED'?[{componentId:id(10),resourceId:id(11),resource:{name:'Lunch',category:'MEAL',baseUnit:'PERSON_MEAL'},selection:'INCLUDED',included:true,selected:true,quantity:adults+children,unitPrice:'0.00',removalCredit:'100.00'}]:[]}})
  }
  return route.fulfill({json:list([])})
 })
 async function select(label,name){await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name,exact:true}).click()}
 await page.goto('http://localhost:5289/operations/bookings');await page.getByRole('button',{name:'New booking',exact:true}).click()
 await page.getByLabel('Group / guest name',{exact:true}).fill('Fixture guest')
 await select('Tour program','Surin day trip')
 await page.getByLabel('Travel date',{exact:true}).fill('2026-11-10');await page.getByLabel('Adults',{exact:true}).fill('2')
 await page.getByText('Outbound: 2026-11-10 · Return: 2026-11-10',{exact:true}).waitFor()
 await select('Agent','Fixture agent')
 await page.getByText('Adult: 800.00 THB · Child: 500.00 THB',{exact:true}).waitFor()
 await page.getByRole('checkbox',{name:'No meals',exact:true}).check()
 await page.locator('dd strong').filter({hasText:'1,400.00 THB'}).waitFor()
 assert.equal(await page.getByLabel('Quantity (PERSON_MEAL)',{exact:true}).isDisabled(),true,'Included credit quantity must not be editable')
 await select('Food allergies','No food allergies')
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.screenshot({path:`${out}/booking-intake-mobile.png`,fullPage:true})
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Save draft',exact:true}).click()
 await page.getByRole('heading',{name:'New booking',exact:true}).waitFor({state:'hidden'})
 assert.equal(posts.length,1);const payload=posts[0]
 assert.equal(payload.serviceDate,'2026-11-10');assert.equal(payload.agentId,id(4));assert.equal(payload.allergyStatus,'NONE');assert.deepEqual(payload.specialRequirements,['NO_MEALS']);assert.equal(payload.lines[0].selected,false)
 for(const field of ['code','tripId','adultPrice','childPrice'])assert.equal(field in payload,false,`${field} must be server-owned`)
 assert.equal('sourceId' in payload.lines[0],false);assert.equal('slotId' in payload.lines[0],false)
 await page.getByRole('button',{name:'New booking',exact:true}).click();await select('Tour program','Open return boat ticket')
 await page.getByRole('combobox',{name:'Return arrangement',exact:true}).waitFor();await select('Return arrangement','Returning with Greenview')
 await page.getByLabel('Return date',{exact:true}).fill('2026-12-01');await page.getByRole('button',{name:'Save draft',exact:true}).waitFor()
 quoteFailure=true;await page.getByLabel('Adults',{exact:true}).fill('3');await page.getByRole('alert').filter({hasText:'QUOTE UNAVAILABLE'}).waitFor();assert.equal(await page.getByRole('button',{name:'Save draft',exact:true}).isDisabled(),true)
 quoteFailure=false;await page.getByRole('button',{name:'Retry program price',exact:true}).click();await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Save draft')?.disabled)
 assert.deepEqual(errors,[]);console.log('PASS Booking intake: dated program, agent price, removal credit, locked included quantity, no operational assignments, mobile, open return, failed quote/retry')
}finally{await browser.close();await vite.close()}
