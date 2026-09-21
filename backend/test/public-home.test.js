import test from 'node:test'
import assert from 'node:assert/strict'
import {publicCompany,publicCatalog} from '../src/modules/commerce/service.js'

test('public company selects contact data only and constructs a bounded response',async()=>{
 let selected
 const row={name:'Company',houseNumber:'12',province:'Phang Nga',address:'Legacy',phone:'0123',email:'hello@example.com',mapUrl:'https://maps.app.goo.gl/example',latitude:'8.5',longitude:'98.2',taxId:'private',bankAccountNumber:'private',id:'private',legalName:'private'}
 const result=await publicCompany({companySettings:{findFirst:async({select})=>{selected=Object.keys(select);return row}}})
 for(const key of ['taxId','bankAccountNumber','bankName','bankAccountName','paymentInstructions','id','legalName','version'])assert.ok(!selected.includes(key))
 assert.deepEqual(result,{company:{name:'Company',address:'12, Phang Nga',phone:'0123',email:'hello@example.com',mapUrl:'https://maps.app.goo.gl/example',latitude:'8.5',longitude:'98.2'}})
})
test('public company handles unconfigured company, legacy address and invalid map values',async()=>{
 assert.deepEqual(await publicCompany({companySettings:{findFirst:async()=>null}}),{company:null})
 for(const mapUrl of ['javascript:alert(1)','https://evil.example/maps','https://user:pass@google.com/maps']){
  const result=await publicCompany({companySettings:{findFirst:async()=>({name:'Company',address:'Legacy address',mapUrl,latitude:'91',longitude:'98'})}})
  assert.equal(result.company.address,'Legacy address');assert.equal(result.company.mapUrl,null)
  assert.equal(result.company.latitude,null);assert.equal(result.company.longitude,null)
 }
 const result=await publicCompany({companySettings:{findFirst:async()=>({name:'Company',latitude:'8'})}})
 assert.equal(result.company.latitude,null);assert.equal(result.company.longitude,null)
})
test('tour ownership filters publication and count before bounded pagination',async()=>{
 for(const ownership of ['GREENVIEW','PARTNER']){
  let countWhere,listArgs
  const db={tourProgram:{count:async({where})=>{countWhere=where;return 25},findMany:async args=>{listArgs=args;return []}}}
  const result=await publicCatalog(db,new URLSearchParams({ownership,page:'2',q:'Surin'}))
  assert.deepEqual(countWhere,listArgs.where)
  assert.deepEqual(countWhere,{status:'ACTIVE',publicStatus:'PUBLISHED',ownership,name:{contains:'Surin',mode:'insensitive'}})
  assert.equal(listArgs.skip,12);assert.equal(listArgs.take,12);assert.equal(result.total,25)
 }
})
test('tour ownership cannot silently fall back to another category',async()=>{
 for(const ownership of ['', 'greenview','OTHER','PARTNER,GREENVIEW'])await assert.rejects(()=>publicCatalog({},new URLSearchParams({ownership})),{message:'INVALID_INPUT',status:400})
 let where
 await publicCatalog({tourProgram:{count:async args=>{where=args.where;return 0},findMany:async()=>[]}},new URLSearchParams())
 assert.deepEqual(where,{status:'ACTIVE',publicStatus:'PUBLISHED'})
})

test('duration combines with ownership before totals and page clamping',async()=>{
 for(const [duration,durationDays] of [['day',1],['overnight',{gt:1}]]){
  let countWhere,listArgs
  const db={tourProgram:{count:async({where})=>{countWhere=where;return 13},findMany:async args=>{listArgs=args;return []}}}
  const result=await publicCatalog(db,new URLSearchParams({duration,ownership:'GREENVIEW',page:'999'}))
  assert.deepEqual(countWhere,{status:'ACTIVE',publicStatus:'PUBLISHED',ownership:'GREENVIEW',durationDays})
  assert.deepEqual(listArgs.where,countWhere)
  assert.equal(result.total,13);assert.equal(result.page,2);assert.equal(listArgs.skip,12)
 }
})
test('invalid duration is rejected rather than silently broadening the result',async()=>{
 for(const duration of ['', 'all','DAY','0','day,overnight'])await assert.rejects(()=>publicCatalog({},new URLSearchParams({duration})),{message:'INVALID_INPUT',status:400})
})
