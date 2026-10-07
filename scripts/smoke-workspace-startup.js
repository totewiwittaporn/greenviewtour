import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage();let release
 await page.route(/\/api\/me\/line(?:\?.*)?$/,route=>route.request().method()==='GET'?route.fulfill({json:{status:'UNLINKED',linkedLineProfile:null}}):route.fallback())
 await page.route('**/api/me',async route=>{await new Promise(resolve=>{release=resolve});await route.fulfill({json:{user:{id:'fixture',displayName:'Tee',status:'ACTIVE',roles:[{code:'ADMIN_MANAGER',scope:'COMPANY'}],management:{company:true},operations:{booking:true,islandBooking:true},companyAccess:{}}}})})
 await page.route('**/api/dashboard',route=>route.fulfill({json:{widgets:[],generatedAt:new Date().toISOString(),timezone:'Asia/Bangkok'}}))
 for(let i=0;i<2;i++){
  await page.goto((process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5174')+'/dashboard');await page.getByRole('status').filter({hasText:'Checking your account'}).waitFor()
  assert.equal(await page.locator('.workspace:not(.workspace-reference)').count(),0,'old layout rendered before account resolves')
  release();await page.locator('.workspace-reference').waitFor();await page.getByRole('heading',{name:'Programmer / System Administrator Dashboard',exact:true}).waitFor()
 }
 console.log('PASS: delayed account load and reload never render legacy shell; verified role opens new layout')
}finally{await browser.close()}
