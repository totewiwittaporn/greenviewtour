import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true})
const base=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5174'
try{
 const page=await browser.newPage();let linked=false,fail=false,operationalRequests=0
 const user={id:'fixture',displayName:'Employee',email:'employee@example.test',roles:[{code:'ADMIN_MANAGER',scope:'COMPANY'}],management:{company:true},operations:{booking:true},companyAccess:{}}
 await page.route('**/api/**',async route=>{
  const pathname=new URL(route.request().url()).pathname
  if(pathname==='/api/me')return route.fulfill({json:{user:{...user,lineOnboardingRequired:!linked}}})
  if(pathname==='/api/me/line'&&route.request().method()==='POST'){linked=false;return route.fulfill({json:{warning:'LINE_RICH_MENU_SYNC_PENDING'}})}
  if(pathname==='/api/me/line')return route.fulfill(fail?{status:500,json:{code:'SERVICE_UNAVAILABLE'}}:{json:{status:linked?'LINKED':'UNLINKED',available:true,displayName:linked?'Verified LINE fixture':null}})
  operationalRequests++;return route.fulfill({json:{widgets:[],generatedAt:new Date().toISOString(),timezone:'Asia/Bangkok'}})
 })
 await page.goto(base+'/dashboard')
 await page.getByRole('heading',{name:'Connect LINE to start work',exact:true}).waitFor()
 assert.equal(operationalRequests,0)
 assert.equal(await page.locator('.workspace-reference').count(),0)
 await page.getByRole('link',{name:'Open Greenview Staff',exact:true}).waitFor()
 assert.equal(await page.locator('.staff-line-card .staff-line-actions button').first().textContent(),'Connect LINE account')
 assert.match(await page.getByRole('button',{name:'Connect LINE account',exact:true}).getAttribute('class'),/button-primary/)
 await page.getByRole('button',{name:'Connect LINE account',exact:true}).click()
 await page.getByRole('dialog').getByText('Add or open Greenview Staff, then tap “เชื่อมบัญชี LINE” (Connect LINE account) in the chat menu. Open the reply link, sign in and confirm your own account.',{exact:true}).waitFor();await page.keyboard.press('Escape')
 await page.setViewportSize({width:390,height:844})
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})))
 await page.getByRole('heading',{name:'เชื่อม LINE ก่อนเริ่มใช้งาน',exact:true}).waitFor()
 await page.getByRole('button',{name:'เชื่อมบัญชี LINE',exact:true}).waitFor()
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.goto(base+'/documents/00000000-0000-0000-0000-000000000001')
 await page.getByRole('heading',{name:'Connect LINE to start work',exact:true}).waitFor()
 assert.equal(operationalRequests,0,'document fetch must wait until LINE onboarding completes')
 fail=true;await page.getByRole('button',{name:'Refresh connection',exact:true}).click()
 await page.getByRole('alert').waitFor()
 await page.goto(base+'/line/connect')
 await page.getByText('Open this page using the account-linking URL sent by Greenview Staff.',{exact:true}).waitFor()
 assert.equal(await page.getByRole('heading',{name:'Connect LINE to start work',exact:true}).count(),0)
 fail=false;linked=true
 await page.goto(base+'/dashboard')
 await page.locator('.workspace-reference').waitFor()
 assert.equal(await page.getByRole('heading',{name:'Connect LINE to start work',exact:true}).count(),0)
 linked=false;await page.goto(base+'/dashboard');await page.getByRole('heading',{name:'Connect LINE to start work',exact:true}).waitFor()
 linked=true;await page.getByRole('button',{name:'Refresh connection',exact:true}).click()
 await page.locator('.workspace-reference').waitFor()
 await page.goto(base+'/profile')
 await page.locator('.staff-line-card').getByRole('button',{name:'Connect LINE account',exact:true}).click()
 const dialog=page.getByRole('dialog')
 await dialog.getByText('Verified LINE fixture',{exact:true}).waitFor()
 assert.equal(await dialog.getByRole('link',{name:'Open Greenview Staff',exact:true}).count(),0)
 await page.keyboard.press('Escape')
 linked=false
 await page.locator('.staff-line-card').getByRole('button',{name:'Connect LINE account',exact:true}).click()
 await dialog.getByRole('link',{name:'Open Greenview Staff',exact:true}).waitFor()
 assert.equal(await dialog.getByText('Verified LINE fixture',{exact:true}).count(),0)
 await page.keyboard.press('Escape')
 linked=true;await page.locator('.staff-line-card').getByRole('button',{name:'Refresh connection',exact:true}).click()
 await page.locator('.staff-line-card [data-status="LINKED"]').waitFor()
 await page.locator('.staff-line-card').getByRole('button',{name:'Unlink LINE',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'Unlink LINE',exact:true}).click()
 await page.getByText('Your LINE account is disconnected. The LINE menu could not update yet; it will retry the next time you interact with the LINE chat.',{exact:true}).waitFor()
 await page.locator('.staff-line-card [data-status="UNLINKED"]').waitFor()
 console.log('PASS: required LINE gate blocks operations/documents, preserves linking, handles retry, Thai/mobile and unlocks after server identity refresh')
}finally{await browser.close()}
