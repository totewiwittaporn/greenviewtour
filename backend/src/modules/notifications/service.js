import {effectiveAccess,canManageBookingTeam,isManager} from '../../../../packages/contracts/access.js'
import {personnelFinanceKinds} from '../../../../packages/contracts/personnel-finance.js'
import {accessProfileSelect} from '../identity-access/policy.js'
import {fail,int} from '../operations/common.js'
// Audit details may contain private compensation or customer data. Only these
// generic labels and authorized destination links leave this projection.
export const notificationFamilies=[
 {prefix:'operations.checkin.',permission:'operations.booking',href:'/operations/bookings',label:'Service attendance updated',important:true},
 {prefix:'operations.stock.',permission:'operations.stock',href:'/operations/inventory',label:'Inventory updated',important:true},
 {prefix:'operations.guide-assignment.',permission:'operations.guide',href:'/operations/guide-assignments',label:'Guide assignment updated',important:true},
 {prefix:'operations.booking.',permission:'operations.booking',href:'/operations/bookings',label:'Booking updated',important:true},
 {prefix:'customer-request.',permission:'operations.booking',href:'/operations/bookings?tab=requests',label:'Customer request updated',important:true},
 {prefix:'customer.',permission:'operations.booking',href:'/operations/bookings?tab=requests',label:'Customer request updated',important:true},
 {prefix:'receivable.',permission:'finance.receive',href:'/company/receivables',label:'Agent payment or statement updated',important:true},
 {prefix:'personnelFinance.',permission:null,href:null,label:'Personnel or finance record updated',important:true},
 {prefix:'company.purchase.',permission:'purchasing.view',href:'/company/purchasing',label:'Purchase updated',important:true},
 {prefix:'company.work.',permission:null,href:'/company/stock-requests',label:'Assigned company work updated',important:true},
 {prefix:'operations.run.',permission:null,href:null,label:'Job Order updated',important:true},
 {prefix:'operations.dispatch.',permission:null,href:null,label:'Job Order updated',important:true},
]
export async function notificationFor(tx,actor,event){
 const family=notificationFamilies.find(f=>event.action.startsWith(f.prefix));if(!family)return null
 if(family.permission&&!effectiveAccess(actor,family.permission).allowed)return null
 let href=family.href
 if(['operations.booking.','operations.checkin.'].includes(family.prefix)){
  const booking=await tx.tourBooking.findUnique({where:{id:event.targetId},select:{createdById:true,assigneeId:true}})
  if(!booking||!isManager(actor)&&!canManageBookingTeam(actor)&&(booking.assigneeId||booking.createdById)!==actor.id)return null
  href+='?bookingId='+event.targetId
 }else if(['customer.','customer-request.'].includes(family.prefix)){
  if(!isManager(actor)&&!canManageBookingTeam(actor))return null
 }else if(family.prefix==='personnelFinance.'){
  const row=await tx.financePersonnelRecord.findUnique({where:{id:event.targetId},select:{kind:true,createdBy:true,employeeId:true}})
  const spec=personnelFinanceKinds[row?.kind];if(!spec||!effectiveAccess(actor,spec.group+'.view').allowed)return null
  const involved=row.createdBy===actor.id||row.employeeId===actor.id||effectiveAccess(actor,spec.group+'.approve').allowed||effectiveAccess(actor,spec.group+'.pay').allowed
  if(!involved)return null
  href='/company/'+({AGENT_REFUND:'agent-refunds',EMPLOYMENT:'employees',ATTENDANCE:'attendance',PAYROLL:'payroll',ALLOWANCE:'allowances',REIMBURSEMENT:'expenses',WORK_ADVANCE:'advances',SALARY_ADVANCE:'salary-advances',SUPPLIER_PAYMENT:'supplier-payments',BOOKING_COMMISSION:'booking-commissions'}[row.kind])
 }else if(family.prefix==='operations.guide-assignment.'){
  const assignment=await tx.guideAssignment.findUnique({where:{id:event.targetId},select:{guideId:true}})
  if(!assignment||assignment.guideId!==actor.id&&!effectiveAccess(actor,'operations.manageGuide').allowed)return null
 }else if(family.prefix==='company.work.'){
  const row=await tx.companyWorkRecord.findUnique({where:{id:event.targetId},select:{kind:true,createdById:true,assigneeId:true}})
  if(!row){const purchase=await tx.purchaseOrder.findUnique({where:{id:event.targetId},select:{id:true}});if(!purchase||!effectiveAccess(actor,'purchasing.view').allowed)return null;return {id:event.id,at:event.createdAt,label:'Purchase updated',action:event.action,href:'/company/purchasing',important:true}}
  if(!effectiveAccess(actor,'inventory.request').allowed&&!effectiveAccess(actor,'housekeeping.view').allowed)return null
  if(!isManager(actor)&&![row.createdById,row.assigneeId].includes(actor.id))return null
  href='/company/'+({JOB:'cleaning-jobs',COUNT:'stock-counts',MAINTENANCE:'maintenance',STOCK_REQUEST:'stock-requests'}[row.kind]||'work-schedules')
 }else if(['operations.dispatch.','operations.run.'].includes(family.prefix)){
  const run=await tx.dispatchRun.findUnique({where:{id:event.targetId},select:{kind:true,staff:{select:{userId:true}}}})
  const duty=run?.kind==='BOAT'?'guide':'driver'
  if(!run||!effectiveAccess(actor,'operations.'+duty).allowed)return null
  if(!effectiveAccess(actor,'operations.'+(duty==='guide'?'manageGuide':'manageDriver')).allowed&&!run.staff.some(s=>s.userId===actor.id))return null
  href='/operations/'+duty+'?runId='+event.targetId
 }
 return {id:event.id,at:event.createdAt,label:family.label,action:event.action,href,important:family.important&&!/\.(saved|SIGN|EDIT|details-amended|return-amended)$/i.test(event.action)}
}
export async function listNotifications(prisma,actorId,params=new URLSearchParams()){
 return prisma.$transaction(async tx=>{
  const actor=await tx.userProfile.findUnique({where:{id:actorId},select:accessProfileSelect})
  if(actor?.status!=='ACTIVE')fail('PERMISSION_DENIED',403)
  const page=int(Number(params.get('page')||1),1,10000)
  const events=await tx.auditEvent.findMany({where:{createdAt:{gte:new Date(Date.now()-30*86400000)},OR:notificationFamilies.map(f=>({action:{startsWith:f.prefix}}))},select:{id:true,action:true,targetId:true,createdAt:true},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*100,take:101})
  const rows=[]
  for(const event of events.slice(0,100)){const row=await notificationFor(tx,actor,event);if(row)rows.push(row)}
  return {rows,page,hasMore:events.length>100,retentionDays:30}
 },{isolationLevel:'RepeatableRead',timeout:15000})
}
