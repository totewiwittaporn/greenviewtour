import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandler } from '../src/app/http.js'
import { parseUsersQuery } from '../src/backoffice/settings/users/query.js'
import { listUsers } from '../src/modules/identity-access/list-users.js'
const token = 'a'.repeat(64)
async function request({ headers = {}, method = 'GET', url = '/api/users', users = async () => ({ users: [], total: 0 }) } = {}) {
  let status, data
  await createHandler({ pool: {}, token, users })({ method, url, headers: { host: '127.0.0.1:5000', ...headers } }, {
    writeHead(code) { status = code }, end(body) { data = JSON.parse(body) },
  })
  return { status, data }
}
test('local API rejects absent credentials, foreign hosts/origins and mutations', async () => {
  assert.equal((await request()).status, 401)
  assert.equal((await request({ headers: { 'x-greenview-local-token': 'wrong' } })).status, 401)
  assert.equal((await request({ headers: { host: 'attacker.invalid', 'x-greenview-local-token': token } })).status, 403)
  assert.equal((await request({ headers: { origin: 'https://attacker.invalid', 'x-greenview-local-token': token } })).status, 403)
  assert.equal((await request({ method: 'POST', headers: { 'x-greenview-local-token': token } })).status, 405)
})
test('authorized directory reads, filter validation and redacted DB errors', async () => {
  const headers = { 'x-greenview-local-token': token }
  assert.equal((await request({ headers })).data.database, 'UP')
  assert.equal((await request({ headers, url: '/api/users?pageSize=100000' })).status, 400)
  const result = await request({ headers, users: async () => { throw new Error('secret database detail') } })
  assert.deepEqual(result, { status: 503, data: { code: 'DATABASE_UNAVAILABLE' } })
  assert.throws(() => parseUsersQuery(new URLSearchParams('page=-1')))
})
test('directory uses a read-only transaction, parameterized search and releases the connection', async () => {
  const calls = []; let released = false
  const client = { async query(sql, params) {
    calls.push({ sql, params })
    if (sql.includes('AS verified')) return { rows: [{ total: 1, verified: 1, signed_in: 0 }] }
    if (sql.includes('count(*)::int AS total FROM')) return { rows: [{ total: 1 }] }
    if (sql.startsWith('SELECT id')) return { rows: [{ id: 'example', email: 'qa@example.invalid' }] }
    return { rows: [] }
  }, release() { released = true } }
  const result = await listUsers({ connect: async () => client }, { search: "' OR TRUE --", page: 99, pageSize: 25 })
  assert.equal(result.page, 1)
  assert.equal(calls[0].sql, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  assert.equal(calls[2].params[0], "' OR TRUE --")
  assert.equal(calls[3].params[2], 0)
  assert.equal(calls.at(-1).sql, 'COMMIT')
  assert.equal(released, true)
})
