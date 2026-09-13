export const personnelFinanceKinds = {
 EMPLOYMENT:{title:'Seasonal employment',group:'personnel',fields:[['position','Position'],['startsOn','Season starts','date'],['endsOn','Season ends','date'],['notes','Employment notes']]},
 ATTENDANCE:{title:'Attendance & rest',group:'personnel',fields:[['date','Date','date'],['type','Record type','select',['PRESENT','REST','PAID_LEAVE','UNPAID_LEAVE','ABSENT','AVAILABLE_NO_JOB']],['substituteId','Substitute employee','employee-optional'],['notes','Reason / arrangement']]},
 PAYROLL:{title:'Payroll drafts',group:'payroll',fields:[['startsOn','Period starts','date'],['endsOn','Period ends','date'],['baseAmount','Base wage (THB)','money'],['basis','Base wage basis / reason'],['items','Additions and deductions','items']]},
 ALLOWANCE:{title:'Trip allowances',group:'expenses',fields:[['runId','Job Order','run'],['amount','Allowance amount (THB)','money'],['notes','Allowance basis']]},
 REIMBURSEMENT:{title:'Reimbursements',group:'expenses',fields:[['date','Expense date','date'],['amount','Amount (THB)','money'],['evidence','Receipt / evidence reference'],['notes','Business purpose']]},
 WORK_ADVANCE:{title:'Work advances',group:'expenses',fields:[['date','Requested date','date'],['dueOn','Clearance due','date'],['amount','Amount (THB)','money'],['notes','Business purpose']]},
 SALARY_ADVANCE:{title:'Salary advances',group:'payroll',fields:[['date','Requested date','date'],['dueOn','Clearance due','date'],['amount','Amount (THB)','money'],['notes','Agreed repayment arrangement']]},
 SUPPLIER_PAYMENT:{title:'Supplier payments',group:'expenses',fields:[['sourcePurchaseId','Received purchase order','purchase'],['date','Payment request date','date'],['amount','Amount (THB)','money'],['evidence','Invoice reference'],['notes','Payment details']]},
}
export function cents(value){if(!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(String(value)))throw new Error('INVALID_AMOUNT');const [a,b='']=String(value).split('.');return Number(a)*100+Number(b.padEnd(2,'0'))}
export function payrollTotal(items,baseAmount='0'){if(!Array.isArray(items)||items.length>100)throw new Error('INVALID_PAYROLL_ITEMS');let total=cents(baseAmount);for(const item of items){if(!item||Object.keys(item).some(k=>!['label','reason','type','amount'].includes(k))||typeof item.label!=='string'||!item.label.trim()||item.label.length>200||typeof item.reason!=='string'||!item.reason.trim()||item.reason.length>1000||!['EARNING','DEDUCTION'].includes(item.type))throw new Error('INVALID_PAYROLL_ITEMS');total+=(item.type==='DEDUCTION'?-1:1)*cents(item.amount)}if(total<=0)throw new Error('INVALID_PAYROLL_TOTAL');return total}
export function financialTotal(kind,payload){return kind==='PAYROLL'?payrollTotal(payload.items,payload.baseAmount):['EMPLOYMENT','ATTENDANCE'].includes(kind)?null:cents(payload.amount)}
export function personnelFinanceErrors(kind,values){
 const errors={};if(!values.title?.trim())errors.title='Enter a record name.';if(!values.employeeId)errors.employeeId='Choose an employee.'
 for(const [key,,type,options] of personnelFinanceKinds[kind].fields){const value=values.payload[key];if(type==='employee-optional')continue
  if(type==='items'){try{payrollTotal(value,values.payload.baseAmount)}catch{errors[key]='Enter valid additions and deductions with reasons and a positive total.'}}
  else if(type==='money'){try{if(cents(value)<=0)throw new Error()}catch{errors[key]='Enter an amount greater than zero, with up to two decimals.'}}
  else if(!value||!String(value).trim())errors[key]='Complete this field.'
  else if(type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(+new Date(value))||new Date(value).toISOString().slice(0,10)!==value))errors[key]='Enter a valid date.'
  else if(type==='select'&&!options.includes(value))errors[key]='Choose an available option.'
 }
 if(values.payload.endsOn<values.payload.startsOn)errors.endsOn='End date must follow start date.'
 if(values.payload.dueOn<values.payload.date)errors.dueOn='Due date must follow requested date.'
 return errors
}
export function recordActions(row,access,actorId){
 const group=personnelFinanceKinds[row.kind].group,own=row.createdBy===actorId
 const beneficiary=group!=='personnel'&&row.kind!=='SUPPLIER_PAYMENT'&&row.employeeId===actorId
 const actions=[]
 if(row.status==='DRAFT'&&access.edit&&own)actions.push('SUBMIT','CANCEL')
 if(row.status==='REJECTED'&&access.edit&&own)actions.push('REVISE')
 if(row.status==='SUBMITTED'&&access.approve&&!own&&!beneficiary)actions.push('APPROVE','REJECT')
 if(row.status==='APPROVED'&&group!=='personnel'&&access.pay&&!beneficiary)actions.push('PAY')
 if(row.status==='PAID'&&['WORK_ADVANCE','SALARY_ADVANCE'].includes(row.kind)&&access.edit)actions.push('CLEAR')
 if(row.status==='CLEARANCE_SUBMITTED'&&access.approve&&row.clearance?.submittedBy!==actorId&&!beneficiary)actions.push('APPROVE_CLEARANCE','REJECT_CLEARANCE')
 return actions
}
