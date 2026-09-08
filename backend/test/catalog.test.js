import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { catalog,initialValues,validateCatalog } from '../../packages/contracts/catalog.js'
import { canManageCatalog,saveSettings,listSettings } from '../src/modules/service-catalog/settings.js'
const profile={status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}]}
function fixture(){
 const records=Object.fromEntries(Object.keys(catalog).map(k=>[catalog[k].model,new Map()])),audit=[]
 const tx={userProfile:{findUnique:async()=>profile},$executeRaw:async()=>{},auditEvent:{create:async e=>audit.push(e)}}
 for(const[model,rows]of Object.entries(records))tx[model]={
  findUnique:async({where})=>rows.get(where.id),count:async({where={}}={})=>[...rows.values()].filter(r=>Object.entries(where).every(([k,v])=>r[k]===v)).length,
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
