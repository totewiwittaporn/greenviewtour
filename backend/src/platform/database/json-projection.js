export async function d1ProjectionValues(db,source,ownerIds){
  if(!db?.d1JsonProjection?.findMany)return null
  const ids=[...new Set((ownerIds||[]).filter(Boolean))]
  if(!ids.length)return new Map()
  const rows=await db.d1JsonProjection.findMany({
    where:{source,ownerId:{in:ids}},
    select:{ownerId:true,textValue:true},
  })
  return new Map(rows.map(row=>[row.ownerId,row.textValue]))
}
