// Isolated fixture UI checks: no business database or provider transport.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {mkdir} from 'node:fs/promises'
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5274',output='/tmp/greenview-backoffice-finance'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true})
const id='a0000000-0000-4000-8000-000000000001'
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],writes=[]
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000)
  const booking={id,version:1,code:'BK-FINANCE',name:'Agent guest',status:'COMPLETED',agentId:'agent',adultPrice:'2300',childPrice:'0',adults:1,children:0,lines:[],trip:{name:'Island trip'},programSnapshot:{}}
  const user={id:'actor',displayName:'Finance manager',status:'ACTIVE',roles:[{code:'MANAGER',scope:'COMPANY'}],management:{company:true},operations:{booking:true,islandBooking:true},canReceivePayment:true,companyAccess:{'finance.receive':true,'expenses.view':true},permissions:[]}
  const bill={id,version:1,title:'Agent statement',agentName:'Fixture Agent',total:'2000',paid:'0',status:'OPEN',dueOn:'2026-09-30',originalDueOn:'2026-09-30',snapshot:[],rescheduleHistory:[]}
  await page.route('**/api/**',async route=>{
   const request=route.request(),url=new URL(request.url())
   if(url.pathname==='/api/me')return route.fulfill({json:{user}})
   if(url.pathname==='/api/auth/recovery-status')return route.fulfill({status:403,json:{code:'RECOVERY_REQUIRED'}})
   if(request.method()==='POST'){
    const input=request.postDataJSON();writes.push({path:url.pathname,input})
    return route.fulfill({status:409,json:{code:'RECORD_CONFLICT'}})
   }
   if(url.pathname==='/api/operations/bookings')return route.fulfill({json:{rows:[booking],total:1,page:1,pageSize:25,summary:{total:1,completed:1}}})
   if(url.pathname==='/api/receivables')return route.fulfill({json:url.searchParams.has('id')?{row:bill,payments:[],total:0,page:1,signatures:[],documentHash:'fixture'}:{rows:[bill],total:1,page:1}})
   if(url.pathname==='/api/evidence')return route.fulfill({json:{rows:[],total:0,page:1,access:{upload:false}}})
   if(url.pathname==='/api/notifications')return route.fulfill({json:{rows:[{id,at:'2026-09-28T04:00:00Z',label:'Booking updated',href:'/operations/bookings?bookingId='+id}],page:1,hasMore:false}})
   return route.fulfill({json:{rows:[],total:0}})
  })
  await page.goto(origin+'/operations/bookings')
  await page.getByRole('button',{name:'Actions for BK-FINANCE',exact:true}).click()
  await page.getByRole('menuitem',{name:'Record received payment',exact:true}).click()
  const dialog=page.getByRole('dialog')
  await dialog.getByLabel('Received amount (THB)',{exact:true}).fill('3500')
  await dialog.getByLabel('Received date',{exact:true}).fill('2026-09-28')
  await dialog.getByLabel('Payment reference',{exact:true}).fill('Fixture receipt')
  await dialog.getByRole('combobox',{name:'Collection basis',exact:true}).click()
  await page.getByRole('option',{name:'Full amount including Agent margin',exact:true}).click()
  await dialog.getByRole('button',{name:'Record received payment',exact:true}).click()
  await dialog.getByRole('alert').waitFor()
  assert.equal(await dialog.getByLabel('Received amount (THB)',{exact:true}).inputValue(),'3500')
  assert.equal(writes[0].input.basis,'FULL');assert.equal(writes[0].input.payer,'CUSTOMER')
  await page.screenshot({path:`${output}/collection-${width}.png`,fullPage:true})
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('dialog').last().getByRole('button',{name:'Discard changes',exact:true}).click()
  await page.goto(origin+'/company/receivables')
  await page.getByRole('button',{name:'Actions for Agent statement',exact:true}).click();await page.getByRole('menuitem',{name:'View statement',exact:true}).click()
  await page.getByRole('button',{name:'Reschedule payment',exact:true}).click()
  const schedule=page.getByRole('dialog').last()
  await schedule.getByLabel('New payment date',{exact:true}).fill('2026-10-07');await schedule.getByLabel('Reason',{exact:true}).fill('Agent requested extension')
  await schedule.getByRole('button',{name:'Save',exact:true}).click();await schedule.getByRole('alert').waitFor()
  assert.equal(writes.at(-1).input.rescheduleKind,'REQUEST');assert.equal(await schedule.getByLabel('Reason',{exact:true}).inputValue(),'Agent requested extension')
  await page.screenshot({path:`${output}/schedule-${width}.png`,fullPage:true})
  await schedule.getByRole('button',{name:'Cancel',exact:true}).click();await page.getByRole('dialog').last().getByRole('button',{name:'Discard changes',exact:true}).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'Notifications',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Booking updated',exact:true}).waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)
  assert.deepEqual(errors,[]);await page.close()
 }
 console.log(JSON.stringify({result:'PASS',flow:'collection and reschedule preserve failed entries; permission-filtered inbox',viewports:[1440,390],screenshots:output,liveWrites:0}))
}finally{await browser.close()}
