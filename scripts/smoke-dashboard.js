// Isolated browser fixtures only. No real users, DB writes or provider messages.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {customerCalendar} from '../backend/src/backoffice/dashboard/overview/service.js'
import {bookingSummary} from '../backend/src/backoffice/dashboard/overview/booking-summary.js'
import {managementSummary} from '../backend/src/backoffice/dashboard/overview/management-summary.js'
import {roleNames} from '../packages/contracts/access.js'
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5274'
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 const manager={id:'fixture',displayName:'Manager',status:'ACTIVE',roles:[{code:'MANAGER',scope:'COMPANY'}],management:{company:true},operations:{booking:true,islandBooking:true},companyAccess:{}}
 let user=manager,signedIn=true,response='ready',calls=0,loadingGate
 const rows=[{id:'b',code:'B1',status:'CONFIRMED',outboundDate:'2026-09-21',adults:82,children:10,programSnapshot:{tourId:'surin',name:'Surin day trip'}}]
 const overview=await managementSummary({tourBooking:{findMany:async()=>rows}},'2026-09-21',customerCalendar)
 await page.route('**/api/auth/recovery-status',route=>route.fulfill({status:403,json:{code:'RECOVERY_REQUIRED'}}))
 await page.route(/\/api\/me\/line(?:\?.*)?$/,route=>route.request().method()==='GET'?route.fulfill({json:{status:'UNLINKED',linkedLineProfile:null}}):route.fallback())
 await page.route('**/api/me',route=>route.fulfill({status:signedIn?200:401,json:signedIn?{user}:{code:'LOGIN_REQUIRED'}}))
 await page.route('**/api/dashboard',async route=>{calls++;if(response==='loading')await loadingGate;return route.fulfill({status:response==='error'?500:200,json:response==='error'?{code:'SERVICE_UNAVAILABLE'}:{today:'2026-09-21',timezone:'Asia/Bangkok',generatedAt:'2026-09-21T03:00:00Z',scope:'Company',calendar:customerCalendar(rows,'2026-09-21'),widgets:[],workOverview:{days:['2026-09-21','2026-09-22'],dispatch:[],jobs:null,finance:[],rowLimit:10},managementOverview:response==='empty'?null:overview,bookingOverview:await bookingSummary({tourBooking:{findMany:async()=>rows},userProfile:{findMany:async()=>[]}},user,'2026-09-21',customerCalendar)}})})
 const noLegacy=async()=>{assert.equal(await page.locator('.dashboard-calendar,.dashboard-attention-table,.dashboard-day,#arrival-calendar').count(),0);assert.equal(await page.locator('main').getByText('Old work area',{exact:true}).count(),0)}
 await page.goto(origin+'/');await page.waitForURL('**/dashboard');await page.locator('.reference-bars button').first().waitFor();await noLegacy()
 assert.equal(await page.title(),'Dashboard · Greenview Tour')
 for(const width of [1440,834,390]){
  await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  const day=page.locator('.reference-bars button').first();await day.focus();await page.keyboard.press('Enter');await page.getByRole('dialog').getByRole('cell',{name:'Surin day trip',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-core-modal-open')),true);await page.keyboard.press('Escape');assert.equal(await day.evaluate(el=>el===document.activeElement),true)
 }
 await page.locator('.reference-bars button').nth(1).click();await page.getByText('No confirmed customers arriving on this date.').waitFor();await page.keyboard.press('Escape')
 const beforeLocale=calls;await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})));await page.waitForFunction(()=>document.documentElement.lang==='th');assert.equal(calls,beforeLocale);await noLegacy();await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})))
 for(const code of Object.keys(roleNames)){
  user={...manager,roles:[{code,scope:['MANAGER','ADMIN_MANAGER'].includes(code)?'COMPANY':'SELF'}],management:['MANAGER','ADMIN_MANAGER'].includes(code)?{company:true}:null}
  const previous=calls;await page.reload()
  await page.locator('.reference-dashboard-content').waitFor()
  assert.ok(calls>previous,'Role overview requested for '+code)
  assert.equal(await page.locator('.dashboard-coming-soon').count(),0)
  await noLegacy()
  assert.equal(await page.locator('.workspace-reference').count(),1,code+' shared shell')
  assert.equal(await page.locator('.topbar .reference-brand,.topbar .reference-search,.topbar .workspace-notifications,.topbar .workspace-help,.topbar .account-menu').count(),5,code+' complete Navbar')
  assert.equal(await page.locator('.breadcrumbs,.sidebar .brand,.sidebar .nav-label,.sidebar-foot').count(),0,code+' legacy shell removed')
  if(['MANAGER','HEAD_BOOKING','BOOKING'].includes(code))assert.equal(await page.locator('.reference-bars button').count(),30)
 }
 user=manager;response='error';await page.reload();await page.getByRole('button',{name:'Retry',exact:true}).waitFor();await noLegacy();response='ready';await page.getByRole('button',{name:'Retry',exact:true}).click();await page.locator('.reference-bars button').first().waitFor()
 response='empty';await page.reload();await page.getByText('Management summaries are unavailable for this account or server version.').waitFor();await noLegacy()
 let release;loadingGate=new Promise(resolve=>{release=resolve});response='loading';try{await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('status').filter({hasText:'Loading your work…'}).waitFor();await noLegacy()}finally{release()}
 await page.locator('.reference-bars button').first().waitFor();response='ready'
 await page.goto(origin+'/login');await page.waitForURL('**/dashboard');await page.locator('.reference-bars button').first().waitFor()
 signedIn=false;await page.goto(origin+'/dashboard');await page.waitForURL('**/login');await page.getByRole('heading',{name:'Welcome back'}).waitFor()
 await page.route('**/api/auth/login',route=>{signedIn=true;return route.fulfill({json:{user}})})
 await page.getByLabel('Email address',{exact:true}).fill('dashboard@example.invalid');await page.getByLabel('Password',{exact:true}).fill('fixture-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/dashboard');await page.locator('.reference-bars button').first().waitFor()
 await page.goto(origin+'/reset-password');await page.getByText('Open the password reset link from your email to continue.').waitFor()
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',roles:Object.keys(roleNames).length,checks:['legacy DOM absent all roles','all 16 roles load a dedicated overview','new GM program detail + empty date','responsive','modal focus','loading/error/retry','auth redirects','locale no refetch'],liveAccounts:false}))
}finally{await browser.close()}
