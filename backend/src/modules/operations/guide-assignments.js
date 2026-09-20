import {audit,authorize,fail,hash,int,keys,string,uuid,write} from './common.js'
import {parseStamp,localStamp} from '../../../../packages/contracts/operations.js'
import {jobBooking} from './dispatch.js'
import {checkStaffAvailability} from './staff-availability.js'
export const guideRoles=['GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE']
const include={guide:{select:{displayName:true}},booking:{include:{trip:true}}}
const projection=row=>({...row,status:row.booking.status==='CANCELLED'?'CANCELLED':row.status,requestHash:undefined,guide:{displayName:row.guide.displayName},booking:jobBooking(row.booking,'BOAT')})
export async function listGuideAssignments(db,actorId,params){
 const {access}=await authorize(db,actorId,'guide'),page=int(params.get('page')||1,1),q=string(params.get('q')||'',100,false)
 const where={...(access.manageGuide?{}:{guideId:actorId}),...(q?{booking:{OR:[{code:{contains:q,mode:'insensitive'}},{name:{contains:q,mode:'insensitive'}}]}}:{})}
 const total=await db.guideAssignment.count({where}),actual=Math.min(page,Math.max(1,Math.ceil(total/25)))
 const rows=await db.guideAssignment.findMany({where,include,orderBy:[{startsAt:'desc'},{id:'asc'}],skip:(actual-1)*25,take:25})
 return {rows:rows.map(projection),total,page:actual,pageSize:25,canManage:access.manageGuide}
}
export async function guideAssignmentOptions(db,actorId,params){
 await authorize(db,actorId,'manageGuide')
 const entity=params.get('entity'),q=string(params.get('q')||'',100,false),page=int(params.get('page')||1,1)
 if(!['bookings','staff'].includes(entity))fail('INVALID_FILTER',400)
 const staff=entity==='staff',model=staff?'userProfile':'tourBooking'
 const where=staff?{status:'ACTIVE',roles:{some:{roleCode:{in:guideRoles},scope:{in:['SELF','COMPANY']}}},...(q?{displayName:{contains:q,mode:'insensitive'}}:{})}:{status:'CONFIRMED',...(q?{OR:[{code:{contains:q,mode:'insensitive'}},{name:{contains:q,mode:'insensitive'}}]}:{})}
 const total=await db[model].count({where}),actual=Math.min(page,Math.max(1,Math.ceil(total/25)))
 const rows=await db[model].findMany({where,select:staff?{id:true,displayName:true}:{id:true,code:true,name:true},skip:(actual-1)*25,take:25,orderBy:{id:'asc'}})
 return {rows:rows.map(r=>({...r,name:staff?r.displayName:r.code+' · '+r.name})),total,page:actual,pageSize:25}
}
export async function saveGuideAssignment(db,actorId,input){
 keys(input,['id','version','bookingId','guideId','startsAt','endsAt','status','notes']);uuid(input.id);int(input.version,0)
 if(!['PLANNED','COMPLETED','CANCELLED'].includes(input.status))fail('INVALID_INPUT',400)
 let startsAt,endsAt;try{startsAt=parseStamp(input.startsAt);endsAt=parseStamp(input.endsAt)}catch{fail('INVALID_TIME',400)}
 if(endsAt<=startsAt||+endsAt-+startsAt>366*86400000)fail('INVALID_TIME_RANGE',400)
 const data={bookingId:uuid(input.bookingId),guideId:uuid(input.guideId),startsAt,endsAt,status:input.status,notes:string(input.notes||'',2000,false)},requestHash=hash(input)
 return write(db,actorId,async tx=>{
  const old=await tx.guideAssignment.findUnique({where:{id:input.id}})
  if(old?.requestHash===requestHash&&old.version===input.version+1)return {ok:true}
  if(old?old.version!==input.version||old.status!=='PLANNED':input.version!==0||data.status!=='PLANNED')fail('SETTINGS_CONFLICT')
  const booking=await tx.tourBooking.findUnique({where:{id:data.bookingId}})
  if(!booking||booking.status!=='CONFIRMED'&&data.status!=='CANCELLED')fail('BOOKING_LOCKED')
  if(data.status==='CANCELLED'&&(!old||old.bookingId!==data.bookingId||old.guideId!==data.guideId||!data.notes))fail('INVALID_INPUT',400)
  if(data.status!=='CANCELLED'){
   const guide=await tx.userProfile.findUnique({where:{id:data.guideId},include:{roles:true}})
   if(guide?.status!=='ACTIVE'||!guide.roles.some(r=>guideRoles.includes(r.roleCode)&&['SELF','COMPANY'].includes(r.scope)))fail('INVALID_RUN_STAFF',400)
   const firstDay=(booking.outboundDate||booking.returnDate)?.toISOString().slice(0,10),lastDay=booking.returnDate?.toISOString().slice(0,10)
   if(firstDay&&localStamp(startsAt).slice(0,10)<firstDay||lastDay&&localStamp(endsAt).slice(0,10)>lastDay)fail('SERVICE_SLOT_UNAVAILABLE')
   await checkStaffAvailability(tx,data.guideId,startsAt,endsAt,{assignmentId:input.id})
   if(data.status==='COMPLETED'&&endsAt>new Date())fail('GUIDE_JOB_NOT_FINISHED',409)
  }
  if(old)await tx.guideAssignment.update({where:{id:input.id},data:{...data,requestHash,version:{increment:1}}})
  else await tx.guideAssignment.create({data:{...data,id:input.id,requestHash}})
  await audit(tx,actorId,input.id,'guide-assignment.saved',{bookingId:data.bookingId,guideId:data.guideId,status:data.status,version:input.version+1})
  return {ok:true}
 },'manageGuide')
}
