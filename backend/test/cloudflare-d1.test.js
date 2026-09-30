import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'

const read=url=>readFileSync(new URL(url,import.meta.url),'utf8')
const modelNames=source=>[...source.matchAll(/^model\s+(\w+)/gm)].map(match=>match[1])

test('D1 schema is deterministically derived from the PostgreSQL source schema',()=>{
  execFileSync(process.execPath,[new URL('../scripts/generate-d1-schema.js',import.meta.url).pathname],{stdio:'pipe'})
  const postgres=read('../prisma/schema.prisma')
  const d1=read('../prisma-d1/schema.prisma')
  const sourceModels=modelNames(postgres),d1Models=modelNames(d1)
  assert.deepEqual(d1Models.filter(name=>sourceModels.includes(name)).sort(),[...sourceModels].sort())
  assert.deepEqual(d1Models.filter(name=>!sourceModels.includes(name)).sort(),[
    'D1BusinessPartnerPaymentTerm','D1BusinessPartnerRole','D1CapacityPoolResource','D1FleetVehiclePurpose',
    'D1JsonProjection','D1TourBookingSpecialRequirement','D1WarehouseResponsibilityDeputy',
  ])
  assert.match(d1,/datasource db \{\s*provider = "sqlite"/)
  assert.match(d1,/runtime\s*=\s*"cloudflare"/)
  assert.doesNotMatch(d1,/@db\./)
  assert.doesNotMatch(d1,/@@schema\(/)
  assert.doesNotMatch(d1,/type:\s*Gin/)
  for(const field of ['allowedPaymentTerms','roles','purposes','specialRequirements','deputyUserIds','resourceIds']){
    assert.match(d1,new RegExp(`\\b${field}\\s+Json\\b`))
  }
})

test('D1 baseline contains no PostgreSQL-only migration syntax',()=>{
  const sql=read('../prisma-d1/migrations/0001_baseline.sql')
  // Prisma's SQLite connector emits JSONB as a declared type name. D1 stores those
  // values as TEXT and its JSON functions read them correctly; the local runtime
  // probe covers that behavior. Block actual PostgreSQL-only migration syntax.
  for(const forbidden of [/\bTIMESTAMPTZ\b/i,/SET\s+LOCAL/i,/app_private\./i,/ARRAY\s*\[/i,/DO\s+\$\$/i,/CREATE\s+TYPE/i,/::uuid/i,/AT\s+TIME\s+ZONE/i]){
    assert.doesNotMatch(sql,forbidden)
  }
  assert.match(sql,/CREATE TABLE "TourBooking"/)
  assert.match(sql,/CREATE TABLE "TourProgram"/)
  const triggers=read('../prisma-d1/migrations/0002_scalar_array_lookups.sql')
  for(const name of ['D1BusinessPartnerPaymentTerm','D1BusinessPartnerRole','D1FleetVehiclePurpose','D1TourBookingSpecialRequirement','D1WarehouseResponsibilityDeputy','D1CapacityPoolResource'])assert.match(triggers,new RegExp(name))
  assert.match(triggers,/SELECT NEW\."storeId".*json_each\(NEW\."deputyUserIds"\)/s)
  const projections=read('../prisma-d1/migrations/0003_json_range_projections.sql')
  for(const source of ['FinancePersonnelRecord.payload.dueOn','FinancePersonnelRecord.payment.paidOn','CustomerRequest.snapshot.payment.receivedOn','OperationDailySnapshot.runs.length'])assert.match(projections,new RegExp(source.replaceAll('.','\\.')))
  assert.match(sql,/CREATE TABLE "D1JsonProjection"/)
})

test('Cloudflare config is isolated from Supabase and PostgreSQL secrets',()=>{
  const config=read('../wrangler.jsonc')
  const env=read('../cloudflare.env')
  const rootPackage=read('../../package.json')
  assert.match(config,/"binding": "DB"/)
  assert.match(config,/"binding": "FILES"/)
  assert.match(config,/"D1_LOCATION_HINT": "apac"/)
  assert.doesNotMatch(config,/SUPABASE|PGPASSWORD|PGHOST/)
  assert.doesNotMatch(env,/SUPABASE|PGPASSWORD|PGHOST/)
  assert.match(rootPackage,/node scripts\/local-cloudflare\.js/)
  assert.match(read('../../scripts/local-cloudflare-policy.js'),/'--env-file','backend\/cloudflare\.env'/)
})
