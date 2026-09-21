// Isolated browser fixtures: every API request is intercepted; no business writes.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
const origin = process.env.GREENVIEW_MEMBER_ORIGIN || 'http://localhost:5175'
const browser = await chromium.launch({headless:true})
try {
 const context = await browser.newContext({viewport:{width:1280,height:900}})
 const page = await context.newPage(), errors = []
 page.on('pageerror', error => errors.push(error.message))
 let authenticated = false, quoteCalls = 0
 const customer = {id:'customer',displayName:'นักเดินทางเดิม',email:'traveller@example.com',phone:'0812345678',version:1}
 const tour = {id:'tour',slug:'surin',name:'ชื่อทัวร์จากฐานข้อมูล',description:'เก็บข้อความต้นฉบับ',durationDays:2,adultPrice:'1500',childPrice:'1000',promotions:[{id:'promo',name:'โปรโมชั่นต้นฉบับ',remaining:10,quotaUnit:'SEAT',adultPrice:'1400',childPrice:'900',serviceStartsOn:'2026-09-21',serviceEndsOn:'2026-10-04'}],components:[]}
 await context.route(/^https:/, route => route.abort())
 await context.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (path === '/api/member/profile') return route.fulfill(authenticated ? {json:{customer}} : {status:401,json:{code:'LOGIN_REQUIRED'}})
  if (path === '/api/public/tours') return route.fulfill({json:{rows:[tour],page:1,total:1}})
  if (path === '/api/public/quote') { quoteCalls++; return route.fulfill({json:{packageTotal:'1500',adultPrice:'1500',childPrice:'1000',components:[],quoteKey:'fixture-quote',terms:{fees:'ค่าธรรมเนียมต้นฉบับ',cancellationTerms:'เงื่อนไขต้นฉบับ'}}}) }
  return route.fulfill({status:400,json:{code:'FIXTURE_UNEXPECTED_REQUEST'}})
 })
 async function selectLanguage(name) {
  await page.locator('.member-account-trigger').click()
  await page.getByRole('button',{name,exact:true}).click()
  assert.equal(await page.locator('.member-account-panel').count(),0)
 }
 await page.goto(origin + '/login')
 await page.getByRole('heading',{name:'เข้าสู่ระบบสมาชิก / Member sign in',exact:true}).waitFor()
 await page.locator('.member-account-trigger').click()
 assert.match(await page.getByRole('button',{name:'Thai / ภาษาไทย',exact:true}).innerText(),/TH/)
 assert.match(await page.getByRole('button',{name:'English',exact:true}).innerText(),/EN/)
 await page.keyboard.press('Escape')
 await page.getByLabel('อีเมล / Email',{exact:true}).fill('holiday@example.com')
 await page.getByLabel('รหัสผ่าน / Password',{exact:true}).fill('keep-my-password')
 await selectLanguage('English')
 await page.getByRole('heading',{name:'Member sign in',exact:true}).waitFor()
 assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'holiday@example.com')
 assert.equal(await page.getByLabel('Password',{exact:true}).inputValue(),'keep-my-password')
 assert.equal(await page.locator('html').getAttribute('lang'),'en')
 assert.match(await page.title(), /Member sign in/)
 await page.reload()
 await page.getByRole('heading',{name:'Member sign in',exact:true}).waitFor()
 await page.getByRole('button',{name:'Sign in',exact:true}).click()
 await page.getByText('Enter a valid email, such as name@example.com',{exact:true}).waitFor()
 await selectLanguage('Thai / ภาษาไทย')
 await page.getByText('กรอกอีเมลให้ถูกต้อง เช่น name@example.com',{exact:true}).waitFor()
 await selectLanguage('English')
 await page.getByRole('button',{name:'Forgot password',exact:true}).click()
 await page.getByRole('heading',{name:'Forgot password',exact:true}).waitFor()
 await page.setViewportSize({width:390,height:844})
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
 await page.goto(origin + '/tours?tour=surin')
 await page.getByRole('heading',{name:tour.name,exact:true}).waitFor()
 await page.getByText('Remaining 10 seats',{exact:false}).waitFor()
 assert.equal(await page.getByText(tour.description,{exact:true}).count(),1)
 authenticated = true
 await page.reload()
 await page.getByLabel('Travel date',{exact:true}).fill('2026-09-21')
 await page.getByText('Requested total',{exact:false}).waitFor()
 await page.getByLabel('Contact name',{exact:true}).fill('ชื่อที่ยังไม่ส่ง')
 await page.getByLabel('Travellers’ food allergies',{exact:true}).selectOption('NONE')
 await page.getByRole('checkbox').check()
 const quoteCount = quoteCalls
 await selectLanguage('Thai / ภาษาไทย')
 assert.equal(await page.getByLabel('ชื่อผู้ติดต่อ / Contact name',{exact:true}).inputValue(),'ชื่อที่ยังไม่ส่ง')
 assert.equal(await page.getByLabel('วันเดินทาง / Travel date',{exact:true}).inputValue(),'2026-09-21')
 assert.equal(await page.getByRole('checkbox').isChecked(),true)
 assert.equal(quoteCalls,quoteCount)
 assert.equal(await page.getByText(tour.description,{exact:true}).count(),1)
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})))
 await page.getByLabel('Contact name',{exact:true}).waitFor()
 assert.equal(await page.getByLabel('Contact name',{exact:true}).inputValue(),'ชื่อที่ยังไม่ส่ง')
 // Fresh page clears the unsent fixture form without navigating through its leave guard.
 const shell = await context.newPage()
 shell.on('pageerror', error => errors.push(error.message))
 for (const signedIn of [false, true]) {
  authenticated = signedIn
  for (const locale of ['th', 'en']) {
   await shell.goto(origin + '/profile')
   await shell.evaluate(value => window.dispatchEvent(new CustomEvent('greenview:locale', {detail:value})), locale)
   await shell.getByRole('heading', {name: signedIn ? (locale === 'th' ? 'ข้อมูลของฉัน / My profile' : 'My profile') : (locale === 'th' ? 'เข้าสู่ระบบสมาชิก / Member sign in' : 'Member sign in'), exact:true}).waitFor()
   for (const width of [320, 390, 834, 1440]) {
    await shell.setViewportSize({width,height:844})
    const account = shell.locator('.member-account-trigger'), toggle = shell.locator('.member-menu-toggle'), nav = shell.locator('#member-navigation')
    assert.equal(await nav.isVisible(), width > 1100)
    await account.click()
    assert.equal(await shell.locator('.member-account-panel').isVisible(),true)
    assert.equal(await shell.locator('.member-signout').count(),signedIn ? 1 : 0)
    assert.equal(await shell.locator('.member-identity').count(),signedIn ? 1 : 0)
    assert.equal(await shell.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
    await shell.keyboard.press('Escape')
    assert.equal(await account.evaluate(element=>element===document.activeElement),true)
    await account.press('Enter')
    await shell.mouse.click(4, 700)
    assert.equal(await shell.locator('.member-account-panel').count(),0)
    if (width <= 1100) {
     await toggle.click()
     assert.equal(await nav.isVisible(),true)
     assert.equal(await nav.getByRole('link').count(),signedIn ? 3 : 2)
     await account.click()
     assert.equal(await nav.isVisible(),false)
     await toggle.click()
     assert.equal(await shell.locator('.member-account-panel').count(),0)
     await shell.keyboard.press('Escape')
     assert.equal(await toggle.evaluate(element=>element===document.activeElement),true)
     assert.equal(await nav.isVisible(),false)
    }
   }
  }
 }
 await shell.close()
 assert.deepEqual(errors,[])
 console.log('Member locale browser fixtures passed: login/reload/errors/recovery, 320/390/834/1440px authenticated and guest header menus, keyboard/outside dismissal, catalog content, quote/contact/consent preservation and event switching.')
} finally { await browser.close() }
