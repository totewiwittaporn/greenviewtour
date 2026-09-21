import test from 'node:test'
import assert from 'node:assert/strict'
import {t, activateLocale, storedLocale, formatDate, formatMoney, bookingStatus} from '../src/core/locale.js'

test('Member locale defaults to Thai when storage is missing, invalid or blocked', () => {
 const previous = globalThis.localStorage
 try {
  globalThis.localStorage = {getItem: () => 'unknown'}; assert.equal(storedLocale(), 'th')
  globalThis.localStorage = {getItem: () => {throw Error('blocked')}}; assert.equal(storedLocale(), 'th')
  globalThis.localStorage = {getItem: () => 'en'}; assert.equal(storedLocale(), 'en')
 } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous }
})
test('Member validation and errors can change language after they are stored in form state', () => {
 const source = 'กรอกอีเมลให้ถูกต้อง เช่น name@example.com'
 const english = t(source, 'en')
 assert.equal(english, 'Enter a valid email, such as name@example.com')
 assert.equal(t(english, 'th'), source)
 assert.equal(t('Your custom tour name', 'th'), 'Your custom tour name')
})
test('Member dates keep Gregorian service days and Bangkok time across locales', () => {
 activateLocale('en')
 assert.match(formatDate('2026-09-21'), /21 Sept 2026/)
 assert.match(formatDate('2026-09-20T18:00:00Z', true), /21 Sept 2026.*01:00/)
 activateLocale('th')
 assert.match(formatDate('2026-09-21'), /2026/)
 assert.equal(formatDate(null), '—')
 assert.equal(formatDate('not-a-date'), '—')
})
test('Member formats money and booking statuses without confusing missing prices with zero', () => {
 activateLocale('en')
 assert.equal(formatMoney(null), 'Contact us')
 assert.match(formatMoney(0), /0\.00/)
 assert.equal(bookingStatus('CONFIRMED'), 'Confirmed')
 activateLocale('th')
 assert.equal(bookingStatus('CONFIRMED'), 'ยืนยันแล้ว')
})
