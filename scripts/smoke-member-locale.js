// Isolated browser fixtures: every API request is intercepted; no business writes.
import {chromium} from 'playwright'
import assert from 'node:assert/strict'
const origin = process.env.GREENVIEW_MEMBER_ORIGIN || 'http://localhost:5175'
const browser = await chromium.launch({headless:true})
try {
 const context = await browser.newContext({viewport:{width:1280,height:900}})
 const page = await context.newPage(), errors = []
 page.on('pageerror', error => errors.push(error.message))
 let authenticated = false, quoteCalls = 0, profileReads = 0, failSave = false, profileWrites = 0, recovery = false
 const customer = {id:'customer',displayName:'นักเดินทางเดิม',email:'traveller@example.com',phone:'0812345678',lineId:'traveller.line',version:1}
 const tour = {id:'tour',slug:'surin',name:'ชื่อทัวร์จากฐานข้อมูล',description:'เก็บข้อความต้นฉบับ',durationDays:2,adultPrice:'1500',childPrice:'1000',promotions:[{id:'promo',name:'โปรโมชั่นต้นฉบับ',remaining:10,quotaUnit:'SEAT',adultPrice:'1400',childPrice:'900',serviceStartsOn:'2026-09-21',serviceEndsOn:'2026-10-04'}],components:[]}
 await context.route(/^https:/, route => route.abort())
 await context.route('**/api/**', route => {
  const path = new URL(route.request().url()).pathname
  if (path === '/api/member/profile') {
   if (route.request().method() === 'GET') profileReads++
   if (route.request().method() === 'POST') {
    profileWrites++
    if (failSave) return route.fulfill({status:409,json:{code:'SETTINGS_CONFLICT'}})
    Object.assign(customer,route.request().postDataJSON(),{nickname:route.request().postDataJSON().nickname?.trim() || '',version:customer.version+1})
   }
   return route.fulfill(authenticated ? {json:{customer,recovery}} : {status:401,json:{code:'LOGIN_REQUIRED'}})
  }
  if (path === '/api/member/login') {authenticated = true; return route.fulfill({json:{customer}})}
  if (path === '/api/member/requests') return route.fulfill({json:{rows:[],page:1,total:0}})
  if (path === '/api/public/tours') return route.fulfill({json:{rows:[tour],page:1,total:1}})
  if (path === '/api/public/quote') { quoteCalls++; return route.fulfill({json:{packageTotal:'1500',adultPrice:'1500',childPrice:'1000',components:[],quoteKey:'fixture-quote',terms:{fees:'ค่าธรรมเนียมต้นฉบับ',cancellationTerms:'เงื่อนไขต้นฉบับ'}}}) }
  return route.fulfill({status:400,json:{code:'FIXTURE_UNEXPECTED_REQUEST'}})
 })
 async function selectLanguage(name) {
  await page.locator('.member-account-trigger').click()
  await page.getByRole('button',{name,exact:true}).click()
  assert.equal(await page.locator('.member-account-panel').count(),0)
 }
 await page.goto(origin + '/login?mode=register')
 await page.getByRole('heading',{name:'สมัครสมาชิก / Create account',exact:true}).waitFor()
 await page.getByLabel('ยืนยันรหัสผ่าน / Confirm password',{exact:true}).waitFor()
 await page.reload()
 await page.getByRole('heading',{name:'สมัครสมาชิก / Create account',exact:true}).waitFor()
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
    assert.equal(await shell.locator('main h1').evaluate(el=>getComputedStyle(el).fontSize),width <= 760 ? '24px' : '26px')
    assert.equal(await shell.locator('main .field label').first().evaluate(el=>getComputedStyle(el).fontSize),'14px')
    assert.equal(await shell.locator('main input').first().evaluate(el=>getComputedStyle(el).fontSize),'16px')
    assert.ok(await shell.locator('main input').first().evaluate(el=>el.getBoundingClientRect().height>=44))
    assert.equal(await shell.locator('main button[type="submit"]').evaluate(el=>getComputedStyle(el).fontSize),'14px')
    await account.click()
    assert.equal(await shell.locator('.member-account-panel').isVisible(),true)
    assert.equal(await shell.locator('.member-signout').count(),signedIn ? 1 : 0)
    assert.equal(await shell.locator('.member-identity').count(),signedIn ? 1 : 0)
    if (signedIn) {
     assert.equal(await shell.locator('.member-contact-details').innerText().then(text=>text.includes(customer.lineId)),true)
     assert.equal(await shell.locator('.member-account-panel').innerText().then(text=>text.includes(customer.email)),false)
     assert.equal(await shell.locator('.member-edit-profile').getAttribute('href'),'/profile')
     assert.equal(await shell.locator('main').innerText().then(text=>text.includes(customer.email)),false)
     assert.equal(await shell.getByLabel('LINE ID',{exact:true}).getAttribute('maxlength'),'100')
     assert.equal(await shell.getByLabel(locale === 'th' ? 'ชื่อเล่น / Nickname' : 'Nickname',{exact:true}).getAttribute('maxlength'),'50')
     assert.equal(await shell.locator('.member-account-name').textContent(),customer.displayName)
    }
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
 // Nickname independently participates in the dirty guard before other edits.
 await shell.getByLabel('Nickname',{exact:true}).fill('  ที  ')
 // LINE ID participates in locale-preserving edits, failure preservation and saved identity.
 await shell.setViewportSize({width:390,height:844})
 await shell.locator('.member-menu-toggle').click()
 await shell.locator('#member-navigation a[href="/tours"]').click()
 await shell.getByRole('dialog').waitFor()
 await shell.getByRole('button',{name:'Continue editing',exact:true}).click()
 assert.equal(await shell.getByLabel('Nickname',{exact:true}).inputValue(),'  ที  ')
 await shell.getByLabel('LINE ID',{exact:true}).fill('new.line')
 await shell.locator('.member-account-trigger').click()
 await shell.getByRole('button',{name:'Thai / ภาษาไทย',exact:true}).click()
 assert.equal(await shell.getByLabel('LINE ID',{exact:true}).inputValue(),'new.line')
 assert.equal(await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).inputValue(),'  ที  ')
 failSave = true
 await shell.getByRole('button',{name:'บันทึกข้อมูล',exact:true}).click()
 await shell.getByText('ข้อมูลเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด',{exact:true}).waitFor()
 assert.equal(await shell.getByLabel('LINE ID',{exact:true}).inputValue(),'new.line')
 assert.equal(await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).inputValue(),'  ที  ')
 assert.equal(await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).inputValue(),'  ที  ')
 assert.equal(await shell.locator('.member-account-name').textContent(),customer.displayName)
 failSave = false
 await shell.getByRole('button',{name:'บันทึกข้อมูล',exact:true}).click()
 await shell.getByText('บันทึกข้อมูลแล้ว',{exact:true}).waitFor()
 assert.equal(profileWrites,2)
 assert.equal(customer.lineId,'new.line')
 assert.equal(customer.nickname,'ที')
 assert.equal(await shell.locator('.member-account-name').textContent(),'ที')
 assert.equal(await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).inputValue(),'ที')
 await shell.locator('.member-account-trigger').click()
 assert.match(await shell.locator('.member-contact-details').innerText(),/new.line/)
 assert.match(await shell.locator('.member-contact-details').innerText(),/ที/)
 assert.equal(await shell.locator('.member-identity strong').textContent(),customer.displayName)
 await shell.keyboard.press('Escape')
 await shell.getByLabel('LINE ID',{exact:true}).fill('')
 await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).fill('')
 await shell.getByRole('button',{name:'บันทึกข้อมูล',exact:true}).click()
 await shell.waitForFunction(()=>document.querySelector('button[type="submit"]').disabled===false)
 assert.equal(customer.lineId,'')
 assert.equal(customer.nickname,'')
 assert.equal(await shell.locator('.member-account-name').textContent(),customer.displayName)
 // Internal navigation keeps the document, shell nodes and loaded session alive.
 await shell.setViewportSize({width:1440,height:900})
 await shell.evaluate(() => {window.shellNodes = [document.querySelector('header'),document.querySelector('footer')];window.shellMarker = true})
 const readsBeforeNavigation = profileReads
 await shell.locator('#member-navigation a[href="/tours"]').click()
 await shell.getByRole('heading',{name:tour.name,exact:true}).waitFor()
 await shell.locator('main a[href="/tours?tour=surin"]').click()
 await shell.getByLabel('วันเดินทาง / Travel date',{exact:true}).waitFor()
 assert.match(shell.url(),/tour=surin/)
 await shell.goBack()
 await shell.locator('main a[href="/tours?tour=surin"]').waitFor()
 await shell.goForward()
 await shell.getByLabel('วันเดินทาง / Travel date',{exact:true}).waitFor()
 await shell.locator('#member-navigation a[href="/profile"]').click()
 await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).fill('unsaved navigation nickname')
 // Hash navigation keeps the same dirty form and contributes a distinct history entry.
 await shell.evaluate(() => document.querySelector('.skip').click())
 assert.equal(await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).inputValue(),'unsaved navigation nickname')
 await shell.goBack()
 assert.equal(await shell.getByRole('dialog').count(),0)
 // Browser back is blocked by an app dialog after restoring the original URL.
 await shell.evaluate(() => history.back())
 await shell.getByRole('dialog').waitFor()
 assert.match(shell.url(),/\/profile$/)
 await shell.getByRole('button',{name:'ทำรายการต่อ',exact:true}).click()
 assert.equal(await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).inputValue(),'unsaved navigation nickname')
 await shell.evaluate(() => history.back())
 await shell.getByRole('dialog').waitFor()
 await shell.getByRole('button',{name:'ออกโดยไม่บันทึก',exact:true}).click()
 await shell.getByLabel('วันเดินทาง / Travel date',{exact:true}).waitFor()
 // A contact-only dirty tour form also blocks browser forward before choosing a date.
 await shell.getByLabel('ชื่อผู้ติดต่อ / Contact name',{exact:true}).fill('unsent tour contact')
 await shell.evaluate(() => history.forward())
 await shell.getByRole('dialog').waitFor()
 assert.match(shell.url(),/tour=surin/)
 await shell.getByRole('button',{name:'ทำรายการต่อ',exact:true}).click()
 assert.equal(await shell.getByLabel('ชื่อผู้ติดต่อ / Contact name',{exact:true}).inputValue(),'unsent tour contact')
 await shell.evaluate(() => history.forward())
 await shell.getByRole('dialog').waitFor()
 await shell.getByRole('button',{name:'ออกโดยไม่บันทึก',exact:true}).click()
 await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).waitFor()
 assert.equal(await shell.getByLabel('ชื่อเล่น / Nickname',{exact:true}).inputValue(),'')
 assert.equal(profileReads,readsBeforeNavigation)
 assert.equal(await shell.evaluate(() => window.shellMarker && window.shellNodes[0] === document.querySelector('header') && window.shellNodes[1] === document.querySelector('footer')),true)
 // Long contact content stays inside a short mobile viewport and scrolls to actions.
 customer.lineId = 'long-line-id-'.repeat(8)
 customer.displayName = 'ชื่อสมาชิกที่มีความยาวเพื่อทดสอบการตัดบรรทัด'.repeat(4)
 await shell.setViewportSize({width:320,height:400})
 await shell.reload()
 await shell.getByLabel('LINE ID',{exact:true}).waitFor()
 await shell.locator('.member-account-trigger').click()
 const bounds = await shell.locator('.member-account-panel').boundingBox()
 assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 320 && bounds.y + bounds.height <= 400)
 await shell.locator('.member-signout').scrollIntoViewIfNeeded()
 assert.equal(await shell.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true)
 await shell.keyboard.press('Escape')
 // Native link contracts: browser owns modified, external, download and API navigation.
 for (const options of [{href:'/tours',ctrlKey:true},{href:'/tours',target:'_blank'},{href:'/api/member/documents/fixture'},{href:'https://example.com'},{href:'/tours',download:true}]) {
  assert.equal(await shell.evaluate(options => {
   const a = document.createElement('a'); a.href = options.href
   if (options.target) a.target = options.target
   if (options.download) a.download = 'fixture'
   document.body.append(a)
   let intercepted
   document.addEventListener('click', event => {intercepted = event.defaultPrevented; event.preventDefault()}, {once:true})
   a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,ctrlKey:options.ctrlKey}))
   a.remove(); return intercepted
  }, options), false)
 }
 authenticated = false
 const login = await context.newPage()
 await login.goto(origin + '/login?next=' + encodeURIComponent('/tours?tour=surin'))
 await login.evaluate(() => {window.authHeader = document.querySelector('header')})
 await login.getByLabel('อีเมล / Email',{exact:true}).fill('traveller@example.com')
 await login.getByLabel('รหัสผ่าน / Password',{exact:true}).fill('valid-password')
 await login.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click()
 await login.getByLabel('วันเดินทาง / Travel date',{exact:true}).waitFor()
 assert.match(login.url(),/\/tours\?tour=surin$/)
 assert.equal(await login.evaluate(() => window.authHeader === document.querySelector('header')),true)
 await login.close()
 recovery = true
 await shell.reload()
 await shell.locator('.member-account-trigger').click()
 assert.equal(await shell.locator('.member-edit-profile').count(),0)
 await shell.close()
 assert.deepEqual(errors,[])
 console.log('Member locale browser fixtures passed: login/reload/errors/recovery, 320/390/834/1440px authenticated and guest header menus, keyboard/outside dismissal, catalog content, quote/contact/consent preservation, nickname and LINE ID dirty/error/save/clear, normalized nickname trigger with full-name fallback/detail, compact typography with 16px inputs and 44px controls, hidden locked details, bounded long-contact dropdown and recovery action visibility.')
} finally { await browser.close() }
