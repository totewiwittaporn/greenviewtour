import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
const output = new URL('../screenshots.local/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await page.locator('h1').waitFor()
  await page.screenshot({ path: new URL('public-desktop.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  assert.equal(await page.locator('.hero-image').evaluate(img => img.complete && img.naturalWidth > 0), true)
  assert.equal(await page.locator('.site-header .logo').evaluate(img => img.complete && img.naturalWidth > 0), true)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: new URL('public-mobile.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  // Authenticated directory states use browser-only fixtures; real sign-in is verified separately.
  await page.route('**/api/me', route => route.fulfill({ json: { user: { id: 'fixture', displayName: 'Fixture user', permissions: ['users.read:COMPANY'], roles: [] } } }))
  await page.route('**/api/users**', route => route.fulfill({ json: { users: [], total: 0, page: 1, pageSize: 25, summary: { total: 0, verified: 0, signed_in: 0 }, checkedAt: new Date().toISOString(), database: 'UP' } }))
  await page.goto('http://localhost:5174/settings/users')
  await page.getByText('Database connected', { exact: true }).waitFor({ timeout: 20000 })
  const live = await page.evaluate(async () => {
    const response = await fetch('/api/users')
    const data = await response.json()
    return { status: response.status, database: data.database, count: data.total }
  })
  assert.equal(live.database, 'UP')
  await page.screenshot({ path: new URL('users-desktop.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByText('Database connected', { exact: true }).waitFor()
  let mode = 'rows'
  const fixture = { users: [{ id: '00000000-0000-0000-0000-000000000001', email: 'qa@example.invalid', email_confirmed_at: '2026-09-01T00:00:00Z', created_at: '2026-09-01T00:00:00Z', last_sign_in_at: null }], total: 1, page: 1, pageSize: 25, summary: { total: 1, verified: 1, signed_in: 0 }, checkedAt: new Date().toISOString(), database: 'UP' }
  await page.route('**/api/users?*', async route => {
    if (mode === 'error') return route.fulfill({ status: 503, json: { code: 'DATABASE_UNAVAILABLE' } })
    const search = new URL(route.request().url()).searchParams.get('search')
    return route.fulfill({ json: search ? { ...fixture, users: [], total: 0 } : fixture })
  })
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByText('qa@example.invalid', { exact: true }).waitFor()
  await page.getByRole('searchbox').fill('no-match')
  await page.getByText('No matching users', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Clear search', exact: true }).first().click()
  await page.getByText('qa@example.invalid', { exact: true }).waitFor()
  assert.equal(await page.getByRole('searchbox').inputValue(), '')
  mode = 'error'
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByRole('alert').waitFor()
  mode = 'rows'
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await page.getByText('qa@example.invalid', { exact: true }).waitFor()
  await page.unroute('**/api/users?*')
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByText('Database connected', { exact: true }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  assert.equal(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded'), 'true')
  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  await page.screenshot({ path: new URL('users-mobile.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: 'PASS', live, checks: ['public images', 'responsive overflow', 'fixture directory', 'refresh', 'fixture rows', 'search/clear', 'failure/retry', 'mobile navigation'], runtimeErrors: errors.length }))
} finally { await browser.close() }
