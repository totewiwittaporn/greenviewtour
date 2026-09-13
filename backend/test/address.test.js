import test from 'node:test'
import assert from 'node:assert/strict'
import { addressKeys,validateAddress,safeMapUrl,mapLinks,formatAddress } from '../../packages/contracts/address.js'
import { initialValues,validateCatalog } from '../../packages/contracts/catalog.js'
import { validateProfilePatch } from '../src/modules/identity-access/user-management.js'
test('structured addresses persist in company, partner, pickup and profile contracts without losing legacy address',()=>{
 const address={province:'ภูเก็ต',district:'เมืองภูเก็ต',subdistrict:'ราไวย์',postalCode:'83130',houseNumber:'12/34',moo:'5',villageName:'บ้านตัวอย่าง',mapUrl:'https://maps.app.goo.gl/example',latitude:'7.8',longitude:'98.3'}
 for(const entity of ['company','partners','locations']){
  const result=validateCatalog(entity,{...initialValues(entity),name:'Fixture',code:'FIX',roles:['SALES_AGENT'],address:'Legacy address',...address})
  assert.deepEqual(result.errors,{});assert.equal(result.data.address,'Legacy address')
  for(const key of addressKeys)assert.equal(result.data[key],address[key])
 }
 const patch=validateProfilePatch({displayName:'Fixture',updatedAt:new Date().toISOString(),address:'Legacy address',...address},{company:false})
 assert.equal(patch.province,'ภูเก็ต');assert.equal(patch.address,'Legacy address')
 assert.match(formatAddress(address),/12\/34.*5.*ราไวย์.*ภูเก็ต/)
})
test('map links accept real Google Maps hosts and reject unsafe, misleading and oversized links',()=>{
 for(const value of ['https://maps.app.goo.gl/abc','https://www.google.com/maps/place/Rawai','https://goo.gl/maps/abc','https://maps.google.com/?q=Phuket'])assert.ok(safeMapUrl(value))
 for(const value of ['javascript:alert(1)','http://maps.google.com/','https://maps.google.com.evil.example/','https://evil.example/?google.com/maps','https://www.google.com/search?q=map','https://user:pass@maps.google.com/','https://maps.app.goo.gl:444/abc',`https://maps.app.goo.gl/${'a'.repeat(2048)}`]){assert.equal(safeMapUrl(value),null);assert.ok(validateAddress({mapUrl:value}).mapUrl)}
})
test('coordinates are paired, bounded and encoded; zero is a valid coordinate',()=>{
 assert.ok(validateAddress({latitude:'7.8'}).latitude)
 assert.ok(validateAddress({latitude:'91',longitude:'98'}).latitude)
 assert.ok(validateAddress({latitude:'7',longitude:'181'}).longitude)
 assert.deepEqual(validateAddress({latitude:'0',longitude:'0'}),{})
 assert.match(mapLinks({latitude:'0',longitude:'0'}).directions,/destination=0%2C0/)
 assert.equal(mapLinks({mapUrl:'javascript:alert(1)'}).pin,null)
})
