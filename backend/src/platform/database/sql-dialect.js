import {d1DatabaseFor,isD1Client} from './d1-runtime.js'
import {isAtomicClient} from './atomic/executor.js'
import {tokens,text,qualify,group,splitTop,upper} from './atomic/sql.js'
import {queryWithOverlay} from './atomic/overlay.js'
const casts=new Set(['int','int4','integer','bigint','text','uuid','json','jsonb'])
// Only the PostgreSQL constructs used by reviewed report queries are translated.
export function sqliteReportSQL(sql){
 const source=qualify(tokens(sql)),out=[]
 for(let i=0;i<source.length;i++){
  const token=source[i],name=upper(token)
  if(token.raw===':'&&source[i+1]?.raw===':'){
   const cast=source[i+2]?.raw.toLowerCase()
   if(!casts.has(cast))throw new Error('D1_REPORT_CAST_UNSUPPORTED:'+cast)
   i+=2;continue
  }
  if(name==='TO_CHAR'&&source[i+1]?.raw==='('){
   const args=group(source,i+1),parts=splitTop(args.body)
   if(parts.length!==2||text(parts[1])!=="'YYYY-MM'")throw new Error('D1_REPORT_DATE_FORMAT_UNSUPPORTED')
   out.push({raw:`strftime('%Y-%m', ${sqliteReportSQL(text(parts[0]))})`,kind:'word'});i=args.end-1;continue
  }
  const functionName={JSONB_BUILD_OBJECT:'json_object',JSON_BUILD_OBJECT:'json_object',JSONB_ARRAY_LENGTH:'json_array_length',GREATEST:'max'}[name]
  if(functionName&&source[i+1]?.raw==='('){out.push({...token,raw:functionName});continue}
  if(['JSONB_AGG','JSON_AGG','LATERAL','PG_ADVISORY_XACT_LOCK'].includes(name))throw new Error('D1_REPORT_SQL_NOT_PORTED:'+name)
  out.push(token)
 }
 return text(out)
}
const bindingValue=value=>value instanceof Date?value.toISOString().replace('Z','+00:00'):typeof value==='boolean'?Number(value):value
export async function reportRows(client,query,{jsonColumns=[],dateColumns=[]}={}){
 if(!isD1Client(client))return client.$queryRaw(query)
 const database=d1DatabaseFor(client),sql=sqliteReportSQL(query.sql),args=query.values.map(bindingValue)
 const statement=isAtomicClient(client)?{sql,args}:queryWithOverlay(sql,args,new Map())
 const response=await database.prepare(statement.sql).bind(...statement.args).all()
 return response.results.map(row=>{
  const result={...row}
  for(const column of jsonColumns)if(typeof result[column]==='string')result[column]=JSON.parse(result[column])
  for(const column of dateColumns)if(result[column]!==null&&result[column]!==undefined)result[column]=new Date(result[column])
  return result
 })
}
export async function reportSets(client,postgres,queries){
 if(!isD1Client(client))return (await client.$queryRaw(postgres))[0]
 const entries=await Promise.all(Object.entries(queries).map(async([name,query])=>[name,await reportRows(client,query)]))
 return Object.fromEntries(entries)
}
