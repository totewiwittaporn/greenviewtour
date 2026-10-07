// Isolated content/read-only UI fixtures; no real company, booking, payment or Auth writes.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {chromium} from 'playwright'
const origin = process.env.GREENVIEW_PUBLIC_ORIGIN || 'http://localhost:5173'
const evidence = process.env.GREENVIEW_CONTENT_EVIDENCE || join(tmpdir(), 'greenview-public-content-20260928')
const paths = ['/about', '/surin-islands', '/surin-islands/travel-guide', '/faq', '/contact-us']
const englishTitles = ['About Greenview Tour', 'Discover the Surin Islands', 'Plan your Surin Islands trip', 'Frequently asked questions', 'Contact Greenview Tour']
const company = {name: 'Content fixture company', address: 'Fixture address', phone: '+66 123 4567', email: 'fixture@example.com', mapUrl: null}
let mode = 'ready', documentReads = 0
const errors = [], unexpected = [], expectedErrors = []
const browser = await chromium.launch({headless: true})
try {
  await mkdir(evidence, {recursive: true})
  const context = await browser.newContext({serviceWorkers: 'block', reducedMotion: 'reduce'})
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin !== new URL(origin).origin) return route.fulfill({status: 200, contentType: url.hostname.includes('googleapis') ? 'text/css' : 'text/html', body: ''})
    if (!url.pathname.startsWith('/api/')) return route.continue()
    if (request.method() !== 'GET') { unexpected.push(request.method() + ' ' + url.pathname); return route.fulfill({status: 405, json: {}}) }
    if (url.pathname === '/api/public/company') return route.fulfill({status: mode === 'error' ? 503 : 200, json: {company: mode === 'empty' ? null : mode === 'unsafe' ? {...company, mapUrl: 'javascript:alert(1)'} : company}})
    if (['/api/public/tours', '/api/public/popups', '/api/public/promotions'].includes(url.pathname)) return route.fulfill({json: {rows: [], page: 1, total: 0}})
    unexpected.push(url.pathname); return route.fulfill({status: 404, json: {}})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') { const text = message.text(); if (text.includes('503') && message.location().url.includes('/api/public/company')) expectedErrors.push(text); else errors.push(text) } })
  page.on('request', request => { if (request.resourceType() === 'document' && new URL(request.url()).origin === new URL(origin).origin) documentReads++ })
  async function language(value) {
    await page.locator('.language-selector > button').click()
    await page.locator('.language-options button').filter({hasText: value.toUpperCase()}).click()
    await page.waitForFunction(value => document.documentElement.lang === value, value)
  }
  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(origin + '/')
  await page.locator('h1').waitFor()
  await page.evaluate(() => { window.contentShell = [document.querySelector('.site-header'), document.querySelector('.public-footer')] })
  const before = documentReads
  await page.locator('.public-main-nav a[href="/information"]').click()
  await page.locator('.information-grid a[href="/about"]').first().click()
  await page.waitForURL(origin + '/about')
  assert.equal(documentReads, before)
  assert.equal(await page.evaluate(() => window.contentShell[0] === document.querySelector('.site-header') && window.contentShell[1] === document.querySelector('.public-footer')), true)
  for (const width of [1440, 834, 390, 320]) {
    await page.setViewportSize({width, height: 1000})
    for (const locale of ['th', 'en']) {
      await language(locale)
      for (const [index, path] of paths.entries()) {
        await page.goto(origin + path)
        await page.locator('.editorial-page h1').waitFor()
        await page.waitForFunction(() => document.querySelector('meta[name="description"]')?.content.length > 50)
        assert.equal(await page.locator('h1').count(), 1)
        assert.equal(await page.locator('meta[name="description"]').count(), 1)
        const heading = await page.locator('.editorial-page h1').innerText()
        assert.equal(await page.title(), heading + ' | Greenview Tour')
        if (locale === 'en') assert.equal(heading, englishTitles[index]); else assert.match(heading, /[\u0e00-\u0e7f]/)
        await page.waitForFunction(() => [...document.querySelectorAll('.editorial-hero img')].every(image => image.complete && image.naturalWidth > 0))
        assert.equal(await page.locator('vite-error-overlay').count(), 0)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, path + ' overflow at ' + width)
        if (width === 1440 && locale === 'th' && path === '/about' || width === 390 && locale === 'th' && path === '/surin-islands') await page.screenshot({path: join(evidence, path.slice(1) + '-' + width + '.png'), fullPage: true})
      }
    }
  }
  await page.setViewportSize({width: 1440, height: 1000})
  await page.goto(origin + '/faq/')
  await language('en')
  await page.locator('#request-confirmation summary').click()
  assert.equal(await page.locator('#request-confirmation').getAttribute('open'), '')
  await language('th')
  assert.equal(await page.locator('#request-confirmation').getAttribute('open'), '')
  assert.match(await page.locator('#request-confirmation').innerText(), /ยังไม่ใช่การยืนยันการจอง/)
  await page.locator('.editorial-sidebar a[href="#group-size"]').click()
  assert.equal(await page.locator('#group-size').getAttribute('open'), '')
  await page.waitForFunction(() => document.activeElement?.id === 'group-size')
  await page.screenshot({path: join(evidence, 'faq-open-desktop.png'), fullPage: true})
  await page.locator('#group-size summary').focus()
  await page.keyboard.press('Enter')
  assert.equal(await page.locator('#group-size').getAttribute('open'), null)
  await page.goBack()
  assert.equal(new URL(page.url()).hash, '')
  mode = 'error'
  await page.goto(origin + '/contact-us/')
  await page.locator('#company [role="alert"]').waitFor()
  assert.equal(await page.locator('#company a').count(), 0)
  mode = 'ready'
  await page.locator('#company button').filter({hasText: /ลองอีกครั้ง|Try again/}).click()
  await page.locator('#company h3').waitFor()
  assert.equal(await page.locator('#company h3').innerText(), company.name)
  for (const state of ['empty', 'unsafe']) {
    mode = state
    await page.reload()
    await page.waitForFunction(() => document.querySelector('#company [aria-busy]')?.getAttribute('aria-busy') === 'false')
    assert.equal(await page.locator('#company a[target="_blank"]').count(), 0)
    if (state === 'empty') assert.equal(await page.locator('#company a').count(), 0)
  }
  mode = 'ready'
  await page.setViewportSize({width: 390, height: 844})
  await page.goto(origin + '/contact-us')
  await page.locator('#company h3').waitFor()
  await page.screenshot({path: join(evidence, 'contact-mobile.png'), fullPage: true})
  await page.locator('.public-menu-toggle').click()
  await page.locator('.public-main-nav a[href="/information"]').click()
  await page.locator('.information-grid a[href="/about"]').first().click()
  await page.waitForURL(origin + '/about')
  assert.equal(await page.locator('.public-menu-toggle').getAttribute('aria-expanded'), 'false')
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, [])
  console.log(JSON.stringify({result: 'PASS', pages: paths, viewports: [1440,834,390,320], locales: ['th','en'], checks: ['one h1/title/description', 'images/overflow/overlay', 'persistent shell', 'FAQ keyboard/hash/locale preservation', 'company empty/error/retry/unsafe map', 'mobile menu'], expectedHttp503: expectedErrors.length, runtimeErrors: 0, businessWrites: 0, evidence}))
} finally { await browser.close() }
