import {fail} from './common.js'
export async function checkStaffAvailability(tx,userId,startsAt,endsAt,{runId,assignmentId}={}){
 if(await tx.dispatchStaff.count({where:{userId,...(runId?{runId:{not:runId}}:{}),run:{status:'OPEN',slot:{startsAt:{lt:endsAt},endsAt:{gt:startsAt}}}}}))fail('STAFF_TIME_CONFLICT')
 if(await tx.guideAssignment.count({where:{guideId:userId,...(assignmentId?{id:{not:assignmentId}}:{}),status:{not:'CANCELLED'},booking:{status:{not:'CANCELLED'}},startsAt:{lt:endsAt},endsAt:{gt:startsAt}}}))fail('STAFF_TIME_CONFLICT')
}
