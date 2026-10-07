import {isD1Client} from '../../platform/database/d1-runtime.js'
import {listD1Users} from './list-users-d1.js'
import {AccessError} from './membership.js'
import { addressKeys } from '../../../../packages/contracts/address.js'
// Callers must supply an authorized management scope; all counts use that same scope.
export async function listUsers(pool, { search = '', page = 1, pageSize = 25, department = null, view = 'detail', recordId = null, visibility } = {}) {
  if(!visibility?.actorId||!visibility.allowedRoleCodes?.length)throw new AccessError('PERMISSION_DENIED')
  if(isD1Client(pool))return listD1Users(pool,{search,page,pageSize,department,view,recordId,visibility})
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const source = 'auth.users u JOIN app_private."UserProfile" p ON p.id=u.id'
    const scope = '($1::text IS NULL OR p.department=$1)'
    const visible=start=>`(p.id=$${start}::uuid OR (($${start+2}::text IS NULL OR p.department=$${start+2}) AND EXISTS (SELECT 1 FROM app_private."UserRole" vr WHERE vr."userId"=p.id) AND NOT EXISTS (SELECT 1 FROM app_private."UserRole" vr WHERE vr."userId"=p.id AND NOT(vr."roleCode"=ANY($${start+1}::text[])))))`
    const visibilityParams=[visibility.actorId,visibility.allowedRoleCodes,visibility.department]
    const contacts=`p.address,p."lineId",${addressKeys.map(key=>`p."${key}"`).join(',')}`
    const basic='u.id,email,email_confirmed_at,created_at,last_sign_in_at,p."displayName",p.nickname,p.department,p.status,p."updatedAt",p."primaryPhone",p."emergencyPhone"'
    const roles=`coalesce((SELECT json_agg(json_build_object('roleCode',r."roleCode",'scope',r.scope)) FROM app_private."UserRole" r WHERE r."userId"=p.id),'[]'::json) AS roles`
    if(recordId){
      const {rows}=await client.query(`SELECT ${basic},${contacts},${roles} FROM ${source} WHERE ${scope} AND p.id=$2::uuid AND ${visible(3)}`,[department,recordId,...visibilityParams])
      if(!rows.length)throw new AccessError('NOT_FOUND',404)
      await client.query('COMMIT')
      return {users:rows,total:1,page:1,pageSize,checkedAt:new Date().toISOString()}
    }
    const summary = (await client.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE email_confirmed_at IS NOT NULL)::int AS verified,
      count(*) FILTER (WHERE last_sign_in_at IS NOT NULL)::int AS signed_in FROM ${source} WHERE ${scope} AND ${visible(2)}`, [department,...visibilityParams])).rows[0]
    const filter = `${scope} AND ($2 = '' OR position(lower($2) in lower(coalesce(email, '') || ' ' || p."displayName")) > 0)`
    const total = (await client.query(`SELECT count(*)::int AS total FROM ${source} WHERE ${filter} AND ${visible(3)}`, [department,search,...visibilityParams])).rows[0].total
    const currentPage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
    const { rows } = await client.query(`SELECT ${basic},${view==='list'?'':contacts+','}${roles}
      FROM ${source} WHERE ${filter} AND ${visible(5)} ORDER BY created_at DESC, u.id DESC LIMIT $3 OFFSET $4`,
    [department,search,pageSize,(currentPage - 1) * pageSize,...visibilityParams])
    await client.query('COMMIT')
    return { users: rows, total, page: currentPage, pageSize, summary, checkedAt: new Date().toISOString() }
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error }
  finally { client.release() }
}
