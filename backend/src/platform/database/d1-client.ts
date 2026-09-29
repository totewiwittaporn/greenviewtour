import {PrismaD1} from '@prisma/adapter-d1'
import {PrismaClient} from '../../generated/d1/client.ts'
import {d1QueryArgs} from './d1-query.js'
import {registerD1Client} from './d1-runtime.js'

export function createD1Prisma(database,{files=null}={}){
  const client=new PrismaClient({adapter:new PrismaD1(database)})
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
  return registerD1Client(extended,database,{files})
}
