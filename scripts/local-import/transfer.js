import {Prisma} from '@prisma/client'
import {verifyDerived} from './derived.js'
import {R2FileStore} from '../../backend/src/platform/files/r2.js'
import {fail,hash,quote,keyFor,sameNames,parseExact,exactJSON,decimalSum} from './values.js'
async function readAll(db,name,primary=['ownerId','value']){
  const rows=[]
  for(let offset=0;;offset+=250){
    const page=(await db.prepare(`SELECT * FROM ${quote(name)} ORDER BY ${primary.map(quote).join(',')} LIMIT 250 OFFSET ?`).bind(offset).all()).results
    rows.push(...page);if(page.length<250)return rows
  }
}
export async function inspectTarget(db,source){
  const dependencies=new Map();let foreignKeys=0
  for(const table of source.tables){
    const info=(await db.prepare(`PRAGMA table_info(${quote(table.name)})`).all()).results
    const additive=table.name==='UserProfile'?['firstName','lastName']:table.name==='CompanySettings'?['lineId','instagramUrl']:[]
    if(additive.some(name=>{const field=info.find(column=>column.name===name);return !field||field.type!=='TEXT'||field.notnull||field.pk}))fail('RUNTIME_ADDITIVE_FIELD_DRIFT:'+table.name)
    if(!sameNames(info.map(column=>column.name).filter(name=>!additive.includes(name)),table.columns))fail('RUNTIME_SCHEMA_DRIFT:'+table.name)
    const primary=info.filter(column=>column.pk).sort((a,b)=>a.pk-b.pk).map(column=>column.name)
    if(JSON.stringify(primary)!==JSON.stringify(table.primary))fail('RUNTIME_PRIMARY_KEY_DRIFT:'+table.name)
    const fks=(await db.prepare(`PRAGMA foreign_key_list(${quote(table.name)})`).all()).results
    foreignKeys+=fks.length;dependencies.set(table.name,new Set(fks.map(fk=>fk.table)))
  }
  const ordered=[]
  while(dependencies.size){
    const ready=[...dependencies].filter(([,deps])=>[...deps].every(name=>ordered.includes(name))).map(([name])=>name).sort()
    if(!ready.length)fail('CYCLIC_FOREIGN_KEY_REVIEW_REQUIRED')
    for(const name of ready){ordered.push(name);dependencies.delete(name)}
  }
  return {ordered,foreignKeys}
}
export async function importData(source,env){
  if(env.APP_ENV!=='local')fail('LOCAL_IMPORT_ONLY')
  const db=env.DB,{ordered,foreignKeys}=await inspectTarget(db,source)
  for(const table of source.tables){
    const count=await db.prepare(`SELECT COUNT(*) AS n FROM ${quote(table.name)}`).first()
    if(count.n!==0)fail('TARGET_NOT_EMPTY:'+table.name)
  }
  if((await env.FILES.list({limit:1})).objects.length)fail('TARGET_R2_NOT_EMPTY')
  const store=new R2FileStore(env.FILES)
  for(const file of source.files){
    const result=await store.putIfAbsent(file.objectKey,file.content,{mimeType:file.mimeType,sha256:file.sha256})
    if(!result.created)fail('UNEXPECTED_EXISTING_R2_OBJECT')
  }
  let loaded=0
  for(const name of ordered){
    const table=source.tables.find(item=>item.name===name)
    const sql=`INSERT INTO ${quote(name)} (${table.columns.map(quote).join(',')}) VALUES (${table.columns.map(()=>'?').join(',')})`
    for(let offset=0;offset<table.rows.length;offset+=25){
      const statements=table.rows.slice(offset,offset+25).map(row=>db.prepare(sql).bind(...table.columns.map(column=>row[column])))
      await db.batch(statements);loaded+=statements.length
    }
  }
  return {loaded,foreignKeys}
}
function normalized(value,field){
  if(value===null)return null
  if(field.array||field.type==='Json')return exactJSON(parseExact(typeof value==='string'?value:JSON.stringify(value)))
  if(field.type==='Decimal')return new Prisma.Decimal(String(value)).toFixed(field.scale)
  return value
}
export async function verifyData(source,env){
  if(env.APP_ENV!=='local')fail('LOCAL_VERIFY_ONLY')
  const {foreignKeys}=await inspectTarget(env.DB,source),tables=[],money=[],integers=[]
  for(const table of source.tables){
    const rows=await readAll(env.DB,table.name,table.primary),index=new Map(rows.map(row=>[keyFor(row,table.primary),row]))
    if(rows.length!==table.rows.length||index.size!==rows.length)fail('DESTINATION_ROW_COUNT:'+table.name)
    const canonical=[]
    for(const expected of table.rows){
      const row=index.get(keyFor(expected,table.primary));if(!row)fail('DESTINATION_IDENTITY_MISMATCH:'+table.name)
      const values={}
      for(const column of table.columns){
        const field=table.fields.find(item=>item.name===column)||{name:column,type:'String'}
        if(field.type==='Decimal'&&row[column]!==null&&!new Prisma.Decimal(String(row[column])).eq(expected[column]))fail('MONEY_VALUE_MISMATCH:'+table.name+'.'+column)
        const actual=normalized(row[column],field),wanted=normalized(expected[column],field)
        if(actual!==wanted)fail('DESTINATION_VALUE_MISMATCH:'+table.name+'.'+column)
        values[column]=actual
      }
      canonical.push(exactJSON(values))
    }
    for(const field of table.fields.filter(field=>field.type==='Decimal')){
      const total=decimalSum(rows.map(row=>row[field.name])),original=source.money.find(item=>item.table===table.name&&item.column===field.name)
      if(total!==original.sum)fail('MONEY_TOTAL_MISMATCH:'+table.name+'.'+field.name)
      money.push({...original,destinationSum:total,matched:true})
    }
    for(const field of table.fields.filter(field=>field.type==='Int'))integers.push({table:table.name,column:field.name,sum:rows.reduce((sum,row)=>sum+BigInt(row[field.name]??0),0n).toString()})
    tables.push({name:table.name,rows:rows.length,contentHash:hash(canonical.sort().join('\n'))})
  }
  if((await env.DB.prepare('PRAGMA foreign_key_check').all()).results.length)fail('FOREIGN_KEY_INTEGRITY_FAILED')
  const derived=await verifyDerived(source,env.DB),store=new R2FileStore(env.FILES),files=[]
  for(const expected of source.files){
    const file=await store.get(expected.objectKey)
    if(!file||file.size!==expected.size||file.mimeType!==expected.mimeType||file.sha256!==expected.sha256||hash(file.body)!==expected.sha256)fail('DESTINATION_R2_INTEGRITY_FAILED')
    files.push({objectKey:expected.objectKey,size:expected.size,sha256:expected.sha256,matched:true})
  }
  const keys=[];let cursor
  do{const page=await env.FILES.list({limit:1000,cursor});keys.push(...page.objects.map(file=>file.key));cursor=page.truncated?page.cursor:undefined}while(cursor)
  if(!sameNames(keys,source.files.map(file=>file.objectKey)))fail('R2_OBJECT_SET_MISMATCH')
  return {status:'PASS',source:source.summary,tables,money,integers,derived,files,foreignKeysChecked:foreignKeys,foreignKeyViolations:0,prismaReadableModels:0,verificationLayer:'D1_BINDING_AND_R2',authCutoverReady:source.summary.identity.readyForAuthCutover,fullApplicationReady:false}
}
