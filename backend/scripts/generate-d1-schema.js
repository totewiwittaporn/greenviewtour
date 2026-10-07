import {onboardingSchema} from '../prisma-d1/onboarding-schema.js'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const here=path.dirname(fileURLToPath(import.meta.url))
const backend=path.resolve(here,'..')
const source=path.join(backend,'prisma','schema.prisma')
const targetDir=path.join(backend,'prisma-d1')
const target=path.join(targetDir,'schema.prisma')
const migrationsDir=path.join(targetDir,'migrations')

let schema=await readFile(source,'utf8')

schema=schema.replace(
  /generator client \{[\s\S]*?\}\s*datasource db \{[\s\S]*?\}/,
  `generator client {
  provider = "prisma-client"
  output   = "../src/generated/d1"
  runtime  = "cloudflare"
}
datasource db {
  provider = "sqlite"
}`
)

schema=schema
  .replace(/\s+@db\.[A-Za-z]+(?:\([^)]*\))?/g,'')
  .replace(/^\s*@@schema\([^\n]+\)\s*$/gm,'')
  .replace(/^\s*schemas\s*=\s*\[[^\n]+\]\s*$/gm,'')
  .replace(/^\s*@@index\(\[resourceIds\],\s*type:\s*Gin\)\s*$/gm,'')

const lookupFields=[
  {model:'BusinessPartner',field:'allowedPaymentTerms',lookup:'D1BusinessPartnerPaymentTerm',initial:'["PREPAID","PAID","COUNTER","AGENT_CREDIT"]'},
  {model:'BusinessPartner',field:'roles',lookup:'D1BusinessPartnerRole',initial:'[]'},
  {model:'FleetVehicle',field:'purposes',lookup:'D1FleetVehiclePurpose',initial:'[]'},
  {model:'TourBooking',field:'specialRequirements',lookup:'D1TourBookingSpecialRequirement',initial:'[]'},
  {model:'WarehouseResponsibility',field:'deputyUserIds',lookup:'D1WarehouseResponsibilityDeputy',initial:'[]',ownerColumn:'storeId'},
  {model:'CapacityPool',field:'resourceIds',lookup:'D1CapacityPoolResource',initial:'[]'},
]

const jsonProjections=[
  {model:'FinancePersonnelRecord',column:'payload',path:['dueOn'],source:'FinancePersonnelRecord.payload.dueOn'},
  {model:'FinancePersonnelRecord',column:'payment',path:['paidOn'],source:'FinancePersonnelRecord.payment.paidOn'},
  {model:'CustomerRequest',column:'snapshot',path:['payment','receivedOn'],source:'CustomerRequest.snapshot.payment.receivedOn'},
  {model:'OperationDailySnapshot',column:'runs',kind:'arrayLength',source:'OperationDailySnapshot.runs.length'},
]

for(const {field,initial} of lookupFields){
  const expression=new RegExp(`(^\\s*${field}\\s+)String\\[\\](?:\\s+@default\\([^\\n]+\\))?`, 'gm')
  schema=schema.replace(expression,(_,prefix)=>`${prefix}Json @default(${JSON.stringify(initial)})`)
}

// Binary payloads do not belong in D1: its row/value limits are smaller than
// Greenview's accepted image/PDF uploads. The Cloudflare schema stores only a
// deterministic R2 object key; file bytes live in the FILES bucket.
for(const model of ['DocumentAsset','EvidenceAttachment','WebsiteImage']){
  const expression=new RegExp(`(model ${model} \\{[\\s\\S]*?\\n)(\\s*)content Bytes\\n`)
  schema=schema.replace(expression,(_,head,indent)=>`${head}${indent}objectKey String @unique\n`)
}

const lookupModels=lookupFields.map(({lookup})=>`model ${lookup} {
  ownerId String
  value   String
  @@id([ownerId, value])
  @@index([value, ownerId])
}`).join('\n\n')

const projectionModel=`model D1JsonProjection {
  source    String
  ownerId   String
  textValue String
  @@id([source, ownerId])
  @@index([source, textValue, ownerId])
}`

schema=(schema.trim()+'\n\n'+lookupModels+'\n\n'+projectionModel+'\n').replace(/\n{3,}/g,'\n\n')

const triggerSql=lookupFields.map(({model,field,lookup,ownerColumn='id'})=>{
  const stem=`${model}_${field}`.replace(/[^A-Za-z0-9_]/g,'_')
  return `CREATE TRIGGER IF NOT EXISTS "${stem}_insert"
AFTER INSERT ON "${model}"
BEGIN
  INSERT OR IGNORE INTO "${lookup}" ("ownerId","value")
  SELECT NEW."${ownerColumn}", CAST(value AS TEXT) FROM json_each(NEW."${field}");
END;

CREATE TRIGGER IF NOT EXISTS "${stem}_update"
AFTER UPDATE OF "${field}" ON "${model}"
BEGIN
  DELETE FROM "${lookup}" WHERE "ownerId"=OLD."${ownerColumn}";
  INSERT OR IGNORE INTO "${lookup}" ("ownerId","value")
  SELECT NEW."${ownerColumn}", CAST(value AS TEXT) FROM json_each(NEW."${field}");
END;

CREATE TRIGGER IF NOT EXISTS "${stem}_delete"
AFTER DELETE ON "${model}"
BEGIN
  DELETE FROM "${lookup}" WHERE "ownerId"=OLD."${ownerColumn}";
END;`
}).join('\n\n')

const projectionTriggerSql=jsonProjections.map(({model,column,path:parts,source,kind})=>{
  const suffix=parts?.join('_')||kind
  const stem=`${model}_${column}_${suffix}`.replace(/[^A-Za-z0-9_]/g,'_')
  const jsonPath=parts?'$.'.concat(parts.join('.')):null
  const valueSql=kind==='arrayLength'
   ?`CAST(json_array_length(NEW."${column}") AS TEXT)`
   :`CAST(json_extract(NEW."${column}", '${jsonPath}') AS TEXT)`
  const presentSql=kind==='arrayLength'
   ?`NEW."${column}" IS NOT NULL`
   :`json_type(NEW."${column}", '${jsonPath}') IS NOT NULL`
  const insert=`INSERT OR REPLACE INTO "D1JsonProjection" ("source","ownerId","textValue")
  SELECT '${source}', NEW."id", ${valueSql}
  WHERE ${presentSql};`
  return `CREATE TRIGGER IF NOT EXISTS "${stem}_insert"
AFTER INSERT ON "${model}"
BEGIN
  ${insert}
END;

CREATE TRIGGER IF NOT EXISTS "${stem}_update"
AFTER UPDATE OF "${column}" ON "${model}"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='${source}' AND "ownerId"=OLD."id";
  ${insert}
END;

CREATE TRIGGER IF NOT EXISTS "${stem}_delete"
AFTER DELETE ON "${model}"
BEGIN
  DELETE FROM "D1JsonProjection" WHERE "source"='${source}' AND "ownerId"=OLD."id";
END;`
}).join('\n\n')

await mkdir(migrationsDir,{recursive:true})
// Applied migrations are immutable. Schema changes require NEW migration files.
for(const [name,sql] of [['0002_scalar_array_lookups.sql',triggerSql],['0003_json_range_projections.sql',projectionTriggerSql]]){
  const current=await readFile(path.join(migrationsDir,name),'utf8')
  if(current!==sql.trim()+'\n')throw new Error('D1_MIGRATION_HISTORY_IMMUTABLE: add a new migration; do not regenerate '+name)
}
schema=schema.replace('model CompanySettings {','model CompanySettings {\n lineId String?\n instagramUrl String?')
schema+='\n'+await readFile(path.join(targetDir,'auth-models.prisma'),'utf8')
schema+='\n'+await readFile(path.join(targetDir,'line-models.prisma'),'utf8')
schema+='\n'+await readFile(path.join(targetDir,'digest-models.prisma'),'utf8')
schema=onboardingSchema(schema)+'\n'+await readFile(path.join(targetDir,'onboarding-models.prisma'),'utf8')
await writeFile(target,schema)
console.log(`Generated D1 Prisma schema: ${path.relative(backend,target)}`)
console.log('Verified immutable D1 scalar-array lookup triggers')
console.log('Verified immutable D1 JSON range projection triggers')
