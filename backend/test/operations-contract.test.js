import test from 'node:test'
import assert from 'node:assert/strict'
import {convertQuantity,parseStamp,localStamp,componentQuantity,peakUsage,tripNights} from '../../packages/contracts/operations.js'
test('pack and case conversion snapshots exact quantities; absent ratios reject',()=>{
 assert.deepEqual(convertQuantity({baseUnit:'BOTTLE',packSize:12,caseSize:24},2,'PACK'),{quantity:24,enteredQuantity:2,enteredUnit:'PACK',factor:12})
 assert.equal(convertQuantity({baseUnit:'BOTTLE',caseSize:24},3,'CASE').quantity,72)
 for(const q of ['',0,-1,1.5,'2x',Infinity])assert.throws(()=>convertQuantity({baseUnit:'BOTTLE',packSize:12},q,'PACK'))
 assert.throws(()=>convertQuantity({baseUnit:'BOTTLE'},2,'PACK'))
 assert.throws(()=>convertQuantity({baseUnit:'FRUIT',packSize:12},2,'PACK'))
 assert.equal(convertQuantity({baseUnit:'FRUIT'},3,'BASE').quantity,3)
})
test('Thailand timestamps reject impossible dates and calculate actual nights',()=>{
 assert.equal(parseStamp('2026-09-10 08:30').toISOString(),'2026-09-10T01:30:00.000Z')
 assert.equal(localStamp(parseStamp('2026-09-10 00:00')),'2026-09-10 00:00')
 for(const value of ['2026-02-30 08:00','2026-09-10 25:00','09/10/2026',''])assert.throws(()=>parseStamp(value))
 assert.equal(tripNights({startsAt:parseStamp('2026-09-10 08:00'),endsAt:parseStamp('2026-09-12 16:00')}),2)
 assert.equal(componentQuantity({basis:'PER_PERSON_NIGHT',quantity:2},3,1,2),16)
})
test('equipment peak counts overlapping holds but reuses sequential slots',()=>{
 const d=n=>new Date(n*1000)
 assert.equal(peakUsage([{start:d(1),end:d(3),quantity:5},{start:d(3),end:d(5),quantity:7}]),7)
 assert.equal(peakUsage([{start:d(1),end:d(4),quantity:5},{start:d(3),end:d(5),quantity:7}]),12)
})
