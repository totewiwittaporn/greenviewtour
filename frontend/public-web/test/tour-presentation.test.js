import test from 'node:test'
import assert from 'node:assert/strict'
import {componentBasisText,componentSelectionText,journeyText,packageComponents} from '../src/features/catalog/tourPresentation.js'

const english={
  'ไป–กลับตามโปรแกรม':'Fixed return itinerary',
  'ไป–กลับแบบ Open Return':'Open return',
  'เที่ยวเดียว · ขาไป':'Outbound only',
  'เที่ยวเดียว · ขากลับ':'Return only',
  'รวมในแพ็กเกจ':'Included',
  'รวมและจำเป็น':'Included · required',
  'บริการเสริม':'Optional services',
  'ไม่รวม':'Not included',
  'ต่อคน':'per person',
  'ต่อการจอง':'per booking',
}
const t=value=>english[value]||value

test('journey labels expose the persisted journey mode without inventing a duration',()=>{
  assert.equal(journeyText('FIXED',t),'Fixed return itinerary')
  assert.equal(journeyText('OPEN_RETURN',t),'Open return')
  assert.equal(journeyText('OUTBOUND_ONLY',t),'Outbound only')
  assert.equal(journeyText('RETURN_ONLY',t),'Return only')
  assert.equal(journeyText('UNKNOWN',t),'')
})

test('program components keep package semantics separated for Public rendering',()=>{
  const tour={components:[
    {id:'required',selection:'REQUIRED',resource:{name:'Boat'}},
    {id:'included',selection:'INCLUDED',resource:{name:'Lunch'}},
    {id:'optional',selection:'OPTIONAL',resource:{name:'Transfer'}},
    {id:'excluded',selection:'EXCLUDED',resource:{name:'Park fee'}},
    {id:'invalid',selection:'OPTIONAL',resource:null},
  ]}
  const grouped=packageComponents(tour)
  assert.deepEqual(grouped.included.map(row=>row.id),['required','included'])
  assert.deepEqual(grouped.optional.map(row=>row.id),['optional'])
  assert.deepEqual(grouped.excluded.map(row=>row.id),['excluded'])
  assert.equal(componentSelectionText('REQUIRED',t),'Included · required')
  assert.equal(componentSelectionText('OPTIONAL',t),'Optional services')
  assert.equal(componentBasisText('PER_PERSON',t),'per person')
  assert.equal(componentBasisText('PER_BOOKING',t),'per booking')
})
