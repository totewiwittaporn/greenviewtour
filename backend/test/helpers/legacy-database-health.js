// Historical adapter contract fixture; the caller supplies a fake pool.
export async function checkDatabase(pool) {
  const result = await pool.query('SELECT 1::int AS connected')
  if (result.rows[0]?.connected !== 1) throw new Error('DATABASE_CHECK_FAILED')
  return { status: 'UP' }
}
