import test from 'node:test'
import assert from 'node:assert/strict'
import {d1QueryArgs} from '../src/platform/database/d1-query.js'

test('D1 query compatibility removes Prisma PostgreSQL insensitive mode recursively',()=>{
 const date=new Date('2026-09-29T00:00:00Z')
 const input={where:{OR:[{name:{contains:'TeSt',mode:'insensitive'}},{agent:{name:{contains:'A',mode:'insensitive'}}}],details:{path:['nested','value'],equals:7},createdAt:{gte:date}},take:25}
 const output=d1QueryArgs(input)
 assert.deepEqual(output,{where:{OR:[{name:{contains:'TeSt'}},{agent:{name:{contains:'A'}}}],details:{path:'$.nested.value',equals:7},createdAt:{gte:date}},take:25})
 assert.equal(output.where.createdAt.gte,date)
 assert.equal(input.where.OR[0].name.mode,'insensitive')
})

test('D1 query compatibility preserves unrelated mode-like values and binary inputs',()=>{
 const bytes=new Uint8Array([1,2,3])
 assert.deepEqual(d1QueryArgs({mode:'strict',data:bytes}),{mode:'strict',data:bytes})
 assert.equal(d1QueryArgs({data:bytes}).data,bytes)
})

test('D1 JSON paths fail closed when a dynamic path is not a simple owned identifier',()=>{
 assert.throws(()=>d1QueryArgs({where:{details:{path:['ok','bad-key'],equals:1}}}),/D1_JSON_PATH_UNSUPPORTED/)
 assert.throws(()=>d1QueryArgs({where:{details:{path:[],equals:1}}}),/D1_JSON_PATH_UNSUPPORTED/)
})
