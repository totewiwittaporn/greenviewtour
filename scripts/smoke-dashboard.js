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
 let user = { id: 'fixture', displayName: 'Dashboard fixture', status: 'ACTIVE', roles: [{ code: 'MANAGER', name: 'Manager', scope: 'COMPANY' }], permissions: [], management: { company: true }, operations: { booking: true, islandBooking: true, guide: true }, companyAccess: {} }
 let signedIn = true, response = 'ready', calls = 0, loadingGate = null
 const calendar = customerCalendar([{ id: 'booking', status: 'CONFIRMED', outboundDate: '2026-09-21', adults: 82, children: 10, programSnapshot: { tourId: 'surin', name: 'Surin day trip' } }], '2026-09-21')
 const manager = structuredClone(user)
 const widget = { id: 'maintenance', title: 'Maintenance jobs', href: '/company/maintenance', scope: 'Company', pending: 31, today: 2, overdue: 3, review: 4, detail: 'Unfinished records, including completed work awaiting acceptance.' }
 let workspace = 'Company', visibleCalendar = calendar, widgets = [widget, {id:'guides',title:'Guide assignments',href:'/operations/guide',scope:'Guide department',pending:5,today:0,overdue:null,review:null,detail:'Guide work awaiting assignment.'}]
 await page.route('**/api/auth/recovery-status', route => route.fulfill({ status: 403, json: { code: 'RECOVERY_REQUIRED' } }))
 await page.route('**/api/me', route => route.fulfill({ status: signedIn ? 200 : 401, json: signedIn ? { user } : { code: 'LOGIN_REQUIRED' } }))
 await page.route('**/api/dashboard', async route => {
  calls++
  // Keep the request pending until the test observes the loading UI; machine speed is irrelevant.
  if (response === 'loading') await loadingGate
  return route.fulfill({ status: response === 'error' ? 500 : 200, json: response === 'error' ? { code: 'SERVICE_UNAVAILABLE' } : { today: '2026-09-21', timezone: 'Asia/Bangkok', generatedAt: '2026-09-21T03:00:00Z', scope: workspace, calendar: response === 'empty' ? null : visibleCalendar, widgets: response === 'empty' ? [] : widgets } })
 })
 await page.goto(origin + '/')
 await page.waitForURL('**/dashboard')
 await page.getByRole('heading', { name: 'Customers · next 14 days' }).waitFor()
 assert.equal(await page.title(), 'Dashboard · Greenview Tour')
 assert.equal(await page.locator('.dashboard-day').count(), 14)
 const table = page.locator('.dashboard-attention-table')
 await table.getByRole('link', {name:'Maintenance jobs',exact:true}).waitFor()
 assert.equal(await page.locator('.dashboard-day[aria-current="date"]').count(),1)
 for (const name of ['Work area','Scope','Today','Pending','Overdue','Awaiting acceptance','Actions']) await table.getByRole('columnheader',{name,exact:true}).waitFor()
 const maintenanceRow = table.getByRole('row').filter({has:page.getByRole('link',{name:'Maintenance jobs',exact:true})})
 const guideRow = table.getByRole('row').filter({has:page.getByRole('link',{name:'Guide assignments',exact:true})})
 for (const value of ['31','2','3','4']) assert.equal(await maintenanceRow.getByRole('cell',{name:value,exact:true}).count(),1)
 assert.equal(await guideRow.locator('td').nth(4).innerText(),'—')
 assert.equal(await guideRow.locator('td').nth(5).innerText(),'—')
 assert.equal(await maintenanceRow.locator('a[href="/company/maintenance"]').count()>0,true)
 assert.equal(await guideRow.locator('a[href="/operations/guide"]').count()>0,true)
 const choose = async (label, name) => {
  const trigger = page.getByRole('combobox',{name:label,exact:true})
  await trigger.scrollIntoViewIfNeeded(); await trigger.focus(); await page.keyboard.press('Space')
  await page.getByRole('listbox').waitFor()
  await page.getByRole('option',{name,exact:true}).click()
 }

 assert.equal(await page.getByRole('link', { name: 'Dashboard', exact: true }).getAttribute('aria-current'), 'page')
 for (const width of [1440, 834, 390]) {
  await page.setViewportSize({ width, height: 900 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: new URL(`dashboard-${width}.png`, output).pathname, fullPage: true })
  if (width===390) {
   const region=table.getByRole('region',{name:'Work needing attention',exact:true})
   await region.focus(); await page.keyboard.press('ArrowRight')
   await page.waitForFunction(()=>document.querySelector('.dashboard-attention-table .table-scroll').scrollLeft>0)
  }
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
 await page.setViewportSize({width:1440,height:1000})
 await choose('Work scope','Guide department')
 assert.equal(await table.getByRole('link',{name:'Maintenance jobs',exact:true}).count(),0)
 await guideRow.waitFor()
 await choose('Show work','Overdue')
 await page.getByRole('button',{name:'Reset filters',exact:true}).waitFor()
 assert.equal(await table.getByRole('link',{name:'Guide assignments',exact:true}).count(),0)
 await page.getByRole('button',{name:'Reset filters',exact:true}).click()
 await maintenanceRow.waitFor(); await guideRow.waitFor()
 await choose('Show work','Today')
 await maintenanceRow.waitFor()
 assert.equal(await table.getByRole('link',{name:'Guide assignments',exact:true}).count(),0)
 await choose('Show work','Awaiting acceptance')
 await maintenanceRow.waitFor()
 await choose('Show work','All work')
 await guideRow.waitFor()
 // Locale changes preserve rows and the same publication scope.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})))
 await page.waitForFunction(()=>document.documentElement.lang==='th')
 assert.equal(await table.locator('tbody tr').count(),2)
 assert.equal(await page.locator('.dashboard-day').count(),14)
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})))
 await page.waitForFunction(()=>document.documentElement.lang==='en')
 await page.locator('.dashboard-day').nth(1).click()
 await page.getByText('No confirmed customers arriving on this date.').waitFor()
 await page.getByRole('button', { name: 'Close', exact: true }).click()
 // Role labels never expand the records returned by the scoped API fixture.
 for (const scope of ['Guide department','My work']) {
  workspace = scope; visibleCalendar = null
  user = {...manager,roles:[{code:scope==='My work'?'GUIDE':'HEAD_GUIDE',name:scope,scope:scope==='My work'?'SELF':'DEPARTMENT'}],management:{company:false},operations:{guide:true},companyAccess:{}}
  widgets = [{...widget,id:'scoped-guide',title:'Guide assignments',scope,href:'/operations/guide',pending:2,today:1,overdue:0,review:null}]
  await page.reload()
  await table.getByRole('link',{name:'Guide assignments',exact:true}).waitFor()
  assert.equal(await page.locator('.dashboard-day').count(),0)
  assert.equal(await table.locator('tbody tr').count(),1)
  assert.equal(await table.getByRole('link',{name:'Maintenance jobs',exact:true}).count(),0)
  assert.equal(await table.getByRole('cell',{name:scope,exact:true}).count(),1)
  await page.screenshot({path:new URL(`dashboard-${scope==='My work'?'staff':'head'}-1440.png`,output).pathname,fullPage:true})
 }
 user = manager; workspace = 'Company'; visibleCalendar = calendar; widgets = [widget]
 response = 'error'; await page.reload(); await page.getByRole('button', { name: 'Retry', exact: true }).waitFor()
 assert.equal(await page.locator('.dashboard-day').count(), 0)
 response = 'ready'; await page.getByRole('button', { name: 'Retry', exact: true }).click(); await page.locator('.dashboard-day').first().waitFor()
 response = 'empty'; await page.reload(); await page.getByRole('heading', { name: 'No work areas available yet' }).waitFor()
 let releaseLoading
 loadingGate = new Promise(resolve => { releaseLoading = resolve })
 response = 'loading'
 try {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('status').filter({ hasText: 'Loading your work…' }).waitFor()
  assert.equal(await page.locator('.dashboard-day').count(), 0)
 } finally { releaseLoading() }
 await page.locator('.dashboard-day').first().waitFor()
 response = 'ready'; await page.goto(origin + '/login'); await page.waitForURL('**/dashboard'); await page.locator('.dashboard-day').first().waitFor()
 signedIn = false; await page.goto(origin + '/dashboard'); await page.waitForURL('**/login'); await page.getByRole('heading', { name: 'Welcome back' }).waitFor()
 await page.route('**/api/auth/login', route => { signedIn = true; return route.fulfill({ json: { user } }) })
 await page.getByLabel('Email address', { exact: true }).fill('dashboard@example.invalid')
 await page.getByLabel('Password', { exact: true }).fill('fixture-password-only')
 await page.getByRole('button', { name: 'Sign in', exact: true }).click()
 await page.waitForURL('**/dashboard'); await page.locator('.dashboard-day').first().waitFor()
 await page.goto(origin + '/reset-password'); await page.getByText('Open the password reset link from your email to continue.').waitFor()
 assert.deepEqual(errors, [])
 console.log(JSON.stringify({ result: 'PASS', dashboardRequests: calls, viewports: [1440, 834, 390], checks: ['root redirect', 'login redirect', 'authenticated login redirect', 'anonymous redirect', 'recovery preserved', '14 dates and current date', 'scope and status filters', 'head and staff scoped rows', 'null metric semantics', 'locale', 'deep links', 'modal keyboard/focus/scroll', 'empty/error/retry/loading', 'no horizontal overflow'], liveAccounts: false }))
} finally { await browser.close() }
