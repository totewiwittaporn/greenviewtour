// Isolated Local test entry. Never referenced by production or the ordinary dev config.
import authCheck from './auth-check.ts'
import {applicationRequest} from './api.ts'
import {staffLineWebhookRequest} from './staff-line.ts'
import {staffOa} from '../platform/line/staff-config.js'
import {createStaffLineClient} from '../platform/line/staff-client.js'
import {createD1Prisma} from '../platform/database/d1-client.ts'
import {lineHash} from '../platform/line/staff-crypto.js'
import {randomUUID} from 'node:crypto'
const replies:any[]=[];let issues=0,rejectNextReply=false
export default {
 async fetch(request:Request,env:any,ctx:ExecutionContext){
  const url=new URL(request.url)
  if(env.APP_ENV!=='local'||!env.VERIFY_TOKEN||!['localhost','127.0.0.1'].includes(url.hostname))return new Response(null,{status:403})
  const config={...staffOa,mode:'test',enabled:true,reason:null,channelKey:'test:'+staffOa.providerId+':'+staffOa.channelId,origin:'http://localhost:5174',addFriendUrl:'https://line.me/R/ti/p/%40335bydey',botId:'U'+'0'.repeat(32),secret:env.VERIFY_TOKEN,encryptionSecret:env.AUTH_SECRET,accessToken:'isolated-fixture-only'}
  const transport=async(input:any,options:any)=>{
   const target=new URL(input)
   if(target.origin!=='https://api.line.me')throw new Error('FIXTURE_NETWORK_FORBIDDEN')
   if(target.pathname.endsWith('/linkToken')){issues++;return Response.json({linkToken:'test-link-'+randomUUID()})}
   if(target.pathname.includes('/profile/'))return Response.json({userId:target.pathname.split('/').at(-1),displayName:'Local LINE test account'})
   if(target.pathname.endsWith('/message/reply')){
    if(rejectNextReply){rejectNextReply=false;return Response.json({}, {status:503})}
    replies.push(JSON.parse(options.body));return Response.json({})
   }
   throw new Error('UNEXPECTED_LINE_FIXTURE_REQUEST')
  }
  if(url.pathname==='/api/me/line')return applicationRequest(request,env,config)
  if(url.pathname==='/api/line/staff/webhook')return staffLineWebhookRequest(request,env,{config,client:createStaffLineClient(config,transport)})
  if(url.pathname.startsWith('/__audit/line-')){
   if(request.method!=='POST'||request.headers.has('origin')||request.headers.get('x-greenview-audit')!==env.VERIFY_TOKEN)return new Response(null,{status:403})
   const input=await request.json() as any
   if(url.pathname==='/__audit/line-replies')return Response.json({replies,issues})
   if(url.pathname==='/__audit/line-fail-reply'){rejectNextReply=true;return Response.json({ok:true})}
   const db=createD1Prisma(env.DB,{files:env.FILES})
   try{
    if(url.pathname==='/__audit/line-expire'){
     await db.staffLineRequest.update({where:{id:lineHash(input.request)},data:{expiresAt:new Date(0)}})
     return Response.json({ok:true})
    }
    if(url.pathname==='/__audit/line-counts')return Response.json({bindings:await db.staffLineBinding.count({where:{status:'LINKED'}}),events:await db.staffLineEvent.count(),requests:await db.staffLineRequest.count()})
    return Response.json({code:'NOT_FOUND'},{status:404})
   }finally{await db.$disconnect()}
  }
  return authCheck.fetch(request,env,ctx)
 },
}
