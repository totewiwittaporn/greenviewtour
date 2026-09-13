import test from 'node:test'
import assert from 'node:assert/strict'
import { createAuthProvider } from '../src/platform/auth/provider.js'
const env = { SUPABASE_URL: 'https://qplzgpyidszxbtbyknjc.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }
test('transient identity failure retries once without caching a completed check', async () => {
  let calls = 0
  const provider = createAuthProvider(env, () => ({ auth: { getUser: async () => ++calls === 1 ? { error: { status: 503 } } : { data: { user: { id: 'verified' } } } } }))
  assert.deepEqual(await Promise.all([provider.user('token'), provider.user('token')]), [{ id: 'verified' }, { id: 'verified' }])
  assert.equal(calls, 2)
  await provider.user('token'); assert.equal(calls, 3)
})
test('invalid sessions and rate limits never retry; persistent outage fails closed', async () => {
  for (const [status, code, expected] of [[401, 'SESSION_EXPIRED', 1], [429, 'AUTH_RATE_LIMITED', 1], [503, 'AUTH_UNAVAILABLE', 2]]) {
    let calls = 0
    const provider = createAuthProvider(env, () => ({ auth: { getUser: async () => { calls++; return { error: { status } } } } }))
    await assert.rejects(provider.user('token'), { code })
    assert.equal(calls, expected)
  }
})
