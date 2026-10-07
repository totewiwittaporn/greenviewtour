import {readTransaction} from '../platform/database/read-transaction.js'
import {createD1Prisma} from '../platform/database/d1-client.ts'
import {Prisma} from '../generated/d1/client.ts'
import {d1Date} from '../platform/database/d1-atomic.js'

type Env={DB:D1Database;FILES:R2Bucket;APP_ENV:string;VERIFY_TOKEN:string}
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}})
const identifier=(value:string)=>{if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))throw new Error('INVALID_IDENTIFIER');return '"'+value+'"'}
const canonical=(value:any):string=>{
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']'
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}'
  return JSON.stringify(value)
}

// Operator-only LOCAL verification entry point, never a production application route.
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url)
  if(env.APP_ENV!=='local')return response({code:'LOCAL_ONLY'},503)
  if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||request.headers.has('origin'))return response({code:'LOCAL_HOST_REQUIRED'},403)
  if(!env.VERIFY_TOKEN||request.headers.get('x-greenview-audit')!==env.VERIFY_TOKEN)return response({code:'AUDIT_TOKEN_REQUIRED'},401)
  if(request.method==='GET'&&url.pathname==='/health/live')return response({status:'UP'})
  if(request.method!=='POST'||url.pathname!=='/verify')return response({code:'NOT_FOUND'},404)
  const prisma=createD1Prisma(env.DB,{files:env.FILES});let current='',columnName=''
  try{
   const {models}=await request.json() as {models:any[]}
   if(!Array.isArray(models)||!models.length||models.length>100)throw new Error('MODEL_LIST_REQUIRED')
   let modelsVerified=0,rows=0
   for(const model of models){
    current=model.name;identifier(current)
    const delegate=(prisma as any)[current[0].toLowerCase()+current.slice(1)]
    if(!delegate?.count||!Array.isArray(model.columns)||!Array.isArray(model.primary))throw new Error('INVALID_MODEL')
    const count=await delegate.count();if(count!==model.rows)throw new Error('COUNT_MISMATCH')
    const sample=await delegate.findFirst()
    if(sample){
     const sql=`SELECT ${model.columns.map(identifier).join(',')} FROM ${identifier(current)} WHERE ${model.primary.map((key:string)=>identifier(key)+'=?').join(' AND ')}`
     const raw=await env.DB.prepare(sql).bind(...model.primary.map((key:string)=>sample[key])).first<Record<string,any>>()
     if(!raw)throw new Error('PRIMARY_KEY_MISMATCH')
     for(const column of model.columns){
      columnName=column
      const field=model.fields.find((item:any)=>item.name===column)||{type:'String'}
      let left=sample[column],right=raw[column]
      if(left===null&&right===null)continue
      if(field.type==='DateTime'){left=d1Date(left);right=d1Date(right)}
      else if(field.type==='Decimal'){left=new Prisma.Decimal(String(left)).toFixed(field.scale);right=new Prisma.Decimal(String(right)).toFixed(field.scale)}
      else if(field.type==='Boolean')left=left?1:0
      else if(field.type==='Json'||field.array){left=canonical(left);right=canonical(typeof right==='string'?JSON.parse(right):right)}
      if(left!==right)throw new Error('PRISMA_DECODE_MISMATCH')
     }
    }else if(count)throw new Error('SAMPLE_REQUIRED')
    modelsVerified++;rows+=count
   }
   const transactionReadVerified=await readTransaction(prisma,async tx=>(await tx.role.count())===(await tx.role.count()))
   if(!transactionReadVerified)throw new Error('TRANSACTION_READ_MISMATCH')
   const guards=await env.DB.prepare('SELECT COUNT(*) AS n FROM D1TxnGuard').first<{n:number}>()
   if(guards?.n!==0)throw new Error('TRANSACTION_GUARD_LEAK')
   return response({status:'PASS',runtime:'workerd',readOnly:true,modelsVerified,rows,transactionReadVerified,transactionGuardRows:guards.n})
  }catch(error){const message=error instanceof Error?error.message:'';return response({code:'PRISMA_LOCAL_VERIFICATION_FAILED',model:current,column:columnName,reason:/^[A-Z_]+$/.test(message)?message:'PRISMA_RUNTIME_ERROR'},500)}
  finally{await prisma.$disconnect()}
 },
} satisfies ExportedHandler<Env>
