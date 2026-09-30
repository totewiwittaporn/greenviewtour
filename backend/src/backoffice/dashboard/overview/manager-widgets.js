import {reportSets} from '../../../platform/database/sql-dialect.js'
import {isD1Client} from '../../../platform/database/d1-runtime.js'
import {Prisma} from '@prisma/client'
import {dateOnly} from '../../../modules/operations/common.js'
// Inputs are widget definitions already admitted by dashboardOverview's fresh
// authorization. No role shortcut and no shared cache; all counts use its snapshot.
export async function managerWidgetCounts(tx,runWidgets,allocationWidgets,{today,end,now,startTime,endTime,tomorrowTime}){
 const admitted=runWidgets.filter(widget=>!widget.id.endsWith('-crew'))
 const scope=admitted.map(widget=>Prisma.sql`(r.kind=${widget.base.kind} AND ${widget.base.staff?Prisma.sql`EXISTS(SELECT 1 FROM app_private."DispatchStaff" mine WHERE mine."runId"=r.id AND mine."userId" IN (${Prisma.join(widget.base.staff.some.userId.in.map(id=>Prisma.sql`${id}::uuid`))}))`:Prisma.sql`TRUE`})`)
 const runQuery=scope.length?Prisma.sql`
  SELECT r.kind,COUNT(*)::int AS pending,
   COUNT(*) FILTER(WHERE s."endsAt"<${now})::int AS overdue,
   COUNT(*) FILTER(WHERE s."startsAt"<${tomorrowTime} AND s."endsAt">=${startTime})::int AS today,
   COUNT(*) FILTER(WHERE s."startsAt">=${startTime} AND
    (NOT EXISTS(SELECT 1 FROM app_private."DispatchStaff" lead WHERE lead."runId"=r.id AND ((r.kind='BOAT' AND lead.role IN ('CAPTAIN','HEAD_CAPTAIN')) OR (r.kind='VEHICLE' AND lead.role IN ('DRIVER','HEAD_DRIVER'))))
     OR (r.kind='BOAT' AND NOT EXISTS(SELECT 1 FROM app_private."DispatchStaff" guide WHERE guide."runId"=r.id AND guide.role IN ('GUIDE','HEAD_GUIDE')))))::int AS crew
  FROM app_private."DispatchRun" r JOIN app_private."ServiceSlot" s ON s.id=r."slotId"
  WHERE r.status='OPEN' AND s."startsAt"<${endTime} AND (${Prisma.join(scope,' OR ')}) GROUP BY r.kind
 `:Prisma.sql`SELECT NULL::text AS kind WHERE FALSE`
 const categories=allocationWidgets.flatMap(widget=>widget.categories)
 const legDate=isD1Client(tx)?Prisma.sql`CASE WHEN leg.direction='OUTBOUND' THEN b."outboundDate" WHEN b."returnStatus"='OUR' THEN b."returnDate" END`:Prisma.sql`leg.day`
 const legSource=isD1Client(tx)?Prisma.sql`CROSS JOIN (SELECT 'OUTBOUND' AS direction UNION ALL SELECT 'RETURN') leg`:Prisma.sql`CROSS JOIN LATERAL (VALUES ('OUTBOUND',b."outboundDate"),('RETURN',CASE WHEN b."returnStatus"='OUR' THEN b."returnDate" END)) leg(direction,day)`
 const allocationQuery=categories.length?Prisma.sql`
  WITH legs AS (
   SELECT c.id AS line,b.id AS booking,CASE WHEN resource.category='TRANSFER' THEN 'driver' ELSE 'guide' END AS area,
    c.quantity,resource."baseUnit",b.adults,b.children,leg.direction,${legDate} AS day,
    COALESCE(att."noShowAdults",0) AS "noShowAdults",COALESCE(att."noShowChildren",0) AS "noShowChildren"
   FROM app_private."BookingComponent" c
   JOIN app_private."OperationResource" resource ON resource.id=c."resourceId"
   JOIN app_private."TourBooking" b ON b.id=c."bookingId"
   ${legSource}
   LEFT JOIN app_private."BookingAttendance" att ON att."bookingId"=b.id AND att.direction=leg.direction AND att."serviceDate"=${legDate}
   WHERE c.selected=true AND b.status='CONFIRMED' AND resource.category IN (${Prisma.join(categories)})
    AND c."dispatchDirection" IN ('BOTH',leg.direction) AND ${legDate}>=${dateOnly(today)} AND ${legDate}<${dateOnly(end)}
  ), assigned AS (
   SELECT a."bookingLineId" AS line,r.direction,SUM(a.adults) AS adults,SUM(a.children) AS children
   FROM app_private."DispatchAssignment" a JOIN app_private."DispatchRun" r ON r.id=a."runId"
   WHERE a.status<>'CANCELLED' AND a."bookingLineId" IN (SELECT line FROM legs) GROUP BY a."bookingLineId",r.direction
  )
  SELECT leg.area,COUNT(DISTINCT leg.booking)::int AS pending,
   COUNT(DISTINCT leg.booking) FILTER(WHERE leg.day=${dateOnly(today)})::int AS today
  FROM legs leg LEFT JOIN assigned a ON a.line=leg.line AND a.direction=leg.direction
  WHERE GREATEST(0,leg.adults-leg."noShowAdults"-COALESCE(a.adults,0))+GREATEST(0,leg.children-leg."noShowChildren"-COALESCE(a.children,0))>0
   AND (leg."baseUnit"<>'PERSON' OR leg.quantity-COALESCE(a.adults,0)-COALESCE(a.children,0)>0)
  GROUP BY leg.area
 `:Prisma.sql`SELECT NULL::text AS area WHERE FALSE`
 if(!admitted.length&&!categories.length)return []
 const batch=await reportSets(tx,Prisma.sql`SELECT (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (${runQuery}) x) AS runs,(SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (${allocationQuery}) x) AS allocations`,{runs:runQuery,allocations:allocationQuery})
 const widgets=runWidgets.map(widget=>{
  const row=batch.runs.find(row=>row.kind===widget.base.kind),crew=widget.id.endsWith('-crew')
  return {id:widget.id,title:widget.title,href:widget.href,pending:crew?row?.crew||0:row?.pending||0,overdue:crew?null:row?.overdue||0,today:crew?null:row?.today||0,review:null,detail:widget.detail,scope:widget.visibility}
 })
 for(const widget of allocationWidgets){const row=batch.allocations.find(row=>row.area===widget.route);widgets.push({id:widget.route+'-allocation',title:widget.title,href:'/operations/'+widget.route,pending:row?.pending||0,today:row?.today||0,overdue:null,review:null,scope:'Company',detail:'Unique bookings with passengers still unallocated in the next 14 days, excluding recorded no-shows.'})}
 return widgets
}
