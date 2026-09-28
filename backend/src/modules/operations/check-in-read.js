import {Prisma} from '@prisma/client'
import {dateOnly} from './common.js'
// The reader is called only after the existing Booking permission check. Its
// complete service-leg set is also the basis of summaries, before search/paging.
function serviceLegs(date){
 const day=dateOnly(date),start=new Date(`${date}T00:00:00+07:00`),end=new Date(+start+86400000)
 return Prisma.sql`FROM app_private."TourBooking" b LEFT JOIN app_private."OperationTrip" t ON t.id=b."tripId"
 CROSS JOIN LATERAL (
  SELECT 'OUTBOUND'::text AS direction WHERE b."outboundDate"=${day} OR (b."outboundDate" IS NULL AND t."startsAt">=${start} AND t."startsAt"<${end})
  UNION ALL SELECT 'RETURN'::text WHERE b."returnStatus"='OUR' AND b."returnDate"=${day}
 ) leg
 LEFT JOIN app_private."BookingAttendance" a ON a."bookingId"=b.id AND a."serviceDate"=${day} AND a.direction=leg.direction
 WHERE b.status IN ('CONFIRMED','COMPLETED')`
}
export async function readCheckInPage(tx,date,q,requested,project){
 const legs=serviceLegs(date),search=Prisma.sql`position(${q||''}::text in lower(b.code||' '||b.name))>0`
 const [counts]=await tx.$queryRaw(Prisma.sql`SELECT COUNT(DISTINCT b.id)::int AS bookings,
  COALESCE(SUM(b.adults+b.children),0)::int AS expected,
  COALESCE(SUM(COALESCE(a.adults,0)+COALESCE(a.children,0)),0)::int AS present,
  COALESCE(SUM(COALESCE(a."noShowAdults",0)+COALESCE(a."noShowChildren",0)),0)::int AS "noShow",
  COUNT(*) FILTER(WHERE b.adults+b.children-COALESCE(a.adults,0)-COALESCE(a.children,0)-COALESCE(a."noShowAdults",0)-COALESCE(a."noShowChildren",0)>0)::int AS unresolved,
  COUNT(*) FILTER(WHERE COALESCE(a."financeStatus",'NONE') NOT IN ('NONE','RETAIN_CHARGES'))::int AS "financePending",
  COUNT(*) FILTER(WHERE ${search})::int AS total ${legs}`)
 const {total,...summary}=counts,page=Math.min(requested,Math.max(1,Math.ceil(total/25)))
 const records=await tx.$queryRaw(Prisma.sql`SELECT b.id,b.code,b.name,b.version,b.adults,b.children,b."outboundDate",b."returnDate",b."returnStatus",leg.direction,
  jsonb_build_object('name',b."programSnapshot"->'name','demo',b."programSnapshot"->'demo') AS "programSnapshot",
  jsonb_build_object('name',t.name) AS trip,
  CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object('serviceDate',a."serviceDate",'direction',a.direction,'version',a.version,'adults',a.adults,'children',a.children,'noShowAdults',a."noShowAdults",'noShowChildren',a."noShowChildren",'reason',a.reason,'financeStatus',a."financeStatus",'financeReason',a."financeReason",'changes',a.changes) END AS attendance
  ${legs} AND ${search} ORDER BY b.code,b.id,CASE WHEN leg.direction='OUTBOUND' THEN 0 ELSE 1 END LIMIT 25 OFFSET ${(page-1)*25}`)
 const rows=records.map(row=>project({...row,attendance:row.attendance?[row.attendance]:[]},date,row.direction))
 const close=await tx.serviceDayClose.findUnique({where:{serviceDate:dateOnly(date)}})
 return {rows,page,pageSize:25,total,serviceDate:date,close,summary}
}
