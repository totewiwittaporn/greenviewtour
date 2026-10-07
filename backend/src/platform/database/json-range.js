const ranges={
  'FinancePersonnelRecord.payload.dueOn':{column:'payload',path:['dueOn']},
  'FinancePersonnelRecord.payment.paidOn':{column:'payment',path:['paidOn']},
  'CustomerRequest.snapshot.payment.receivedOn':{column:'snapshot',path:['payment','receivedOn']},
}
const operators=new Set(['lt','lte','gt','gte'])

export function isD1JsonProjection(db){return Boolean(db?.d1JsonProjection?.findMany)}

export async function jsonRangeWhere(db,key,range){
  const config=ranges[key]
  if(!config||!range||typeof range!=='object'||Array.isArray(range))throw new Error('INVALID_JSON_RANGE_LOOKUP')
  const entries=Object.entries(range)
  if(!entries.length||entries.some(([operator,value])=>!operators.has(operator)||typeof value!=='string'||!value))throw new Error('INVALID_JSON_RANGE_LOOKUP')
  if(!isD1JsonProjection(db))return {[config.column]:{path:config.path,...range}}
  const rows=await db.d1JsonProjection.findMany({
    where:{source:key,textValue:Object.fromEntries(entries)},
    select:{ownerId:true},
  })
  return {id:{in:[...new Set(rows.map(row=>row.ownerId))]}}
}

export const jsonRangeProjections=Object.freeze({...ranges})
