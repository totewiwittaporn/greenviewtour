import { randomBytes } from 'node:crypto'
import { AccessError } from '../../modules/identity-access/membership.js'
export const COOKIE = 'gv_session'
const ttl = 8 * 60 * 60 * 1000
export class SessionStore {
  entries = new Map()
  create(session, purpose = 'workspace') {
    for (const [key, entry] of this.entries) if (entry.deadline <= Date.now()) this.entries.delete(key)
    if (this.entries.size >= 500) throw new AccessError('TRY_AGAIN_LATER', 503)
    const id = randomBytes(32).toString('hex')
    this.entries.set(id, { session, purpose, deadline: Date.now() + ttl })
    return id
  }
  id(req) { return req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) }
  get(req) {
    const id = this.id(req), entry = this.entries.get(id)
    if (!entry || entry.deadline <= Date.now()) { this.entries.delete(id); throw new AccessError('SESSION_REQUIRED', 401) }
    return { id, entry }
  }
  deleteUser(userId) { for (const [id, entry] of this.entries) if (entry.session.user.id === userId) this.entries.delete(id) }
  cookie(id) { return `${COOKIE}=${id}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${id ? ttl / 1000 : 0}` }
  async authenticated(req, provider, pool) {
    const { entry, id } = this.get(req)
    try {
      if (entry.session.expires_at * 1000 < Date.now() + 60000) {
        if (!entry.refreshing) entry.refreshing = provider.refresh(entry.session.refresh_token).then(session => { entry.session = session }).finally(() => { entry.refreshing = null })
        await entry.refreshing
      }
      const user = await provider.user(entry.session.access_token)
      // getUser verifies the JWT; session existence additionally enforces sign-out/revocation.
      const claims = JSON.parse(Buffer.from(entry.session.access_token.split('.')[1], 'base64url').toString())
      const active = await pool.query('SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id WHERE s.id=$1::uuid AND s.user_id=$2::uuid AND (s.not_after IS NULL OR s.not_after>now()) AND (u.banned_until IS NULL OR u.banned_until<now())', [claims.session_id, user.id])
      if (!active.rowCount) throw new Error('REVOKED')
      return { user, entry, id }
    } catch (error) {
      // Temporary provider/DB outages do not erase a valid local session.
      if (!(error instanceof AccessError && error.code === 'SESSION_EXPIRED' && error.status === 401) && error.message !== 'REVOKED') throw error
      this.entries.delete(id)
      throw new AccessError('SESSION_EXPIRED', 401)
    }
  }
}
