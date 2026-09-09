import { editOwnProfile } from '../src/modules/identity-access/user-management.js'
import { publicProfile } from '../src/modules/identity-access/policy.js'
// Real Preview integration verification. Every fixture and audit is rolled back.
import assert from 'node:assert/strict'
import { loadEnvFile } from 'node:process'
import { randomUUID } from 'node:crypto'
import { createDatabasePool } from '../src/platform/database/pool.js'
import { createPrisma } from '../src/platform/database/prisma.js'
import { profileInclude } from '../src/modules/identity-access/policy.js'
import { canManageCatalog, saveSettings, listSettings } from '../src/modules/service-catalog/settings.js'
import { catalog, initialValues } from '../../packages/contracts/catalog.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),prisma=createPrisma(pool),rollback=new Error('EXPECTED_ROLLBACK')
let stage='connect'
try{
 const counts=async()=>Object.fromEntries(await Promise.all(Object.values(catalog).map(async c=>[c.model,await prisma[c.model].count()])))
 const before=await counts()
 const profiles=await prisma.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude}),actor=profiles.find(canManageCatalog)
 assert.ok(actor,'Company manager required for integration verification')
 stage='private table permissions'
 const security=await pool.query(`SELECT c.relname, c.relrowsecurity, has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access, has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS staff_access FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app_private' AND c.relname = ANY($1::text[])`,[Object.values(catalog).map(c=>c.model[0].toUpperCase()+c.model.slice(1))])
 assert.equal(security.rows.length,7);assert.ok(security.rows.every(r=>r.relrowsecurity&&!r.anon_access&&!r.staff_access))
 await prisma.$transaction(async tx=>{
  const db=new Proxy(tx,{get(target,key){if(key==='$transaction')return fn=>fn(tx);return target[key]}})
  const create=async(entity,values)=>{stage=`create ${entity}`;return(await saveSettings(db,actor.id,entity,{...initialValues(entity),...values,id:randomUUID(),version:0})).row}
  const prefix=`QA-${randomUUID().slice(0,8)}`
  const partner=await create('partners',{code:`${prefix}-A`,name:'Rollback Partner A',roles:['SALES_AGENT','TOUR_OPERATOR','TRANSPORT_PROVIDER'],province:'ภูเก็ต',district:'เมืองภูเก็ต',subdistrict:'ราไวย์',houseNumber:'12/34',moo:'5',mapUrl:'https://maps.app.goo.gl/fixture'})
  const other=await create('partners',{code:`${prefix}-B`,name:'Rollback Partner B',roles:['SALES_AGENT']})
  const tour=await create('tours',{code:`${prefix}-T`,name:'Rollback tour',ownership:'PARTNER',operatorId:partner.id,adultPrice:'1500.00',supplierPricing:'NET',supplierAdultNet:'700.00'})
  const rate=await create('rates',{agentId:partner.id,tourId:tour.id,adultPrice:'900.50'})
  await create('rates',{agentId:other.id,tourId:tour.id,adultPrice:'1100'})
  await create('locations',{code:`${prefix}-H`,name:'Rollback hotel',province:'ภูเก็ต',district:'เมืองภูเก็ต',subdistrict:'ราไวย์',houseNumber:'12',latitude:'7.88',longitude:'98.39'})
  await create('vehicles',{code:`${prefix}-V`,name:'Rollback van',capacity:'10',ownership:'PARTNER',providerId:partner.id})
  await create('channels',{code:`${prefix}-W`,name:'Rollback walk-in'})
  if(before.companySettings===0)await create('company',{name:'Rollback company'})
  const company=(await tx.companySettings.findMany({take:1}))[0]
  const companySaved=await saveSettings(db,actor.id,'company',{...initialValues('company',company),id:company.id,version:company.version,province:'ภูเก็ต',district:'เมืองภูเก็ต',subdistrict:'ราไวย์',postalCode:'99999'})
  assert.equal(companySaved.row.postalCode,'83130')
  const companyRead=await listSettings(db,actor.id,'company',new URLSearchParams());assert.equal(companyRead.rows[0].postalCode,'83130')
  stage='structured address persistence'
  const storedPartner=await tx.businessPartner.findUnique({where:{id:partner.id}});assert.equal(storedPartner.province,'Phuket');assert.equal(storedPartner.houseNumber,'12/34');assert.equal(storedPartner.postalCode,'83130')
  await editOwnProfile(db,actor.id,{displayName:actor.displayName,updatedAt:actor.updatedAt.toISOString(),province:'กระบี่',district:'เมืองกระบี่',subdistrict:'อ่าวนาง',moo:'5',houseNumber:'99'})
  const updatedActor=await tx.userProfile.findUnique({where:{id:actor.id},include:profileInclude});assert.equal(updatedActor.postalCode,'81180');assert.equal(updatedActor.address,actor.address);assert.equal(publicProfile(updatedActor,'fixture@example.invalid').province,'กระบี่')
  stage='read prices and foreign keys'
  const result=await listSettings(db,actor.id,'rates',new URLSearchParams('q=Rollback tour'))
  assert.equal(result.total,2);assert.equal(String(result.rows.find(r=>r.agentId===partner.id).adultPrice),'900.5');assert.equal(String(await tx.tourProgram.findUnique({where:{id:tour.id}}).then(t=>t.adultPrice)),'1500')
  assert.equal(result.rows.find(r=>r.agentId===other.id).childPrice,null)
  stage='version and reference protection'
  const change={...initialValues('rates',rate),id:rate.id,version:rate.version,adultPrice:'950.00'}
  await saveSettings(db,actor.id,'rates',change)
  await assert.rejects(saveSettings(db,actor.id,'rates',change),{code:'SETTINGS_CONFLICT'})
  await assert.rejects(saveSettings(db,actor.id,'partners',{...initialValues('partners',partner),id:partner.id,version:partner.version,roles:['SALES_AGENT']}),{code:'PARTNER_IN_USE'})
  stage='unique agent program constraint'
  await tx.$executeRawUnsafe('SAVEPOINT duplicate_rate')
  await assert.rejects(create('rates',{agentId:partner.id,tourId:tour.id,adultPrice:'800'}),{code:'SETTINGS_DUPLICATE'})
  await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT duplicate_rate')
  throw rollback
 },{timeout:30000}).catch(error=>{if(error!==rollback)throw error})
 stage='rollback counts';assert.deepEqual(await counts(),before)
 console.log(JSON.stringify({result:'PASS',environment:'preview',tables:7,checks:['CRUD','automatic postal code write/read','foreign keys','per-agent prices','null versus zero','version conflicts','role dependencies','unique prices','RLS and revoked grants'],fixtures:'ROLLED_BACK',counts:before}))
}catch(error){console.error(JSON.stringify({result:'FAIL',stage,errorCode:error.code||error.name}));process.exitCode=1}
finally{await prisma.$disconnect();await pool.end()}
