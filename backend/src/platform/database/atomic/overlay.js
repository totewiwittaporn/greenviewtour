import {Prisma} from '@prisma/client'
import {schema} from './schema.js'
import {tokens,quote,identifier,boundText,qualify} from './sql.js'
const {Decimal}=Prisma
export const limits=Object.freeze({rows:2500,statements:800,queries:950,documentBytes:1800000,sqlBytes:99000})
export function databaseError(code,status=409){return Object.assign(new Error(code),{code,status})}
export function tableInfo(name){const info=schema.tables[name];if(!info?.pk?.length)throw databaseError('D1_TABLE_NOT_ADMITTED:'+name);return info}
export const keyFor=(name,row)=>JSON.stringify(tableInfo(name).pk.map(field=>row[field]))
export function numericValue(value,column){
  if(value===null)return null
  let decimal
  try{decimal=new Decimal(String(value))}catch{throw databaseError('D1_DECIMAL_INVALID',400)}
  const [precision=14,scale=2]=column.nativeArgs||[]
  if(!decimal.isFinite()||decimal.decimalPlaces()>scale||decimal.abs().gte(new Decimal(10).pow(precision-scale)))throw databaseError('D1_DECIMAL_OUT_OF_RANGE',400)
  return decimal.toFixed(scale)
}
function stamp(value,dateOnly){
  let input=value
  if(typeof input==='string'&&/^\d{4}-\d\d-\d\d \d\d:/.test(input))input=input.replace(' ','T')+'Z'
  const date=new Date(input)
  if(!Number.isFinite(+date))throw databaseError('D1_DATE_INVALID',400)
  if(dateOnly&&date.toISOString().slice(11)!=='00:00:00.000Z')throw databaseError('D1_DATE_ONLY_TIME_INVALID',400)
  return date.toISOString().replace('Z','+00:00')
}
export function normalizeRow(name,input){
  const info=tableInfo(name),row={}
  for(const column of info.columns){
    let value=input[column.name]??null
    if(value===null){if(column.required||info.pk.includes(column.name))throw databaseError('D1_NOT_NULL:'+name+'.'+column.name,400);row[column.name]=null;continue}
    const type=column.type.toUpperCase()
    if(column.kind==='Decimal'||type==='DECIMAL')value=numericValue(value,column)
    else if(column.kind==='DateTime'||type.includes('DATE'))value=stamp(value,column.native==='Date')
    else if(column.kind==='Boolean'||type==='BOOLEAN'){
      if(![true,false,0,1].includes(value))throw databaseError('D1_BOOLEAN_INVALID',400)
      value=Number(value)
    }else if(column.kind==='Int'||type==='INTEGER'){
      if(!Number.isSafeInteger(value)||value< -2147483648||value>2147483647)throw databaseError('D1_INTEGER_OUT_OF_RANGE',400)
    }else if(type==='JSONB'||column.kind==='Json'||column.kind==='String[]'){
      if(typeof value!=='string')value=JSON.stringify(value)
      try{JSON.parse(value)}catch{throw databaseError('D1_JSON_INVALID',400)}
    }else{
      if(typeof value!=='string')throw databaseError('D1_TEXT_REQUIRED:'+name+'.'+column.name,400)
      if(column.native==='Uuid'){
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw databaseError('D1_UUID_INVALID',400)
        value=value.toLowerCase()
      }
      if(column.nativeArgs?.[0]&&['VarChar','Char'].includes(column.native)&&[...value].length>column.nativeArgs[0])throw databaseError('D1_TEXT_TOO_LONG',400)
      if(column.enum&&!column.enum.includes(value))throw databaseError('D1_ENUM_INVALID',400)
    }
    row[column.name]=value
  }
  return row
}
function scalarType(column){
  const type=column.type.toUpperCase()
  if(type.includes('INT')||type==='BOOLEAN')return 'INTEGER'
  if(['REAL','FLOAT','DOUBLE','DECIMAL','NUMERIC'].includes(type))return 'NUMERIC'
  return 'TEXT'
}
function rowColumns(info,alias){return info.columns.map(column=>`CAST(json_extract(${alias}.value, '$.${quote(column.name)}') AS ${scalarType(column)}) AS ${quote(column.name)}`).join(',')}
function rowCollection(path){return `json_each(json_extract(?1, '${path}'))`}
export function queryWithOverlay(sql,args,changes,{returns=null,extra={}}={}){
  const input=tokens(sql),references=new Set(qualify(input).filter(token=>['word','identifier'].includes(token.kind)).map(identifier))
  const tables={},ctes=['"__gv_context" AS (SELECT ?1 AS value)']
  for(const [name,rows] of changes){
    if(!references.has(name))continue
    const info=tableInfo(name),collection=rowCollection(`$.tables.${quote(name)}`)
    tables[name]=[...rows.values()]
    const match=info.pk.map(field=>`base.${quote(field)} IS json_extract(delta.value,'$.${quote(field)}')`).join(' AND ')
    ctes.push(`${quote(name)} AS (SELECT ${info.columns.map(column=>'base.'+quote(column.name)).join(',')} FROM main.${quote(name)} base WHERE NOT EXISTS(SELECT 1 FROM ${collection} delta WHERE ${match}) UNION ALL SELECT ${rowColumns(info,'delta')} FROM ${collection} delta WHERE json_extract(delta.value,'$.__deleted')=0)`)
  }
  if(returns)ctes.push(`"__gv_return" AS (SELECT ${rowColumns(tableInfo(returns.table),'r')} FROM ${rowCollection('$.returns')} r)`)
  let body=boundText(input,args)
  const recursive=/^WITH\s+RECURSIVE\s+/i.test(body)
  if(/^WITH\s+/i.test(body))body=body.replace(/^WITH\s+(?:RECURSIVE\s+)?/i,'')
  else body='SELECT_SENTINEL '+body
  const compiled=`WITH ${recursive?'RECURSIVE ':''}${ctes.join(',')} ${body.startsWith('SELECT_SENTINEL ')?body.slice(16):', '+body}`
  const data=JSON.stringify({args,tables,returns:returns?.rows,...extra})
  if(new TextEncoder().encode(data).length>limits.documentBytes||new TextEncoder().encode(compiled).length>limits.sqlBytes)throw databaseError('D1_UNIT_SIZE_LIMIT',413)
  return {sql:compiled,args:[data]}
}
export function decimalAssignment(expression,before,args,excluded=null){
  const input=qualify(expression);let i=0
  const operand=()=>{
    const t=input[i++]
    if(!t)throw databaseError('D1_DECIMAL_EXPRESSION_UNSUPPORTED')
    if(t.raw==='('){const value=add();if(input[i++]?.raw!==')')throw databaseError('D1_DECIMAL_EXPRESSION_UNSUPPORTED');return value}
    if(t.raw==='+'||t.raw==='-'){const value=operand();return value===null?null:t.raw==='-'?value.negated():value}
    if(t.kind==='parameter'){const value=args[t.index];return value==null?null:new Decimal(String(value))}
    if(t.kind==='string')return new Decimal(t.raw.slice(1,-1).replaceAll("''","'"))
    if(/^\d/.test(t.raw))return new Decimal(t.raw)
    if(t.raw.toUpperCase()==='NULL')return null
    if(['word','identifier'].includes(t.kind)){
      let field=identifier(t),record=before
      if(input[i]?.raw==='.'){
        i++;if(field==='excluded')record=excluded
        field=identifier(input[i++])
      }
      if(!record||!Object.hasOwn(record,field))throw databaseError('D1_DECIMAL_EXPRESSION_UNSUPPORTED')
      const value=record[field];return value===null?null:new Decimal(String(value))
    }
    throw databaseError('D1_DECIMAL_EXPRESSION_UNSUPPORTED')
  }
  const multiply=()=>{let value=operand();while(['*','/'].includes(input[i]?.raw)){const operation=input[i++].raw,next=operand();value=value===null||next===null?null:operation==='*'?value.mul(next):value.div(next)}return value}
  const add=()=>{let value=multiply();while(['+','-'].includes(input[i]?.raw)){const operation=input[i++].raw,next=multiply();value=value===null||next===null?null:operation==='+'?value.add(next):value.sub(next)}return value}
  const result=add()
  if(i!==input.length)throw databaseError('D1_DECIMAL_EXPRESSION_UNSUPPORTED')
  return result===null?null:result.toString()
}
