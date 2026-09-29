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
  return database.batch(prepared)
}
