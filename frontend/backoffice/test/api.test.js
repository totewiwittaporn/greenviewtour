import test from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../src/core/auth/api.js'
test('proxy HTML failure retains HTTP status and is not replayed', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('<html>Unavailable</html>', { status: 503 }) })
  await assert.rejects(api('/api/operations/stock-command', { id: 'command' }), { message: 'SERVICE_UNAVAILABLE', status: 503 })
  assert.equal(calls, 1)
})
test('caller cancellation is preserved alongside request timeout', async t => {
  const controller = new AbortController()
  let signal
  t.mock.method(globalThis, 'fetch', async (_path, options) => { signal = options.signal; return Response.json({ rows: [] }) })
  await api('/api/operations/jobs', undefined, { signal: controller.signal })
  assert.notEqual(signal, controller.signal)
  assert.equal(signal.aborted, false)
  controller.abort()
  assert.equal(signal.aborted, true)
})
test('malformed successful response is not accepted as data', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('not json'))
  await assert.rejects(api('/api/operations/jobs'), { message: 'SERVICE_UNAVAILABLE' })
})
test('temporary read failure retries once; persistent outage remains visible', async t => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => ++calls === 1 ? Response.json({ code: 'SERVICE_UNAVAILABLE' }, { status: 503 }) : Response.json({ rows: ['restored'] }))
  assert.deepEqual(await api('/api/operations/jobs'), { rows: ['restored'] })
  assert.equal(calls, 2)
  calls = 0
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ code: 'SERVICE_UNAVAILABLE' }, { status: 503 }) })
  await assert.rejects(api('/api/operations/jobs'), { message: 'SERVICE_UNAVAILABLE', status: 503 })
  assert.equal(calls, 2)
})
