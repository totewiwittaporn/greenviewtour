import { editOwnProfile } from '../../modules/identity-access/user-management.js'
import { publicProfile } from '../../modules/identity-access/policy.js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { profileInclude } from '../../modules/identity-access/policy.js'
import { canManageCatalog, saveSettings, listSettings } from '../../modules/service-catalog/settings.js'
import { catalog, initialValues } from '../../../../packages/contracts/catalog.js'
import {createD1Prisma} from '../../platform/database/d1-client.ts'
import {readTourEditor,saveTourEditor} from '../../modules/service-catalog/tour-editor.js'
export async function catalogWrites(env){
const prisma=createD1Prisma(env.DB,{files:env.FILES});let stage='fixture'
try{
const before=Object.fromEntries(await Promise.all(Object.values(catalog).map(async c=>[c.model,await prisma[c.model].count()])))
const profiles=await prisma.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude}),actor=profiles.find(canManageCatalog);assert.ok(actor)

  const db=prisma,tx=prisma
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
  const season=await create('seasons',{code:`${prefix}-S`,name:'Rollback season',tourId:tour.id,startsOn:'2026-10-15',endsOn:'2027-05-15',onlineStartsOn:'2026-10-15',onlineEndsOn:'2027-05-15',bookingStartsOn:'2026-10-01',bookingEndsOn:'2027-05-14',cutoffDays:'1'})
  const promotion=await create('promotions',{code:`${prefix}-P`,name:'Rollback promotion',tourId:tour.id,adultPrice:'1400.00',startsOn:'2026-10-01',endsOn:'2026-10-31',serviceStartsOn:'2026-10-15',serviceEndsOn:'2026-10-31'})
  const popup=await create('popups',{code:`${prefix}-POP`,name:'Rollback popup',imageUrl:'https://example.invalid/local-popup.jpg',imageAlt:'Local popup fixture',title:'Local announcement',startsOn:'2026-10-01',endsOn:'2026-10-31',frequency:'SESSION',priority:'1'})
  stage='season promotion popup CRUD and permissions'
  for(const [entity,row] of [['seasons',season],['promotions',promotion],['popups',popup]]){
    const detail=await listSettings(db,actor.id,entity,new URLSearchParams(`recordId=${row.id}`))
    assert.equal(detail.rows[0].id,row.id)
    const edited=(await saveSettings(db,actor.id,entity,{...initialValues(entity,detail.rows[0]),id:row.id,version:row.version,name:row.name+' edited'})).row
    assert.equal(edited.name,row.name+' edited')
    await assert.rejects(()=>listSettings(db,randomUUID(),entity,new URLSearchParams()),{code:'PERMISSION_DENIED'})
  }
  if(before.companySettings===0)await create('company',{name:'Rollback company'})
  const company=(await tx.companySettings.findMany({take:1}))[0]
  const companySaved=await saveSettings(db,actor.id,'company',{...initialValues('company',company),id:company.id,version:company.version,province:'ภูเก็ต',district:'เมืองภูเก็ต',subdistrict:'ราไวย์',postalCode:'99999',phone:'0812345678'})
  assert.equal(companySaved.row.postalCode,'83130');assert.equal(companySaved.row.phone,'+66812345678')
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
  await assert.rejects(create('rates',{agentId:partner.id,tourId:tour.id,adultPrice:'800'}),{code:'AGENT_RATE_PERIOD_OVERLAP'})
  stage='tour content editor'
  const current=await readTourEditor(prisma,actor.id,tour.id)
  const payload={program:{...initialValues('tours',current.tour),id:tour.id,version:current.tour.version},content:current.content,highlights:[],itinerary:[],faqs:[],media:[]}
  payload.content.en.name='D1 Local tour editor';payload.content.th.name='โปรแกรมทัวร์ทดสอบฐานข้อมูล'
  payload.highlights=[{id:randomUUID(),status:'ACTIVE',sortOrder:1,titleTh:'ทดสอบ',titleEn:'Atomic highlight'}]
  payload.itinerary=Array.from({length:16},(_,index)=>({id:randomUUID(),status:'ACTIVE',sortOrder:index,day:1,titleEn:'Step '+index,descriptionEn:'Bounded nested createMany'}))
  payload.faqs=[{id:randomUUID(),status:'ACTIVE',sortOrder:1,questionEn:'Does this commit atomically?',answerEn:'Yes'}]
  payload.media=[{id:randomUUID(),status:'ACTIVE',kind:'HERO',sortOrder:1,url:'https://example.invalid/local-fixture.jpg',altEn:'Fixture only'}]
  const saved=await saveTourEditor(prisma,actor.id,tour.id,payload)
  assert.equal(saved.content.en.name,payload.content.en.name)
  assert.equal(saved.content.th.name,payload.content.th.name)
  assert.equal(await prisma.tourProgramContent.count({where:{tourId:tour.id}}),2)
  assert.equal(await prisma.tourItineraryStep.count({where:{tourId:tour.id}}),16)
  assert.equal(await prisma.tourHighlight.count({where:{tourId:tour.id}}),1)
  assert.equal(await prisma.tourFaq.count({where:{tourId:tour.id}}),1)
  assert.equal(await prisma.tourMedia.count({where:{tourId:tour.id}}),1)
  await assert.rejects(()=>saveTourEditor(prisma,actor.id,tour.id,payload),{code:'SETTINGS_CONFLICT'})
  const version=saved.tour.version
  await assert.rejects(()=>saveTourEditor(prisma,actor.id,tour.id,{...payload,program:{...payload.program,version},content:{...payload.content,en:{...payload.content.en,name:'Should not commit'}},media:[{invalid:'reject'}]}))
  assert.equal((await readTourEditor(prisma,actor.id,tour.id)).content.en.name,payload.content.en.name)
  return {checks:['settings CRUD across ten catalog entities including seasons, promotions and website pop-ups','Thai/English structured addresses and postal-code derivation','per-agent exact prices, null versus zero and unique constraints','stale edit/invalid dependency cannot alter existing records','TH/EN tour editor transaction and content/audit parity']}

}catch(error){console.error('CATALOG_D1_FAILED',stage,error);throw Object.assign(error,{stage})}
finally{await prisma.$disconnect()}
}
