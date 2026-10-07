// Isolated LOCAL regression entry only; never referenced by deployment config.
import worker from './worker.ts'
import {createD1Prisma} from '../platform/database/d1-client.ts'
import {passwordHash} from '../platform/auth/cloudflare/runtime.js'
import {hash as bcryptHash} from 'bcryptjs'
import {randomUUID} from 'node:crypto'
export default {
 async fetch(request:Request,env:any,ctx:ExecutionContext){
  const url=new URL(request.url)
  if(!url.pathname.startsWith('/__audit/'))return worker.fetch(request,env,ctx,true)
  if(env.APP_ENV!=='local'||!['localhost','127.0.0.1'].includes(url.hostname)||request.headers.has('origin')||!env.VERIFY_TOKEN||request.headers.get('x-greenview-audit')!==env.VERIFY_TOKEN)return new Response(null,{status:403})
  const db=createD1Prisma(env.DB,{files:env.FILES})
  try{
   if(url.pathname==='/__audit/seed'&&request.method==='POST'){
    const input=await request.json() as {email:string;password:string;legacy?:boolean;role?:'ADMIN_MANAGER'|'MANAGER'}
    if(!input.email.endsWith('@example.test'))throw new Error('FIXTURE_EMAIL_ONLY')
    const role=input.role??'ADMIN_MANAGER'
    if(!['ADMIN_MANAGER','MANAGER'].includes(role))throw new Error('FIXTURE_ROLE_INVALID')
    const id=randomUUID(),password=input.legacy?await bcryptHash(input.password,10):await passwordHash(input.password)
    await db.$transaction(async tx=>{
     await tx.authUser.create({data:{id,name:'Local audit manager',email:input.email,emailVerified:true,updatedAt:new Date()}})
     await tx.authAccount.create({data:{id:randomUUID(),accountId:id,providerId:'credential',userId:id,password,updatedAt:new Date()}})
     await tx.userProfile.create({data:{id,displayName:'Local audit manager',department:'MANAGEMENT',roles:{create:{roleCode:role,scope:'COMPANY'}}}})
    })
    return Response.json({id})
   }
   if(url.pathname==='/__audit/mail'&&request.method==='POST'){
    const {email,kind}=await request.json() as {email:string;kind:string}
    if(!email.endsWith('@example.test'))throw new Error('FIXTURE_EMAIL_ONLY')
    const mail=await db.localMail.findFirst({where:{recipient:email,kind},orderBy:{createdAt:'desc'},select:{link:true,kind:true}})
    return Response.json({mail})
   }
   if(url.pathname==='/__audit/state'&&request.method==='POST'){
    const {email}=await request.json() as {email:string}
    if(!email.endsWith('@example.test'))throw new Error('FIXTURE_EMAIL_ONLY')
    const user=await db.authUser.findUnique({where:{email},select:{id:true,emailVerified:true}})
    const profile=user?await db.userProfile.findUnique({where:{id:user.id},select:{status:true,roles:{select:{roleCode:true,scope:true}}}}):null
    return Response.json({user,profile,webSessions:user?await db.webSession.count({where:{userId:user.id}}):0,authSessions:user?await db.authSession.count({where:{userId:user.id}}):0})
   }
   if(url.pathname==='/__audit/suspend'&&request.method==='POST'){
    const {email}=await request.json() as {email:string}
    if(!email.endsWith('@example.test'))throw new Error('FIXTURE_EMAIL_ONLY')
    const user=await db.authUser.findUniqueOrThrow({where:{email}})
    await db.userProfile.update({where:{id:user.id},data:{status:'SUSPENDED'}})
    return Response.json({ok:true})
   }
   return Response.json({code:'NOT_FOUND'},{status:404})
  }catch(error){console.error('AUTH_FIXTURE_FAILED',error);return Response.json({code:'AUTH_FIXTURE_FAILED'},{status:500})}
  finally{await db.$disconnect()}
 },
}
