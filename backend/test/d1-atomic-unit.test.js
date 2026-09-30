import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {tokens,mutation} from '../src/platform/database/atomic/sql.js'
import {d1SearchQuery} from '../src/platform/database/atomic/search.js'
import {d1ModelArgs} from '../src/platform/database/atomic/model-args.js'
import {numericValue,decimalAssignment,queryWithOverlay} from '../src/platform/database/atomic/overlay.js'
import {D1AtomicPlanner} from '../src/platform/database/atomic/planner.js'
import {atomicUnit,registerAtomicFactory,readOnlyFiles} from '../src/platform/database/atomic/executor.js'
import {registerD1Client} from '../src/platform/database/d1-runtime.js'
import {schema} from '../src/platform/database/atomic/schema.js'
import {notificationFor} from '../src/modules/notifications/service.js'
const scalar=(db,sql,args)=>db.prepare(sql).get(Object.fromEntries(args.map((value,i)=>[String(i+1),value]))).matched

test('long LIKE patterns retain SQLite wildcard, unicode, null and escape semantics',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  const long='Greenview Tour KuraBuri '.repeat(4),thai='เที่ยวหมู่เกาะสุรินทร์'.repeat(3)
  const values=[long,long+' suffix','prefix '+long,'prefix '+long+' suffix',long.toUpperCase(),thai,'prefix '+thai+' suffix',long+'x'+long,long+'_'+long,null,'',"O'Brien "+long]
  const patterns=[long,'%'+long+'%',long+'%','%'+long,'%'+long+'%suffix','%'+long+'_%','%'+long+'%'+long+'%',thai,'%'+thai+'%',thai.slice(0,-1)+'_',"%O'Brien "+long+'%',long+'\\_%','%'+long+'\\%']
  let comparisons=0
  for(const escape of [''," ESCAPE '\\'"])for(const pattern of patterns)for(const value of values){
   const args=[value,pattern],raw={sql:'SELECT ?1 LIKE ?2'+escape+' AS matched',args}
   const rewritten=d1SearchQuery(raw)
   assert.equal(scalar(db,rewritten.sql,args),scalar(db,raw.sql,args),JSON.stringify({value,pattern,escape}));comparisons++
   const negative={...raw,sql:'SELECT ?1 NOT LIKE ?2'+escape+' AS matched'}
   assert.equal(scalar(db,d1SearchQuery(negative).sql,args),scalar(db,negative.sql,args))
  }
  assert.ok(comparisons>250)
 }finally{db.close()}
})

test('Prisma concatenated long LIKE uses original bindings and never interpolates user text',()=>{
 const value="เกาะสุรินทร์ O'Brien".repeat(4),query={sql:"SELECT ? LIKE ('%' || ? || '%') AS matched",args:['prefix '+value+' suffix',value]}
 const compiled=d1SearchQuery(query)
 assert.ok(!compiled.sql.includes(value));assert.equal(compiled.args,query.args)
 const db=new DatabaseSync(':memory:');try{assert.equal(scalar(db,compiled.sql,query.args),1)}finally{db.close()}
})

test('short LIKE queries stay native and excessive patterns fail explicitly',()=>{
 const query={sql:'SELECT ?1 LIKE ?2',args:['hello','%ell%']};assert.equal(d1SearchQuery(query),query)
 assert.throws(()=>d1SearchQuery({sql:'SELECT ?1 LIKE ?2',args:['x','x'.repeat(1025)]}),/D1_SEARCH_PATTERN_TOO_LONG/)
})

test('query tokenization preserves quoted values and blocks multiple statements',()=>{
 assert.doesNotThrow(()=>tokens("SELECT ';not an injection' AS \"semi;colon\""))
 assert.throws(()=>tokens('SELECT 1; DELETE FROM Role'),/D1_SINGLE_STATEMENT_REQUIRED/)
 assert.deepEqual(tokens('SELECT ?, ?4, ?').filter(t=>t.kind==='parameter').map(t=>t.index),[0,3,4])
 assert.equal(mutation('SELECT * FROM Role'),null)
 const update=mutation('UPDATE "Role" SET "name"=? WHERE "code"=? RETURNING "code","name"')
 assert.equal(update.kind,'UPDATE');assert.equal(update.table,'Role');assert.equal(update.assignments[0].field,'name');assert.equal(update.returning.length,3)
 const insert=mutation('INSERT INTO "Role" ("code","name") VALUES (?,?) ON CONFLICT ("code") DO UPDATE SET "name"=excluded."name" RETURNING "code"')
 assert.equal(insert.conflict.action,'UPDATE');assert.deepEqual(insert.conflict.keys,['code'])
})

test('write overlays bind data and preserve the backing-table anti-join',()=>{
 const changes=new Map([['Role',new Map([['id',{code:"O'Brien",name:'private input',__deleted:0}]])]])
 const compiled=queryWithOverlay('SELECT * FROM "main"."Role" WHERE "code"=?',["O'Brien"],changes)
 assert.equal(compiled.args.length,1);assert.ok(compiled.sql.includes('NOT EXISTS'))
 assert.ok(!compiled.sql.includes('private input'));assert.ok(!compiled.sql.includes("O'Brien"))
 assert.equal(JSON.parse(compiled.args[0]).tables.Role[0].code,"O'Brien")
 assert.throws(()=>queryWithOverlay('SELECT ?',['x'.repeat(1800000)],new Map()),/D1_UNIT_SIZE_LIMIT/)
})

test('money assignments are decimal exact and reject scale or range loss',()=>{
 assert.equal(decimalAssignment(tokens('"paid" + ?1'),{paid:'0.10'},['0.20']),'0.3')
 assert.equal(numericValue('0.3',{nativeArgs:[14,2]}),'0.30')
 assert.equal(numericValue('999999999999.99',{nativeArgs:[14,2]}),'999999999999.99')
 for(const value of ['0.001','1000000000000','Infinity','NaN'])assert.throws(()=>numericValue(value,{nativeArgs:[14,2]}),/D1_DECIMAL_OUT_OF_RANGE/)
})

test('schema-aware JSON arguments preserve literal mode/path and normalize only UUID fields',()=>{
 const literal={mode:'insensitive',path:['literal'],value:1}
 assert.deepEqual(d1ModelArgs('AuditEvent',{data:{details:literal},where:{details:{equals:literal}}}),{data:{details:literal},where:{details:{equals:literal}}})
 const uuid='AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'
 assert.equal(d1ModelArgs('UserProfile',{where:{id:uuid}}).where.id,uuid.toLowerCase())
 assert.deepEqual(d1ModelArgs('AuditEvent',{where:{details:{path:['name'],string_contains:'x',mode:'insensitive'}}}).where.details,{path:'$.name',string_contains:'x'})
})

test('read-only units and unrecognized write SQL fail before any database change',async()=>{
 let calls=0
 const planner=new D1AtomicPlanner({prepare(){calls++;throw new Error('unexpected IO')}},{readOnly:true})
 await assert.rejects(()=>planner.execute('INSERT INTO Role(code,name) VALUES(?,?)',['a','b']),/D1_READ_ONLY_UNIT/)
 await assert.rejects(()=>planner.execute('DROP TABLE Role',[]),/D1_READ_STATEMENT_REQUIRED/)
 assert.equal(calls,0);assert.equal(planner.statements.length,0)
})

test('a stale read snapshot retries the complete callback rather than returning mixed data',async()=>{
 let reads=0,callbacks=0,disconnections=0
 const db={prepare(){return {first:async()=>({version:++reads===1?1:2})}}},client={}
 registerD1Client(client,db)
 registerAtomicFactory(client,planner=>({value:planner.version,$disconnect:async()=>{disconnections++}}))
 const value=await atomicUnit(client,async tx=>{callbacks++;return tx.value},{readOnly:true})
 assert.equal(value,2);assert.equal(callbacks,2);assert.equal(disconnections,2)
})

test('external object writes are prohibited inside a retried database callback',()=>{
 let calls=0;const bucket={get(){calls++;return 'object'},put(){calls++;},delete(){calls++;}}
 const files=readOnlyFiles(bucket)
 assert.equal(files.get('x'),'object')
 assert.throws(()=>files.put('x','bad'),/D1_EXTERNAL_WRITE_INSIDE_UNIT/)
 assert.throws(()=>files.delete('x'),/D1_EXTERNAL_WRITE_INSIDE_UNIT/)
 assert.equal(calls,1)
})

test('generated unit metadata matches the reviewed schema and immutable migrations',()=>{
 for(const [name,digest] of Object.entries(schema.hashes)){
  const file=name==='source'?'../prisma/schema.prisma':name==='target'?'../prisma-d1/schema.prisma':'../prisma-d1/migrations/'+name
  assert.equal(createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex'),digest)
 }
 assert.equal(Object.keys(schema.tables).length,76)
 assert.equal(schema.tables.UserProfile.columns.find(c=>c.name==='id').native,'Uuid')
 assert.equal(schema.tables.AgentBill.columns.find(c=>c.name==='total').nativeArgs[0],14)
})

test('audit events without a target never request an invalid unique lookup',async()=>{
 const db=new Proxy({},{get(){throw new Error('no entity lookup permitted')}})
 assert.equal(await notificationFor(db,{id:'actor'},{action:'personnelFinance.payroll.exported',targetId:null}),null)
})

test('identity migration preserves existing rows and accepts missing source dates without inventing timestamps',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  for(const name of ['0001_baseline.sql','0002_scalar_array_lookups.sql','0003_json_range_projections.sql','0004_atomic_unit_of_work.sql','0005_json_projection_null_values.sql'])db.exec(readFileSync(new URL('../prisma-d1/migrations/'+name,import.meta.url),'utf8'))
  db.prepare('INSERT INTO D1Identity(id,email,created_at) VALUES(?,?,?)').run('qa-existing','old@example.test','2026-01-01T00:00:00.000+00:00')
  const before=db.prepare('SELECT * FROM D1Identity').all()
  db.exec(readFileSync(new URL('../prisma-d1/migrations/0006_identity_optional_created_at.sql',import.meta.url),'utf8'))
  assert.deepEqual(db.prepare('SELECT * FROM D1Identity').all(),before)
  const version=db.prepare('SELECT version FROM D1TxnRevision WHERE id=1').get().version
  db.prepare('INSERT INTO D1Identity(id,email,created_at) VALUES(?,?,?)').run('qa-no-date','missing@example.test',null)
  assert.equal(db.prepare('SELECT created_at FROM D1Identity WHERE id=?').get('qa-no-date').created_at,null)
  assert.equal(db.prepare('SELECT version FROM D1TxnRevision WHERE id=1').get().version,version+1)
  assert.equal(db.prepare('SELECT id FROM D1Identity ORDER BY created_at DESC NULLS FIRST LIMIT 1').get().id,'qa-no-date')
  assert.throws(()=>db.prepare('INSERT INTO D1Identity(id,email,created_at) VALUES(?,?,?)').run('qa-duplicate','MISSING@example.test',null),/UNIQUE/)
 }finally{db.close()}
})
