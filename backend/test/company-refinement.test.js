import { validateThaiAddress } from '../../packages/contracts/thai-address.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import areas from '../../packages/contracts/data/thai-areas.js'
import { contactValue,formatPhone,formatTaxId } from '../../packages/contracts/contact.js'
import { initialValues,validateCatalog } from '../../packages/contracts/catalog.js'
import { canManageCatalog,listSettings,saveSettings } from '../src/modules/service-catalog/settings.js'
test('Thai lookup has unique administrative codes and valid parent relationships including Bangkok and Phuket',()=>{
 for(const name of ['provinces','districts','subdistricts'])assert.equal(new Set(areas[name].map(r=>r.id)).size,areas[name].length)
 assert.equal(areas.provinces.length,77)
 const provinces=new Set(areas.provinces.map(r=>r.id)),districts=new Set(areas.districts.map(r=>r.id))
 assert.ok(areas.districts.every(r=>provinces.has(r.parent)))
 assert.ok(areas.subdistricts.every(r=>districts.has(r.parent)))
 assert.ok(areas.subdistricts.find(r=>r.th==='ราไวย์'&&r.parent===8301))
 assert.ok(areas.subdistricts.find(r=>r.th==='วงศ์สว่าง'&&r.parent===1029))
})
test('company contact accepts pasted separators and preserves all digits and country codes',()=>{
 assert.equal(formatTaxId('0123456789012'),'0-1234-56789-01-2')
 for(const [raw,display]of[['076123456','076-123-456'],['021234567','02-123-4567'],['0812345678','081-234-5678'],['+66812345678','+66-81-234-5678']]){assert.equal(formatPhone(raw),display);assert.equal(contactValue(display),raw)}
 const valid=validateCatalog('company',{...initialValues('company'),name:'Example',taxId:'0-1234-56789-01-2',phone:'+66-81-234-5678'})
 assert.deepEqual(valid.errors,{});assert.equal(valid.data.taxId,'0123456789012');assert.equal(valid.data.phone,'+66812345678')
 for(const value of ['123','12345678901234','123456789012x'])assert.ok(validateCatalog('company',{name:'Example',taxId:value}).errors.taxId)
 assert.ok(validateCatalog('company',{name:'Example',phone:'0123abc789'}).errors.phone)
 assert.deepEqual(validateCatalog('company',{name:'Example',taxId:'',phone:''}).errors,{})
})
test('company permits active Manager and administrator, denies other roles on both read and write',async()=>{
 for(const role of ['MANAGER','ADMIN_MANAGER','HEAD_BOOKING','BOOKING','ACCOUNT','GUIDE','DRIVER']){
 const actor={status:'ACTIVE',department:'BOOKING',roles:[{roleCode:role,scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}]}
 assert.equal(canManageCatalog(actor),['MANAGER','ADMIN_MANAGER'].includes(role))
 assert.equal(canManageCatalog({...actor,status:'SUSPENDED'}),false)
 if(['MANAGER','ADMIN_MANAGER'].includes(role))continue
 const tx={userProfile:{findUnique:async()=>actor},$executeRaw:async()=>{}};tx.$transaction=async fn=>fn(tx)
 await assert.rejects(listSettings(tx,'actor','company',new URLSearchParams()),{code:'PERMISSION_DENIED'})
 await assert.rejects(saveSettings(tx,'actor','company',{}),{code:'PERMISSION_DENIED'})
 }
})

test('Thai hierarchy rejects cross-province combinations and accepts empty optional house fields',()=>{
 assert.deepEqual(validateThaiAddress({province:'ภูเก็ต',district:'เมืองภูเก็ต',subdistrict:'ราไวย์'},areas),{})
 assert.deepEqual(validateThaiAddress({},areas),{})
 assert.ok(validateThaiAddress({province:'กระบี่',district:'เมืองภูเก็ต',subdistrict:'ราไวย์'},areas).district)
 assert.ok(validateThaiAddress({houseNumber:'12/34'},areas).province)
})
