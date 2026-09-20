// Alternative for macOS Prisma schema-engine TLS failures. Uses the same verified
// CA connection as the running app; each migration and its ledger entry commit together.
import {readFile,readdir} from 'node:fs/promises'
import {loadEnvFile} from 'node:process'
import {createHash,randomUUID} from 'node:crypto'
import {createDatabasePool} from '../src/platform/database/pool.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),client=await pool.connect()
try{
 await client.query('BEGIN')
 await client.query("SET LOCAL statement_timeout = '60s'")
 await client.query('SELECT pg_advisory_xact_lock(72707369)')
 await client.query('SELECT pg_advisory_xact_lock(7082027)')
 const ledger=await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM app_private._prisma_migrations')
 if(ledger.rows.some(r=>!r.finished_at&&!r.rolled_back_at))throw Error('UNRESOLVED_MIGRATION')
 const folder=new URL('../prisma/migrations/',import.meta.url)
 const entries=(await readdir(folder,{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name).sort()
 const pending=[]
 for(const name of entries){
  const sql=await readFile(new URL(name+'/migration.sql',folder),'utf8'),checksum=createHash('sha256').update(sql).digest('hex')
  const old=ledger.rows.find(r=>r.migration_name===name&&r.finished_at&&!r.rolled_back_at)
  if(old){const lf=sql.replaceAll('\r\n','\n');const checksums=[checksum,...[lf,lf.replaceAll('\n','\r\n')].map(text=>createHash('sha256').update(text).digest('hex'))];if(!checksums.includes(old.checksum))throw Error('MIGRATION_CHECKSUM_MISMATCH');continue}
  pending.push({name,sql,checksum})
 }
 if(!process.argv.includes('--apply')){console.log(JSON.stringify({pending:pending.map(m=>m.name),mode:'check',tls:'verified'}));await client.query('ROLLBACK')}
 else{
  for(const m of pending){await client.query(m.sql);await client.query('INSERT INTO app_private._prisma_migrations (id,checksum,migration_name,started_at,finished_at,applied_steps_count) VALUES ($1,$2,$3,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1)',[randomUUID(),m.checksum,m.name])}
  await client.query('COMMIT');console.log(JSON.stringify({applied:pending.map(m=>m.name),tls:'verified'}))
 }
}catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({error:/^[A-Z_]+$/.test(e.message)?e.message:'MIGRATION_FAILED',code:/^[A-Z0-9]{5}$/.test(e.code||'')?e.code:null}));process.exitCode=1}
finally{client.release();await pool.end()}
