const startedAt=new Date().toISOString(),errors=[]
export function recordApiFailure(error,method,now=new Date()){
 const entry={at:now.toISOString(),method:['GET','POST','PUT','PATCH','DELETE'].includes(method)?method:'OTHER',code:/^(P\d{4}|[0-9A-Z]{5}|E[A-Z_]{2,30})$/.test(error?.code||'')?error.code:'UNCLASSIFIED',type:/^[A-Za-z]{1,60}$/.test(error?.name||'')?error.name:'Error'}
 errors.unshift(entry);if(errors.length>100)errors.length=100
}
export function apiStatus(now=new Date()){
 return {api:'RESPONDING',checkedAt:now.toISOString(),startedAt,errors:[...errors],retention:'CURRENT_PROCESS_LAST_100',providers:'NOT_PROBED'}
}
