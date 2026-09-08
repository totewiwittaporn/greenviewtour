import test from 'node:test'
import assert from 'node:assert/strict'
import { databaseConfig, PREVIEW_PROJECT_REF } from '../src/platform/database/config.js'
import { checkDatabase } from '../src/platform/database/pool.js'

const base = {
  APP_ENV: 'preview', SUPABASE_PROJECT_REF: PREVIEW_PROJECT_REF,
  PGHOST: `db.${PREVIEW_PROJECT_REF}.supabase.co`, PGPORT: '5432',
  PGDATABASE: 'postgres', PGUSER: 'postgres', PGPASSWORD: 'test-only-not-a-real-password',
}
test('direct and session pooler configurations keep verified TLS and bounded pools', () => {
  for (const env of [base, { ...base, PGHOST: 'aws-0-ap-southeast-1.pooler.supabase.com', PGUSER: `postgres.${PREVIEW_PROJECT_REF}` }]) {
    const config = databaseConfig(env)
    assert.equal(config.ssl.rejectUnauthorized, true)
    assert.equal(config.max, 3)
    assert.equal(config.connectionTimeoutMillis, 5000)
  }
})
test('rejects wrong environment, cross-project connection and unsafe TLS before connecting', () => {
  for (const change of [
    { APP_ENV: 'production' }, { SUPABASE_PROJECT_REF: 'another-project' },
    { PGHOST: 'db.another-project.supabase.co' },
    { PGHOST: 'aws-0-ap-southeast-1.pooler.supabase.com', PGUSER: 'postgres.other' },
    { PGHOST: 'aws-0-ap-southeast-1.pooler.supabase.com.attacker.invalid' },
    { PGPORT: '6543' }, { PGDATABASE: 'other' },
    { PGPASSWORD: '' }, { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
  ]) assert.throws(() => databaseConfig({ ...base, ...change }))
})
test('readiness requires a successful DB query and propagates failure', async () => {
  assert.deepEqual(await checkDatabase({ query: async () => ({ rows: [{ connected: 1 }] }) }), { status: 'UP' })
  await assert.rejects(checkDatabase({ query: async () => { throw new Error('offline') } }))
  await assert.rejects(checkDatabase({ query: async () => ({ rows: [] }) }))
})
