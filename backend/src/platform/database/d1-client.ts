import {PrismaD1} from '@prisma/adapter-d1'
import {PrismaClient} from '../../generated/d1/client.ts'
import {d1QueryArgs} from './d1-query.js'

export function createD1Prisma(database){
  const client=new PrismaClient({adapter:new PrismaD1(database)})
  return client.$extends({
    name:'greenview-d1-portability',
    query:{
      $allModels:{
        $allOperations({args,query}){
          return query(d1QueryArgs(args))
        },
      },
    },
  })
}
