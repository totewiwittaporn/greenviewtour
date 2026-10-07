import {ColumnTypeEnum} from '@prisma/driver-adapter-utils'
import {schema} from './schema.js'
import {d1SearchQuery} from './search.js'
import {PrismaD1} from '@prisma/adapter-d1'
// Implicit nested-write transactions are savepoints in the deferred plan.
export function createPlanningD1Adapter(planner){
  const factory=new PrismaD1(planner.binding),connect=factory.connect.bind(factory)
  factory.connect=async()=>{
    const base=await connect()
    // Prisma merges chunked query results using the FIRST chunk's metadata.
    // The stock D1 adapter discards that metadata for an empty chunk, corrupting
    // later populated chunks. Preserve headers even when there are zero rows.
    const convertData=base.convertData.bind(base)
    base.convertData=io=>io[1].length?convertData(io):{
      columnNames:io[0],rows:[],columnTypes:io[0].map(name=>{
        const types=new Set(Object.values(schema.tables).flatMap(table=>table.columns.filter(column=>column.name===name).map(column=>column.type)))
        if(types.size===1){
          const type=[...types][0]
          if(type==='INTEGER'||type==='BOOLEAN')return ColumnTypeEnum.Int32
          if(type==='DECIMAL'||type==='REAL')return ColumnTypeEnum.UnknownNumber
          if(type==='DATETIME')return ColumnTypeEnum.DateTime
        }
        return ColumnTypeEnum.Text
      }),
    }
    const queryRaw=base.queryRaw.bind(base),executeRaw=base.executeRaw.bind(base)
    base.queryRaw=query=>queryRaw(d1SearchQuery(query))
    base.executeRaw=query=>executeRaw(d1SearchQuery(query))
    base.startTransaction=async()=>{
      const initial=planner.savepoint(),savepoints=new Map()
      return {
        provider:base.provider,adapterName:'greenview-d1-atomic-plan',options:{usePhantomQuery:true},
        queryRaw:base.queryRaw.bind(base),executeRaw:base.executeRaw.bind(base),
        async commit(){},async rollback(){planner.restore(initial)},
        async createSavepoint(name){savepoints.set(name,planner.savepoint())},
        async rollbackToSavepoint(name){const point=savepoints.get(name);if(!point)throw new Error('D1_SAVEPOINT_NOT_FOUND');planner.restore(point)},
        async releaseSavepoint(name){savepoints.delete(name)},
      }
    }
    return base
  }
  return factory
}
