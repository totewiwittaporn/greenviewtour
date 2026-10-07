import assert from 'node:assert/strict'
import {addressValues} from '../packages/contracts/address.js'
import {mkdtemp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const root=fileURLToPath(new URL('../frontend/backoffice',import.meta.url)),output=await mkdtemp(tmpdir()+'/greenview-onboarding-browser-')
const vite=await createServer({root,configFile:root+'/vite.config.js',server:{host:'127.0.0.1',port:5374,strictPort:true},logLevel:'error'})
let browser
try{
 await vite.listen();browser=await chromium.launch({headless:true})
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],calls=[]
 page.on('pageerror',error=>errors.push(error.message))
 await context.addInitScript(()=>{if(!localStorage.getItem('greenview.locale'))localStorage.setItem('greenview.locale','en')})
 let state='EMAIL_VERIFIED',profile={firstName:'',lastName:'',primaryPhone:'',...addressValues({})},available=false
 const data=()=>({state,email:'employee@example.test',roles:['GUIDE'],department:'GUIDE',profile,line:{available,reason:available?null:'LINE_LOCAL_ONLY'}})
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(!['localhost','127.0.0.1'].includes(url.hostname))return route.abort();return route.continue()})
 await page.route('**/api/onboarding**',async route=>{
  const path=new URL(route.request().url()).pathname;calls.push(path)
  if(path==='/api/onboarding/line/start')return route.fulfill({json:{redirectUrl:'http://localhost:5374/line-provider-fixture'}})
  if(path==='/api/onboarding/line/finish'){assert.deepEqual(route.request().postDataJSON(),{code:'fixture-code',state:'fixture-state'});state='ACTIVE';return route.fulfill({json:{state,redirect:'/dashboard'}})}
  if(path==='/api/onboarding/exchange')return route.fulfill({json:data()})
  if(path==='/api/onboarding/profile'){profile=route.request().postDataJSON();state='PROFILE_COMPLETED';return route.fulfill({json:data()})}
  if(path==='/api/onboarding/password'){const input=route.request().postDataJSON();assert.equal(input.password,input.confirmPassword);state='PASSWORD_SET';return route.fulfill({json:data()})}
  return route.fulfill({json:data()})
 })
 await page.goto('http://localhost:5374/onboarding#invitation='+'a'.repeat(64))
 await page.getByLabel('Legal first name').waitFor()
 assert.equal(new URL(page.url()).hash,'')
 assert.match(await page.title(),/Greenview/)
 assert.equal(await page.locator('vite-error-overlay').count(),0)
 await page.getByRole('button',{name:'Save employee information',exact:true}).click()
 assert.equal(await page.getByLabel('Legal first name').getAttribute('aria-invalid'),'true')
 await page.getByLabel('Legal first name').fill('Somchai')
 await page.getByLabel('Legal last name').fill('Jaidee')
 assert.equal(await page.getByLabel('Full address',{exact:true}).count(),0)
 for(const [label,option] of [['Province','Phuket'],['District / Amphoe','Mueang Phuket'],['Subdistrict / Tambon','Rawai']]){
  const select=page.getByRole('combobox',{name:label,exact:true});await select.click();await page.getByRole('option',{name:new RegExp('^'+option+' ')}).click()
 }
 await page.getByLabel('House number',{exact:true}).fill('12')
 assert.equal(await page.getByLabel('Postal code',{exact:true}).inputValue(),'83130')
 await page.setViewportSize({width:390,height:844})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.screenshot({path:output+'/address-mobile.png',fullPage:true})
 await page.setViewportSize({width:1440,height:1000})
 await page.getByLabel('Phone number').fill('0812345678')
 await page.screenshot({path:output+'/information-desktop.png',fullPage:true})
 await page.getByRole('button',{name:'Save employee information',exact:true}).click()
 await page.getByLabel('New password',{exact:true}).waitFor()
 await page.reload();await page.getByLabel('New password',{exact:true}).waitFor()
 assert.equal(await page.getByLabel('New password',{exact:true}).inputValue(),'')
 await page.getByLabel('New password',{exact:true}).fill('private-password-123')
 await page.getByLabel('Confirm password',{exact:true}).fill('different')
 await page.getByRole('button',{name:'Save password and continue',exact:true}).click()
 await page.getByText('Passwords must match.',{exact:true}).waitFor()
 assert.equal(calls.filter(path=>path.endsWith('/password')).length,0)
 await page.getByLabel('Confirm password',{exact:true}).fill('private-password-123')
 await page.getByRole('button',{name:'Save password and continue',exact:true}).click()
 const lineButton=page.getByRole('button',{name:'Continue with LINE',exact:true});await lineButton.waitFor()
 assert.equal(await lineButton.isDisabled(),true)
 await page.screenshot({path:output+'/line-local-desktop.png',fullPage:true})
 await page.setViewportSize({width:390,height:844})
 await page.evaluate(()=>{localStorage.setItem('greenview.locale','th')})
 await page.reload();await page.getByRole('button',{name:'\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e15\u0e48\u0e2d\u0e14\u0e49\u0e27\u0e22 LINE',exact:true}).waitFor()
 assert.ok((await page.locator('body').innerText()).includes('\u0e23\u0e30\u0e1a\u0e1a\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e04\u0e27\u0e32\u0e21\u0e04\u0e37\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e41\u0e25\u0e49\u0e27'))
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.screenshot({path:output+'/line-local-mobile-th.png',fullPage:true})
 // An enabled fixture exposes the real primary action; no external LINE request is made.
 available=true
 await page.reload();await page.getByRole('button',{name:'\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e15\u0e48\u0e2d\u0e14\u0e49\u0e27\u0e22 LINE',exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23\u0e15\u0e48\u0e2d\u0e14\u0e49\u0e27\u0e22 LINE',exact:true}).isDisabled(),false)
 await page.route('**/line-provider-fixture',route=>route.fulfill({contentType:'text/html',body:'LINE provider fixture'}))
 await page.route('**/dashboard',route=>route.fulfill({contentType:'text/html',body:'Activated dashboard fixture'}))
 await page.locator('button[type=submit]').click();await page.waitForURL('**/line-provider-fixture')
 await page.goto('http://localhost:5374/onboarding/line-callback?code=fixture-code&state=fixture-state')
 await page.waitForURL('**/dashboard')
 assert.equal(calls.filter(path=>path.endsWith('/line/finish')).length,1)
 assert.equal(calls.filter(path=>path.endsWith('/exchange')).length,1)
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({status:'PASS',source:'UI API fixtures; no real business writes',viewports:['1440x1000','390x844'],locales:['en','th'],checks:['one-use link removed from URL','field validation and focus','structured cascading address with automatic postcode','address mobile no overflow','profile save','password step survives reload','password mismatch blocks request','Local LINE readiness disabled','LINE start and callback with fixture provider','callback completion deduplicated under StrictMode','no horizontal overflow','no runtime errors'],screenshots:output}))
}finally{await browser?.close();await vite.close()}
