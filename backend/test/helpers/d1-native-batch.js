import assert from 'node:assert/strict'
// Model native D1 totals including trigger writes, and direct changes() results.
export function withNativeTriggerCounts(database){
 const prepare=database.prepare.bind(database),batch=database.batch.bind(database)
 database.prepare=sql=>sql==='SELECT changes() AS direct_changes'?{directCounter:true,sql}:prepare(sql)
 database.batch=async statements=>{
  assert.equal(statements.length%2,0)
  for(let i=1;i<statements.length;i+=2)assert.equal(statements[i].directCounter,true)
  const result=await batch(statements.filter((_,index)=>index%2===0))
  return result.flatMap(row=>[
   {...row,meta:{...row.meta,changes:row.meta.changes?row.meta.changes+3:0}},
   {success:true,results:[{direct_changes:row.meta.changes}],meta:{changes:0}},
  ])
 }
 return database
}
