import test from 'node:test'
import assert from 'node:assert/strict'
import { listUsers } from '../src/modules/identity-access/list-users.js'
test('directory uses a read-only transaction, parameterized search and releases the connection', async () => {
  const calls = []; let released = false
  const client = { async query(sql, params) {
    calls.push({ sql, params })
    if (sql.includes('AS verified')) return { rows: [{ total: 1, verified: 1, signed_in: 0 }] }
    if (sql.includes('count(*)::int AS total FROM')) return { rows: [{ total: 1 }] }
    if (sql.startsWith('SELECT u.id')) return { rows: [{ id: 'example', email: 'qa@example.invalid' }] }
    return { rows: [] }
  }, release() { released = true } }
  const result = await listUsers({ connect: async () => client }, { search: "' OR TRUE --", page: 99, pageSize: 25 })
  assert.equal(result.page, 1)
  assert.equal(calls[0].sql, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  assert.equal(calls[2].params[1], "' OR TRUE --")
  assert.equal(calls[3].params[3], 0)
  assert.equal(calls.at(-1).sql, 'COMMIT')
  assert.equal(released, true)
})
