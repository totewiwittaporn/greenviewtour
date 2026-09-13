import test from 'node:test'
import assert from 'node:assert/strict'
import {initialValues,validateCatalog,visibleField} from '../../packages/contracts/catalog.js'
const fixture=(entity,changes={})=>({...initialValues(entity),code:'QA-MASTER',name:'Master test',...changes})
test('meal and park accommodation settings preserve verification boundary',()=>{
 const meal=fixture('services',{category:'MEAL',baseUnit:'PERSON_MEAL',ownership:'PARK',mealPeriod:'LUNCH'})
 assert.deepEqual(validateCatalog('services',meal).errors,{})
 assert.ok(validateCatalog('services',{...meal,mealPeriod:''}).errors.mealPeriod)
 const room=fixture('services',{category:'ACCOMMODATION',baseUnit:'ROOM_NIGHT',ownership:'PARK',accommodationType:'STANDARD_TENT',status:'INACTIVE'})
 assert.deepEqual(validateCatalog('services',room).errors,{})
 assert.ok(validateCatalog('services',{...room,status:'ACTIVE',occupancy:'4'}).errors.accommodationType)
 assert.deepEqual(validateCatalog('services',{...room,status:'ACTIVE',occupancy:'4',verificationStatus:'VERIFIED'}).errors,{})
 assert.equal(visibleField({key:'mealPeriod'},{category:'ACCOMMODATION'}),false)
})
test('fleet capacity includes crew, engine counts and external commission are validated',()=>{
 const boat=fixture('vehicles',{kind:'SPEEDBOAT',capacity:'30',totalCapacity:'33',expectedCrew:'3',engineCount:'2',purposes:[]})
 assert.deepEqual(validateCatalog('vehicles',boat).errors,{})
 assert.ok(validateCatalog('vehicles',{...boat,totalCapacity:'32'}).errors.totalCapacity)
 assert.ok(validateCatalog('vehicles',{...boat,engineCount:'5'}).errors.engineCount)
 const car={...boat,kind:'VAN',ownership:'PARTNER',providerId:'11111111-1111-1111-1111-111111111111',purposes:['PASSENGER_TRANSFER','CARGO'],commissionType:'PERCENT',commissionValue:'10'}
 assert.deepEqual(validateCatalog('vehicles',car).errors,{})
 assert.equal(validateCatalog('vehicles',car).data.engineCount,null)
 assert.ok(validateCatalog('vehicles',{...car,commissionValue:'101'}).errors.commissionValue)
 assert.ok(validateCatalog('vehicles',{...car,commissionType:''}).errors.commissionValue)
})
test('lifejackets can be configured without inventing stock or size',()=>{
 const lifejacket=fixture('equipment',{category:'LIFEJACKET',baseUnit:'PIECE',status:'INACTIVE'})
 assert.deepEqual(validateCatalog('equipment',lifejacket).errors,{})
})
