// Isolated browser fixtures; never contacts the database or LINE.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../frontend/backoffice/', import.meta.url))
const vite = await createServer({ root, server: { port: 5278, strictPort: true }, configFile: `${root}vite.config.js` })
await vite.listen()
const browser = await chromium.launch({ headless: true, ...(process.env.GV_BROWSER_PATH ? { executablePath: process.env.GV_BROWSER_PATH } : process.platform === 'win32' ? { channel: 'msedge' } : {}) })
try {
 const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [], snapshots = [], writes = []
 page.on('pageerror', error => errors.push(error.message))
 const readiness = { status: 'NOT_CONFIGURED', missing: ['LINE_GROUP_ID'], schedulerEnabled: false, deliveryEnabled: false }
 await page.route('**/api/**', async route => {
  const request = route.request(), url = new URL(request.url())
  if (url.pathname === '/api/me') return route.fulfill({ json: { user: { displayName: 'Summary fixture', management: { company: true }, roles: [] } } })
  if (request.method() === 'POST') {
   const input = request.postDataJSON(); writes.push(input)
   const snapshot = { id: '00000000-0000-4000-8000-000000000001', serviceDate: input.serviceDate, kind: input.kind, revision: 1, createdAt: '2026-09-09T15:00:00Z', runs: [{ id: '00000000-0000-4000-8000-000000000002', name: 'Fixture boat', kind: 'BOAT', direction: 'OUTBOUND', adults: 2, children: 1, passengers: 3 }] }
   snapshots.push(snapshot)
   return route.fulfill({ json: { snapshot, readiness, outbox: null, bookingsLocked: false } })
  }
  return route.fulfill({ json: { serviceDate: url.searchParams.get('date'), readiness, snapshots, outbox: [], page: 1, pageSize: 25, total: snapshots.length } })
 })
 await page.goto('http://localhost:5278/operations/daily-close')
 await page.getByRole('button', { name: 'Capture closing snapshot', exact: true }).waitFor()
 await page.getByLabel('Service date (Thailand)', { exact: true }).fill('2026-02-30')
 await page.getByRole('button', { name: 'Load date', exact: true }).click()
 await page.getByText('Enter a valid date: YYYY-MM-DD.', { exact: true }).waitFor()
 await page.getByLabel('Service date (Thailand)', { exact: true }).fill('2026-09-10')
 await page.getByRole('button', { name: 'Load date', exact: true }).click()
 await page.getByRole('button', { name: 'Capture closing snapshot', exact: true }).click()
 await page.getByText('Closing snapshot saved as revision 1. No LINE message was sent.', { exact: true }).waitFor()
 assert.deepEqual(writes, [{ serviceDate: '2026-09-10', kind: 'CLOSE' }])
 await page.getByRole('button', { name: 'Actions for CLOSE revision 1', exact: true }).click()
 await page.getByRole('menuitem', { name: 'View', exact: true }).click()
 await page.getByText('Fixture boat', { exact: true }).waitFor()
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
 assert.deepEqual(errors, [])
 console.log('PASS daily summary date validation, snapshot preview, honest unsent status and mobile layout')
} finally { await browser.close(); await vite.close() }
