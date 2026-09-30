import {Prisma} from '@prisma/client'
import {AccessError} from './membership.js'
import {addressKeys} from '../../../../packages/contracts/address.js'
import {readTransaction} from '../../platform/database/read-transaction.js'
import {reportRows} from '../../platform/database/sql-dialect.js'
// The caller passes an already-authorized company or department scope.
export async function listD1Users(db,{search='',page=1,pageSize=25,department=null,view='detail',recordId=null}={}){
 return readTransaction(db,async tx=>{
  const from=Prisma.sql`FROM "D1Identity" u JOIN "UserProfile" p ON p.id=u.id`
  const scope=Prisma.sql`(${department} IS NULL OR p.department=${department})`
  const basic=Prisma.raw('u.id,u.email,u.email_confirmed_at,u.created_at,u.last_sign_in_at,p."displayName",p.nickname,p.department,p.status,p."updatedAt",p."primaryPhone",p."emergencyPhone"')
  const contacts=Prisma.raw(`p.address,p."lineId",${addressKeys.map(key=>`p."${key}"`).join(',')}`)
  const roles=Prisma.raw(`COALESCE((SELECT json_group_array(json_object('roleCode',r."roleCode",'scope',r.scope)) FROM "UserRole" r WHERE r."userId"=p.id),'[]') AS roles`)
  const decode={jsonColumns:['roles'],dateColumns:['email_confirmed_at','created_at','last_sign_in_at','updatedAt']}
  if(recordId){
   const users=await reportRows(tx,Prisma.sql`SELECT ${basic},${contacts},${roles} ${from} WHERE ${scope} AND p.id=${recordId.toLowerCase()}`,decode)
   if(!users.length)throw new AccessError('NOT_FOUND',404)
   return {users,total:1,page:1,pageSize,checkedAt:new Date().toISOString()}
  }
  const [summary]=await reportRows(tx,Prisma.sql`SELECT count(*) AS total,count(*) FILTER(WHERE email_confirmed_at IS NOT NULL) AS verified,count(*) FILTER(WHERE last_sign_in_at IS NOT NULL) AS signed_in ${from} WHERE ${scope}`)
  const filter=Prisma.sql`${scope} AND (${search}='' OR instr(lower(COALESCE(u.email,'')||' '||p."displayName"),lower(${search}))>0)`
  const [{total}]=await reportRows(tx,Prisma.sql`SELECT count(*) AS total ${from} WHERE ${filter}`)
  const currentPage=Math.min(page,Math.max(1,Math.ceil(total/pageSize)))
  const fields=view==='list'?Prisma.sql`${basic},${roles}`:Prisma.sql`${basic},${contacts},${roles}`
  const users=await reportRows(tx,Prisma.sql`SELECT ${fields} ${from} WHERE ${filter} ORDER BY u.created_at DESC NULLS FIRST,u.id DESC LIMIT ${pageSize} OFFSET ${(currentPage-1)*pageSize}`,decode)
  return {users,total,page:currentPage,pageSize,summary,checkedAt:new Date().toISOString()}
 })
}
