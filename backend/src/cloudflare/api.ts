import {employeeOnboardingApi} from '../platform/auth/cloudflare/onboarding-api.js'
import {sendEmployeeInvitation} from '../modules/identity-access/employee-onboarding.js'
import {redactOwnerIdentity} from '../modules/identity-access/owner-privacy.js'
import {createStaffLineOnboarding} from '../platform/line/staff-onboarding.js'
import {requestEnvironment,requestAddress,mutationRateKeys} from './environment.js'
import {memberSurfacePaused} from '../modules/commerce/member-release.js'
import {staffLineSettings} from '../platform/line/staff-config.js'
import {staffLineApi} from '../platform/line/staff-api.js'
import {boundedAuthBody} from '../platform/auth/cloudflare/request-body.js'
import {createHash,timingSafeEqual} from 'node:crypto'
import {createHandler} from '../app/http.js'
import {createD1Prisma} from '../platform/database/d1-client.ts'
import {createD1AuthProvider} from '../platform/auth/cloudflare/provider.js'
import {authSettings,authError} from '../platform/auth/cloudflare/runtime.js'
import {consumeRate} from '../platform/auth/cloudflare/rate-limit.js'
import {SessionStore} from '../platform/auth/sessions.js'
import {AccessError} from '../modules/identity-access/membership.js'
export type ApiEnv={DB:D1Database;FILES:R2Bucket;APP_ENV:string;AUTH_SECRET:string;LOCAL_API_TOKEN?:string;PRODUCTION_ENABLED?:string;BACKOFFICE_ORIGIN?:string;MEMBER_ORIGIN?:string;PUBLIC_ORIGIN?:string}
const digest=(value:string)=>createHash('sha256').update(value).digest()
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})
export async function applicationRequest(request:Request,env:ApiEnv,staffLineOverride?:any,memberRegression=false):Promise<Response>{
 const url=new URL(request.url)
 if(memberSurfacePaused(url.pathname,env.APP_ENV,memberRegression))return json({code:'MEMBER_PAUSED'},503)
 const policy=requestEnvironment(request,env)
 if(policy.code)return json({code:policy.code},policy.status)
 if(policy.local){
  if(!env.AUTH_SECRET||!env.LOCAL_API_TOKEN)return json({code:'LOCAL_AUTH_CONFIGURATION_REQUIRED'},503)
  const supplied=request.headers.get('x-greenview-local-token')||''
  if(!timingSafeEqual(digest(supplied),digest(env.LOCAL_API_TOKEN)))return json({code:'LOCAL_ACCESS_REQUIRED'},401)
 }
 const config=authSettings(env)
 const aliases=(value:string)=>policy.local?[value,value.replace('://localhost:', '://127.0.0.1:')]:[value]
 const allowedOrigins={workspace:aliases(config.origins.workspace),customer:aliases(config.origins.customer),public:aliases(config.origins.public)}
 const origin=request.headers.get('origin')
 const surface=url.pathname.startsWith('/api/member/')?'customer':url.pathname.startsWith('/api/public/')?'public':'workspace'
 if(origin&&!(surface==='public'?Object.values(allowedOrigins).flat():allowedOrigins[surface]).includes(origin))return json({code:'ORIGIN_DENIED'},403)
 if(!['GET','HEAD','OPTIONS'].includes(request.method)&&!origin)return json({code:'ORIGIN_REQUIRED'},403)
 const prisma=createD1Prisma(env.DB,{files:env.FILES})
 try{
  const provider=createD1AuthProvider(prisma,env)
  const address=requestAddress(request,policy.local)
  let authInput:any
  const authPath=/\/(auth|member)\/(login|recover|register|accept-invitation|recovery-session|verify-email)$/.test(url.pathname)
  if(request.method==='POST'&&authPath){
   await consumeRate(env.DB,'auth:'+address,{maximum:120,seconds:600})
   const {input,bytes}=await boundedAuthBody(request)
   authInput=input
   request=new Request(request.url,{method:request.method,headers:request.headers,body:bytes})
   if(/\/login$/.test(url.pathname)&&typeof input.email==='string')await consumeRate(env.DB,'login:'+input.email.trim().toLowerCase(),{maximum:15,seconds:900})
  }
  if(['/api/auth/verify-email','/api/member/verify-email'].includes(url.pathname)){
   if(request.method!=='POST')return json({code:'METHOD_NOT_ALLOWED'},405)
   return json(await provider.verifyEmail(authInput.token,surface))
  }
  const sessions=new SessionStore(prisma,{secure:!policy.local}),memberSessions=sessions.fork('gv_member_session')
  if(url.pathname==='/api/onboarding'||url.pathname.startsWith('/api/onboarding/'))return await employeeOnboardingApi(request,{db:prisma,database:env.DB,env,sessions,provider,address})
  // Capture the authenticated viewer per request; public/member responses never inherit staff identity.
  let staffViewerId:string|undefined
  const authenticateStaff=sessions.authenticated.bind(sessions)
  sessions.authenticated=async (...args:Parameters<typeof authenticateStaff>)=>{
   const result=await authenticateStaff(...args)
   if(result.entry.purpose==='workspace')staffViewerId=result.user.id
   return result
  }
  if(url.pathname==='/api/me/line')return json(await staffLineApi(request,{db:prisma,database:env.DB,sessions,provider,config:staffLineOverride||staffLineSettings(env)}))
  const handler=createHandler({sendInvitation:(result:any)=>sendEmployeeInvitation(prisma,env,result),lineOnboarding:createStaffLineOnboarding(prisma,env),memberRegression,pool:prisma,prisma,provider,sessions,memberSessions,token:env.LOCAL_API_TOKEN,port:Number(url.port||8787),workerRuntime:true,environment:env.APP_ENV,allowedOrigins,
   throttle:async(req:any)=>{
    if(policy.local)return consumeRate(env.DB,'mutations:'+address,{maximum:600,seconds:60})
    const keys=await mutationRateKeys(req,sessions,address)
    for(const key of keys)await consumeRate(env.DB,key,{maximum:key.startsWith('mutations:ip:')?1200:600,seconds:60})
   },
  })
  const headers=Object.fromEntries(request.headers);headers.host=url.host
  const req={method:request.method,url:url.pathname+url.search,headers,async *[Symbol.asyncIterator](){
   if(!request.body)return
   const reader=request.body.getReader()
   try{for(;;){const {done,value}=await reader.read();if(done)return;yield Buffer.from(value)}}finally{reader.releaseLock()}
  }}
  let status=200,responseHeaders=new Headers(),result:Response|undefined
  const res={
   writeHead(code:number,values:Record<string,string|number|string[]>){status=code;responseHeaders=new Headers();for(const [key,value] of Object.entries(values)){for(const part of Array.isArray(value)?value:[value])responseHeaders.append(key,String(part))}},
   end(body:string|Uint8Array){responseHeaders.set('referrer-policy','no-referrer');result=new Response(body,{status,headers:responseHeaders})},
  }
  await handler(req,res)
  if(result&&staffViewerId&&result.status<400&&result.headers.get('content-type')?.includes('application/json')){
   const data=await redactOwnerIdentity(prisma,staffViewerId,await result.json())
   return new Response(JSON.stringify(data),{status:result.status,headers:result.headers})
  }
  return result||json({code:'SERVICE_UNAVAILABLE'},503)
 }catch(original){
  const error=authError(original)
  if(error instanceof AccessError){
   const response=json({code:error.code,...(error.errors?{errors:error.errors}:{}),...(error.retryAfterSeconds?{retryAfterSeconds:error.retryAfterSeconds}:{})},error.status)
   if(error.retryAfterSeconds)response.headers.set('retry-after',String(error.retryAfterSeconds))
   return response
  }
  console.error(JSON.stringify({event:'WORKER_API_FAILED',code:/^[A-Z0-9_]{1,60}$/.test(error.code||'')?error.code:'UNCLASSIFIED'}))
  return json({code:'SERVICE_UNAVAILABLE'},503)
 }finally{await prisma.$disconnect()}
}
