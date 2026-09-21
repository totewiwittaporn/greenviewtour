// Intercepted browser fixtures only: no real accounts, database writes or provider messages.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { customerCalendar } from '../backend/src/backoffice/dashboard/overview/service.js'
const origin = process.env.GREENVIEW_TEST_ORIGIN || 'http://localhost:5274'
const output = new URL('../screenshots.local/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
 const errors = []; page.on('pageerror', error => errors.push(error.message))
 const user = { id: 'fixture', displayName: 'Dashboard fixture', status: 'ACTIVE', roles: [{ code: 'MANAGER', name: 'Manager', scope: 'COMPANY' }], permissions: [], management: { company: true }, operations: { booking: true, islandBooking: true, guide: true }, companyAccess: {} }
 let signedIn = true, response = 'ready', calls = 0
 const calendar = customerCalendar([{ id: 'booking', status: 'CONFIRMED', outboundDate: '2026-09-21', adults: 82, children: 10, programSnapshot: { tourId: 'surin', name: 'Surin day trip' } }], '2026-09-21')
 const widget = { id: 'maintenance', title: 'Maintenance jobs', href: '/company/maintenance', scope: 'Company', pending: 31, today: 2, overdue: 3, review: 4, detail: 'Unfinished records, including completed work awaiting acceptance.' }
 await page.route('**/api/auth/recovery-status', route => route.fulfill({ status: 403, json: { code: 'RECOVERY_REQUIRED' } }))
 await page.route('**/api/me', route => route.fulfill({ status: signedIn ? 200 : 401, json: signedIn ? { user } : { code: 'LOGIN_REQUIRED' } }))
 await page.route('**/api/dashboard', async route => {
  calls++
  if (response === 'loading') await new Promise(resolve => setTimeout(resolve, 500))
  return route.fulfill({ status: response === 'error' ? 500 : 200, json: response === 'error' ? { code: 'SERVICE_UNAVAILABLE' } : { today: '2026-09-21', timezone: 'Asia/Bangkok', generatedAt: '2026-09-21T03:00:00Z', scope: 'Company', calendar: response === 'empty' ? null : calendar, widgets: response === 'empty' ? [] : [widget] } })
 })
 await page.goto(origin + '/')
 await page.waitForURL('**/dashboard')
 await page.getByRole('heading', { name: 'Customers · next 14 days' }).waitFor()
 assert.equal(await page.title(), 'Dashboard · Greenview Tour')
 assert.equal(await page.locator('.dashboard-day').count(), 14)
 await page.getByText('Pending · 2 today · 3 overdue · 4 awaiting acceptance', { exact: true }).waitFor()
 assert.equal(await page.getByRole('link', { name: 'Dashboard', exact: true }).getAttribute('aria-current'), 'page')
 for (const width of [1440, 834, 390]) {
  await page.setViewportSize({ width, height: 900 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: new URL(`dashboard-${width}.png`, output).pathname, fullPage: true })
  const day = page.locator('.dashboard-day').first()
  await day.focus(); await page.keyboard.press('Enter')
  await page.getByRole('dialog').waitFor()
  await page.getByRole('cell', { name: 'Surin day trip', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-core-modal-open')), true)
  await page.screenshot({ path: new URL(`dashboard-dialog-${width}.png`, output).pathname })
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(), 0)
  assert.equal(await day.evaluate(el => el === document.activeElement), true)
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-core-modal-open')), false)
 }
 await page.locator('.dashboard-day').nth(1).click()
 await page.getByText('No confirmed customers arriving on this date.').waitFor()
 await page.getByRole('button', { name: 'Close', exact: true }).click()
 response = 'error'; await page.reload(); await page.getByRole('button', { name: 'Retry', exact: true }).waitFor()
 assert.equal(await page.locator('.dashboard-day').count(), 0)
 response = 'ready'; await page.getByRole('button', { name: 'Retry', exact: true }).click(); await page.locator('.dashboard-day').first().waitFor()
 response = 'empty'; await page.reload(); await page.getByRole('heading', { name: 'No work areas available yet' }).waitFor()
 response = 'loading'; await page.reload(); await page.getByText('Loading your work…').waitFor(); await page.locator('.dashboard-day').first().waitFor()
 response = 'ready'; await page.goto(origin + '/login'); await page.waitForURL('**/dashboard'); await page.locator('.dashboard-day').first().waitFor()
 signedIn = false; await page.goto(origin + '/dashboard'); await page.waitForURL('**/login'); await page.getByRole('heading', { name: 'Welcome back' }).waitFor()
 await page.route('**/api/auth/login', route => { signedIn = true; return route.fulfill({ json: { user } }) })
 await page.getByLabel('Email address', { exact: true }).fill('dashboard@example.invalid')
 await page.getByLabel('Password', { exact: true }).fill('fixture-password-only')
 await page.getByRole('button', { name: 'Sign in', exact: true }).click()
 await page.waitForURL('**/dashboard'); await page.locator('.dashboard-day').first().waitFor()
 await page.goto(origin + '/reset-password'); await page.getByText('Open the password reset link from your email to continue.').waitFor()
 assert.deepEqual(errors, [])
 console.log(JSON.stringify({ result: 'PASS', dashboardRequests: calls, viewports: [1440, 834, 390], checks: ['root redirect', 'login redirect', 'authenticated login redirect', 'anonymous redirect', 'recovery preserved', '14 dates', 'modal keyboard/focus/scroll', 'empty/error/retry/loading', 'no horizontal overflow'], liveAccounts: false }))
} finally { await browser.close() }
