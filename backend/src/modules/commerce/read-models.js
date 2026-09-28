import {Prisma} from '@prisma/client'
import {readJsonFields} from '../../platform/database/read-json.js'
export const requestListSelect={id:true,version:true,status:true,serviceDate:true,adults:true,children:true,bookingId:true,holdUntil:true}
export const customerDirectorySelect={id:true,version:true,displayName:true,nickname:true,email:true,phone:true,status:true,authUserId:true}
export async function requestListDetails(tx,rows){
 if(!rows.length)return rows
 const details=await tx.$queryRaw(Prisma.sql`SELECT r.id, r."details"->>'name' AS name, r."snapshot"->>'tourName' AS "tourName", r."snapshot"->>'packageTotal' AS "packageTotal", b.status AS "bookingStatus" FROM app_private."CustomerRequest" r LEFT JOIN app_private."TourBooking" b ON b.id=r."bookingId" WHERE r.id IN (${Prisma.join(rows.map(row=>Prisma.sql`${row.id}::uuid`))})`)
 const byId=new Map(details.map(row=>[row.id,row]))
 return rows.map(row=>{const value=byId.get(row.id)||{};return {...row,booking:value.bookingStatus?{status:value.bookingStatus}:null,details:{name:value.name},snapshot:{tourName:value.tourName,packageTotal:value.packageTotal}}})
}
export async function memberRequestSnapshots(tx,rows){
 const paths=['tourName','packageTotal','confirmedTotal','promotion.name','paymentReview.message','bookingCode','demoCheckout','dateProposal.serviceDate','dateProposal.quoteKey','dateProposal.capacitySelections','dateProposal.quote.packageTotal','dateProposal.quote.terms.cancellationTerms','dateProposal.note','dateProposal.availability']
 const values=await readJsonFields(tx,'CustomerRequest','snapshot',rows.map(row=>row.id),paths)
 return rows.map(row=>{const v=values.get(row.id)||{};return {...row,snapshot:{tourName:v.tourName,packageTotal:v.packageTotal,confirmedTotal:v.confirmedTotal,bookingCode:v.bookingCode,promotion:v['promotion.name']?{name:v['promotion.name']}:null,paymentReview:v['paymentReview.message']?{message:v['paymentReview.message']}:null,demoCheckout:v.demoCheckout,dateProposal:row.status==='DATE_PROPOSED'?{serviceDate:v['dateProposal.serviceDate'],quoteKey:v['dateProposal.quoteKey'],capacitySelections:v['dateProposal.capacitySelections'],quote:{packageTotal:v['dateProposal.quote.packageTotal'],terms:{cancellationTerms:v['dateProposal.quote.terms.cancellationTerms']}},note:v['dateProposal.note'],availability:v['dateProposal.availability']}:null}}})
}
