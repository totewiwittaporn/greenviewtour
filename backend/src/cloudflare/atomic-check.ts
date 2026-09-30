import {demoWrites} from './checks/demo-writes.js'
import {catalogWrites} from './checks/catalog-writes.js'
import {attendanceWrites} from './checks/attendance-writes.js'
import {memberFiles} from './checks/member-files.js'
import {identityWrites} from './checks/identity-writes.js'
import {financeCompany} from './checks/finance-company.js'
import {reportParity} from './checks/report-parity.js'
import {operationsFlow} from './checks/smoke-operations.js'
import {dispatchFlow} from './checks/smoke-dispatch.js'
import {capacityRace} from './checks/capacity-race.js'
import {coreTransactions} from './checks/core-transactions.js'
const suites={core:coreTransactions,capacity:capacityRace,operations:operationsFlow,dispatch:dispatchFlow,reports:reportParity,finance:financeCompany,identity:identityWrites,member:memberFiles,catalog:catalogWrites,attendance:attendanceWrites,demo:demoWrites}
export default {
 async fetch(request,env){
  const url=new URL(request.url)
  if(env.APP_ENV!=='local'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||request.headers.get('x-greenview-audit')!==env.VERIFY_TOKEN)return new Response('Forbidden',{status:403})
  if(url.pathname==='/health/live')return Response.json({status:'UP'})
  const name=url.pathname.slice(1),run=suites[name]
  if(request.method!=='POST'||!run)return new Response('Not found',{status:404})
  try{return Response.json({status:'PASS',suite:name,...await run(env)})}
  catch(error){return Response.json({status:'FAIL',suite:name,stage:error.stage||null,code:/^[A-Z0-9_:-]+$/.test(error.message)?error.message:'SEE_PRIVATE_WORKER_LOG'},{status:500})}
 }
}
