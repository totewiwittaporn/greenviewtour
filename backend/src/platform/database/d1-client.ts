import {createGuardedD1Adapter,guardD1Transactions} from './d1-adapter.js'
import {PrismaClient} from '../../generated/d1/client.ts'
import {d1QueryArgs} from './d1-query.js'
import {registerD1Client} from './d1-runtime.js'

export function createD1Prisma(database,{files=null}={}){
  const client=new PrismaClient({adapter:createGuardedD1Adapter(database)})
  const extended=client.$extends({
    name:'greenview-d1-portability',
    query:{
      $allModels:{
        $allOperations({args,query}){
          return query(d1QueryArgs(args))
        },
      },
    },
  })
  return registerD1Client(guardD1Transactions(extended),database,{files})
}
