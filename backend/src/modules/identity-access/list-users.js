import { addressKeys } from '../../../../packages/contracts/address.js'
// Callers must supply an authorized management scope; all counts use that same scope.
export async function listUsers(pool, { search = '', page = 1, pageSize = 25, department = null } = {}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const source = 'auth.users u JOIN app_private."UserProfile" p ON p.id=u.id'
    const scope = '($1::text IS NULL OR p.department=$1)'
    const summary = (await client.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE email_confirmed_at IS NOT NULL)::int AS verified,
      count(*) FILTER (WHERE last_sign_in_at IS NOT NULL)::int AS signed_in FROM ${source} WHERE ${scope}`, [department])).rows[0]
    const filter = `${scope} AND ($2 = '' OR position(lower($2) in lower(coalesce(email, '') || ' ' || p."displayName")) > 0)`
    const total = (await client.query(`SELECT count(*)::int AS total FROM ${source} WHERE ${filter}`, [department,search])).rows[0].total
    const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
    const { rows } = await client.query(`SELECT u.id, email, email_confirmed_at, created_at, last_sign_in_at, p."displayName", p.department, p.status, p."updatedAt", p.address, p."primaryPhone", p."emergencyPhone", p."lineId", ${addressKeys.map(key=>`p."${key}"`).join(', ')},
      coalesce((SELECT json_agg(json_build_object('roleCode',r."roleCode",'scope',r.scope)) FROM app_private."UserRole" r WHERE r."userId"=p.id),'[]'::json) AS roles
      FROM ${source} WHERE ${filter} ORDER BY created_at DESC, u.id DESC LIMIT $3 OFFSET $4`,
    [department,search,pageSize,(currentPage - 1) * pageSize])
    await client.query('COMMIT')
    return { users: rows, total, page: currentPage, pageSize, summary, checkedAt: new Date().toISOString() }
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error }
  finally { client.release() }
}
