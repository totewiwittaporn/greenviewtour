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
      if (url.pathname === '/api/public/tours') return route.fulfill({ json: { rows: [tour], page: 1, total: 1 } })
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
  assert.match(await page.locator('h1').innerText(), / \/ Tours$/)
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
        const language = page.locator('.language-selector > button')
        await language.waitFor()
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,`${locale} ${width} ${path} overflow`)
        const login=page.locator('.public-topbar-actions .customer-login')
        assert.equal(await login.getAttribute('href'),'http://localhost:5175/login')
        assert.equal(await page.locator('.site-header .customer-login').count(),0)
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
          await page.locator('.public-main-nav a').first().click()
          assert.equal(await page.locator('.public-main-nav').isVisible(),false)
        }else{
          assert.equal(await hamburger.isVisible(),false)
          const links=await page.locator('.public-main-nav a').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top))
          assert.ok(links.every(top=>top===links[0]))
        }
      }
    }
  }
  assert.deepEqual(unexpectedApi, [])
  assert.deepEqual(errors, [])
  console.log('Public locale fixtures passed: titles, language, persistence, custom event, dates/currency, mobile layout and original CMS content.')
} finally {
  await browser.close()
}
