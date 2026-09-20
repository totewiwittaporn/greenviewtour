import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { pushText, verifyWebhook } from '../src/platform/line/messaging.js'
const retryKey = '11111111-1111-4111-8111-111111111111'
const payload = { to: 'C' + 'a'.repeat(32), messages: [{ type: 'text', text: 'DEMO ทดสอบ' }] }
test('default simulation needs no token and never invokes transport', async () => {
 let calls = 0
 const result = await pushText({ payload, retryKey, transport: () => { calls++; throw new Error('Unexpected network') } })
 assert.equal(calls, 0); assert.equal(result.status, 'SIMULATED'); assert.equal(result.accepted, false)
})
test('invalid targets, message limits and retry keys fail before transport', async () => {
 let calls = 0
 for (const input of [{ payload: { ...payload, to: 'phone-number' } }, { payload: { ...payload, messages: [] } }, { payload: { ...payload, messages: Array(6).fill(payload.messages[0]) } }, { payload: { ...payload, messages: [{ type: 'text', text: 'x'.repeat(5001) }] } }, { retryKey: 'bad' }]) {
  await assert.rejects(() => pushText({ payload, retryKey, ...input, transport: () => { calls++ } }))
 }
 assert.equal(calls, 0)
})
test('live transport fixes destination, prevents redirects and preserves retry key', async () => {
 const result = await pushText({ payload, retryKey, token: 'TEST', mode: 'live', transport: async (url, options) => {
  assert.equal(url, 'https://api.line.me/v2/bot/message/push'); assert.equal(options.redirect, 'error')
  assert.equal(options.headers['X-Line-Retry-Key'], retryKey); assert.deepEqual(JSON.parse(options.body), payload)
  return { ok: true, status: 200, headers: new Headers() }
 } })
 assert.equal(result.status, 'ACCEPTED')
})
test('provider failures expose no secrets and classify retryability', async () => {
 for (const code of [400, 401, 403, 429, 500, 503]) {
  const result = await pushText({ payload, retryKey, token: 'SECRET', mode: 'live', transport: async () => ({ ok: false, status: code, headers: new Headers() }) })
  assert.equal(result.accepted, false); assert.equal(result.retryable, code >= 500)
  assert.ok(!JSON.stringify(result).includes('SECRET'))
 }
 const result = await pushText({ payload, retryKey, token: 'SECRET', mode: 'live', transport: async () => { throw new Error('SECRET') } })
 assert.deepEqual(result, { status: 'FAILED', accepted: false, retryable: true })
})
test('webhook authentication verifies exact raw bytes and rejects malformed signatures', () => {
 const raw = Buffer.from('{"events":[],"destination":"DEMO"}'), secret = 'TEST'
 const signature = createHmac('sha256', secret).update(raw).digest('base64')
 assert.equal(verifyWebhook(raw, signature, secret), true)
 for (const sig of ['', 'bad', signature.slice(1), signature.replace(/.$/, '!')]) assert.equal(verifyWebhook(raw, sig, secret), false)
 assert.equal(verifyWebhook(Buffer.from(raw.toString() + ' '), signature, secret), false)
 assert.equal(verifyWebhook(raw, signature, 'wrong'), false)
 assert.equal(verifyWebhook(raw, signature, ''), false)
})
