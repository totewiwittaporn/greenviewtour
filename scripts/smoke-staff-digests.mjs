// Isolated UI fixtures: no real staff, database writes, credentials or LINE transport.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import path from 'node:path'
const appRoot=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url))
const evidencePath=width=>path.join(tmpdir(),`greenview-staff-digests-${width}.png`)
let server
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://127.0.0.1:5294'
if(!process.env.GREENVIEW_TEST_ORIGIN){server=await createServer({root:appRoot,configFile:appRoot+'vite.config.js',server:{host:'127.0.0.1',port:5294,strictPort:true}});await server.listen()}
const browser=await chromium.launch({headless:true}),errors=[],writes=[],unexpected=[]
const user={id:'manager-fixture',displayName:'Fixture manager',status:'ACTIVE',roles:[{code:'MANAGER',scope:'COMPANY'}],management:{company:true},operations:{booking:true,islandBooking:true,guide:true,driver:true},companyAccess:{},permissions:[]}
let mode='ready',failSend=true,failResend=true,reads=0,releasePrepare
const rows=Array.from({length:26},(_,i)=>({userId:'staff-'+i,name:i===0?'Guide fixture':i===1?'Unlinked captain':'Staff fixture '+i,jobs:[{key:'run-'+i,version:1,role:i===1?'Captain':'Guide',kind:'Boat job',time:'08:30',passengers:8,href:'/operations/guide'}],messages:[{type:'text',text:'Assigned fixture work\nGuide · Boat job · 08:30 · 8 passengers'}],reason:i===1?'NOT_LINKED':null,contentHash:'hash-'+i}))
try{
 for(const width of [1440,390]){
  mode='ready';failSend=true;failResend=true
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',reducedMotion:'reduce'})
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url())
   if(url.origin!==new URL(origin).origin)return route.fulfill({status:200,contentType:'text/plain',body:''})
   if(!url.pathname.startsWith('/api/'))return route.continue()
   if(url.pathname==='/api/me')return route.fulfill({json:{user}})
   if(url.pathname==='/api/auth/recovery-status')return route.fulfill({status:403,json:{code:'RECOVERY_REQUIRED'}})
   if(url.pathname==='/api/operations/daily-summary')return route.fulfill({json:{snapshots:[],total:0,page:1,pageSize:25,readiness:{deliveryEnabled:false,schedulerEnabled:false}}})
   if(url.pathname==='/api/operations/staff-digests'){
    if(request.method()==='GET'){reads++;return route.fulfill({status:mode==='error'?500:mode==='denied'?403:200,json:mode==='error'||mode==='denied'?{code:mode==='denied'?'PERMISSION_DENIED':'FIXTURE_ERROR'}:{serviceDate:url.searchParams.get('date'),rows:mode==='empty'?[]:rows,coverage:'ASSIGNED_WORK_ONLY'}})}
    const body=request.postDataJSON();writes.push(body)
    if(body.action==='prepare'){
     assert.deepEqual(Object.keys(body).sort(),['action','serviceDate'])
     await new Promise(resolve=>{releasePrepare=resolve})
     return route.fulfill({json:{serviceDate:body.serviceDate,mode:'simulation',rows:rows.map(row=>({userId:row.userId,id:'digest-'+row.userId,status:'PREPARED',revision:1,attempts:0,mode:'simulation',contentHash:'saved-hash-'+row.userId,messages:[{type:'text',text:'Saved message after work changed\nCaptain · Boat job · 09:30 · 10 passengers'}]})),skipped:[]}})
    }
    if(body.action==='resend'){
     assert.deepEqual(Object.keys(body).sort(),['action','commandId','id'])
     if(failResend){failResend=false;return route.fulfill({status:503,json:{code:'FIXTURE_RESEND_FAILURE'}})}
     return route.fulfill({json:{userId:'staff-0',id:'resend-'+body.id,status:'PREPARED',mode:'simulation',contentHash:'resend-hash',messages:[{type:'text',text:'Saved resend after another change\nCaptain · Boat job · 10:30'}]}})
    }
    if(body.action==='simulate'){
     assert.deepEqual(Object.keys(body).sort(),['action','id'])
     if(failSend){failSend=false;return route.fulfill({status:503,json:{code:'FIXTURE_TEST_FAILURE'}})}
     return route.fulfill({json:{userId:'staff-0',id:body.id,status:'SIMULATED',accepted:false,mode:'simulation',contentHash:body.id.startsWith('resend-')?'resend-hash':'saved-hash-staff-0',messages:[{type:'text',text:body.id.startsWith('resend-')?'Saved resend after another change\nCaptain · Boat job · 10:30':'Saved message after work changed\nCaptain · Boat job · 09:30 · 10 passengers'}]}})
    }
    unexpected.push(body);return route.fulfill({status:400,json:{code:'INVALID_REQUEST'}})
   }
   if(request.method()!=='GET'){unexpected.push(url.pathname);return route.fulfill({status:405,json:{}})}
   return route.fulfill({json:{rows:[],total:0}})
  })
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin+'/operations/daily-close')
  await page.getByRole('heading',{name:'Daily Work Assignment',exact:true}).waitFor()
  const panel=page.locator('section[aria-labelledby="staff-digests-title"]')
  await panel.getByText('Guide fixture',{exact:true}).waitFor()
  assert.equal(await panel.locator('tbody tr').count(),25)
  await panel.getByText('No active LINE connection',{exact:true}).waitFor()
  await panel.getByRole('button',{name:'Next',exact:true}).click();assert.equal(await panel.locator('tbody tr').count(),1)
  await panel.getByRole('button',{name:'Previous',exact:true}).click()
  await panel.getByRole('button',{name:'Actions for Guide fixture',exact:true}).click();await page.getByRole('menuitem',{name:'View message preview',exact:true}).click()
  const dialog=page.getByRole('dialog');await dialog.getByText('Assigned fixture work',{exact:false}).waitFor()
  assert.equal(await dialog.getByRole('button',{name:'Test manual send (simulation)',exact:true}).count(),0)
  assert.equal(await dialog.locator('textarea,input').count(),0)
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
  await panel.getByRole('button',{name:'Prepare Daily Work Assignment tests',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('button[aria-busy="true"]'))
  assert.equal(await page.getByRole('button',{name:'Load date',exact:true}).isDisabled(),true)
  releasePrepare();await panel.getByText('Preparation saved. Review each message before running a simulation. No LINE message was sent.',{exact:true}).waitFor()
  await panel.getByRole('button',{name:'Actions for Guide fixture',exact:true}).click();await page.getByRole('menuitem',{name:'Test manual send (simulation)',exact:true}).click()
  await dialog.getByText('Saved message after work changed',{exact:false}).waitFor();assert.equal(await dialog.getByText('Assigned fixture work',{exact:false}).count(),0)
  assert.equal(await dialog.locator('dd').evaluate(node=>getComputedStyle(node).whiteSpace),'pre-wrap')
  await dialog.getByRole('button',{name:'Test manual send (simulation)',exact:true}).click()
  await dialog.getByRole('alert').waitFor();assert.match(await dialog.innerText(),/Unable to load or test staff digests/)
  assert.equal(await dialog.getByRole('button',{name:'Test manual send (simulation)',exact:true}).isEnabled(),true)
  await dialog.getByRole('button',{name:'Test manual send (simulation)',exact:true}).click()
  await dialog.getByText('Simulation completed — no message sent',{exact:true}).waitFor()
  assert.equal(await dialog.getByRole('button',{name:'Test manual send (simulation)',exact:true}).count(),0)
  await dialog.getByRole('button',{name:'Prepare resend (simulation)',exact:true}).click();await dialog.getByRole('alert').waitFor()
  await dialog.getByRole('button',{name:'Prepare resend (simulation)',exact:true}).click();await dialog.getByText('Prepared for simulation',{exact:true}).waitFor()
  await dialog.getByText('Saved resend after another change',{exact:false}).waitFor();assert.equal(await dialog.getByText('Saved message after work changed',{exact:false}).count(),0)
  const resendWrites=writes.filter(row=>row.action==='resend').slice(-2);assert.equal(resendWrites[0].commandId,resendWrites[1].commandId)
  await dialog.getByRole('button',{name:'Test manual send (simulation)',exact:true}).click();await dialog.getByText('Simulation completed — no message sent',{exact:true}).waitFor()
  const before=reads;await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})))
  await page.waitForFunction(()=>document.documentElement.lang==='th');assert.equal(reads,before)
  await dialog.getByText('จำลองสำเร็จ — ยังไม่ได้ส่งข้อความ',{exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  assert.equal(await page.locator('vite-error-overlay').count(),0)
  await page.screenshot({path:evidencePath(width)})
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})))
  for(const next of ['error','denied','empty']){
   mode=next;await panel.getByRole('button',{name:'Refresh',exact:true}).click()
   if(next==='empty')await panel.getByText('No Daily Work Assignment is available for this service date.',{exact:true}).waitFor()
   else await panel.getByRole('alert').waitFor()
   assert.equal(await panel.getByRole('button',{name:'Prepare Daily Work Assignment tests',exact:true}).isDisabled(),true)
  }
  mode='ready';await panel.getByRole('button',{name:'Refresh',exact:true}).click();await panel.getByText('Guide fixture',{exact:true}).waitFor()
  assert.equal(await panel.getByText('Not prepared',{exact:true}).count(),25)
  await context.close()
 }
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[])
 assert.equal(writes.filter(row=>row.action==='prepare').length,2);assert.equal(writes.filter(row=>row.action==='simulate').length,6)
 console.log(JSON.stringify({result:'PASS',flow:'Daily summaries → staff preview → prepare → explicit manual simulation',checks:['manager preview','prepared and resent previews use exact persisted text','26-row pagination','missing binding distinct','no editable recipients/text','pending date lock','failed mutation retained/no automatic replay','simulation never claims delivery','explicit resend preserves command ID on retry','Thai/English without refetch','refresh clears prepared actions','error/403/empty/recovery','desktop/mobile no overflow'],viewports:[1440,390],runtimeErrors:0,realWrites:0,providerCalls:0,evidence:[evidencePath(1440),evidencePath(390)]}))
}finally{await browser.close();await server?.close()}
