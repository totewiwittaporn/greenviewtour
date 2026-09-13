import { createHash } from 'node:crypto'
import { savePersonnelFinance } from './service.js'
function demoId(key){const h=createHash('sha256').update(`DEMO-COMPANY-PERSONNEL:${key}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`}
// Caller owns database selection and authorization. Never creates auth users or overwrites existing records.
export async function seedPersonnelFinanceDemo(prisma,actorId,{employeeId,runId,sourcePurchaseId}={}){
 const employee=await prisma.userProfile.findUnique({where:{id:employeeId},select:{displayName:true}})
 if(!employee?.displayName.startsWith('DEMO'))throw new Error('DEMO_EMPLOYEE_REQUIRED')
 const samples=[
 ['employment','EMPLOYMENT',{position:'DEMO seasonal captain',startsOn:'2026-09-01',endsOn:'2027-04-30',notes:'DEMO only. Employment availability is separate from Job Orders.'}],
 ['available','ATTENDANCE',{date:'2026-09-19',type:'AVAILABLE_NO_JOB',substituteId:null,notes:'DEMO available without Job Order; no deduction.'}],
 ['rest','ATTENDANCE',{date:'2026-09-21',type:'REST',substituteId:null,notes:'DEMO planned weekly rest.'}],
 ['payroll','PAYROLL',{startsOn:'2026-09-01',endsOn:'2026-09-30',baseAmount:'10000',basis:'DEMO manually entered sample amounts; not actual compensation or an adopted deduction policy.',items:[{label:'DEMO sample agreed adjustment',reason:'DEMO owner-authorized manual example, not real deduction',type:'DEDUCTION',amount:'100'}]}],
 ['reimbursement','REIMBURSEMENT',{date:'2026-09-13',amount:'350',evidence:'DEMO RECEIPT - not a real receipt',notes:'DEMO equipment delivery expense.'}],
 ['work-advance','WORK_ADVANCE',{date:'2026-09-13',dueOn:'2026-09-30',amount:'1500',notes:'DEMO supply purchase advance; no actual payment.'}],
 ['salary-advance','SALARY_ADVANCE',{date:'2026-09-13',dueOn:'2026-09-30',amount:'1000',notes:'DEMO repayment arrangement, no actual payment or automatic payroll deduction.'}],
 ...(runId?[['allowance','ALLOWANCE',{runId,amount:'500',notes:'DEMO proposed allowance for assigned Job Order.'}]]:[]),
 ...(sourcePurchaseId?[['supplier','SUPPLIER_PAYMENT',{sourcePurchaseId,date:'2026-09-13',amount:'1',evidence:'DEMO invoice - not real',notes:'DEMO partial payment request against received purchase.'}]]:[]),
 ]
 const result=[]
 for(const [key,kind,payload] of samples){const id=demoId(key);const old=await prisma.financePersonnelRecord.findUnique({where:{id}});if(old){result.push({id,kind,created:false});continue}await savePersonnelFinance(prisma,actorId,{id,version:0,kind,title:`DEMO FLOW · ${key}`,employeeId,payload});result.push({id,kind,created:true})}
 return result
}
