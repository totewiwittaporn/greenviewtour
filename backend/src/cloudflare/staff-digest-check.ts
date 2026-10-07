// Isolated Local acceptance only; never an ordinary or Production Worker entry.
import authCheck from './auth-check.ts'
import {createD1Prisma} from '../platform/database/d1-client.ts'
import {prepareStaffDailyDigests} from '../modules/notifications/staff-digest.js'
import {prepareStaffDigestTick} from '../modules/notifications/staff-digest-schedule.js'
import {staffOa} from '../platform/line/staff-config.js'
import {randomUUID} from 'node:crypto'
export default {
 async fetch(request:Request,env:any,ctx:ExecutionContext):Promise<Response>{
  const url=new URL(request.url)
  if(env.APP_ENV!=='local'||!env.VERIFY_TOKEN||!['localhost','127.0.0.1'].includes(url.hostname))return new Response(null,{status:403})
  if(!url.pathname.startsWith('/__audit/digest-'))return authCheck.fetch(request,env,ctx)
  if(request.method!=='POST'||request.headers.has('origin')||request.headers.get('x-greenview-audit')!==env.VERIFY_TOKEN)return new Response(null,{status:403})
  const db=createD1Prisma(env.DB,{files:env.FILES})
  try{
   const input=await request.json() as any
   const auth=await db.authUser.findUnique({where:{email:input.email}})
   if(!auth||!input.email.endsWith('@example.test'))throw new Error('FIXTURE_ACCOUNT_REQUIRED')
   if(url.pathname==='/__audit/digest-job'){
    await db.userRole.deleteMany({where:{userId:auth.id}})
    await db.userRole.create({data:{userId:auth.id,roleCode:'HOUSEKEEPING',scope:'SELF'}})
    const id=randomUUID()
    await db.companyWorkRecord.create({data:{id,kind:'JOB',name:'PRIVATE CUSTOMER MUST NOT LEAK',status:'PENDING',dueOn:new Date(input.serviceDate+'T00:00:00Z'),assigneeId:auth.id,createdById:auth.id,commandHash:id,payload:{jobKind:'CLEANING',privateNote:'SECRET NOTE'}}})
    return Response.json({id,userId:auth.id})
   }
   if(url.pathname==='/__audit/digest-change'){
    await db.companyWorkRecord.updateMany({where:{id:input.id,assigneeId:auth.id},data:{version:{increment:1}}})
    return Response.json({ok:true})
   }
   if(url.pathname==='/__audit/digest-remove-role'){
    await db.userRole.deleteMany({where:{userId:auth.id}});return Response.json({ok:true})
   }
   if(url.pathname==='/__audit/digest-tick'){
    const config={channelKey:'live:'+staffOa.providerId+':'+staffOa.channelId,enabled:false,mode:'disabled',liveEnabled:false}
    return Response.json(await prepareStaffDigestTick(db,{actorId:auth.id,config,localTime:input.localTime,now:new Date(input.now)},prepareStaffDailyDigests))
   }
   return new Response(null,{status:404})
  }catch{return Response.json({code:'DIGEST_FIXTURE_FAILED'},{status:500})}finally{await db.$disconnect()}
 }
}
