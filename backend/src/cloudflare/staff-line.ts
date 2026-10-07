import {consumeRate} from '../platform/auth/cloudflare/rate-limit.js'
import {staffLineSettings} from '../platform/line/staff-config.js'
import {processStaffWebhook,parseStaffWebhook} from '../platform/line/staff-webhook.js'
import {createD1Prisma} from '../platform/database/d1-client.ts'
import {AccessError} from '../modules/identity-access/membership.js'
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}})
export async function staffLineWebhookRequest(request:Request,env:any,override?:{config:any;client:any}){
 const config=override?.config||staffLineSettings(env)
 if(!config.enabled)return json({code:config.reason||'LINE_NOT_CONFIGURED'},503)
 if(request.method!=='POST')return json({code:'METHOD_NOT_ALLOWED'},405)
 if(request.headers.has('origin'))return json({code:'ORIGIN_DENIED'},403)
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json({code:'JSON_REQUIRED'},415)
 let db:any
 try{
  const chunks:Uint8Array[]=[];let size=0
  const reader=request.body?.getReader()
  try{if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw new AccessError('REQUEST_TOO_LARGE',413)}chunks.push(value)}}finally{reader?.releaseLock()}
  const raw=Buffer.concat(chunks.map(chunk=>Buffer.from(chunk))),signature=request.headers.get('x-line-signature')||''
  parseStaffWebhook(raw,signature,config) // Authenticate raw bytes before opening a database.
  db=createD1Prisma(env.DB,{files:env.FILES})
  return json(await processStaffWebhook(db,config,raw,signature,override?.client,userId=>consumeRate(env.DB,'staff-line-issue:'+config.channelKey+':'+userId,{maximum:10,seconds:600})))
 }catch(error:any){
  if(error instanceof AccessError)return json({code:error.code},error.status)
  console.error('STAFF_LINE_WEBHOOK_FAILED')
  return json({code:'LINE_PROCESSING_FAILED'},503)
 }finally{await db?.$disconnect()}
}
