import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
if(!process.argv.includes('--apply')){console.log('Use --apply to import the approved PNG into Preview.');process.exit(0)}
loadEnvFile(new URL('../.env',import.meta.url))
const content=await readFile(new URL('../assets/greenview-tour-logo.png',import.meta.url))
if(content.length>262144||content.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('INVALID_LOGO')
const pool=createDatabasePool(),prisma=createPrisma(pool)
try{
 const sha256=createHash('sha256').update(content).digest('hex')
 const data={mimeType:'image/png',content,sha256,sourceUrl:'https://greenviewtour.com/wp-content/uploads/2024/12/greenview-tour-logo-1.png'}
 await prisma.documentAsset.upsert({where:{key:'company-logo'},create:{key:'company-logo',...data},update:data})
 const saved=await prisma.documentAsset.findUniqueOrThrow({where:{key:'company-logo'}})
 if(!Buffer.from(saved.content).equals(content))throw Error('LOGO_VERIFICATION_FAILED')
 console.log(JSON.stringify({result:'VERIFIED',bytes:content.length,sha256}))
}finally{await prisma.$disconnect();await pool.end()}
