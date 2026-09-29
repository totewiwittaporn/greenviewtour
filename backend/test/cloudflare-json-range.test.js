import test from 'node:test'
import assert from 'node:assert/strict'
import {jsonRangeWhere,isD1JsonProjection} from '../src/platform/database/json-range.js'

test('JSON range keeps PostgreSQL path filters on the baseline client',async()=>{
 const db={}
 assert.equal(isD1JsonProjection(db),false)
 assert.deepEqual(await jsonRangeWhere(db,'FinancePersonnelRecord.payload.dueOn',{lt:'2026-10-01'}),{payload:{path:['dueOn'],lt:'2026-10-01'}})
 assert.deepEqual(await jsonRangeWhere(db,'CustomerRequest.snapshot.payment.receivedOn',{gte:'2026-09-01'}),{snapshot:{path:['payment','receivedOn'],gte:'2026-09-01'}})
})

test('D1 JSON range resolves indexed projection owner ids',async()=>{
 let query
 const db={d1JsonProjection:{findMany:async value=>{query=value;return [{ownerId:'a'},{ownerId:'a'},{ownerId:'b'}]}}}
 assert.equal(isD1JsonProjection(db),true)
 assert.deepEqual(await jsonRangeWhere(db,'FinancePersonnelRecord.payment.paidOn',{gte:'2026-09-01',lte:'2026-09-30'}),{id:{in:['a','b']}})
 assert.deepEqual(query,{where:{source:'FinancePersonnelRecord.payment.paidOn',textValue:{gte:'2026-09-01',lte:'2026-09-30'}},select:{ownerId:true}})
})

test('JSON range rejects unknown projections, operators and non-string dates',async()=>{
 await assert.rejects(()=>jsonRangeWhere({},'Unknown.path',{lt:'x'}),/INVALID_JSON_RANGE_LOOKUP/)
 await assert.rejects(()=>jsonRangeWhere({},'FinancePersonnelRecord.payload.dueOn',{equals:'x'}),/INVALID_JSON_RANGE_LOOKUP/)
 await assert.rejects(()=>jsonRangeWhere({},'FinancePersonnelRecord.payload.dueOn',{lt:new Date()}),/INVALID_JSON_RANGE_LOOKUP/)
})
