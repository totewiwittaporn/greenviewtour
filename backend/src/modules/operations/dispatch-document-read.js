import {Prisma} from '@prisma/client'
const fields=names=>names.split(' ')
const pairs=(alias,names)=>fields(names).flatMap(name=>[Prisma.sql`${name}::text`,Prisma.raw(`${alias}."${name}"`)])
const idsSql=rows=>Prisma.join(rows.map(row=>Prisma.sql`${row.id}::uuid`))
const assignmentNames='id runId bookingLineId adults children pickupAt dropoffPoint notes actualAdults actualChildren changeReason cancellationReason status'
// Inputs are run rows already selected by listJobs' complete date/staff scope.
// Fixed joins project only document fields; no request-supplied SQL identifiers.
export async function loadRunDocuments(tx,runs,kind){
 if(!runs.length)return []
 const bookingNames='id code name status adults children agentId agentName agentReference assistance outboundDate returnDate returnStatus '+(kind==='BOAT'?'allergies requestNotes allergyStatus specialRequirements':'agentPhone contactPhone hotel room pickupPoint dropoffPoint')
 const bookingPairs=[...pairs('b',bookingNames),Prisma.sql`'programSnapshot'::text`,Prisma.sql`jsonb_build_object('tourId',b."programSnapshot"->'tourId','name',b."programSnapshot"->'name','demoDataset',b."programSnapshot"->'demoDataset')`,Prisma.sql`'trip'::text`,Prisma.sql`jsonb_build_object('tourId',t."tourId",'name',t.name,'startsAt',t."startsAt",'endsAt',t."endsAt",'tour',jsonb_build_object('printCode',p."printCode"))`,Prisma.sql`'agent'::text`,Prisma.sql`jsonb_build_object('shortName',agent."shortName")`]
 const assignments=await tx.$queryRaw(Prisma.sql`SELECT ${Prisma.join(fields(assignmentNames).map(name=>Prisma.raw(`a."${name}"`)))},jsonb_build_object(${Prisma.join(bookingPairs)}) AS booking FROM app_private."DispatchAssignment" a JOIN app_private."BookingComponent" c ON c.id=a."bookingLineId" JOIN app_private."TourBooking" b ON b.id=c."bookingId" LEFT JOIN app_private."OperationTrip" t ON t.id=b."tripId" LEFT JOIN app_private."TourProgram" p ON p.id=t."tourId" LEFT JOIN app_private."BusinessPartner" agent ON agent.id=b."agentId" WHERE a."runId" IN (${idsSql(runs)}) ORDER BY a."createdAt",a.id`)
 const staff=await tx.$queryRaw(Prisma.sql`SELECT s."runId",s."userId",s.role,u."displayName" AS name FROM app_private."DispatchStaff" s JOIN app_private."UserProfile" u ON u.id=s."userId" WHERE s."runId" IN (${idsSql(runs)}) ORDER BY s.id`)
 const bookings=[...new Map(assignments.map(row=>[row.booking.id,row.booking])).values()]
 const lines=kind==='BOAT'&&bookings.length?await tx.$queryRaw(Prisma.sql`SELECT c."bookingId",c.selected,jsonb_build_object('category',c.snapshot->'category','mealPeriod',c.snapshot->'mealPeriod','accommodationType',c.snapshot->'accommodationType','ownership',c.snapshot->'ownership','day',c.snapshot->'day') AS snapshot,jsonb_build_object('category',r.category,'mealPeriod',r."mealPeriod",'accommodationType',r."accommodationType",'ownership',r.ownership) AS resource FROM app_private."BookingComponent" c JOIN app_private."OperationResource" r ON r.id=c."resourceId" WHERE c."bookingId" IN (${idsSql(bookings)}) AND c.selected=true ORDER BY c.id`):[]
 const linesByBooking=new Map()
 for(const line of lines){const values=linesByBooking.get(line.bookingId)||[];values.push(line);linesByBooking.set(line.bookingId,values)}
 const assignmentsByRun=new Map(),staffByRun=new Map()
 for(const assignment of assignments){
  const booking=assignment.booking
  for(const field of ['outboundDate','returnDate'])if(booking[field])booking[field]=new Date(booking[field])
  if(booking.trip)for(const field of ['startsAt','endsAt'])if(booking.trip[field])booking.trip[field]=new Date(booking.trip[field])
  if(kind==='BOAT')booking.lines=linesByBooking.get(booking.id)||[]
  const rows=assignmentsByRun.get(assignment.runId)||[];rows.push({...assignment,bookingLine:{booking}});assignmentsByRun.set(assignment.runId,rows)
 }
 for(const member of staff){const rows=staffByRun.get(member.runId)||[];rows.push({userId:member.userId,role:member.role,user:{displayName:member.name}});staffByRun.set(member.runId,rows)}
 return runs.map(run=>({...run,assignments:assignmentsByRun.get(run.id)||[],staff:staffByRun.get(run.id)||[]}))
}
