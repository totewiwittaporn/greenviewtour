import {reportSets} from '../../../platform/database/sql-dialect.js'
import {Prisma} from '@prisma/client'
import {dateOnly} from '../../../modules/operations/common.js'
import {reportingSeason} from './season-summary.js'
const addDays=(day,n)=>new Date(+dateOnly(day)+n*86400000).toISOString().slice(0,10)
const arrival=Prisma.sql`COALESCE(b."outboundDate",CASE WHEN b."returnStatus"='OUR' THEN b."returnDate" END)`
const range=(from,to)=>Prisma.sql`((b."outboundDate">=${dateOnly(from)} AND b."outboundDate"<${dateOnly(to)}) OR (b."outboundDate" IS NULL AND b."returnStatus"='OUR' AND b."returnDate">=${dateOnly(from)} AND b."returnDate"<${dateOnly(to)}))`
const programId=Prisma.sql`COALESCE(NULLIF(b."programSnapshot"->>'tourId',''),t."tourId"::text,'standalone')`
const programName=Prisma.sql`CASE WHEN ${programId}='standalone' THEN 'Standalone services' ELSE COALESCE(NULLIF(b."programSnapshot"->>'name',''),NULLIF(t.name,''),'Tour program') END`
const key=value=>new Date(value).toISOString().slice(0,10)
// Called only after dashboard company + both Booking permissions pass. Aggregate
// all matching bookings in the database; only ten daily preview identities leave DB.
export async function managementPageSummary(tx,today){
 const end=addDays(today,30),monthStart=dateOnly(today);monthStart.setUTCDate(1);monthStart.setUTCMonth(monthStart.getUTCMonth()-5)
 const fromMonth=key(monthStart),season=reportingSeason(today)
 const groupedQuery=Prisma.sql`SELECT ${arrival} AS day,${programId} AS "programId",${programName} AS name,b.status,COUNT(*) AS bookings,SUM(b.adults+b.children) AS pax FROM app_private."TourBooking" b LEFT JOIN app_private."OperationTrip" t ON t.id=b."tripId" WHERE b.status IN ('DRAFT','CONFIRMED','COMPLETED','CANCELLED') AND ${range(today,end)} GROUP BY 1,2,3,4`
 const previewQuery=Prisma.sql`WITH ranked AS (SELECT b.id,b.code,b.status,${arrival} AS day,${programName} AS program,b.adults+b.children AS pax,ROW_NUMBER() OVER(PARTITION BY ${arrival} ORDER BY b.code,b.id) AS n FROM app_private."TourBooking" b LEFT JOIN app_private."OperationTrip" t ON t.id=b."tripId" WHERE b.status IN ('DRAFT','CONFIRMED','COMPLETED','CANCELLED') AND ${range(today,addDays(today,2))}) SELECT id,code,status,day,program,pax FROM ranked WHERE n<=5 ORDER BY day,code,id`
 const monthsQuery=Prisma.sql`SELECT to_char(${arrival},'YYYY-MM') AS month,COUNT(*) AS bookings,SUM(b.adults+b.children) AS pax FROM app_private."TourBooking" b WHERE b.status IN ('CONFIRMED','COMPLETED') AND ${range(fromMonth,addDays(today,1))} GROUP BY month`
 const agentsQuery=Prisma.sql`SELECT COALESCE(a.id::text,'direct') AS id,COALESCE(a.name,'Direct / no agent') AS name,COUNT(*) AS bookings,SUM(b.adults+b.children) AS pax FROM app_private."TourBooking" b LEFT JOIN app_private."BusinessPartner" a ON a.id=b."agentId" WHERE b.status IN ('CONFIRMED','COMPLETED') AND ${range(season.from,addDays(season.through,1))} GROUP BY a.id,a.name`
 const {grouped,preview,months,agents}=await reportSets(tx,Prisma.sql`SELECT (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (${groupedQuery}) x) AS grouped,(SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (${previewQuery}) x) AS preview,(SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (${monthsQuery}) x) AS months,(SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (${agentsQuery}) x) AS agents`,{grouped:groupedQuery,preview:previewQuery,months:monthsQuery,agents:agentsQuery})
 const calendar30=Array.from({length:30},(_,i)=>({date:addDays(today,i),bookings:0,pax:0,programs:[]}))
 const byDate=new Map(calendar30.map(day=>[day.date,day]))
 for(const row of grouped){
  if(!['CONFIRMED','COMPLETED'].includes(row.status))continue
  const day=byDate.get(key(row.day));if(!day)continue
  let program=day.programs.find(item=>item.id===row.programId)
  if(!program){program={id:row.programId,name:row.name,bookings:0,pax:0};day.programs.push(program)}
  const bookings=Number(row.bookings),pax=Number(row.pax)
  program.bookings+=bookings;program.pax+=pax;day.bookings+=bookings;day.pax+=pax
 }
 for(const day of calendar30)day.programs.sort((a,b)=>a.name.localeCompare(b.name,'en'))
 const bookingDays=[today,addDays(today,1)].map(date=>{
  const entries=grouped.filter(row=>key(row.day)===date)
  const count=status=>entries.filter(row=>row.status===status).reduce((sum,row)=>sum+Number(row.bookings),0)
  return {date,total:entries.reduce((sum,row)=>sum+Number(row.bookings),0),confirmed:count('CONFIRMED'),draft:count('DRAFT'),completed:count('COMPLETED'),cancelled:count('CANCELLED'),rows:preview.filter(row=>key(row.day)===date).map(({id,code,status,program,pax})=>({id,code,status,program,pax:Number(pax)}))}
 })
 const monthlyRows=Array.from({length:6},(_,i)=>{
  const date=new Date(+monthStart);date.setUTCMonth(date.getUTCMonth()+i)
  const month=key(date).slice(0,7),row=months.find(row=>row.month===month)
  return {month,bookings:Number(row?.bookings||0),pax:Number(row?.pax||0)}
 })
 const totalPax=agents.reduce((sum,row)=>sum+Number(row.pax),0)
 const ranked=agents.map(row=>({...row,bookings:Number(row.bookings),pax:Number(row.pax)})).sort((a,b)=>b.pax-a.pax||a.name.localeCompare(b.name)).slice(0,6)
 const seasonAgents={...season,totalPax,rows:ranked.map(row=>({...row,share:totalPax?Math.round(row.pax/totalPax*1000)/10:0}))}
 return {from:today,through:addDays(today,29),calendar30,bookingDays,seasonAgents,monthly:{from:fromMonth,through:today,basis:'last6Months',rows:monthlyRows},revenue:null,revenueUnavailableReason:'NO_COMPANY_REVENUE_DEFINITION'}
}
