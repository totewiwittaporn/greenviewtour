import {bookingPageSummary} from './booking-page.js'
import {dateOnly} from '../../../modules/operations/common.js'
import {canManageBookingTeam} from '../../../../../packages/contracts/access.js'
const add=(day,n)=>new Date(+dateOnly(day)+n*86400000).toISOString().slice(0,10)
export async function bookingSummary(tx,actor,today,calendar,{lean=false}={}){
 if(lean)return bookingPageSummary(tx,actor,today)
 const end=add(today,30),range={gte:dateOnly(today),lt:dateOnly(end)}
 const rows=await tx.tourBooking.findMany({where:{OR:[{outboundDate:range},{outboundDate:null,returnStatus:'OUR',returnDate:range}]},select:{id:true,code:true,status:true,createdById:true,assigneeId:true,outboundDate:true,returnDate:true,returnStatus:true,adults:true,children:true,programSnapshot:true,trip:{select:{tourId:true,name:true}}}})
 const unique=[...new Map(rows.map(row=>[row.id,row])).values()]
 const manager=canManageBookingTeam(actor),work=manager?unique:unique.filter(row=>(row.assigneeId||row.createdById)===actor.id)
 const owners=[...new Set(work.map(row=>row.assigneeId||row.createdById).filter(Boolean))]
 const people=owners.length?await tx.userProfile.findMany({where:{id:{in:owners}},select:{id:true,displayName:true}}):[]
 const names=new Map(people.map(p=>[p.id,p.displayName]))
 const team=new Map()
 for(const row of work){const id=row.assigneeId||row.createdById||null;const item=team.get(id)||{id,name:names.get(id)||null,total:0,draft:0,confirmed:0,completed:0,cancelled:0};item.total++;if(Object.hasOwn(item,row.status.toLowerCase()))item[row.status.toLowerCase()]++;team.set(id,item)}
 return {from:today,through:add(today,29),calendar30:calendar(unique,today,30),scope:manager?'team':'own',work:{total:work.length,draft:work.filter(r=>r.status==='DRAFT').length,confirmed:work.filter(r=>r.status==='CONFIRMED').length},team:manager?[...team.values()].sort((a,b)=>(a.name||'').localeCompare(b.name||'')):[],rows:work.filter(r=>['DRAFT','CONFIRMED'].includes(r.status)).sort((a,b)=>a.code.localeCompare(b.code)).slice(0,10).map(row=>({id:row.id,code:row.code,status:row.status,pax:row.adults+row.children,owner:names.get(row.assigneeId||row.createdById)||null,program:row.programSnapshot?.name||row.trip?.name||null}))}
}
