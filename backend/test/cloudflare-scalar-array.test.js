import test from 'node:test'
import assert from 'node:assert/strict'
import {scalarArrayWhere,isD1ArrayLookup} from '../src/platform/database/scalar-array.js'

test('scalar array filters preserve PostgreSQL native has/hasSome while baseline remains active',async()=>{
 const pg={}
 assert.equal(isD1ArrayLookup(pg,'BusinessPartner.roles'),false)
 assert.deepEqual(await scalarArrayWhere(pg,'BusinessPartner.roles','SALES_AGENT'),{roles:{has:'SALES_AGENT'}})
 assert.deepEqual(await scalarArrayWhere(pg,'CapacityPool.resourceIds',['a','b'],{mode:'hasSome'}),{resourceIds:{hasSome:['a','b']}})
})

test('D1 scalar array filters resolve lookup owner ids and deduplicate results',async()=>{
 let query
 const db={d1BusinessPartnerRole:{findMany:async value=>{query=value;return [{ownerId:'p1'},{ownerId:'p1'},{ownerId:'p2'}]}}}
 assert.equal(isD1ArrayLookup(db,'BusinessPartner.roles'),true)
 assert.deepEqual(await scalarArrayWhere(db,'BusinessPartner.roles','SALES_AGENT'),{id:{in:['p1','p2']}})
 assert.deepEqual(query,{where:{value:'SALES_AGENT'},select:{ownerId:true}})
})

test('D1 lookup maps non-id owners and hasSome without leaking JSON predicates',async()=>{
 let query
 const db={d1WarehouseResponsibilityDeputy:{findMany:async value=>{query=value;return [{ownerId:'store-a'}]}}}
 assert.deepEqual(await scalarArrayWhere(db,'WarehouseResponsibility.deputyUserIds','user-a'),{storeId:{in:['store-a']}})
 assert.deepEqual(query.where,{value:'user-a'})
 const pool={d1CapacityPoolResource:{findMany:async value=>{query=value;return [{ownerId:'pool-a'}]}}}
 assert.deepEqual(await scalarArrayWhere(pool,'CapacityPool.resourceIds',['r1','r2'],{mode:'hasSome'}),{id:{in:['pool-a']}})
 assert.deepEqual(query.where,{value:{in:['r1','r2']}})
})

test('invalid scalar array lookup requests fail closed',async()=>{
 await assert.rejects(()=>scalarArrayWhere({},'Unknown.field','x'),/INVALID_SCALAR_ARRAY_LOOKUP/)
 await assert.rejects(()=>scalarArrayWhere({},'BusinessPartner.roles','x',{mode:'every'}),/INVALID_SCALAR_ARRAY_LOOKUP/)
})
