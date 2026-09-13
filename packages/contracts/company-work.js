const f=(key,label,type='text',required=true,options)=>({key,label,type,required,options})
export const workDefinitions={
 ZONE:{title:'Cleaning zones',permission:'housekeeping.view',edit:'housekeeping.manage',fields:[f('description','Location / description','text'),f('checklist','Checklist (one task per line)','lines')]},
 SCHEDULE:{title:'Cleaning & count schedules',permission:'housekeeping.view',edit:'housekeeping.manage',fields:[f('jobKind','Work type','select',true,['CLEANING','COUNT']),f('zoneId','Cleaning zone','zones',false),f('storeId','Stock location','stores',false),f('assigneeId','Assigned employee','users'),f('frequency','Repeat','select',true,['WEEKLY','MONTHLY','CUSTOM']),f('startsOn','First due date','date'),f('endsOn','Last due date','date'),f('customDates','Custom dates (one YYYY-MM-DD per line)','lines',false),f('checklist','Checklist (one task per line)','lines')]},
 JOB:{title:'Cleaning & count jobs',permission:'housekeeping.view',edit:null,fields:[]},
 STOCK_REQUEST:{title:'Stock requests',permission:'inventory.request',edit:'inventory.request',fields:[f('storeId','Source stock location','stores'),f('destinationId','Destination / custody location','stores'),f('resourceId','Item','resources'),f('quantity','Quantity (base units)','integer'),f('dueOn','Return / required date','date'),f('vehicleId','Boat or vehicle','vehicles',false),f('reason','Reason','text')]},
 COUNT:{title:'Stock counts',permission:'inventory.request',edit:'inventory.request',fields:[f('balanceId','Stock balance / lot','balances'),f('countedQuantity','Observed quantity','integer'),f('jobId','Scheduled count job','jobs',false),f('reason','Difference / inspection reason','text')]},
 MAINTENANCE:{title:'Maintenance jobs',permission:'inventory.request',edit:'inventory.request',fields:[f('vehicleId','Boat or vehicle','vehicles',false),f('resourceId','Equipment or spare','resources',false),f('assigneeId','Assigned technician','users'),f('dueOn','Due date','date'),f('reason','Problem and planned work','text')]},
 PURCHASE:{title:'Purchasing',permission:'purchasing.view',edit:'purchasing.edit',fields:[f('supplierId','Supplier','partners'),f('storeId','Receiving stock location','stores'),f('requestId','Related stock request','requests',false),f('quotationUrl','Quotation link (HTTPS)','text',false),f('reason','Purchase reason','text')]},
 RESPONSIBILITY:{title:'Warehouse custodians',permission:'inventory.request',edit:'inventory.assign',fields:[f('storeId','Stock location','stores'),f('primaryUserId','Primary custodian','users'),f('deputyUserId','Deputy (optional)','users',false),f('reason','Appointment reason','text')]},
}
export const workStatusNames={DRAFT:'Draft',SUBMITTED:'Awaiting approval',APPROVED:'Approved',ACTIVE:'Active',INACTIVE:'Inactive',PENDING:'Pending',DONE:'Awaiting acceptance',ACCEPTED:'Accepted',REJECTED:'Returned for changes',CANCELLED:'Cancelled',ISSUED:'Issued / awaiting return',CLOSED:'Closed',PART_RECEIVED:'Part received',RECEIVED:'Received'}
export function calendarDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('INVALID_DATE');const d=new Date(value+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==value)throw Error('INVALID_DATE');return d}
export function scheduleDates({frequency,startsOn,endsOn,customDates=[]},through=endsOn){
 const first=calendarDate(startsOn),end=calendarDate(endsOn),limit=calendarDate(through)
 if(end<first||+end-+first>366*86400000)throw Error('SCHEDULE_RANGE')
 if(!['WEEKLY','MONTHLY','CUSTOM'].includes(frequency))throw Error('INVALID_FREQUENCY')
 if(frequency==='CUSTOM'){
  if(!Array.isArray(customDates)||!customDates.length||customDates.length>366||new Set(customDates).size!==customDates.length)throw Error('INVALID_CUSTOM_DATES')
  for(const date of customDates){const d=calendarDate(date);if(d<first||d>end)throw Error('SCHEDULE_RANGE')}
  return customDates.filter(date=>calendarDate(date)<=limit).sort()
 }
 const result=[]
 for(let i=0;i<367;i++){
  let next
  if(frequency==='WEEKLY')next=new Date(+first+i*7*86400000)
  else {const month=first.getUTCMonth()+i,last=new Date(Date.UTC(first.getUTCFullYear(),month+1,0)).getUTCDate();next=new Date(Date.UTC(first.getUTCFullYear(),month,Math.min(first.getUTCDate(),last)))}
  if(next>end||next>limit)break
  result.push(next.toISOString().slice(0,10))
 }
 return result
}
export function satang(value){const s=String(value);if(!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(s))throw Error('INVALID_AMOUNT');const[a,b='']=s.split('.');return Number(a)*100+Number(b.padEnd(2,'0'))}
export const baht=value=>(value/100).toFixed(2)
export function purchaseTotal(lines){if(!Array.isArray(lines)||!lines.length||lines.length>50)throw Error('INVALID_LINES');return baht(lines.reduce((sum,line)=>{if(!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>1000000)throw Error('INVALID_QUANTITY');const next=sum+line.quantity*satang(line.unitCost);if(!Number.isSafeInteger(next)||next>999999999999)throw Error('AMOUNT_TOO_LARGE');return next},0))}
