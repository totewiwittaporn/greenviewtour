import test from 'node:test'
import {registerHooks} from 'node:module'
registerHooks({load(url,context,next){if(url.endsWith('.wasm?module'))return {format:'module',shortCircuit:true,source:'import {readFileSync} from "node:fs"; export default new WebAssembly.Module(readFileSync(new URL('+JSON.stringify(url.split('?')[0])+')))'};return next(url,context)}})
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync,readdirSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {createD1Prisma} from '../src/platform/database/d1-client.ts'
import {saveOperationCatalog} from '../src/modules/operations/catalog.js'
import {convertQuantity} from '../../packages/contracts/operations.js'
function sqliteBinding(sqlite){
 const result=(sql,args)=>{
  const stmt=sqlite.prepare(sql),before=sqlite.prepare('SELECT total_changes() AS n').get().n
  const results=stmt.columns().length?stmt.all(...args): (stmt.run(...args),[])
  return {success:true,results,meta:{changes:sqlite.prepare('SELECT total_changes() AS n').get().n-before}}
 }
 const prepare=sql=>({sql,args:[],bind(...args){return {...this,args}},async all(){return result(this.sql,this.args)},async run(){return result(this.sql,this.args)},async first(column){const row=result(this.sql,this.args).results[0]||null;return column?row?.[column]:row},async raw(options){const stmt=sqlite.prepare(this.sql),columns=stmt.columns().map(c=>c.name);stmt.setReturnArrays(true);const rows=stmt.all(...this.args);return options?.columnNames?[columns,...rows]:rows}})
 return {prepare,async batch(statements){sqlite.exec('BEGIN');try{const rows=statements.map(s=>result(s.sql,s.args));sqlite.exec('COMMIT');return rows}catch(error){sqlite.exec('ROLLBACK');throw error}}}
}

async function fixture(t){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON')
 const directory=new URL('../prisma-d1/migrations/',import.meta.url)
 for(const file of readdirSync(directory).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL(file,directory),'utf8'))
 const db=createD1Prisma(sqliteBinding(sqlite));t.after(async()=>{await db.$disconnect();sqlite.close()})
 const actor=randomUUID()
 await db.$transaction(async tx=>{
  await tx.role.create({data:{code:'MANAGER',name:'Manager'}})
  await tx.permission.create({data:{code:'users.read',description:'Fixture management'}})
  await tx.rolePermission.create({data:{roleCode:'MANAGER',permissionCode:'users.read'}})
  await tx.authUser.create({data:{id:actor,email:'units@example.test',name:'Unit fixture',emailVerified:true}})
  await tx.userProfile.create({data:{id:actor,displayName:'Unit fixture',roles:{create:{roleCode:'MANAGER',scope:'COMPANY'}}}})
 })
 return {db,actor}
}
const input=(baseUnit,extra={})=>({id:randomUUID(),version:0,code:'UNIT-'+baseUnit,name:'Unit fixture '+baseUnit,status:'INACTIVE',category:'OTHER',baseUnit,...extra})
test('all existing and added consumable units round-trip through catalog validation and SQLite D1 storage',async t=>{
 const {db,actor}=await fixture(t)
 for(const baseUnit of ['BOTTLE','FRUIT','PIECE','SACK','TIN','BUCKET']){
  const value=input(baseUnit),{row}=await saveOperationCatalog(db,actor,'consumables',value)
  const stored=await db.operationResource.findUnique({where:{id:row.id}})
  assert.equal(stored.baseUnit,baseUnit);assert.equal(stored.status,'INACTIVE')
  assert.equal(stored.salePrice,null);assert.equal(stored.costPrice,null)
  assert.equal(stored.packSize,null);assert.equal(stored.caseSize,null)
  assert.equal((await saveOperationCatalog(db,actor,'consumables',value)).row.id,row.id)
 }
 assert.equal(await db.operationResource.count(),6)
 assert.equal(await db.stockLot.count(),0)
})
test('unknown units, incompatible categories and invented package ratios fail without records',async t=>{
 const {db,actor}=await fixture(t)
 for(const unit of ['KG','GRAM','UNKNOWN','sack'])await assert.rejects(saveOperationCatalog(db,actor,'consumables',input(unit)),{code:'INVALID_SETTINGS'})
 for(const unit of ['SACK','TIN','BUCKET']){
  for(const category of ['WATER','SOFT_DRINK','JUICE','WATERMELON','PINEAPPLE'])await assert.rejects(saveOperationCatalog(db,actor,'consumables',input(unit,{category})),{code:'INVALID_UNIT'})
  for(const field of ['packSize','caseSize'])await assert.rejects(saveOperationCatalog(db,actor,'consumables',input(unit,{[field]:'12'})),{code:'INVALID_UNIT'})
  assert.deepEqual(convertQuantity({baseUnit:unit},3,'BASE'),{quantity:3,enteredQuantity:3,enteredUnit:'BASE',factor:1})
  for(const enteredUnit of ['PACK','CASE','KG','GRAM'])assert.throws(()=>convertQuantity({baseUnit:unit,packSize:12,caseSize:24},2,enteredUnit),/UNIT_NOT_CONFIGURED/)
  for(const quantity of [0,-1,1.5])assert.throws(()=>convertQuantity({baseUnit:unit},quantity,'BASE'))
 }
 assert.equal(await db.operationResource.count(),0)
 assert.equal(convertQuantity({baseUnit:'BOTTLE',packSize:12},2,'PACK').quantity,24)
 assert.equal(convertQuantity({baseUnit:'BOTTLE',caseSize:24},2,'CASE').quantity,48)
})
