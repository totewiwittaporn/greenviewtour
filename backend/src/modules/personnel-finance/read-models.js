import {readJsonFields} from '../../platform/database/read-json.js'
import {financialTotal} from '../../../../packages/contracts/personnel-finance.js'
export const financeListSelect={id:true,kind:true,title:true,employeeId:true,status:true,version:true,createdBy:true}
export async function financeListPayloads(tx,rows,kind){
 const paths=kind==='EMPLOYMENT'?['startsOn','endsOn']:kind==='ATTENDANCE'?['date']:kind==='PAYROLL'?['baseAmount','items']:['amount']
 const payloads=await readJsonFields(tx,'FinancePersonnelRecord','payload',rows.map(row=>row.id),paths)
 const clearances=await readJsonFields(tx,'FinancePersonnelRecord','clearance',rows.filter(row=>row.status==='CLEARANCE_SUBMITTED').map(row=>row.id),['submittedBy'])
 return rows.map(row=>{
  const payload=payloads.get(row.id)||{}
  // Reuse the existing fixed-decimal validator/calculator; do not introduce a
  // second payroll formula. Draft labels/evidence are not sent to list tables.
  const amountCents=financialTotal(kind,payload)
  return {...row,payload:['EMPLOYMENT','ATTENDANCE'].includes(kind)?payload:{},amountCents,clearance:clearances.get(row.id)||null}
 })
}
