// Fixture-only public locale checks. All API requests are intercepted before network access.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const origin = process.env.GREENVIEW_PUBLIC_ORIGIN || 'http://localhost:5173'
const tour = {
  id: 'locale-fixture', slug: 'locale-fixture', name: '\u0e17\u0e31\u0e27\u0e23\u0e4c\u0e08\u0e32\u0e01 CMS',
  description: '\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32\u0e15\u0e49\u0e19\u0e09\u0e1a\u0e31\u0e1a CMS',
  durationDays: 1, ownership: 'GREENVIEW', adultPrice: 2500, childPrice: null,
  promotions: [], seasons: [{ onlineStartsOn: '2026-09-21', onlineEndsOn: '2026-10-21', cutoffDays: 2 }],
}
const partner = {...tour, id: 'partner-fixture', slug: 'partner-fixture', name: 'Partner CMS tour', ownership: 'PARTNER'}
let companyMode = 'ready'
let tourMode = 'ready'
const tourQueries = []
const company = {name: 'Greenview fixture company', address: 'Fixture address', phone: '+66 123 4567', email: 'fixture@example.com', mapUrl: 'https://maps.google.com/?q=Surin'}
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage()
  const errors = []
  const unexpectedApi = []
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/public/company') {
        if (companyMode === 'error') return route.fulfill({status: 503, json: {}})
        return route.fulfill({json: {company: companyMode === 'empty' ? null : companyMode === 'unsafe' ? {...company, mapUrl: 'javascript:alert(1)'} : company}})
      }
      if (url.pathname === '/api/public/tours') {
        const ownership = url.searchParams.get('ownership')
        tourQueries.push(url.search)
        if (tourMode === 'error' && ownership) return route.fulfill({status: 503, json: {}})
        const rows = tourMode === 'empty' && ownership ? [] : ownership === 'PARTNER' ? [partner] : [tour]
        return route.fulfill({json: {rows, page: 1, total: rows.length}})
      }
      if (url.pathname === '/api/public/popups') return route.fulfill({ json: { rows: [] } })
      unexpectedApi.push(url.pathname)
      return route.fulfill({ status: 404, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
    }
    if (url.origin !== new URL(origin).origin) return route.abort()
    return route.continue()
  })
  await page.goto(`${origin}/tours?tour=${tour.slug}`)
  await page.getByRole('heading', { name: tour.name, exact: true }).waitFor()
  assert.equal(await page.locator('html').getAttribute('lang'), 'th')
  assert.equal(await page.locator('h1').innerText(), 'โปรแกรมทัวร์')
  const chooseLanguage = async code => {
    await page.locator('.language-selector > button').click()
    await page.locator('.language-options button').filter({hasText: code}).click()
  }
  assert.match(await page.locator('.language-selector > button').innerText(), /TH/)
  await chooseLanguage('EN')
  await page.getByRole('heading', { name: 'Tours', exact: true }).waitFor()
  await page.waitForFunction(() => document.title === 'Tours | Greenview Tour')
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  assert.equal(await page.evaluate(() => localStorage.getItem('greenview.locale')), 'en')
  assert.ok((await page.locator('body').innerText()).includes('Booking closes before departure by'))
  assert.ok((await page.locator('body').innerText()).includes('21 Sept 2026'))
  assert.ok((await page.locator('body').innerText()).includes('2,500.00'))
  await page.getByRole('heading', { name: tour.name, exact: true }).waitFor()
  assert.ok((await page.locator('body').innerText()).includes(tour.description))
  // Route changes retain the actual shell nodes and browser document, including query detail links.
  await page.evaluate(() => {
    window.shellFixture = {header: document.querySelector('.site-header'), footer: document.querySelector('.public-footer'), language: document.querySelector('.language-selector')}
  })
  const assertShell = async () => {
    assert.equal(await page.evaluate(() => Boolean(window.shellFixture && window.shellFixture.header === document.querySelector('.site-header') && window.shellFixture.footer === document.querySelector('.public-footer') && window.shellFixture.language === document.querySelector('.language-selector'))), true)
    assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  }
  await page.evaluate(() => {const link=document.createElement('a');link.href='/promotions';document.body.append(link);link.click();link.remove()})
  await page.getByRole('heading', {name: 'Tour promotions', exact: true}).waitFor()
  await assertShell()
  await page.locator('.public-main-nav a[href="/#company"]').click()
  await page.waitForURL(`${origin}/#company`)
  await page.waitForFunction(() => document.activeElement?.id === 'company')
  await page.waitForFunction(() => document.querySelector('#company').getBoundingClientRect().top < innerHeight)
  await assertShell()
  await page.locator('.public-main-nav a[href="/#surin"]').click()
  await page.waitForURL(`${origin}/#surin`)
  await page.waitForFunction(() => document.activeElement?.id === 'surin')
  await assertShell()
  await page.locator('.public-main-nav a[href="/tours"]').click()
  await page.getByRole('heading', {name: 'Tours', exact: true}).waitFor()
  await page.locator('a[href="/tours?tour=locale-fixture"]').click()
  await page.waitForURL(`${origin}/tours?tour=locale-fixture`)
  await page.getByRole('heading', {name: 'Travel dates available for online booking', exact: true}).waitFor()
  await assertShell()
  await page.goBack()
  await page.waitForURL(`${origin}/tours`)
  await page.locator('a[href="/tours?tour=locale-fixture"]').waitFor()
  await page.goForward()
  await page.waitForURL(`${origin}/tours?tour=locale-fixture`)
  await assertShell()
  // Modified clicks and explicit browser targets/downloads are never consumed by the router.
  const nativeChecks = await page.evaluate(() => {
    const results = []
    for (const setup of [{ctrlKey:true}, {metaKey:true}, {shiftKey:true}, {altKey:true}, {target:'_blank'}, {download:'tour'}, {href:'https://example.com/'}, {href:'/api/public/tours'}]) {
      const anchor = document.createElement('a')
      anchor.href = setup.href || '/tours'
      if (setup.target) anchor.target = setup.target
      if (setup.download) anchor.download = setup.download
      document.body.append(anchor)
      const event = new MouseEvent('click', {bubbles:true,cancelable:true,...setup})
      const observe = observed => { if(observed===event) { results.push(!observed.defaultPrevented); observed.preventDefault() } }
      document.addEventListener('click', observe)
      anchor.dispatchEvent(event)
      document.removeEventListener('click', observe)
      anchor.remove()
    }
    return results
  })
  assert.deepEqual(nativeChecks, Array(8).fill(true))
  await page.reload()
  await page.getByRole('heading', { name: 'Tours', exact: true }).waitFor()
  await page.setViewportSize({ width: 375, height: 812 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('greenview:locale', { detail: 'th' })))
  await page.waitForFunction(() => document.documentElement.lang === 'th' && document.title !== 'Tours | Greenview Tour')
  await page.getByRole('heading', { name: tour.name, exact: true }).waitFor()
  assert.ok((await page.locator('body').innerText()).includes(tour.description))
  await chooseLanguage('EN')
  await page.goto(`${origin}/promotions`)
  await page.waitForFunction(() => document.title === 'Tour promotions | Greenview Tour')
  await page.goto(origin)
  await page.waitForFunction(() => document.title === 'Greenview Tour \u2014 Surin Islands trips')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  for (const locale of ['th','en']) {
    await chooseLanguage(locale.toUpperCase())
    for (const width of [320,390,834,1100,1440]) {
      await page.setViewportSize({width,height:900})
      for (const path of ['/', '/tours', '/promotions']) {
        await page.goto(`${origin}${path}`)
        if (path === '/') await page.locator('#company h3').waitFor()
        const language = page.locator('.language-selector > button')
        await language.waitFor()
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,`${locale} ${width} ${path} overflow`)
        const login=page.locator('.public-topbar-actions .customer-login')
        assert.equal(await login.getAttribute('href'),'http://localhost:5175/login')
        assert.equal(await login.innerText(),locale==='th'?'เข้าสู่ระบบ':'Login')
        const navigationText=await page.locator('.public-main-nav').innerText()
        if(locale==='th') assert.doesNotMatch(navigationText, /Tours|Promotions|Contact us|About Surin Islands/)
        assert.equal(await page.locator('.site-header .customer-login').count(),1)
        assert.equal(await page.locator('.customer-register').getAttribute('href'),'http://localhost:5175/login?mode=register')
        assert.equal(await page.locator('.customer-register').isVisible(),true)
        assert.equal(await page.locator('.public-brand img').count(),2)
        assert.equal(await page.locator('.public-brand img').evaluateAll(nodes=>nodes.every(img=>img.complete && img.naturalWidth>0)),true)
        await language.click()
        await page.locator('.language-options').waitFor()
        await page.keyboard.press('Escape')
        assert.equal(await language.getAttribute('aria-expanded'),'false')
        assert.equal(await language.evaluate(el=>el===document.activeElement),true)
        await language.click()
        await page.locator('main').click({position:{x:8,y:180}})
        assert.equal(await page.locator('.language-options').count(),0)
        const hamburger=page.locator('.public-menu-toggle')
        if(width<=1100){
          assert.equal(await page.locator('.public-main-nav').isVisible(),false)
          await hamburger.click()
          assert.equal(await page.locator('.public-main-nav').isVisible(),true)
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false)
          await page.keyboard.press('Escape')
          assert.equal(await hamburger.getAttribute('aria-expanded'),'false')
          assert.equal(await hamburger.evaluate(el=>el===document.activeElement),true)
          await hamburger.focus()
          await page.keyboard.press('Enter')
          await page.evaluate(() => { window.mobileShell = document.querySelector('.site-header') })
          await page.locator('.public-main-nav a[href="/tours"]').click()
          await page.waitForURL(`${origin}/tours`)
          assert.equal(await page.evaluate(() => window.mobileShell === document.querySelector('.site-header')),true)
          assert.equal(await page.locator('.public-main-nav').isVisible(),false)
        }else{
          assert.equal(await hamburger.isVisible(),false)
          const links=await page.locator('.public-main-nav a').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top))
          assert.ok(links.every(top=>top===links[0]))
        }
      }
    }
  }
  // Home consumes public company data and ownership-filtered published tours.
  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(origin)
  await page.locator('#company h3').waitFor()
  assert.equal(await page.locator('#company h3').innerText(), company.name)
  assert.deepEqual(await page.locator('main > section').evaluateAll(nodes => nodes.map(n => n.id || n.className)), ['hero', 'home-welcome home-container', 'company', 'surin', 'tours'])
  for (const image of await page.locator('img[src^="/images/home/"]').all()) {
    await image.scrollIntoViewIfNeeded()
    await image.evaluate(el => el.decode())
    assert.ok(await image.evaluate(el => el.naturalWidth > 0))
  }
  assert.equal(await page.locator('img[src^="/images/home/"]').count(), 2)
  const own = page.locator('.home-tour-group').filter({has: page.locator('#tours-GREENVIEW')})
  const other = page.locator('.home-tour-group').filter({has: page.locator('#tours-PARTNER')})
  await other.getByRole('heading', {name: partner.name}).waitFor()
  assert.ok((await own.innerText()).includes(tour.name))
  assert.ok(!(await own.innerText()).includes(partner.name))
  assert.ok(!(await other.innerText()).includes(tour.name))
  assert.ok(tourQueries.some(q => new URLSearchParams(q).get('ownership') === 'GREENVIEW'))
  assert.ok(tourQueries.some(q => new URLSearchParams(q).get('ownership') === 'PARTNER'))
  await page.evaluate(() => {window.homeShell = document.querySelector('.site-header')})
  await other.locator('a[href="/tours?ownership=PARTNER"]').click()
  await page.waitForURL(`${origin}/tours?ownership=PARTNER`)
  await page.getByRole('heading', {name: partner.name, exact:true}).waitFor()
  assert.equal(await page.evaluate(() => window.homeShell === document.querySelector('.site-header')), true)
  companyMode = 'empty'
  tourMode = 'empty'
  await page.goto(origin)
  await page.getByText('Company information is not available yet.', {exact:true}).waitFor()
  assert.equal(await page.locator('#company a').count(), 0)
  await page.locator('.home-empty').first().waitFor()
  assert.equal(await page.locator('.home-empty').count(), 2)
  companyMode = 'unsafe'
  tourMode = 'ready'
  await page.reload()
  await page.locator('#company h3').waitFor()
  assert.equal(await page.locator('#company a[target="_blank"]').count(), 0)
  companyMode = 'error'
  tourMode = 'error'
  await page.reload()
  await page.locator('#company [role="alert"]').waitFor()
  await page.locator('.home-tour-group [role="alert"]').first().waitFor()
  companyMode = 'ready'
  tourMode = 'ready'
  await page.locator('#company button').click()
  await page.locator('#company h3').waitFor()
  assert.equal(await page.locator('#company a[target="_blank"]').getAttribute('href'), company.mapUrl)
  for (const group of await page.locator('.home-tour-group').all()) {
    await group.getByRole('button').click()
    await group.locator('.tour-card').waitFor()
  }
  assert.equal(await page.locator('[role="alert"]').count(), 0)
  assert.deepEqual(unexpectedApi, [])
  assert.deepEqual(errors, [])
  console.log('Public locale fixtures passed: titles, language, persistence, custom event, dates/currency, mobile layout, original CMS content, persistent shell nodes, history, anchors, native link behavior, Home section order, real photos, ownership queries, company safety and empty/error/retry states.')
} finally {
  await browser.close()
}
