import {requestEnvironment} from './environment.js'
import {memberSurfacePaused} from '../modules/commerce/member-release.js'
import {staffLineWebhookRequest} from './staff-line.ts'
import {applicationRequest} from './api.ts'
import {createD1Prisma} from '../platform/database/d1-client.ts'
import {runAutomaticStaffDigests} from '../modules/notifications/staff-digest-schedule.js'

type Env = {
  DB: D1Database
  FILES: R2Bucket
  APP_ENV: string
  AUTH_SECRET: string
  LOCAL_API_TOKEN?: string
  PRODUCTION_ENABLED?: string
  DAILY_WORK_ASSIGNMENT_AUTO_SEND?: string
  DAILY_WORK_ASSIGNMENT_ACTOR_ID?: string
  LINE_STAFF_ENABLED?: string
  LINE_STAFF_CHANNEL_ID?: string
  LINE_STAFF_PROVIDER_ID?: string
  LINE_STAFF_BOT_ID?: string
  LINE_STAFF_CHANNEL_SECRET?: string
  LINE_STAFF_ACCESS_TOKEN?: string
  BACKOFFICE_ORIGIN?: string
  PUBLIC_ORIGIN?: string
  MEMBER_ORIGIN?: string
  ASSETS?: Fetcher
  D1_LOCATION_HINT: string
}

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'},
})

export default {
  async fetch(request:Request,env:Env,ctx:ExecutionContext,memberRegression=false):Promise<Response>{
    const url=new URL(request.url)
    if(memberSurfacePaused(url.pathname,env.APP_ENV,memberRegression))return json({code:'MEMBER_PAUSED'},503)
    const policy=requestEnvironment(request,env)
    if(policy.code)return json({code:policy.code},policy.status)
    if(!policy.local&&(url.pathname==='/health'||url.pathname.startsWith('/health/')))return json({code:'NOT_FOUND'},404)
    if(url.pathname==='/api/line/staff/webhook')return staffLineWebhookRequest(request,env)
    if(url.pathname.startsWith('/api/'))return applicationRequest(request,env,undefined,memberRegression)
    if(!policy.local){
      if(url.pathname==='/api'||url.pathname.startsWith('/api/'))return json({code:'NOT_FOUND'},404)
      if(!['GET','HEAD'].includes(request.method))return json({code:'METHOD_NOT_ALLOWED'},405)
      if(!env.ASSETS)return json({code:'SERVICE_UNAVAILABLE'},503)
      const response=await env.ASSETS.fetch(request)
      const headers=new Headers(response.headers)
      headers.set('x-content-type-options','nosniff')
      headers.set('referrer-policy','no-referrer')
      headers.set('x-frame-options','DENY')
      headers.set('strict-transport-security','max-age=31536000')
      return new Response(response.body,{status:response.status,headers})
    }
    if(request.method!=='GET')return json({code:'METHOD_NOT_ALLOWED'},405)
    if(url.pathname==='/health/live')return json({status:'UP',service:'greenviewtour-cloudflare-api',environment:env.APP_ENV})
    if(url.pathname==='/health/db'){
      const direct=await env.DB.prepare('SELECT 1 AS connected').first<{connected:number}>()
      const prisma=createD1Prisma(env.DB,{files:env.FILES})
      try{
        const roles=await prisma.role.count()
        const insensitiveSearchProbe=await prisma.role.count({where:{name:{contains:'__probe__',mode:'insensitive'}}})
        const jsonPathProbe=await prisma.auditEvent.count({where:{details:{path:['probe','text'],string_contains:'__probe__',mode:'insensitive'}}})
        return json({status:direct?.connected===1?'UP':'DOWN',database:'D1',roles,insensitiveSearchProbe,jsonPathProbe,locationHint:env.D1_LOCATION_HINT})
      }finally{
        ctx.waitUntil(prisma.$disconnect())
      }
    }
    if(url.pathname==='/health/storage'){
      const objects=await env.FILES.list({limit:1})
      return json({status:'UP',storage:'R2',objectsObserved:objects.objects.length})
    }
    return json({code:'NOT_FOUND'},404)
  },
  async scheduled(controller:ScheduledController,env:Env):Promise<void>{
    const db=createD1Prisma(env.DB,{files:env.FILES})
    try{
      const result=await runAutomaticStaffDigests(db,{env,cron:controller.cron,now:new Date(controller.scheduledTime)})
      console.log(JSON.stringify({event:'DAILY_WORK_ASSIGNMENT_CRON',status:result.status,serviceDate:result.serviceDate,prepared:result.prepared,delivered:result.delivered,reason:result.reason||null}))
    }finally{
      await db.$disconnect()
    }
  },
} satisfies ExportedHandler<Env>
