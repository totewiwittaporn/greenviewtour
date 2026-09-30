import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rmdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {parseExact,exactJSON,ExactNumber,convertValue,schemaModels,decodeCopy,decimalSum} from '../../scripts/local-import/values.js'
import {copyNulls} from '../../scripts/local-import/source.js'
import {acquireLock} from '../../scripts/local-cloudflare-safety.js'
import {createGuardedD1Adapter,guardD1Transactions} from '../src/platform/database/d1-adapter.js'
const field=(type,extra={})=>({name:'value',type,optional:false,array:false,attributes:'',precision:null,scale:null,maxLength:null,...extra})
test('migration JSON keeps exact large integers and decimals instead of JS rounding',()=>{
 const value=parseExact('{"n":12345678901234567890.123456,"list":[0.1,0.2],"text":"001"}')
 assert.equal(value.n.text,'12345678901234567890.123456')
 assert.equal(exactJSON(value),'{"list":[0.1,0.2],"n":12345678901234567890.123456,"text":"001"}')
 assert.equal(decimalSum([new ExactNumber('0.1'),new ExactNumber('0.2')]),'0.30')
})
test('D1 money conversion validates precision and never rounds a source value',()=>{
 const money=field('Decimal',{precision:14,scale:2})
 assert.equal(convertValue(new ExactNumber('999999999999.99'),money),'999999999999.99')
 assert.equal(convertValue(new ExactNumber('0.1'),money),'0.10')
 assert.throws(()=>convertValue(new ExactNumber('1.001'),money),/DECIMAL_PRECISION_LOSS/)
 assert.throws(()=>convertValue(new ExactNumber('1000000000000'),money),/DECIMAL_PRECISION_LOSS/)
 assert.throws(()=>convertValue(null,money),/REQUIRED_VALUE_NULL/)
})
test('date-only stays on the same business day and timestamps retain the instant',()=>{
 const date=field('DateTime',{attributes:'@db.Date'}),timestamp=field('DateTime',{attributes:'@db.Timestamptz(6)'})
 assert.equal(convertValue('2026-10-15',date),'2026-10-15T00:00:00.000+00:00')
 assert.equal(convertValue('2026-10-15T00:00:00.12+07:00',timestamp),'2026-10-14T17:00:00.120+00:00')
 assert.throws(()=>convertValue('2026-02-30',date),/INVALID_DATE_ONLY/)
 assert.throws(()=>convertValue('2026-10-15T00:00:00.123456+00:00',timestamp),/SUBMILLISECOND_REVIEW_REQUIRED/)
 assert.throws(()=>convertValue('2026-10-15T00:00:00',timestamp),/EXPLICIT_TIMEZONE_REQUIRED/)
})
test('JSON null and SQL NULL remain distinct',()=>{
 const json=field('Json',{optional:true})
 assert.equal(convertValue(null,json,{sqlNull:true}),null)
 assert.equal(convertValue(null,json,{sqlNull:false}),'null')
 assert.equal(convertValue(parseExact('{"amount":0.1,"nullable":null}'),json),' {"amount":0.1,"nullable":null}'.trim())
})
test('native constraints fail early rather than coercing invalid source values',()=>{
 assert.equal(convertValue(true,field('Boolean')),1)
 assert.throws(()=>convertValue(1,field('Boolean')),/BOOLEAN_REQUIRED/)
 assert.throws(()=>convertValue(new ExactNumber('2147483648'),field('Int')),/INTEGER_RANGE/)
 assert.throws(()=>convertValue('not-a-uuid',field('String',{attributes:'@db.Uuid'})),/INVALID_UUID/)
 assert.throws(()=>convertValue('INVALID',field('AccountStatus',{values:['ACTIVE','SUSPENDED']})),/INVALID_ENUM/)
 assert.equal(convertValue(['ไทย','EN'],field('String',{array:true})),'["ไทย","EN"]')
 assert.throws(()=>convertValue(['ไทย',1],field('String',{array:true})),/INVALID_SCALAR_ARRAY/)
 assert.throws(()=>convertValue('abcd',field('String',{maxLength:3})),/TEXT_LENGTH_EXCEEDED/)
})
test('pg_dump COPY restores SQL-null metadata by primary key rather than row order',()=>{
 const models=schemaModels('model Example {\n id String @id\n payload Json?\n}\n')
 const copy='COPY app_private."Example" (id, payload) FROM stdin;\na\t\\N\nb\tnull\n\\.\n'
 const index=copyNulls(copy,models).get('Example')
 assert.equal(index.get('["a"]').has('payload'),true)
 assert.equal(index.get('["b"]').has('payload'),false)
 assert.equal(decodeCopy('left\\tright'),'left\tright')
 assert.equal(decodeCopy('\\N'),null)
 assert.equal(decodeCopy('\\\\N'),'\\N')
})
test('concurrent local state operations are locked without deleting another owner lock',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'greenview-lock-test-')),lock=path.join(directory,'state.lock')
 const release=await acquireLock(lock,'test-owner')
 await assert.rejects(()=>acquireLock(lock,'second-owner'),/LOCAL_STATE_BUSY/)
 await release();const again=await acquireLock(lock,'next-owner');await again();await rmdir(directory)
})
test('Prisma D1 adapter rejects interactive and implicit transactions before sending SQL',async()=>{
 let requests=0
 const factory=createGuardedD1Adapter({prepare(){requests++;throw new Error('NO_SQL_EXPECTED')}})
 const adapter=await factory.connect()
 await assert.rejects(()=>adapter.startTransaction('SERIALIZABLE'),/D1_ATOMIC_BATCH_REQUIRED/)
 assert.equal(requests,0);await adapter.dispose()
})
test('data migration CLI denies arbitrary remote flags and Production context',()=>{
 for(const [args,env,code] of [
  [['apply','--remote'],process.env,'LOCAL_DATA_COMMAND_REQUIRED'],
  [['apply','--source','/tmp/unused'],{...process.env,NODE_ENV:'production'},'PRODUCTION_CONTEXT_FORBIDDEN'],
 ])assert.throws(()=>execFileSync(process.execPath,[fileURLToPath(new URL('../../scripts/local-data.js',import.meta.url)),...args],{env,stdio:'pipe'}),error=>error.status===1&&error.stderr.toString().includes(code))
})

test('public D1 transaction guard never evaluates the callback or underlying transaction',async()=>{
 let calls=0
 const client=guardD1Transactions({value:7,$transaction:async fn=>{calls++;return fn()}})
 await assert.rejects(()=>client.$transaction(async()=>{calls++;return true}),/D1_ATOMIC_BATCH_REQUIRED/)
 assert.equal(calls,0);assert.equal(client.value,7)
})
