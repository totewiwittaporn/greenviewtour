import {dateOnly} from '../../../modules/operations/common.js'
const key=value=>value?new Date(value).toISOString().slice(0,10):null
const unfinished=new Set(['DRAFT','REJECTED','PENDING','SUBMITTED','APPROVED','ISSUED','DONE'])
// Reuse the dashboard's authorized source predicates for counts and previews.
export async function jobPageSection(tx,source,days){
 const dateWhere={dueOn:{gte:dateOnly(days[0]),lt:new Date(+dateOnly(days[1])+86400000)},status:{notIn:['CANCELLED','INACTIVE']}}
 const select={id:true,name:true,status:true,dueOn:true,assigneeId:true},orderBy=[{dueOn:'asc'},{id:'asc'}]
 const counts=await tx.companyWorkRecord.groupBy({by:['dueOn','status'],where:{AND:[source.base,dateWhere]},_count:{_all:true}})
 const dated=[]
 for(const date of days)dated.push(...await tx.companyWorkRecord.findMany({where:{AND:[source.base,{...dateWhere,dueOn:dateOnly(date)}]},select,orderBy,take:10}))
 const pending=await tx.companyWorkRecord.findMany({where:{AND:[source.base,source.pending]},select,orderBy,take:10})
 const review=await tx.companyWorkRecord.findMany({where:{AND:[source.base,{status:'DONE'}]},select,orderBy,take:10})
 const ids=[...new Set([...dated,...pending,...review].map(row=>row.assigneeId).filter(Boolean))]
 const users=ids.length?await tx.userProfile.findMany({where:{id:{in:ids}},select:{id:true,displayName:true}}):[]
 const names=new Map(users.map(user=>[user.id,user.displayName]))
 const project=row=>({id:row.id,name:row.name,status:row.status,date:key(row.dueOn),assignee:names.get(row.assigneeId)||null,href:source.href})
 return {id:source.id,title:source.title,href:source.href,scope:source.visibility,
  days:days.map(date=>{const groups=counts.filter(row=>key(row.dueOn)===date);return {date,total:groups.reduce((sum,row)=>sum+row._count._all,0),pending:groups.filter(row=>unfinished.has(row.status)).reduce((sum,row)=>sum+row._count._all,0),rows:dated.filter(row=>key(row.dueOn)===date).map(project)}}),
  pending:pending.map(project),review:review.map(project)}
}
