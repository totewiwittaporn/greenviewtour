import { createHash, timingSafeEqual } from 'node:crypto'
import { listUsers } from '../modules/identity-access/list-users.js'
import { parseUsersQuery } from '../backoffice/settings/users/query.js'

const digest = value => createHash('sha256').update(value).digest()
export function createHandler({ pool, token, users = listUsers }) {
  if (!token || token.length < 32) throw new Error('LOCAL_API_TOKEN_REQUIRED')
  return async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(body))
    }
    if (!['127.0.0.1:5000', 'localhost:5000'].includes(req.headers.host)) return send(403, { code: 'LOCAL_HOST_REQUIRED' })
    if (req.method !== 'GET') return send(405, { code: 'READ_ONLY_PREVIEW' })
    const url = new URL(req.url, 'http://127.0.0.1:5000')
    if (url.pathname === '/health/live') return send(200, { status: 'UP', service: 'greenviewtour-local-api' })
    if (req.headers.origin && !['http://localhost:5174', 'http://127.0.0.1:5174'].includes(req.headers.origin)) return send(403, { code: 'ORIGIN_DENIED' })
    const supplied = req.headers['x-greenview-local-token']
    if (typeof supplied !== 'string' || !timingSafeEqual(digest(supplied), digest(token))) return send(401, { code: 'LOCAL_ACCESS_REQUIRED' })
    if (url.pathname !== '/api/users') return send(404, { code: 'NOT_FOUND' })
    let filters
    try { filters = parseUsersQuery(url.searchParams) } catch { return send(400, { code: 'INVALID_FILTER' }) }
    try { send(200, { ...await users(pool, filters), database: 'UP', environment: 'preview' }) }
    catch { send(503, { code: 'DATABASE_UNAVAILABLE' }) }
  }
}
