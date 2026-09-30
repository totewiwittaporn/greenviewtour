import {reportRows} from '../../../platform/database/sql-dialect.js'
import {Prisma} from '@prisma/client'
import {dateOnly} from '../../../modules/operations/common.js'
import {canManageBookingTeam} from '../../../../../packages/contracts/access.js'
const add=(day,n)=>new Date(+dateOnly(day)+n*86400000).toISOString().slice(0,10)
const arrival=Prisma.sql`COALESCE(b."outboundDate",CASE WHEN b."returnStatus"='OUR' THEN b."returnDate" END)`
const owner=Prisma.sql`COALESCE(b."assigneeId",b."createdById")`
// Booking staff keep the authorized company calendar but only their assigned
// work queue; a department lead receives team work. No passenger lists are read.
export async function bookingPageSummary(tx,actor,today){
 const end=add(today,30),manager=canManageBookingTeam(actor)
 const range=Prisma.sql`((b."outboundDate">=${dateOnly(today)} AND b."outboundDate"<${dateOnly(end)}) OR (b."outboundDate" IS NULL AND b."returnStatus"='OUR' AND b."returnDate">=${dateOnly(today)} AND b."returnDate"<${dateOnly(end)}))`
 const scope=manager?Prisma.sql`true`:Prisma.sql`${owner}=${actor.id}::uuid`
 const programId=Prisma.sql`COALESCE(NULLIF(b."programSnapshot"->>'tourId',''),t."tourId"::text,'standalone')`
 const programName=Prisma.sql`CASE WHEN ${programId}='standalone' THEN 'Standalone services' ELSE COALESCE(NULLIF(b."programSnapshot"->>'name',''),NULLIF(t.name,''),'Tour program') END`
 const grouped=await reportRows(tx,Prisma.sql`SELECT ${arrival} AS day,${programId} AS id,${programName} AS name,COUNT(*)::int AS bookings,SUM(b.adults+b.children)::int AS pax FROM app_private."TourBooking" b LEFT JOIN app_private."OperationTrip" t ON t.id=b."tripId" WHERE ${range} AND b.status IN ('CONFIRMED','COMPLETED') GROUP BY 1,2,3`)
 const counts=await reportRows(tx,Prisma.sql`SELECT ${owner} AS id,u."displayName" AS name,b.status,COUNT(*)::int AS count FROM app_private."TourBooking" b LEFT JOIN app_private."UserProfile" u ON u.id=${owner} WHERE ${range} AND ${scope} GROUP BY 1,2,3`)
 const rows=await reportRows(tx,Prisma.sql`SELECT b.id,b.code,b.status,b.adults+b.children AS pax,u."displayName" AS owner,COALESCE(NULLIF(b."programSnapshot"->>'name',''),t.name) AS program FROM app_private."TourBooking" b LEFT JOIN app_private."OperationTrip" t ON t.id=b."tripId" LEFT JOIN app_private."UserProfile" u ON u.id=${owner} WHERE ${range} AND ${scope} AND b.status IN ('DRAFT','CONFIRMED') ORDER BY b.code,b.id LIMIT 10`)
 const calendar30=Array.from({length:30},(_,i)=>({date:add(today,i),bookings:0,pax:0,programs:[]})),byDate=new Map(calendar30.map(day=>[day.date,day]))
 for(const row of grouped){const day=byDate.get(new Date(row.day).toISOString().slice(0,10));if(!day)continue;let program=day.programs.find(p=>p.id===row.id);if(!program){program={id:row.id,name:row.name,bookings:0,pax:0};day.programs.push(program)}program.bookings+=row.bookings;program.pax+=row.pax;day.bookings+=row.bookings;day.pax+=row.pax}
 for(const day of calendar30)day.programs.sort((a,b)=>a.name.localeCompare(b.name,'en'))
 const team=new Map()
 for(const row of counts){const item=team.get(row.id)||{id:row.id,name:row.name,total:0,draft:0,confirmed:0,completed:0,cancelled:0};item.total+=row.count;const status=row.status.toLowerCase();if(Object.hasOwn(item,status))item[status]+=row.count;team.set(row.id,item)}
 const total=status=>counts.filter(row=>!status||row.status===status).reduce((sum,row)=>sum+row.count,0)
 return {from:today,through:add(today,29),calendar30,scope:manager?'team':'own',work:{total:total(),draft:total('DRAFT'),confirmed:total('CONFIRMED')},team:manager?[...team.values()].sort((a,b)=>(a.name||'').localeCompare(b.name||'')):[],rows}
}
