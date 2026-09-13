const dated = new Set(['/operations/driver','/operations/guide','/operations/stock','/operations/issues','/operations/daily-close'])
const preparation = new Set(['/operations/stock','/operations/issues'])
export function operationHref(target, source) {
 const next=new URL(target,'http://workspace.local'),current=new URL(source,'http://workspace.local')
 const date=current.searchParams.get('date')
 if(dated.has(next.pathname)&&dated.has(current.pathname)&&/^\d{4}-\d{2}-\d{2}$/.test(date||'')){
  if(next.searchParams.get('date')!==date){next.searchParams.delete('runId');next.searchParams.delete('selectedRunId');next.searchParams.delete('page')}
  next.searchParams.set('date',date)
  if(preparation.has(next.pathname)&&preparation.has(current.pathname)){
   const runId=current.searchParams.get('runId');if(runId)next.searchParams.set('runId',runId);else next.searchParams.delete('runId')
  }
 }
 return next.pathname+next.search+next.hash
}
