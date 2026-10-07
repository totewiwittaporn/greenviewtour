import {Prisma} from '@prisma/client'
import {isD1Client} from './d1-runtime.js'
import {reportRows} from './sql-dialect.js'
// Identity metadata belongs to the auth integration, not to PostgreSQL's auth schema.
export async function existingStaffIdentity(db,email){
 if(isD1Client(db))return reportRows(db,Prisma.sql`SELECT u.id FROM "D1Identity" u JOIN "UserProfile" p ON p.id=u.id WHERE lower(u.email)=${email} LIMIT 1`)
 return db.$queryRaw`SELECT u.id FROM auth.users u JOIN app_private."UserProfile" p ON p.id=u.id WHERE lower(u.email)=${email} LIMIT 1`
}
export async function identityEmail(db,id){
 if(isD1Client(db))return (await reportRows(db,Prisma.sql`SELECT email FROM "D1Identity" WHERE id=${id}`))[0]
 return (await db.$queryRaw`SELECT email FROM auth.users WHERE id=${id}::uuid`)[0]
}
