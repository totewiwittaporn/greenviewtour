// Intercepted Booking fixtures only: no real database, emails or booking mutations.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {bookingSummary} from '../backend/src/backoffice/dashboard/overview/booking-summary.js'
import {customerCalendar} from '../backend/src/backoffice/dashboard/overview/service.js'
import {canEditBooking} from '../packages/contracts/access.js'
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5274'
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 let role='BOOKING';const assignmentCommands=[]
 const actor=()=>({id:'assistant-a',displayName:'Assistant A',status:'ACTIVE',roles:[{code:role,scope:'SELF'}],operations:{booking:true,islandBooking:true},management:null,companyAccess:{}})
 const rows=[['OWN-DRAFT','DRAFT','assistant-a',3],['OWN-CONFIRMED','CONFIRMED','assistant-a',5],['FOREIGN-DRAFT','DRAFT','assistant-b',4],['FOREIGN-CONFIRMED','CONFIRMED','assistant-b',7]].map(([code,status,assigneeId,adults],i)=>({id:'booking-'+i,code,status,assigneeId,createdById:'original-creator',version:1,name:code,adults,children:0,outboundDate:'2026-09-22',returnDate:null,returnStatus:'NONE',programSnapshot:{tourId:'tour',name:'Island day trip',journeyMode:'ROUND_TRIP'},trip:{name:'Island day trip'}}))
 const tx={tourBooking:{findMany:async()=>rows},userProfile:{findMany:async()=>[{id:'assistant-a',displayName:'Assistant A'},{id:'assistant-b',displayName:'Assistant B'}]}}
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/me')return route.fulfill({json:{user:actor()}})
  if(path==='/api/dashboard')return route.fulfill({json:{today:'2026-09-22',timezone:'Asia/Bangkok',generatedAt:'2026-09-22T03:00:00Z',scope:'Company',widgets:[{id:'legacy',title:'Old work area'}],bookingOverview:await bookingSummary(tx,actor(),'2026-09-22',customerCalendar)}})
  if(path==='/api/operations/booking-assignees')return route.fulfill({json:{rows:[{id:'assistant-a',displayName:'Assistant A'},{id:'assistant-b',displayName:'Assistant B'}],total:2,page:1,pages:1}})
  if(path==='/api/operations/booking-assignment'){const command=route.request().postDataJSON();assignmentCommands.push(command);const row=rows.find(row=>row.id===command.bookingId);row.assigneeId=command.assigneeId;row.version++;return route.fulfill({json:{ok:true}})}
  if(path==='/api/operations/bookings')return route.fulfill({json:{rows:rows.map(row=>({...row,canEdit:canEditBooking(actor(),row)})),total:4,page:1,pages:1,pageSize:25,summary:{total:4,draft:2,confirmed:2,completed:0}}})
  return route.fulfill({json:{rows:[],total:0}})
 })
 for(role of ['BOOKING','HEAD_BOOKING']){
  await page.goto(origin+'/dashboard');await page.locator('.reference-bars button').first().waitFor();assert.equal(await page.locator('.reference-bars button').count(),30)
  assert.equal(await page.locator('.dashboard-calendar,.dashboard-attention-table,.dashboard-day').count(),0)
  assert.equal(await page.locator('main').getByText('Old work area',{exact:true}).count(),0)
  const stats=page.locator('.reference-stat');assert.equal(await stats.nth(0).locator('strong').innerText(),'12');assert.equal(await stats.nth(1).locator('strong').innerText(),'12');assert.equal(await stats.nth(2).locator('strong').innerText(),role==='BOOKING'?'2':'4')
  const work=page.getByRole('region',{name:'Booking work',exact:true});await work.getByText('OWN-DRAFT',{exact:true}).waitFor();assert.equal(await work.getByText('FOREIGN-DRAFT',{exact:true}).count(),role==='BOOKING'?0:1)
  assert.equal(await page.getByRole('heading',{name:'Booking team overview',exact:true}).count(),role==='HEAD_BOOKING'?1:0)
  const bar=page.locator('.reference-bars button').first();await bar.click();await page.getByRole('dialog').getByRole('cell',{name:'Island day trip',exact:true}).waitFor();await page.keyboard.press('Escape')
  await page.goto(origin+'/operations/bookings');await page.getByRole('button',{name:'Actions for OWN-DRAFT',exact:true}).waitFor()
  for(const code of ['OWN-DRAFT','FOREIGN-DRAFT','OWN-CONFIRMED','FOREIGN-CONFIRMED']){
   await page.getByRole('button',{name:'Actions for '+code,exact:true}).click();const menu=page.getByRole('menu');await menu.getByRole('menuitem',{name:'View',exact:true}).waitFor()
   assert.equal(await menu.getByRole('menuitem',{name:'Assign booking',exact:true}).count(),role==='HEAD_BOOKING'?1:0)
   if(role==='BOOKING'&&code.startsWith('FOREIGN-'))assert.equal(await menu.getByRole('menuitem').count(),1)
   const editable=role==='HEAD_BOOKING'||code.startsWith('OWN-')
   for(const action of code.endsWith('DRAFT')?['Edit','Confirm','Cancel']:['Update guest details','Complete','Cancel'])assert.equal(await menu.getByRole('menuitem',{name:action,exact:true}).count(),editable?1:0,role+' '+code+' '+action)
   await page.keyboard.press('Escape')
  }
 }
 await page.getByRole('button',{name:'Actions for FOREIGN-DRAFT',exact:true}).click();await page.getByRole('menuitem',{name:'Assign booking',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Assign booking',exact:true});await dialog.waitFor();const select=dialog.getByRole('combobox',{name:'Responsible person',exact:true});await select.click();await page.getByRole('option',{name:'Assistant A',exact:true}).click();await dialog.getByRole('button',{name:'Save assignment',exact:true}).click();await dialog.waitFor({state:'detached'});assert.equal(assignmentCommands.length,1);assert.equal(assignmentCommands[0].bookingId,'booking-2');assert.equal(assignmentCommands[0].assigneeId,'assistant-a');assert.equal(assignmentCommands[0].version,1);assert.match(assignmentCommands[0].id,/^[0-9a-f-]{36}$/)
 role='BOOKING';await page.reload();await page.getByRole('button',{name:'Actions for FOREIGN-DRAFT',exact:true}).click();await page.getByRole('menuitem',{name:'Edit',exact:true}).waitFor();await page.keyboard.press('Escape')
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks:['30 dates both Booking personas','all customer totals but own/team work separation','legacy dashboard absent','program detail','all bookings visible','own versus foreign mutation menus','manager assignment command','new assignee gains edit UI'],liveAccounts:false}))
}finally{await browser.close()}
