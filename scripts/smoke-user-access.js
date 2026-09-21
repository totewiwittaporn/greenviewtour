import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { accessDefinitions, roleNames } from '../packages/contracts/access.js'
await mkdir(new URL('../screenshots.local/',import.meta.url),{recursive:true})
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 const user={id:'00000000-0000-4000-8000-000000000001',displayName:'Manager',email:'manager@example.invalid',status:'ACTIVE',roles:[],management:{company:true}}
 const row={id:'00000000-0000-4000-8000-000000000002',displayName:'Booking and Sales',email:'staff@example.invalid',status:'ACTIVE',roles:[{roleCode:'BOOKING',scope:'SELF'}],canConfigureAccess:true}
 let failLoad=true,conflict=true,request,saves=0
 await page.route('**/api/me',route=>route.fulfill({json:{user}}))
 await page.route('**/api/users?*',route=>route.fulfill({json:{users:[row],page:1,total:1,summary:{total:1,verified:1,signed_in:1},checkedAt:new Date().toISOString()}}))
 await page.route('**/api/users/*/access',async route=>{
  if(route.request().method()==='POST'){request=route.request().postDataJSON();saves++;return route.fulfill(conflict?{status:409,json:{code:'ACCESS_CONFLICT'}}:{json:{ok:true,version:2}})}
  if(failLoad){return route.fulfill({status:503,json:{code:'SERVICE_UNAVAILABLE'}})}
  return route.fulfill({json:{version:1,roles:row.roles,overrides:[],history:[],availableRoles:Object.entries(roleNames).filter(([code])=>!['ADMIN_MANAGER','MANAGER'].includes(code)).map(([code,name])=>({code,name})),permissions:Object.entries(accessDefinitions).map(([code,d])=>({code,label:d.label}))}})
 })
 await page.goto(((process.env.GREENVIEW_TEST_ORIGIN || 'http://localhost:5174') + '/settings/users'))
 await page.getByRole('button',{name:'Actions for staff@example.invalid'}).waitFor()
 const density=await page.locator('.table-scroll td').first().evaluate(el=>({font:getComputedStyle(el).fontSize,padding:getComputedStyle(el).paddingTop}))
 assert.deepEqual(density,{font:'12px',padding:'8px'})
 assert.equal((await page.getByRole('button',{name:'Actions for staff@example.invalid'}).boundingBox()).width,28)
 async function open(){await page.getByRole('button',{name:'Actions for staff@example.invalid'}).click();await page.getByRole('menuitem',{name:'Configure permissions'}).click()}
 await open();await page.getByText('Unable to load permissions.',{exact:false}).waitFor();failLoad=false;await page.getByRole('button',{name:'Retry',exact:true}).click()
 await page.getByRole('checkbox',{name:'Sales',exact:true}).check()
 const payment=page.getByRole('combobox',{name:'Record a booking as paid',exact:true})
 await payment.click();await page.getByRole('option',{name:'Deny for this user'}).click()
 await page.getByLabel('Reason for change',{exact:true}).fill('Sales duty without collecting payment')
 await page.getByRole('button',{name:'Review changes',exact:true}).click()
 await page.getByRole('button',{name:'Confirm permissions',exact:true}).click()
 await page.getByText('Permissions changed while you were editing, or an earlier save completed.',{exact:false}).waitFor()
 assert.equal(await page.getByLabel('Reason for change',{exact:true}).inputValue(),'Sales duty without collecting payment')
 assert.equal(saves,1);assert.deepEqual(request.roles,['BOOKING','SALES']);assert.equal(request.overrides[0].effect,'DENY')
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Keep editing',exact:true}).waitFor();await page.getByRole('button',{name:'Discard changes',exact:true}).click()
 conflict=false;await open();await page.getByRole('checkbox',{name:'Sales',exact:true}).check();await page.getByLabel('Reason for change',{exact:true}).fill('Add sales duties')
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'})
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
 await page.screenshot({path:new URL('../screenshots.local/user-access-mobile.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true})
 await page.getByRole('button',{name:'Review changes',exact:true}).click();await page.getByRole('button',{name:'Confirm permissions',exact:true}).click();await page.getByText('User permissions updated.',{exact:true}).waitFor()
 assert.equal(saves,2);assert.deepEqual(errors,[])
 console.log('USER_ACCESS_BROWSER_PASS: load failure, retry, multiple roles, deny, review, conflict preservation, discard, mobile, success')
} finally {await browser.close()}
