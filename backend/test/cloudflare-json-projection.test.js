import test from 'node:test'
import assert from 'node:assert/strict'
import {d1ProjectionValues} from '../src/platform/database/json-projection.js'

test('D1 projection values are bounded to requested owners and return a lookup map',async()=>{
 let query
 const db={d1JsonProjection:{findMany:async value=>{query=value;return [{ownerId:'a',textValue:'3'},{ownerId:'b',textValue:'1'}]}}}
 const values=await d1ProjectionValues(db,'OperationDailySnapshot.runs.length',['a','b','a'])
 assert.deepEqual(query,{where:{source:'OperationDailySnapshot.runs.length',ownerId:{in:['a','b']}},select:{ownerId:true,textValue:true}})
 assert.equal(values.get('a'),'3')
 assert.equal(values.get('b'),'1')
})

test('projection values return null outside D1 and skip empty D1 requests',async()=>{
 assert.equal(await d1ProjectionValues({},'x',['a']),null)
 let calls=0
 const db={d1JsonProjection:{findMany:async()=>{calls++;return []}}}
 assert.equal((await d1ProjectionValues(db,'x',[])).size,0)
 assert.equal(calls,0)
})
