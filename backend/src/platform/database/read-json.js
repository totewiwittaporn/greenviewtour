import { Prisma } from '@prisma/client'

const sources = new Set(['TourBooking.programSnapshot', 'BookingComponent.snapshot', 'CustomerRequest.snapshot', 'CustomerRequest.details', 'CompanyWorkRecord.payload', 'FinancePersonnelRecord.payload', 'FinancePersonnelRecord.clearance'])
const identifier = value => /^[A-Za-z][A-Za-z0-9]*$/.test(value)
// Internal-only projection after the domain reader has selected authorized IDs.
// JSON paths are fixed by source code, never accepted from a request. Values and
// UUIDs stay parameterized. Keep the caller's read transaction for consistency.
export async function readJsonFields(tx, table, column, ids, paths) {
 if (!ids.length) return new Map()
 if (!sources.has(`${table}.${column}`) || paths.some(path => !path.split('.').every(identifier))) throw new Error('INVALID_READ_PROJECTION')
 const field = Prisma.raw(`"${column}"`)
 const pairs = paths.flatMap(path => [Prisma.sql`${path}::text`, Prisma.sql`${field} #> ${path.split('.')}::text[]`])
 const rows = await tx.$queryRaw(Prisma.sql`SELECT id, jsonb_build_object(${Prisma.join(pairs)}) AS value FROM ${Prisma.raw(`app_private."${table}"`)} WHERE id IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))})`)
 return new Map(rows.map(row => [row.id, row.value]))
}
