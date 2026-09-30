import {PrismaD1} from '@prisma/adapter-d1'

// The installed Prisma adapter otherwise turns transactions into independent
// queries. Fail closed until each multi-write flow uses reviewed native D1 batch.
export function createGuardedD1Adapter(database){
  const factory=new PrismaD1(database)
  const connect=factory.connect.bind(factory)
  factory.connect=async()=>{
    const adapter=await connect()
    adapter.startTransaction=async()=>{
      const error=new Error('D1_ATOMIC_BATCH_REQUIRED')
      error.code='D1_ATOMIC_BATCH_REQUIRED'
      throw error
    }
    return adapter
  }
  return factory
}

export function guardD1Transactions(client){
  // Protect the public Prisma API as well as the low-level adapter. Keep the
  // client extensible/readable while never evaluating a transaction callback.
  return new Proxy(client,{
    get(target,key,receiver){
      if(key==='$transaction')return async()=>{
        const error=new Error('D1_ATOMIC_BATCH_REQUIRED')
        error.code='D1_ATOMIC_BATCH_REQUIRED'
        throw error
      }
      return Reflect.get(target,key,receiver)
    },
  })
}
