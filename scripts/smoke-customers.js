// Isolated browser regression. Every API response is intercepted; no live credentials or writes.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5274'
const artifacts=process.env.GREENVIEW_CUSTOMERS_ARTIFACT_DIR
if(artifacts)await mkdir(artifacts,{recursive:true})
const browser=await chromium.launch({headless:true}),results=[]
try {
 for(const [locale,width,height] of [['en',1440,1000],['th',390,844]]) {
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<500})
  await context.addInitScript(value=>localStorage.setItem('greenview.locale',value),locale)
  const page=await context.newPage(),errors=[],consoleIssues=[],writes=[],reads=[]
  page.setDefaultTimeout(10000)
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(['error','warning'].includes(message.type()))consoleIssues.push(message.text())})
  let mode='normal',role='MANAGER',deniedBookings=false,hold=null,meReads=0
  const customer={id:'fixture-customer',displayName:'Fixture Customer',email:'customer@example.test',phone:'0812345678',status:'ACTIVE',version:1}
  const booking={id:'11111111-1111-4111-8111-111111111111',code:'BK-FIXTURE',name:'Fixture Booking',adults:2,children:0,status:'CONFIRMED',version:1,outboundDate:'2026-10-20',returnDate:'2026-10-20',returnStatus:'OUR',programSnapshot:{},trip:{name:'Fixture Island Tour'},lines:[]}
  const request={id:'fixture-request',details:{name:'Fixture Request',phone:'0812345678',allergyStatus:'NONE',notes:''},snapshot:{tourName:'Fixture Island Tour',packageTotal:'2500.00'},serviceDate:'2026-10-20',adults:2,children:0,status:'REQUESTED',version:1}
  await context.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url())
   if(req.method()!=='GET'){writes.push(url.pathname);return route.fulfill({status:400,json:{code:'FIXTURE_WRITES_BLOCKED'}})}
   reads.push(url.pathname+url.search)
   if(url.pathname==='/api/me'){
    meReads++
    const company=['MANAGER','ADMIN_MANAGER'].includes(role)
    return route.fulfill({json:{user:{id:'fixture-user',displayName:'Fixture User',status:'ACTIVE',roles:[{code:role,scope:company?'COMPANY':'SELF'}],operations:{booking:role!=='CAPTAIN'&&!deniedBookings,islandBooking:role!=='CAPTAIN'&&!deniedBookings},management:company?{company:true}:null,companyAccess:{}}}})
   }
   if(url.pathname==='/api/operations/bookings')return route.fulfill({json:{rows:[booking],total:1,page:1,pageSize:25,summary:{total:1,confirmed:1,draft:0,completed:0}}})
   if(url.pathname==='/api/operations/customer-capacity')return route.fulfill({json:{canConfirm:true,groupSize:2,legs:[]}})
   if(url.pathname==='/api/customers'){
    if(hold&&url.searchParams.get('kind')==='requests'){const gate=hold;hold=null;gate.started();await gate.promise}
    if(mode==='error')return route.fulfill({status:500,json:{code:'FIXTURE_ERROR'}})
    return route.fulfill({json:{rows:mode==='empty'?[]:url.searchParams.get('kind')==='customers'?[customer]:[request],total:mode==='empty'?0:1,page:1,pageSize:25}})
   }
   return route.fulfill({json:{rows:[],total:0}})
  })
  const customersLink=page.locator('.sidebar a[href^="/settings/customers"]'),bookingLink=page.locator('.sidebar a[href^="/operations/bookings"]')
  const requestsTab=page.locator('#booking-source-tab-requests'),allTab=page.locator('[id="booking-source-tab-"]'),directTab=page.locator('#booking-source-tab-DIRECT'),agentTab=page.locator('#booking-source-tab-AGENT')
  const customerAction=page.getByRole('button',{name:'Actions for Fixture Customer',exact:true}),requestAction=page.getByRole('button',{name:'Actions for Fixture Request',exact:true}),bookingAction=page.getByRole('button',{name:/Actions for BK-FIXTURE/})
  const table=page.locator('main .panel.table-panel .table-scroll')
  async function nav(link){if(width<500)await page.locator('.menu-toggle').click();await link.click()}
  async function closeDialog(){await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'})}
  await page.goto(origin+'/operations/bookings');await bookingAction.waitFor()
  const initialMeReads=meReads // React StrictMode may run the initial identity effect twice.
  assert.equal(new URL(page.url()).pathname,'/operations/bookings');assert.match(await page.title(),/Greenview Tour/)
  assert.equal(await page.getByRole('tab').count(),4)
  assert.match(await directTab.innerText(),/Direct bookings/)
  assert.equal(await page.locator('.sidebar a[href="/customers"]').count(),0)
  assert.match(await customersLink.locator('..').locator('.nav-section-label').innerText(),/Settings/)
  await page.locator('.sidebar').evaluate(element=>{element.dataset.retained='yes'})
  await requestsTab.click();await requestAction.waitFor()
  assert.equal(new URL(page.url()).searchParams.get('tab'),'requests')
  assert.equal(await bookingAction.count(),0)
  await requestAction.click();await page.getByRole('menuitem',{name:/Review|ตรวจสอบ/}).click()
  await page.getByRole('dialog').getByRole('heading',{name:'Fixture Island Tour',exact:true}).waitFor()
  await closeDialog()
  // Original white-screen sequence now traverses independent directory and request pages.
  for(const close of ['button','Escape']){
   await nav(customersLink);await customerAction.click();await page.getByRole('menuitem',{name:/Edit|แก้ไข/}).click()
   await page.getByRole('dialog').waitFor()
   if(close==='button')await page.locator('.dialog-header button').click();else await page.keyboard.press('Escape')
   await page.getByRole('dialog').waitFor({state:'detached'})
   assert.equal(await page.getByRole('tab').count(),0)
   await nav(bookingLink);await requestAction.waitFor()
   assert.equal(await customerAction.count(),0);assert.deepEqual(errors,[])
  }
  await allTab.click();await bookingAction.waitFor()
  let release,started;const startedPromise=new Promise(resolve=>{started=resolve})
  hold={started,promise:new Promise(resolve=>{release=resolve})}
  await requestsTab.click();await startedPromise
  assert.equal(await table.getAttribute('aria-busy'),'true');assert.equal(await bookingAction.count(),0)
  await directTab.click();await bookingAction.waitFor();release()
  await page.waitForTimeout(150)
  assert.equal(await directTab.getAttribute('aria-selected'),'true');assert.equal(await requestAction.count(),0)
  await agentTab.click();await bookingAction.waitFor()
  assert.equal(new URL(page.url()).searchParams.get('source'),'AGENT')
  await requestsTab.focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');await bookingAction.waitFor()
  assert.equal(await allTab.getAttribute('aria-selected'),'true')
  await allTab.focus();await page.keyboard.press('End');await page.keyboard.press('Enter');await requestAction.waitFor()
  const searched=page.waitForResponse(response=>{const url=new URL(response.url());return url.pathname==='/api/customers'&&url.searchParams.get('q')==='Fixture'})
  await page.locator('main .filterbar input').fill('Fixture');await searched;await requestAction.waitFor()
  await directTab.click();await bookingAction.waitFor();assert.equal(await page.locator('main .filterbar input[type="search"]').inputValue(),'')
  await requestsTab.click();await requestAction.waitFor();assert.equal(await page.locator('main .filterbar input').inputValue(),'Fixture')
  await page.goBack();await bookingAction.waitFor();assert.equal(await directTab.getAttribute('aria-selected'),'true')
  await page.goForward();await requestAction.waitFor();assert.equal(await page.locator('main .filterbar input').inputValue(),'Fixture')
  assert.equal(await page.locator('.sidebar').getAttribute('data-retained'),'yes');assert.equal(meReads,initialMeReads)
  await page.locator('main .filterbar input').fill('');await requestAction.waitFor()
  if(artifacts)await page.screenshot({path:artifacts+'/booking-requests-'+locale+'-'+width+'.png',fullPage:false})
  await nav(customersLink);await customerAction.waitFor()
  if(artifacts)await page.screenshot({path:artifacts+'/settings-customers-'+locale+'-'+width+'.png',fullPage:false})
  // Unsaved customer edits survive a rejected navigation and clear only on explicit discard.
  await customerAction.click();await page.getByRole('menuitem',{name:/Edit|แก้ไข/}).click()
  await page.getByRole('dialog').locator('input').first().fill('Unsaved Fixture')
  await page.getByRole('dialog').evaluate(()=>{history.back()})
  await page.getByRole('button',{name:/Keep editing|แก้ไขต่อ/}).waitFor()
  await page.getByRole('button',{name:/Keep editing|แก้ไขต่อ/}).click()
  assert.equal(await page.getByRole('dialog').locator('input').first().inputValue(),'Unsaved Fixture')
  await page.keyboard.press('Escape');await page.getByRole('button',{name:/Discard changes|ทิ้งการเปลี่ยนแปลง|ยกเลิกการแก้ไข/}).click()
  await page.getByRole('dialog').waitFor({state:'detached'})
  await nav(bookingLink);await requestAction.waitFor()
  mode='empty';await allTab.click();await bookingAction.waitFor();await requestsTab.click();await table.locator('.empty-state:not([role])').waitFor()
  mode='error';await directTab.click();await bookingAction.waitFor();await requestsTab.click();await table.getByRole('alert').waitFor()
  mode='normal';await table.getByRole('alert').getByRole('button').click();await requestAction.waitFor()
  assert.equal(await table.getByRole('alert').count(),0)
  // A converted request opens its existing Booking, without creating another record.
  request.status='AWAITING_PAYMENT';request.bookingId=booking.id;request.snapshot.bookingCode=booking.code
  await page.reload();await requestAction.click();await page.getByRole('menuitem',{name:/Review|ตรวจสอบ/}).click()
  await page.getByRole('dialog').getByRole('link',{name:/Open booking|เปิดรายการจอง/}).click()
  await page.locator('.booking-sheet').waitFor();assert.equal(new URL(page.url()).searchParams.get('bookingId'),booking.id)
  assert.match(await page.locator('.booking-sheet').innerText(),/BK-FIXTURE/);await closeDialog()
  assert.equal(new URL(page.url()).searchParams.has('bookingId'),false)
  await page.reload();await bookingAction.waitFor();assert.equal(await page.getByRole('dialog').count(),0)
  await page.goto(origin+'/customers');await requestAction.waitFor();assert.equal(new URL(page.url()).pathname,'/operations/bookings')
  await page.goto(origin+'/customers?tab=customers');await customerAction.waitFor();assert.equal(new URL(page.url()).pathname,'/settings/customers')
  for(role of ['BOOKING']){
   await page.goto(origin+'/settings/customers');await table.getByText('Fixture Customer',{exact:true}).waitFor()
   assert.equal(await customerAction.count(),0);assert.equal(await page.getByRole('tab').count(),0)
   await nav(bookingLink);await bookingAction.waitFor();assert.equal(await requestsTab.count(),0)
   const count=reads.filter(x=>x.startsWith('/api/customers?')&&x.includes('kind=requests')).length
   await page.goto(origin+'/operations/bookings?tab=requests');await page.getByRole('heading',{name:/Access restricted|ไม่มีสิทธิ์เข้าถึง/}).waitFor()
   assert.equal(reads.filter(x=>x.startsWith('/api/customers?')&&x.includes('kind=requests')).length,count)
   await page.goto(origin+'/customers');await table.getByText('Fixture Customer',{exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/settings/customers')
  }
  role='HEAD_BOOKING';await page.goto(origin+'/settings/customers');await customerAction.waitFor();await page.goto(origin+'/operations/bookings?tab=requests');await requestAction.waitFor();assert.equal(await requestsTab.count(),1)
  role='CAPTAIN';await page.goto(origin+'/settings/customers');await page.locator('main').getByText(/Access restricted|ไม่มีสิทธิ์เข้าถึง/).waitFor();assert.equal(await customersLink.count(),0)
  role='MANAGER';deniedBookings=true;await page.goto(origin+'/operations/bookings?tab=requests');await requestAction.waitFor()
  assert.equal(await page.getByRole('tab').count(),1)
  await requestAction.click();await page.getByRole('menuitem',{name:/Review|ตรวจสอบ/}).click();assert.equal(await page.getByRole('link',{name:/Open booking|เปิดรายการจอง/}).count(),0);await closeDialog()
  assert.equal(await page.locator('vite-error-overlay').count(),0);assert.ok((await page.locator('main').innerText()).length>100)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[])
  assert.deepEqual(consoleIssues.filter(message=>!message.includes('500 (Internal Server Error)')),[])
  results.push({locale,viewport:{width,height},runtimeErrors:0,writes:0,checks:['four Booking tabs','Settings-only directory','edit-close original regression','slow response cancellation','keyboard and history','per-tab search','persistent shell and identity','unsaved navigation','empty/error/retry','existing Booking link','legacy links','Booking read-only and request denial','Manager restricted booking permissions']})
  await context.close()
 }
 console.log(JSON.stringify({result:'PASS',test:'booking-customer-navigation',results,liveAccounts:false,browser:'Playwright Chromium; Browser plugin not available'},null,2))
} finally {await browser.close()}
