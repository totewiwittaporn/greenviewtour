import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { catalog,initialValues,validateCatalog } from '../../packages/contracts/catalog.js'
import { canManageCatalog,saveSettings,listSettings } from '../src/modules/service-catalog/settings.js'
const profile={status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}]}
function matches(row,where={}){
 return Object.entries(where).every(([key,value])=>{
  if(key==='OR')return value.some(condition=>matches(row,condition))
  if(value&&typeof value==='object'){
   if('has'in value)return row[key]?.includes(value.has)
   if('not'in value)return row[key]!==value.not && row[key]!==undefined
   if('contains'in value)return String(row[key]||'').toLowerCase().includes(value.contains.toLowerCase())
   return matches(row[key]||{},value)
  }
  return row[key]===value
 })
}
function fixture(){
 const records=Object.fromEntries(Object.keys(catalog).map(k=>[catalog[k].model,new Map()])),audit=[]
 const tx={userProfile:{findUnique:async()=>profile},$executeRaw:async()=>{},auditEvent:{create:async e=>audit.push(e)}}
 for(const[model,rows]of Object.entries(records))tx[model]={
  findUnique:async({where})=>rows.get(where.id),count:async({where={}}={})=>[...rows.values()].filter(r=>matches(r,where)).length,
  findMany:async({where={},skip=0,take=25})=>[...rows.values()].filter(r=>matches(r,where)).slice(skip,skip+take),
  create:async({data})=>{const row={...data,version:1};rows.set(row.id,row);return row},
  update:async({where,data})=>{const row={...rows.get(where.id),...data,version:rows.get(where.id).version+1};rows.set(row.id,row);return row},
 }
 tx.$transaction=async fn=>fn(tx)
 return {tx,records,audit}
}
const input=(entity,extra={})=>({...initialValues(entity),id:randomUUID(),version:0,...extra})
test('settings permission retains current company-manager boundary',()=>{
 assert.equal(canManageCatalog(profile),true)
 for(const p of [{...profile,status:'SUSPENDED'},{...profile,roles:[{...profile.roles[0],scope:'SELF'}]},{...profile,department:'BOOKING',roles:[{...profile.roles[0],roleCode:'HEAD_BOOKING'}]}])assert.equal(canManageCatalog(p),false)
})
test('exact agent/tour prices allow different agents and never derive from direct price',async()=>{
 const{tx}=fixture(),a=await saveSettings(tx,'actor','partners',input('partners',{code:'A',name:'Agent A',roles:['SALES_AGENT']})),b=await saveSettings(tx,'actor','partners',input('partners',{code:'B',name:'Agent B',roles:['SALES_AGENT']}))
 const tour=await saveSettings(tx,'actor','tours',input('tours',{code:'T1',name:'Island tour',adultPrice:'1500'}))
 const rateA=await saveSettings(tx,'actor','rates',input('rates',{agentId:a.row.id,tourId:tour.row.id,adultPrice:'900.50'})),rateB=await saveSettings(tx,'actor','rates',input('rates',{agentId:b.row.id,tourId:tour.row.id,adultPrice:'1100'}))
 assert.equal(rateA.row.adultPrice,'900.50');assert.equal(rateB.row.adultPrice,'1100');assert.equal(tour.row.adultPrice,'1500');assert.equal(rateA.row.childPrice,null)
})
test('prices reject negative, excess precision, exponent and implicit numeric coercion; zero remains explicit',()=>{
 for(const value of ['-1','1.001','1e3',Infinity,1500,'100000000'])assert.ok(validateCatalog('tours',input('tours',{code:'T',name:'Tour',adultPrice:value})).errors.adultPrice)
 assert.equal(validateCatalog('tours',input('tours',{code:'T',name:'Tour',adultPrice:'0'})).data.adultPrice,'0')
 assert.ok(validateCatalog('rates',initialValues('rates')).errors.adultPrice)
})
test('operator and transport ownership cannot leave a stale partner or supplier price',()=>{
 const result=validateCatalog('tours',input('tours',{code:'T',name:'Tour',ownership:'GREENVIEW',operatorId:randomUUID(),supplierPricing:'NET',supplierAdultNet:'100'}))
 assert.equal(result.data.operatorId,null);assert.equal(result.data.supplierPricing,'NOT_SET');assert.equal(result.data.supplierAdultNet,null)
 assert.ok(validateCatalog('tours',input('tours',{ownership:'PARTNER'})).errors.operatorId)
 assert.ok(validateCatalog('vehicles',input('vehicles',{ownership:'PARTNER'})).errors.providerId)
})
test('server rejects wrong partner roles, stale writes, forged fields and role removal while used',async()=>{
 const{tx}=fixture(),p=await saveSettings(tx,'actor','partners',input('partners',{code:'P',name:'Partner',roles:['TOUR_OPERATOR']}))
 await assert.rejects(saveSettings(tx,'actor','rates',input('rates',{agentId:p.row.id,tourId:randomUUID(),adultPrice:'100'})),{code:'RELATED_RECORD_UNAVAILABLE'})
 await saveSettings(tx,'actor','tours',input('tours',{code:'T',name:'Tour',ownership:'PARTNER',operatorId:p.row.id}))
 await assert.rejects(saveSettings(tx,'actor','partners',{...initialValues('partners',p.row),id:p.row.id,version:1,roles:['SALES_AGENT']}),{code:'PARTNER_IN_USE'})
 await assert.rejects(saveSettings(tx,'actor','partners',{...initialValues('partners',p.row),id:p.row.id,version:99}),{code:'SETTINGS_CONFLICT'})
 await assert.rejects(saveSettings(tx,'actor','partners',{...initialValues('partners',p.row),id:p.row.id,version:1,isAdmin:true}),{code:'INVALID_SETTINGS'})
})
test('uncertain create retry does not duplicate records or audit; update increments version',async()=>{
 const{tx,audit}=fixture(),request=input('tours',{code:'T',name:'Tour',adultPrice:'100.00'})
 const first=await saveSettings(tx,'actor','tours',request),again=await saveSettings(tx,'actor','tours',request)
 assert.equal(first.row.id,again.row.id);assert.equal(audit.length,1)
 const edited=await saveSettings(tx,'actor','tours',{...request,version:1,name:'Updated tour'});assert.equal(edited.row.version,2)
 assert.deepEqual(audit[0].data.details.fields.includes('adultPrice'),true);assert.equal(JSON.stringify(audit).includes('100.00'),false)
})
test('lookup and listing reject unbounded pages and unsupported filters',async()=>{
 const{tx}=fixture()
 for(const query of ['page=-1','page=1.5','page=999999','status=INVALID','role=ADMIN'])await assert.rejects(listSettings(tx,'actor','partners',new URLSearchParams(query)),{code:'INVALID_FILTER'})
})

test('catalog summaries cover all authorized records independently of search, status and pagination',async()=>{
 const{tx,records}=fixture()
 const others={partners:{roles:['TOUR_OPERATOR']},tours:{ownership:'PARTNER'},rates:{childPrice:null},locations:{kind:'PIER'},vehicles:{ownership:'PARTNER'},channels:{kind:'AGENT'}}
 const extras={partners:{roles:['SALES_AGENT']},tours:{ownership:'GREENVIEW'},rates:{childPrice:'0'},locations:{kind:'HOTEL'},vehicles:{ownership:'GREENVIEW'},channels:{kind:'DIRECT'}}
 for(const entity of Object.keys(extras)){
  const rows=records[catalog[entity].model]
  for(let index=0;index<31;index++)rows.set(String(index),{id:String(index),name:index===0?'Match':'Other',code:String(index),status:index<28?'ACTIVE':'INACTIVE',...(index<7?extras[entity]:others[entity]),agent:{name:index===0?'Match':'Other'},tour:{name:'Tour'}})
  const page=await listSettings(tx,'actor',entity,new URLSearchParams('page=2'))
  assert.equal(page.rows.length,6);assert.equal(page.total,31);assert.equal(page.pageSize,25)
  assert.deepEqual(page.summary,{total:31,active:28,inactive:3,featured:7})
  const filtered=await listSettings(tx,'actor',entity,new URLSearchParams('q=Match&status=ACTIVE&page=99'))
  assert.equal(filtered.rows.length,1);assert.equal(filtered.total,1);assert.equal(filtered.page,1)
  assert.deepEqual(filtered.summary,page.summary)
 }
})
test('catalog summary data remains behind company-management authorization',async()=>{
 const{tx}=fixture();tx.userProfile.findUnique=async()=>({...profile,status:'SUSPENDED'})
 let read=false;tx.tourProgram.count=async()=>{read=true;return 0}
 await assert.rejects(listSettings(tx,'actor','tours',new URLSearchParams()),{code:'PERMISSION_DENIED'})
 assert.equal(read,false)
})

test('journey duration and agent payment defaults validate without inventing dates or prices',()=>{
 const tour=input('tours',{code:'D',name:'Daytrip'})
 assert.equal(validateCatalog('tours',tour).data.durationDays,1)
 assert.ok(validateCatalog('tours',{...tour,durationDays:'367'}).errors.durationDays)
 assert.equal(validateCatalog('tours',{...tour,journeyMode:'OPEN_RETURN'}).data.durationDays,null)
 const partner=input('partners',{code:'A',name:'Agent',roles:['SALES_AGENT'],allowedPaymentTerms:['PREPAID'],defaultPaymentTerms:'COUNTER'})
 assert.ok(validateCatalog('partners',partner).errors.defaultPaymentTerms)
 assert.deepEqual(validateCatalog('partners',{...partner,defaultPaymentTerms:'PREPAID'}).errors,{})
})
test('annual agreement validates calendar bounds and safe evidence references',async()=>{
 const{tx}=fixture(),agent=(await saveSettings(tx,'actor','partners',input('partners',{code:'AG',name:'Agent',roles:['SALES_AGENT']}))).row
 const base=input('agreements',{code:'2026',name:'Annual 2026',agentId:agent.id,startsOn:'2026-01-01',endsOn:'2026-12-31'})
 assert.ok(validateCatalog('agreements',{...base,startsOn:'2026-02-30'}).errors.startsOn)
 assert.ok(validateCatalog('agreements',{...base,endsOn:'2025-12-31'}).errors.endsOn)
 assert.ok(validateCatalog('agreements',{...base,evidenceUrl:'javascript:alert(1)'}).errors.evidenceUrl)
 const agreement=(await saveSettings(tx,'actor','agreements',base)).row
 const tour=(await saveSettings(tx,'actor','tours',input('tours',{code:'T',name:'Tour'}))).row
 const rate=input('rates',{agentId:agent.id,tourId:tour.id,agreementId:agreement.id,adultPrice:'100'})
 await saveSettings(tx,'actor','rates',rate)
 await assert.rejects(saveSettings(tx,'actor','rates',{...rate,id:randomUUID(),agreementId:''}),{code:'AGENT_RATE_PERIOD_OVERLAP'})
 await assert.rejects(saveSettings(tx,'actor','agreements',{...initialValues('agreements',agreement),id:agreement.id,version:1,endsOn:'2027-12-31'}),{code:'AGREEMENT_IN_USE'})
})
