// Read-only directory for the local owner preview. Application RBAC is a separate feature.
export async function listUsers(pool, { search = '', page = 1, pageSize = 25 } = {}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const summary = (await client.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE email_confirmed_at IS NOT NULL)::int AS verified,
      count(*) FILTER (WHERE last_sign_in_at IS NOT NULL)::int AS signed_in FROM auth.users`)).rows[0]
    const filter = "($1 = '' OR position(lower($1) in lower(coalesce(email, ''))) > 0)"
    const total = (await client.query(`SELECT count(*)::int AS total FROM auth.users WHERE ${filter}`, [search])).rows[0].total
    const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
    const { rows } = await client.query(`SELECT id, email, email_confirmed_at, created_at, last_sign_in_at
      FROM auth.users WHERE ${filter} ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
    [search, pageSize, (currentPage - 1) * pageSize])
    await client.query('COMMIT')
    return { users: rows, total, page: currentPage, pageSize, summary, checkedAt: new Date().toISOString() }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { client.release() }
}
