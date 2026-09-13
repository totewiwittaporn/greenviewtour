import { loadEnvFile } from 'node:process'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
import { dailyBookingDocument, documentBrand } from '../src/modules/operations/documents.js'
import { listJobs } from '../src/modules/operations/dispatch.js'
import { operationAccess } from '../../packages/contracts/operation-access.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),prisma=createPrisma(pool)
try{
 const actor=(await prisma.userProfile.findMany({where:{status:'ACTIVE'},include:{roles:true}})).find(p=>operationAccess(p).manager)
 if(!actor)throw Error('MANAGER_NOT_FOUND')
 const brand=await documentBrand(prisma)
 if(!brand.logo)throw Error('LOGO_NOT_FOUND')
 for(const date of ['2026-09-09','2026-09-10','2026-09-11']){
  const d=await dailyBookingDocument(prisma,actor.id,date)
  const jobs=await listJobs(prisma,actor.id,new URLSearchParams({kind:'VEHICLE',date}))
  console.log(JSON.stringify({date,bookings:d.rows.length,unknownCounterPrices:d.summary.unknownPrices,vehicleRuns:jobs.total}))
 }
 const {rows}=await pool.query(`SELECT relrowsecurity FROM pg_class WHERE oid='app_private."DocumentAsset"'::regclass`)
 if(!rows[0]?.relrowsecurity)throw Error('ASSET_RLS_NOT_ENABLED')
 console.log(JSON.stringify({result:'READ_ONLY_PASS',logoSha256:brand.sha256,rls:true}))
}finally{await prisma.$disconnect();await pool.end()}
