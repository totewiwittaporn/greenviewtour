import {createGuardedD1Adapter} from './d1-adapter.js'
import {PrismaClient} from '../../generated/d1/client.ts'
import {registerD1Client} from './d1-runtime.js'
import {createPlanningD1Adapter} from './atomic/adapter.js'
import {atomicUnit,registerAtomicFactory,markAtomicClient,readOnlyFiles} from './atomic/executor.js'
import {d1ModelArgs} from './atomic/model-args.js'
const writes=new Set(['create','createMany','createManyAndReturn','update','updateMany','updateManyAndReturn','upsert','delete','deleteMany'])
export function createD1Prisma(database,{files=null}={}){
  let client
  const make=planner=>{
    const binding=planner?.binding||database
    const raw=new PrismaClient({adapter:planner?createPlanningD1Adapter(planner):createGuardedD1Adapter(binding)})
    const extended=raw.$extends({name:'greenview-d1-atomic',query:{$allModels:{$allOperations({model,operation,args,query}){
      const converted=d1ModelArgs(model,args)
      if(!planner)return atomicUnit(client,tx=>tx[model[0].toLowerCase()+model.slice(1)][operation](converted),{readOnly:!writes.has(operation)})
      return query(converted)
    }}}})
    const wrapped=new Proxy(extended,{get(target,key,receiver){
      if(key==='$transaction')return (callback,options={})=>planner?callback(wrapped):atomicUnit(client,callback,options)
      if(!planner&&['$executeRaw','$executeRawUnsafe'].includes(String(key)))return (...args)=>atomicUnit(client,tx=>tx[key](...args))
      if(!planner&&['$queryRaw','$queryRawUnsafe'].includes(String(key)))return (...args)=>atomicUnit(client,tx=>tx[key](...args),{readOnly:true})
      return Reflect.get(target,key,receiver)
    }})
    registerD1Client(wrapped,binding,{files:planner?readOnlyFiles(files):files})
    if(planner)markAtomicClient(wrapped)
    return wrapped
  }
  client=make(null)
  registerAtomicFactory(client,planner=>make(planner))
  return client
}
