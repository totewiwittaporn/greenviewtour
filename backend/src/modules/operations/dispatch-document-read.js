const assignmentFields=['id','runId','bookingLineId','adults','children','pickupAt','dropoffPoint','notes','actualAdults','actualChildren','changeReason','cancellationReason','status']
const pick=(value,fields)=>Object.fromEntries(fields.map(field=>[field,value?.[field]??null]))
const programSnapshot=value=>pick(value,['tourId','name','demoDataset'])
const componentSnapshot=value=>pick(value,['category','mealPeriod','accommodationType','ownership','day'])
const resourceSnapshot=value=>pick(value,['category','mealPeriod','accommodationType','ownership'])

const bookingSelect=kind=>({
 id:true,code:true,name:true,status:true,adults:true,children:true,agentId:true,agentName:true,agentReference:true,assistance:true,
 outboundDate:true,returnDate:true,returnStatus:true,
 ...(kind==='BOAT'
  ?{allergies:true,requestNotes:true,allergyStatus:true,specialRequirements:true}
  :{agentPhone:true,contactPhone:true,hotel:true,room:true,pickupPoint:true,dropoffPoint:true}),
 programSnapshot:true,
 trip:{select:{tourId:true,name:true,startsAt:true,endsAt:true,tour:{select:{printCode:true}}}},
 agent:{select:{shortName:true}},
})

// Inputs are run rows already selected by listJobs' complete date/staff scope.
// Queries stay bounded to those run IDs and select only document-owned relations.
export async function loadRunDocuments(tx,runs,kind){
 if(!runs.length)return []
 const runIds=runs.map(run=>run.id)
 const assignmentRows=await tx.dispatchAssignment.findMany({
  where:{runId:{in:runIds}},
  select:{
   ...Object.fromEntries(assignmentFields.map(field=>[field,true])),
   bookingLine:{select:{booking:{select:bookingSelect(kind)}}},
  },
  orderBy:[{createdAt:'asc'},{id:'asc'}],
 })
 const staff=await tx.dispatchStaff.findMany({
  where:{runId:{in:runIds}},
  select:{runId:true,userId:true,role:true,user:{select:{displayName:true}}},
  orderBy:{id:'asc'},
 })
 const bookingIds=[...new Set(assignmentRows.map(row=>row.bookingLine.booking.id))]
 const lines=kind==='BOAT'&&bookingIds.length?await tx.bookingComponent.findMany({
  where:{bookingId:{in:bookingIds},selected:true},
  select:{bookingId:true,selected:true,snapshot:true,resource:{select:{category:true,mealPeriod:true,accommodationType:true,ownership:true}}},
  orderBy:{id:'asc'},
 }):[]
 const linesByBooking=new Map()
 for(const line of lines){
  const values=linesByBooking.get(line.bookingId)||[]
  values.push({bookingId:line.bookingId,selected:line.selected,snapshot:componentSnapshot(line.snapshot),resource:resourceSnapshot(line.resource)})
  linesByBooking.set(line.bookingId,values)
 }
 const assignmentsByRun=new Map(),staffByRun=new Map()
 for(const row of assignmentRows){
  const source=row.bookingLine.booking
  const booking={
   ...source,
   programSnapshot:programSnapshot(source.programSnapshot),
   trip:{
    tourId:source.trip.tourId,
    name:source.trip.name,
    startsAt:source.trip.startsAt,
    endsAt:source.trip.endsAt,
    tour:{printCode:source.trip.tour?.printCode??null},
   },
   agent:{shortName:source.agent?.shortName??null},
   ...(kind==='BOAT'?{lines:linesByBooking.get(source.id)||[]}:{})
  }
  const assignment=pick(row,assignmentFields)
  const values=assignmentsByRun.get(row.runId)||[]
  values.push({...assignment,bookingLine:{booking}})
  assignmentsByRun.set(row.runId,values)
 }
 for(const member of staff){
  const values=staffByRun.get(member.runId)||[]
  values.push({userId:member.userId,role:member.role,user:{displayName:member.user.displayName}})
  staffByRun.set(member.runId,values)
 }
 return runs.map(run=>({...run,assignments:assignmentsByRun.get(run.id)||[],staff:staffByRun.get(run.id)||[]}))
}
