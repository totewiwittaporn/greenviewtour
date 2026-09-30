import {isAtomicClient} from './atomic/executor.js'
import {d1DatabaseFor} from './d1-runtime.js'

export const d1Date=value=>{
  const date=value instanceof Date?value:new Date(value)
  if(!Number.isFinite(+date))throw new Error('INVALID_D1_DATE')
  return date.toISOString().replace('Z','+00:00')
}

export async function d1AtomicBatch(client,statements){
  const database=d1DatabaseFor(client)
  if(!database)throw new Error('D1_DATABASE_REQUIRED')
  if(!Array.isArray(statements)||!statements.length)throw new Error('D1_BATCH_REQUIRED')
  const prepared=statements.map(({sql,params=[]})=>{
    if(typeof sql!=='string'||!sql.trim()||!Array.isArray(params))throw new Error('INVALID_D1_BATCH_STATEMENT')
    return database.prepare(sql).bind(...params)
  })
  if(isAtomicClient(client))return database.batch(prepared)
  // D1 meta.changes includes trigger work. Read SQLite's direct row count within
  // the SAME atomic batch so CAS callers do not confuse revision triggers with
  // additional business-row updates.
  const result=await database.batch(prepared.flatMap(statement=>[statement,database.prepare('SELECT changes() AS direct_changes')]))
  return prepared.map((_,index)=>{
    const row=result[index*2],changes=result[index*2+1]?.results?.[0]?.direct_changes
    if(!Number.isSafeInteger(changes)||changes<0)throw new Error('D1_DIRECT_CHANGE_COUNT_REQUIRED')
    return {...row,meta:{...row.meta,changes}}
  })
}
