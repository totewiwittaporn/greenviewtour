// Isolated browser fixtures: no real accounts, credentials, database writes or email.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {mkdir} from 'node:fs/promises'
const screenshots=new URL('../screenshots.local/',import.meta.url)
await mkdir(screenshots,{recursive:true})
import {customerCalendar} from '../backend/src/backoffice/dashboard/overview/service.js'
const origin = process.env.GREENVIEW_TEST_ORIGIN || 'http://localhost:5274'
const browser = await chromium.launch({headless:true})
try {
 const page = await browser.newPage({viewport:{width:834,height:1000}})
 const errors=[]; page.on('pageerror',error=>errors.push(error.message))
 let signedIn=false, calls=0, loginCalls=0
 const user={id:'fixture',displayName:'Name',email:'locale@example.invalid',status:'ACTIVE',roles:[{code:'MANAGER',name:'Manager',scope:'COMPANY'}],permissions:[],management:{company:true},operations:{booking:true},companyAccess:{'inventory.request':true}}
 const calendar=customerCalendar([{id:'booking',status:'CONFIRMED',outboundDate:'2026-09-21',adults:3,children:1,programSnapshot:{tourId:'tour',name:'Maintenance jobs'}}], '2026-09-21')
 await page.route('**/api/auth/login',route=>{loginCalls++; return route.fulfill({status:401,json:{code:'INVALID_CREDENTIALS'}})})
 await page.route('**/api/me',route=>route.fulfill({status:signedIn?200:401,json:signedIn?{user}:{code:'LOGIN_REQUIRED'}}))
 await page.route('**/api/dashboard',route=>{calls++; return route.fulfill({json:{today:'2026-09-21',timezone:'Asia/Bangkok',generatedAt:'2026-09-21T03:00:00Z',scope:'Company',calendar,widgets:[{id:"maintenance",title:"Maintenance jobs",href:"/company/maintenance",scope:"Company",pending:7,today:2,overdue:3,review:1,detail:"Unfinished records; review counts completed work awaiting acceptance."}]}})})
 await page.goto(origin+'/login')
 await page.getByLabel('Email address',{exact:true}).fill('locale@example.invalid')
 await page.getByLabel('Password',{exact:true}).fill('unsaved-password-only')
 await page.getByRole('button',{name:'Thai / ภาษาไทย',exact:true}).click()
 assert.equal(await page.locator('html').getAttribute('lang'),'th')
 assert.equal(await page.getByLabel('ที่อยู่อีเมล / Email address',{exact:true}).inputValue(),'locale@example.invalid')
 assert.equal(await page.getByLabel('รหัสผ่าน / Password',{exact:true}).inputValue(),'unsaved-password-only')
 await page.getByRole('button',{name:'English',exact:true}).click()
 assert.equal(await page.getByLabel('Password',{exact:true}).inputValue(),'unsaved-password-only')
 await page.getByRole('button',{name:'Sign in',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'Unable to sign in.'}).waitFor()
 await page.getByRole('button',{name:'Thai / ภาษาไทย',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'เข้าสู่ระบบไม่ได้'}).waitFor()
 await page.getByRole('button',{name:'English',exact:true}).click()
 await page.getByRole('alert').filter({hasText:'Unable to sign in.'}).waitFor()
 assert.equal(loginCalls,1,'Language switch must not replay a sign-in attempt')
 signedIn=true
 await page.goto(origin+'/dashboard')
 await page.getByRole('heading',{name:'Customers · next 14 days'}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Thai / ภาษาไทย',exact:true}).innerText(),'TH')
 assert.equal(await page.getByRole('button',{name:'English',exact:true}).innerText(),'EN')
 const originalCalls=calls
 await page.getByRole('button',{name:'Thai / ภาษาไทย',exact:true}).click()
 await page.getByRole('heading',{name:'ลูกค้า · 14 วันข้างหน้า / Customers · next 14 days'}).waitFor()
 await page.getByRole('heading',{name:'งานซ่อมบำรุง / Maintenance jobs',exact:true}).waitFor()
 assert.equal(await page.title(),'ภาพรวมงาน · Greenview Tour')
 assert.equal(calls,originalCalls,'Language switch must not refetch permission-bound dashboard data')
 await page.locator('.dashboard-day').first().click()
 await page.getByRole('cell',{name:'Maintenance jobs',exact:true}).waitFor()
 assert.equal(await page.getByRole('cell',{name:'4',exact:true}).count(),1)
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})))
 await page.getByRole('columnheader',{name:'Tour program',exact:true}).waitFor()
 assert.equal(await page.getByRole('dialog').count(),1,'Language event must not close active dialog')
 await page.getByRole('cell',{name:'Maintenance jobs',exact:true}).waitFor()
 await page.keyboard.press('Escape')
 assert.equal(await page.locator('.dashboard-day').first().evaluate(el=>el===document.activeElement),true)
 await page.getByRole('button',{name:'Thai / ภาษาไทย',exact:true}).click()
 for (const width of [1440,834,390]) {
  await page.setViewportSize({width,height:900})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Thai overflow at ${width}`)
  await page.screenshot({path:new URL(`locale-backoffice-${width}.png`,screenshots).pathname,fullPage:true})
 }
 await page.reload()
 await page.getByRole('heading',{name:'ลูกค้า · 14 วันข้างหน้า / Customers · next 14 days'}).waitFor()
 assert.equal(await page.locator('html').getAttribute('lang'),'th')
 assert.equal(await page.locator('.account-name').innerText(),'Name','Stored employee name must remain unchanged')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({result:'PASS',app:'Backoffice bilingual',checks:['unsaved auth fields','Thai/English labels','reload persistence','no refetch on switch','modal remains open across language event','stored names unchanged','focus restoration','1440/834/390 overflow'],liveAccounts:false}))
} finally { await browser.close() }
