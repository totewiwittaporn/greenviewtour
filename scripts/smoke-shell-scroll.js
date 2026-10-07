// Real Core Shell + isolated HTTP fixtures. No accounts, credentials or business writes.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
import {managementSummary} from '../backend/src/backoffice/dashboard/overview/management-summary.js'
import {customerCalendar} from '../backend/src/backoffice/dashboard/overview/service.js'
import {accessDefinitions} from '../packages/contracts/access.js'
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5274',output=process.env.GREENVIEW_SCROLL_SCREENSHOTS||'/tmp/greenview-shell-scroll'
await mkdir(output,{recursive:true})
const today='2026-10-20',bookings=Array.from({length:30},(_,i)=>({id:'fixture-'+i,code:'GV-'+i,name:'Fixture guests '+i,status:'CONFIRMED',adults:12,children:2,outboundDate:new Date(Date.UTC(2026,9,20+i)).toISOString().slice(0,10),returnStatus:'NONE',programSnapshot:{tourId:'tour',name:'Surin Islands'}}))
const managementOverview=await managementSummary({tourBooking:{findMany:async()=>bookings}},today,customerCalendar)
const user={id:'scroll-fixture',displayName:'Scroll QA',status:'ACTIVE',roles:[{code:'MANAGER',scope:'COMPANY'}],management:{company:true,users:true},operations:{booking:true,islandBooking:true,guide:true,driver:true,stock:true,manageGuide:true,manageDriver:true},companyAccess:Object.fromEntries(Object.keys(accessDefinitions).map(key=>[key,true]))}
const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars']}),results=[]
try{for(const [width,height,locale] of [[1376,1032,'th'],[1440,900,'en'],[834,900,'th'],[390,844,'th'],[320,640,'en']]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width!==1440}),page=await context.newPage(),errors=[];let dashboardCalls=0,meCalls=0
 await context.addInitScript(locale=>localStorage.setItem('greenview.locale',locale),locale)
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(12000)
 await context.route('**/api/**',async route=>{
  assert.equal(route.request().method(),'GET','No business writes in this check')
  const path=new URL(route.request().url()).pathname
  if(path==='/api/me'){meCalls++;return route.fulfill({json:{user}})}
  if(path==='/api/dashboard'){dashboardCalls++;await new Promise(resolve=>setTimeout(resolve,100));return route.fulfill({json:{today,generatedAt:today+'T03:00:00Z',scope:'Company',widgets:[],managementOverview}})}
  if(path==='/api/operations/bookings')return route.fulfill({json:{rows:bookings.slice(0,25),total:30,page:1,pageSize:25,summary:{total:30,confirmed:30}}})
  return route.fulfill({json:{rows:[],total:0}})
 })
 const boxes=()=>page.evaluate(()=>{const box=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}};const main=document.querySelector('#main'),sidebar=document.querySelector('.sidebar');return {header:box(document.querySelector('.topbar')),main:box(main),sidebar:box(sidebar),mainY:main.scrollTop,sidebarY:sidebar.scrollTop,windowY:window.scrollY,rootHeight:document.documentElement.scrollHeight,viewport:innerHeight,overflowX:document.documentElement.scrollWidth>innerWidth}})
 const wheel=async(x,y,delta)=>{await page.mouse.move(x,y);await page.waitForTimeout(100);await page.mouse.wheel(0,delta);await page.waitForTimeout(350)}
 const touch=await context.newCDPSession(page)
 const swipe=async(x,y)=>{await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++){await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*25}]});await page.waitForTimeout(25)}await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(800)}
 await page.goto(origin+'/dashboard');await page.locator('.reference-dashboard-content').waitFor()
 assert.equal(dashboardCalls,1,'StrictMode must not dispatch a duplicate Dashboard read')
 assert.equal(await page.locator('vite-error-overlay').count(),0)
 let base=await boxes();assert.equal(base.overflowX,false);assert.equal(base.windowY,0)
 assert.ok(base.rootHeight<=height+1,'The document must not be a scroll owner')
 assert.ok(Math.abs(base.main.top-base.header.bottom)<=1,'Main begins below intrinsic Navbar height')
 assert.ok(base.main.bottom<=height+1,'Main stays in viewport')
 // A tall-content fixture exercises both ends even when the real day is empty.
 await page.locator('.workspace-page').evaluate(el=>{const section=document.createElement('section');section.textContent='Long workspace content fixture';section.style.minHeight='1400px';el.append(section)})
 await page.locator('#main').evaluate(el=>el.scrollTop=0)
 const mainX=width-24,mainY=base.header.bottom+30
 await wheel(mainX,mainY,420);let moved=await boxes()
 assert.ok(moved.mainY>100,'Content wheel scrolls content');assert.equal(moved.sidebarY,base.sidebarY);assert.equal(moved.windowY,0)
 assert.deepEqual(moved.header,base.header);assert.deepEqual(moved.main,base.main)
 if([1376,390].includes(width)){await page.locator('#main').evaluate(el=>el.scrollTop=0);const prior=await boxes();await swipe(mainX,base.header.bottom+280);const next=await boxes();assert.ok(next.mainY>60,'Touch content scroll');assert.equal(next.sidebarY,prior.sidebarY);assert.equal(next.windowY,0)}
 if(width<=760)await page.locator('.menu-toggle').click()
 base=await boxes();assert.ok(Math.abs(base.sidebar.top-base.header.bottom)<=1,'Sidebar never extends behind Navbar')
 assert.ok(base.sidebar.bottom<=height+1,'Sidebar ends within viewport')
 await page.locator('.sidebar').evaluate(el=>el.scrollTop=0);base=await boxes()
 await wheel(base.sidebar.left+30,base.header.bottom+45,450);moved=await boxes()
 assert.ok(moved.sidebarY>100,'Sidebar wheel scrolls sidebar '+JSON.stringify({width,base,moved}));assert.equal(moved.mainY,base.mainY);assert.equal(moved.windowY,0)
 await page.locator('.sidebar').evaluate(el=>el.scrollTop=el.scrollHeight);base=await boxes()
 await wheel(base.sidebar.left+30,base.header.bottom+45,900);moved=await boxes()
 assert.equal(moved.mainY,base.mainY,'Sidebar boundary cannot chain to content');assert.equal(moved.windowY,0)
 await wheel(width/2,20,900);assert.deepEqual(await boxes(),moved,'Navbar wheel cannot move either workspace region')
 if([1376,390].includes(width)){await page.locator('.sidebar').evaluate(el=>el.scrollTop=0);const prior=await boxes();await swipe(30,base.header.bottom+280);const next=await boxes();assert.ok(next.sidebarY>60,'Touch sidebar scroll');assert.equal(next.mainY,prior.mainY);assert.equal(next.windowY,0)}
 await page.screenshot({path:output+`/independent-${width}-${locale}.png`})
 if(width<=760){await page.locator('.menu-toggle').click();assert.equal(await page.locator('.sidebar').isVisible(),false)}
 const positions=await boxes();await page.locator('.workspace-help').click();await page.getByRole('dialog').waitFor()
 await page.locator('dialog .dialog-content').evaluate(el=>{const filler=document.createElement('div');filler.style.height='1200px';filler.textContent='Dialog scroll fixture';el.append(filler)})
 const dialog=await page.locator('dialog .dialog-content').boundingBox();await wheel(dialog.x+dialog.width/2,dialog.y+50,450)
 await page.waitForFunction(()=>document.querySelector('dialog .dialog-content')?.scrollTop>50)
 assert.ok(await page.locator('dialog .dialog-content').evaluate(el=>el.scrollTop>50),'Dialog owns its scroll')
 await wheel(5,height-20,800);const locked=await boxes();assert.deepEqual(locked.main,positions.main);assert.deepEqual(locked.header,positions.header);assert.equal(locked.mainY,positions.mainY);assert.equal(locked.sidebarY,positions.sidebarY);assert.equal(locked.windowY,0)
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'})
 const restored=await boxes();assert.equal(restored.mainY,positions.mainY);assert.equal(restored.sidebarY,positions.sidebarY)
 await page.locator('#main').evaluate(el=>el.scrollTop=el.scrollHeight);const end=await boxes();await wheel(mainX,mainY,900);const endAgain=await boxes();assert.equal(endAgain.mainY,end.mainY);assert.equal(endAgain.sidebarY,end.sidebarY);assert.equal(endAgain.windowY,0)
 await page.locator('#main').evaluate(el=>el.scrollTop=0)
 if(width<=760)await page.locator('.menu-toggle').click()
 const link=page.locator('.sidebar a[href^="/operations/bookings"]').first();await link.scrollIntoViewIfNeeded();const sidebarBefore=(await boxes()).sidebarY,identityReads=meCalls
 await link.click();await page.locator('main h1').filter({hasText:/Bookings/}).waitFor()
 assert.equal((await boxes()).mainY,0,'Navigation resets content only');assert.equal((await boxes()).sidebarY,sidebarBefore);assert.equal(meCalls,identityReads)
 await page.locator('main .page-heading button').click();await page.getByRole('dialog').locator('input').first().fill('Unsaved fixture')
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('dialog[open]').length===2)
 assert.equal(await page.locator('dialog[data-core-modal-top]').count(),1)
 assert.equal(await page.locator('dialog[open]').first().locator('.dialog-content').evaluate(el=>getComputedStyle(el).overflowY),'hidden')
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('dialog[open]').length===1)
 assert.equal(await page.locator('html').getAttribute('data-core-modal-open'),'')
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelectorAll('dialog[open]').length===2)
 await page.locator('dialog[open]').last().locator('.dialog-content button').last().click();await page.getByRole('dialog').waitFor({state:'detached'})
 assert.equal(await page.locator('html').getAttribute('data-core-modal-open'),null)

 await page.goBack();await page.locator('.reference-dashboard-content').waitFor();assert.equal((await boxes()).mainY,0);assert.equal(dashboardCalls,2)
 if(width<=760){await page.locator('.menu-toggle').click();await page.locator('.sidebar a').last().focus();await page.keyboard.press('Escape');assert.equal(await page.locator('.sidebar').isVisible(),false)}
 assert.equal(await page.locator('vite-error-overlay').count(),0);assert.deepEqual(errors,[])
 results.push({width,height,locale,independentScroll:true,touchSwipe:[1376,390].includes(width),modalLock:true,nestedModalLock:true,scrollChaining:false,dashboardCalls,rootScroll:0})
 await context.close()
 }
 console.log(JSON.stringify({result:'PASS',test:'shell-independent-scroll',browser:'Playwright Chromium',results,realAccounts:false,realWrites:0},null,2))
}finally{await browser.close()}
