import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectTarget} from '../../scripts/local-import/transfer.js'
const source={tables:[{name:'UserProfile',columns:['id'],primary:['id']}]}
const fields=[{name:'id',type:'TEXT',pk:1,notnull:1},{name:'firstName',type:'TEXT',pk:0,notnull:0},{name:'lastName',type:'TEXT',pk:0,notnull:0}]
const db=info=>({prepare:sql=>({all:async()=>({results:sql.startsWith('PRAGMA table_info')?info:[]})})})
test('offline import permits only the reviewed nullable legal-name additions',async()=>{
 assert.deepEqual(await inspectTarget(db(fields),source),{ordered:['UserProfile'],foreignKeys:0})
 await assert.rejects(inspectTarget(db([...fields,{name:'unreviewed'}]),source),/RUNTIME_SCHEMA_DRIFT/)
 await assert.rejects(inspectTarget(db(fields.map(f=>f.name==='firstName'?{...f,notnull:1}:f)),source),/RUNTIME_ADDITIVE_FIELD_DRIFT/)
 await assert.rejects(inspectTarget(db(fields.filter(f=>f.name!=='lastName')),source),/RUNTIME_ADDITIVE_FIELD_DRIFT/)
})
