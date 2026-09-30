import {scalarArrayLookups} from '../scalar-array.js'
import {jsonRangeProjections} from '../json-range.js'
const decode=value=>typeof value==='string'?JSON.parse(value):value
const delegateTable=name=>name[0].toUpperCase()+name.slice(1)
// Mirror trigger-derived rows only for the write set; database triggers commit them.
export function derivedChanges(planner,table,before,after){
  for(const [source,config] of Object.entries(scalarArrayLookups)){
    const [owner,field]=source.split('.')
    if(owner!==table)continue
    const target=delegateTable(config.delegate)
    for(const value of new Set(decode(before?.[field]||'[]')))planner.setRow(target,{ownerId:before[config.ownerField],value},true)
    for(const value of new Set(decode(after?.[field]||'[]')))planner.setRow(target,{ownerId:after[config.ownerField],value},false)
  }
  const projections={...jsonRangeProjections,'OperationDailySnapshot.runs.length':{column:'runs',arrayLength:true}}
  for(const [source,config] of Object.entries(projections)){
    if(source.split('.')[0]!==table)continue
    const id=after?.id??before?.id
    planner.setRow('D1JsonProjection',{source,ownerId:id,textValue:null},true)
    if(!after||after[config.column]===null)continue
    let value=decode(after[config.column])
    if(config.arrayLength)value=Array.isArray(value)?value.length:0
    else for(const part of config.path)value=value?.[part]
    if(value===null||value===undefined)continue
    planner.setRow('D1JsonProjection',{source,ownerId:id,textValue:typeof value==='object'?JSON.stringify(value):String(value)},false)
  }
}
