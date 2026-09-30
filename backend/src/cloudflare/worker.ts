import {createD1Prisma} from '../platform/database/d1-client.ts'

type Env = {
  DB: D1Database
  FILES: R2Bucket
  APP_ENV: string
  D1_LOCATION_HINT: string
}

const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'},
})

export default {
  async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(request.url)
    // Infrastructure-only checkpoint: hosted execution stays closed until full cutover acceptance.
    if(env.APP_ENV!== 'local')return json({code:'PRODUCTION_NOT_ENABLED'},503)
    if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return json({code:'LOCAL_HOST_REQUIRED'},403)
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
} satisfies ExportedHandler<Env>
