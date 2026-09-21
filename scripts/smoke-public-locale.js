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
  await page.getByRole('button', { name: 'English', exact: true }).click()
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
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await page.goto(`${origin}/promotions`)
  await page.waitForFunction(() => document.title === 'Tour promotions | Greenview Tour')
  await page.goto(origin)
  await page.waitForFunction(() => document.title === 'Greenview Tour \u2014 Surin Islands trips')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  assert.deepEqual(unexpectedApi, [])
  assert.deepEqual(errors, [])
  console.log('Public locale fixtures passed: titles, language, persistence, custom event, dates/currency, mobile layout and original CMS content.')
} finally {
  await browser.close()
}
