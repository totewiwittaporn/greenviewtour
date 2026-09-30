import {d1DatabaseFor} from '../d1-runtime.js'
import {D1AtomicPlanner} from './planner.js'
import {databaseError,limits} from './overlay.js'
const factories=new WeakMap(),active=new WeakSet()
export function registerAtomicFactory(client,factory){factories.set(client,factory);return client}
export function markAtomicClient(client){active.add(client);return client}
export function isAtomicClient(client){return active.has(client)}
export async function atomicUnit(client,callback,options={}){
  if(typeof callback!=='function')throw databaseError('D1_CALLBACK_UNIT_REQUIRED',400)
  if(active.has(client))return callback(client)
  const database=d1DatabaseFor(client),factory=factories.get(client)
  if(!database||!factory)throw databaseError('D1_UNIT_FACTORY_REQUIRED',503)
  const deadline=Date.now()+Math.min(options.timeout||30000,60000)
  let remaining=limits.queries
  for(let attempt=0;attempt<4;attempt++){
    const planner=new D1AtomicPlanner(database,{readOnly:Boolean(options.readOnly),maxQueries:remaining})
    let transaction
    try{
      await planner.start();transaction=factory(planner)
      const value=await callback(transaction)
      if(Date.now()>deadline)throw databaseError('D1_UNIT_TIMEOUT',503)
      await planner.commit()
      return value
    }catch(error){
      const snapshotConflict=error.code==='D1_ATOMIC_SNAPSHOT'||error.message?.includes('D1_ATOMIC_SNAPSHOT')
      const changed=Number.isSafeInteger(planner.version)&&!planner.closed?await planner.currentVersion().then(version=>version!==planner.version).catch(()=>false):false
      remaining-=planner.queries+2
      if((snapshotConflict||changed)&&attempt<3&&remaining>24&&Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,5*(attempt+1)));continue}
      if(snapshotConflict||changed)throw databaseError('P2034',409)
      throw error
    }finally{
      await planner.serial
      planner.closed=true
      if(transaction)await transaction.$disconnect()
    }
  }
  throw databaseError('P2034',409)
}
export function readOnlyFiles(bucket){
  if(!bucket)return null
  return new Proxy(bucket,{get(target,key){
    if(['put','delete','createMultipartUpload','resumeMultipartUpload'].includes(key))return ()=>{throw databaseError('D1_EXTERNAL_WRITE_INSIDE_UNIT')}
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value
  }})
}
