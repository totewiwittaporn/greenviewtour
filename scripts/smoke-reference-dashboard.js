import {summarizeCash} from '../backend/src/backoffice/dashboard/overview/cash-summary.js'
// Intercepted browser fixtures only: no real accounts, database writes or provider messages.
// Run against the isolated server from smoke-browser-fixtures.js. Screenshots default to /tmp.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
import {customerCalendar} from '../backend/src/backoffice/dashboard/overview/service.js'
import {roleNames} from '../packages/contracts/access.js'
import {readManuals} from '../backend/src/backoffice/manuals/service.js'
import {managementSummary} from '../backend/src/backoffice/dashboard/overview/management-summary.js'
const origin=process.env.GREENVIEW_TEST_ORIGIN || 'http://localhost:5274'
const output=process.env.GREENVIEW_REFERENCE_SCREENSHOTS || '/tmp/greenview-reference-dashboard-screenshots'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true})
const today='2026-09-22', rows=Array.from({length:30},(_,i)=>({id:'fixture-'+i,code:'GV2609-'+String(i).padStart(3,'0'),status:i===1?'DRAFT':i===2?'CANCELLED':'CONFIRMED',outboundDate:new Date(Date.UTC(2026,8,22+i)).toISOString().slice(0,10),returnStatus:'NONE',returnDate:null,adults:12+i%5*8,children:2,programSnapshot:{tourId:'surin',name:'Surin Islands'},agent:{id:i%2?'agent-b':'agent-a',name:i%2?'Sunny Holiday':'Ocean Travel'}}))
const overview=await managementSummary({tourBooking:{findMany:async()=>rows}},today,customerCalendar)
const cashOverview={...summarizeCash({today,receipts:[{id:'r1',bookingId:'b1',net:'2300',margin:'1200',receivedOn:today}],expenses:[{id:'e1',title:'Approved supplies',kind:'REIMBURSEMENT',status:'APPROVED',payload:{amount:'500',plannedPaymentOn:today}}]}),payrollIncluded:false}
let persona='gm',state='ready'
const widgets=[{id:'guide',title:'Boat jobs',href:'/operations/guide',scope:'Company',pending:4,today:2,overdue:0,review:null,detail:'Assigned boat jobs.'},{id:'guide-allocation',title:'Awaiting boat allocation',href:'/operations/guide',scope:'Company',pending:3,today:1,overdue:null,review:null,detail:'Bookings awaiting allocation.'},{id:'maintenance',title:'Maintenance jobs',href:'/company/maintenance',scope:'Company',pending:3,today:2,overdue:0,review:1,detail:'Maintenance work.'}]
let browserErrors=[],consoleErrors=[],calls=0
const page=await browser.newPage({viewport:{width:1440,height:1000}})
page.on('pageerror',error=>browserErrors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())})
const getUser=()=>({id:'fixture-'+persona,displayName:persona==='gm'?'GM':'Tee',status:'ACTIVE',roles:[{code:persona==='gm'?'MANAGER':'ADMIN_MANAGER',name:persona==='gm'?'Manager':'Admin Manager',scope:'COMPANY'}],management:{company:true,users:true},permissions:[],operations:{booking:true,islandBooking:true,guide:true},companyAccess:{}})
await page.route('**/api/**',route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/auth/recovery-status')return route.fulfill({status:403,json:{code:'RECOVERY_REQUIRED'}});if(path==='/api/manuals'){try{return route.fulfill({json:readManuals(getUser(),new URL(route.request().url()).searchParams.get('role'))})}catch{return route.fulfill({status:403,json:{code:'PERMISSION_DENIED'}})}}if(path==='/api/me')return route.fulfill({json:{user:getUser()}});if(path==='/api/dashboard'){calls++;return route.fulfill({status:state==='error'?500:200,json:state==='error'?{code:'SERVICE_UNAVAILABLE'}:{today,timezone:'Asia/Bangkok',generatedAt:today+'T03:00:00Z',scope:'Company',calendar:customerCalendar(rows,today),widgets,managementOverview:overview,cashOverview}})}return route.fulfill({json:{items:[],total:0}})})
const ready=async()=>{await page.goto(origin+'/dashboard');await page.locator('.reference-dashboard-content').waitFor();assert.equal(await page.title(),'Dashboard · Greenview Tour');assert.equal(await page.locator('vite-error-overlay').count(),0)}
const noOverflow=async(label)=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,label+' horizontal overflow')
const focusDialog=async(selector)=>{const button=page.locator(selector);await button.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();assert.equal(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),true);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await button.evaluate(el=>el===document.activeElement),true)}
try {
for(const role of ['gm','programmer']){
 persona=role;await page.setViewportSize({width:1440,height:1000});await ready()
 assert.match(await page.locator('h1').innerText(),role==='gm'?/General Manager Dashboard/:/Programmer \/ System Administrator Dashboard/)
 assert.equal(await page.locator('.topbar .reference-brand img').getAttribute('src'),'/images/brand/greenview-logo.webp')
 assert.equal(await page.locator('.topbar').evaluate(el=>{const bell=el.querySelector('.workspace-notifications').getBoundingClientRect(),help=el.querySelector('.workspace-help').getBoundingClientRect(),account=el.querySelector('.account-menu').getBoundingClientRect();return bell.right<=help.left&&help.right<=account.left}),true,'Help sits between bell and User Info')
 await focusDialog('.workspace-notifications');await focusDialog('.workspace-help')
 await page.locator('.workspace-help').click();const manualLink=page.getByRole('dialog').getByRole('link',{name:'User guides',exact:true});assert.equal(await manualLink.getAttribute('href'),'/manuals');await manualLink.click();await page.waitForURL('**/manuals');await page.locator('.manual-role-list a').first().waitFor();assert.equal(await page.locator('.manual-role-list a').count(),role==='gm'?1:Object.keys(roleNames).length);await page.locator('.manual-role-list a[href="/manuals/'+(role==='gm'?'MANAGER':'ADMIN_MANAGER')+'"]').click();await page.locator('.manual-article').waitFor();assert.ok((await page.locator('.manual-article').innerText()).length>400);await ready();assert.equal(await page.locator('.reference-brand img').first().evaluate(img=>img.complete&&img.naturalWidth>0),true);assert.equal((await page.request.get(origin+'/images/dashboard/island-hero.webp')).status(),200)

 const search=page.locator('.reference-search input')
 await search.fill('Booking');await page.locator('.reference-search-results a').first().waitFor()
 const allowed=await page.locator('.sidebar nav a').evaluateAll(links=>links.map(a=>a.getAttribute('href')))
 for(const href of await page.locator('.reference-search-results a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))))assert.ok(allowed.includes(href))
 await page.keyboard.press('ArrowDown');assert.equal(await page.locator('.reference-search-results a').first().evaluate(el=>el===document.activeElement),true)
 await page.keyboard.press('Escape');assert.equal(await page.locator('.reference-search-results').count(),0)
 await search.focus();await search.fill('nothing-matches-this');await page.getByText('No matching work areas.',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await search.inputValue(),'');assert.equal(await search.evaluate(el=>el===document.activeElement),true)
 await search.fill('Dashboard');await page.keyboard.press('Enter');assert.equal(await search.inputValue(),'')
 if(role==='gm'){
  assert.equal(await page.locator('.reference-bars button').count(),30)
  await page.getByRole('heading',{name:'Actual money received',exact:true}).waitFor();await page.getByRole('heading',{name:'Actual money paid',exact:true}).waitFor()
  await page.getByRole('combobox',{name:'Payment timing',exact:true}).click();await page.getByRole('option',{name:'UNSCHEDULED',exact:true}).click();await page.getByRole('cell',{name:'AGENT_REFUND',exact:true}).waitFor()
  await page.getByRole('combobox',{name:'Payment timing',exact:true}).click();await page.getByRole('option',{name:'NEXT_30_DAYS',exact:true}).click();await page.getByRole('link',{name:'Approved supplies',exact:true}).waitFor()
  const first=page.locator('.reference-bars button').first();await first.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').getByRole('cell',{name:'Surin Islands',exact:true}).waitFor();await page.keyboard.press('Escape');assert.equal(await first.evaluate(el=>el===document.activeElement),true)
  await page.getByRole('tab',{name:'Tomorrow',exact:true}).click();assert.equal(await page.getByRole('tab',{name:'Tomorrow',exact:true}).getAttribute('aria-selected'),'true');await page.getByRole('tabpanel').filter({visible:true}).getByText('GV2609-001',{exact:true}).waitFor()
  await page.getByRole('tab',{name:'Today',exact:true}).click();await page.getByRole('tabpanel').filter({visible:true}).getByText('GV2609-000',{exact:true}).waitFor()
 }else{
  assert.deepEqual(await page.locator('.reference-panel h2').allTextContents(),['Error / Bug','API status']);assert.equal(await page.getByRole('button',{name:'+ Add note',exact:true}).count(),0)
 }
 for(const width of [1440,834,390]){await page.setViewportSize({width,height:1000});await noOverflow(role+' '+width);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/${role}-${width}.png`,fullPage:true});if(width===390){await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();assert.equal(await page.locator('.sidebar nav').isVisible(),true);await page.locator('.sidebar a').first().focus();await page.keyboard.press('Escape');assert.equal(await page.locator('.sidebar').isVisible(),false)}}
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})));await page.waitForFunction(()=>document.documentElement.lang==='th');await page.setViewportSize({width:320,height:900});await noOverflow(role+' Thai 320');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/${role}-th-320.png`,fullPage:true});await focusDialog('.workspace-help');await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})));await page.waitForFunction(()=>document.documentElement.lang==='en')
}
persona='gm';const consoleBefore=consoleErrors.length;await page.goto(origin+'/manuals/ADMIN_MANAGER');await page.getByRole('heading',{name:'Access restricted',exact:true}).waitFor();assert.equal(await page.locator('.manual-article').count(),0);assert.equal(await page.getByText('System dashboard',{exact:true}).count(),0);for(const message of consoleErrors.slice(consoleBefore))assert.match(message,/Failed to load resource: the server responded with a status of 403/);consoleErrors.length=consoleBefore
const legacy=await page.request.get(origin+'/manuals/dashboard-guide.html');const legacyText=await legacy.text();assert.match(legacyText,/url=\/manuals/);assert.equal(legacyText.includes('System dashboard'),false);assert.ok(legacyText.length<500)
assert.deepEqual(browserErrors,[]);assert.deepEqual(consoleErrors,[])
console.log(JSON.stringify({result:'PASS',roles:['gm','programmer'],viewports:[1440,834,390,320],locale320:'th',screenshots:output,calls,checks:['identity','not blank','no framework overlay','console clean','permission-safe navigation search','clear/focus/keyboard','bell/help order and modal focus','GM bar details','today/tomorrow tabs','programmer Error/Bug and API only','mobile navigation','no horizontal overflow'],liveAccounts:false}))
}catch(error){await page.screenshot({path:output+'/failure.png',fullPage:true});console.log('Overflow boxes',await page.evaluate(()=>Array.from(document.querySelectorAll('*')).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1).slice(0,15)));throw error}finally{await browser.close()}
