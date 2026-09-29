const sources=new Map([
  ['TourBooking.programSnapshot','tourBooking'],
  ['BookingComponent.snapshot','bookingComponent'],
  ['CustomerRequest.snapshot','customerRequest'],
  ['CustomerRequest.details','customerRequest'],
  ['CompanyWorkRecord.payload','companyWorkRecord'],
  ['FinancePersonnelRecord.payload','financePersonnelRecord'],
  ['FinancePersonnelRecord.clearance','financePersonnelRecord'],
])
const identifier=value=>/^[A-Za-z][A-Za-z0-9]*$/.test(value)

const readPath=(value,path)=>{
  let current=value
  for(const key of path.split('.')){
    if(!current||typeof current!=='object'||Array.isArray(current)||!Object.hasOwn(current,key))return null
    current=current[key]
  }
  return current===undefined?null:current
}

// Portable projection for authorized, already-bounded row IDs. Keeping this in
// Prisma instead of PostgreSQL jsonb operators lets the same business readers
// run against PostgreSQL during migration and D1 after cutover.
export async function readJsonFields(tx,table,column,ids,paths){
  if(!ids.length)return new Map()
  const delegate=sources.get(`${table}.${column}`)
  if(!delegate||paths.some(path=>!path.split('.').every(identifier)))throw new Error('INVALID_READ_PROJECTION')
  if(!tx[delegate]?.findMany)throw new Error('INVALID_READ_PROJECTION_MODEL')
  const rows=await tx[delegate].findMany({
    where:{id:{in:[...new Set(ids)]}},
    select:{id:true,[column]:true},
  })
  return new Map(rows.map(row=>[
    row.id,
    Object.fromEntries(paths.map(path=>[path,readPath(row[column],path)])),
  ]))
}
