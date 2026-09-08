import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
const output=new URL('../screenshots.local/',import.meta.url)
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const user={id:'00000000-0000-0000-0000-000000000001',displayName:'Fixture Manager',email:'fixture@example.invalid',status:'ACTIVE',department:'MANAGEMENT',roles:[{code:'MANAGER',name:'Manager',scope:'COMPANY'}],management:{company:true}}
 const row={...user,displayName:'Fixture Guide',department:'GUIDE',roles:[{roleCode:'GUIDE',scope:'SELF'}],updatedAt:new Date().toISOString(),canEdit:true,email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),last_sign_in_at:null}
 await page.route('**/api/me',r=>r.fulfill({json:{user}}))
 await page.route('**/api/users?*',r=>r.fulfill({json:{users:[row],total:1,page:1,pageSize:25,summary:{total:1,verified:1,signed_in:0},database:'UP',checkedAt:new Date().toISOString(),canChangeDepartment:true}}))
 let patch,conflict=false
 await page.route('**/api/users/*/profile',r=>{patch=r.request().postDataJSON();if(conflict)return r.fulfill({status:409,json:{code:'PROFILE_CONFLICT'}});Object.assign(row,patch);return r.fulfill({json:{ok:true}})})
 await page.goto('http://localhost:5174/settings/users')
 await page.getByRole('button',{name:'Open user info'}).click()
 await page.getByRole('dialog',{name:'User info'}).waitFor()
 assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Sign out',exact:true}).count(),1)
 assert.equal(await page.getByRole('dialog').getByRole('link',{name:'Open public website'}).count(),1)
 await page.screenshot({path:fileURLToPath(new URL('user-info-desktop.png',output)),fullPage:true})
 await page.keyboard.press('Escape')
 await page.getByRole('dialog').waitFor({state:'hidden'})
 assert.equal(await page.getByRole('button',{name:'Open user info'}).evaluate(el=>el===document.activeElement),true)
 await page.getByRole('button',{name:`Actions for ${row.email}`}).click()
 await page.getByRole('button',{name:'Edit user',exact:true}).click()
 await page.getByLabel('Display name',{exact:true}).fill('Updated Fixture Guide')
 await page.getByRole('button',{name:'Close dialog'}).click()
 await page.getByRole('dialog',{name:'Discard changes?'}).waitFor()
 await page.getByRole('button',{name:'Keep editing'}).click()
 await page.getByLabel('Department',{exact:true}).selectOption('DRIVER')
 await page.getByRole('button',{name:'Save changes'}).click()
 await page.getByRole('dialog',{name:'Review department change'}).waitFor()
 assert.equal(patch,undefined)
 await page.getByRole('button',{name:'Confirm department change'}).click()
 await page.getByText('User profile updated.',{exact:true}).waitFor()
 assert.equal(patch.department,'DRIVER');assert.equal(patch.displayName,'Updated Fixture Guide');assert.equal('roles' in patch,false)
 await page.getByRole('button',{name:`Actions for ${row.email}`}).click()
 await page.getByRole('button',{name:'Edit user',exact:true}).click()
 await page.getByLabel('Display name',{exact:true}).fill('Stale Fixture Edit')
 conflict=true
 await page.getByRole('button',{name:'Save changes'}).click()
 await page.getByRole('alert').waitFor()
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:fileURLToPath(new URL('user-edit-mobile.png',output)),fullPage:true})
 assert.equal(await page.getByRole('dialog').evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true)
 await page.getByRole('button',{name:'Close dialog'}).click()
 await page.getByRole('button',{name:'Discard changes'}).click()
 await page.getByRole('button',{name:'Open user info'}).click()
 await page.route('**/api/auth/logout',r=>r.fulfill({json:{ok:true}}))
 await page.getByRole('button',{name:'Sign out',exact:true}).click()
 await page.waitForURL('**/login')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({result:'PASS',providerWrites:0,checks:['User Info links','Escape and focus return','row actions','dirty discard','department confirmation','save and refresh','409 recovery','mobile dialog','sign out navigation']}))
}finally{await browser.close()}
