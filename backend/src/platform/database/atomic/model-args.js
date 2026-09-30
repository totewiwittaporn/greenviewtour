import {schema} from './schema.js'
import {d1QueryArgs} from '../d1-query.js'
const plain=value=>value&&typeof value==='object'&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)
const uuid=value=>{
  if(typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value))return value.toLowerCase()
  if(Array.isArray(value))return value.map(uuid)
  if(plain(value))return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,uuid(item)]))
  return value
}
function where(model,value){
  if(Array.isArray(value))return value.map(item=>where(model,item))
  if(!plain(value))return value
  const meta=schema.tables[model]
  return Object.fromEntries(Object.entries(value).map(([key,item])=>{
    const column=meta?.columns.find(column=>column.name===key),related=meta?.relations?.[key]
    if(column?.native==='Uuid')return [key,uuid(item)]
    if(column){
      if(column.type==='JSONB'&&plain(item)){
        const literals=new Set(['equals','not','array_contains','array_starts_with','array_ends_with'])
        const operators=d1QueryArgs(Object.fromEntries(Object.entries(item).filter(([name])=>!literals.has(name))))
        return [key,{...operators,...Object.fromEntries(Object.entries(item).filter(([name])=>literals.has(name)))}]
      }
      return [key,d1QueryArgs(item)]
    }
    return [key,where(related||model,item)]
  }))
}
function data(model,value){
  if(Array.isArray(value))return value.map(item=>data(model,item))
  if(!plain(value))return value
  const meta=schema.tables[model]
  return Object.fromEntries(Object.entries(value).map(([key,item])=>{
    const column=meta?.columns.find(column=>column.name===key),related=meta?.relations?.[key]
    if(column)return [key,column.native==='Uuid'?uuid(item):item]
    if(related)return [key,relationData(related,item)]
    return [key,item]
  }))
}
function relationData(model,value){
  if(!plain(value))return value
  return Object.fromEntries(Object.entries(value).map(([action,input])=>{
    if(['connect','disconnect','delete','deleteMany','set'].includes(action))return [action,where(model,input)]
    if(action==='create')return [action,data(model,input)]
    if(action==='createMany')return [action,{...input,data:data(model,input.data)}]
    if(['update','updateMany','upsert','connectOrCreate'].includes(action)){
      const transform=item=>plain(item)&&['data','where','create','update'].some(key=>Object.hasOwn(item,key))?d1ModelArgs(model,item):data(model,item)
      return [action,Array.isArray(input)?input.map(transform):transform(input)]
    }
    return [action,input]
  }))
}
export function d1ModelArgs(model,args){
  if(!plain(args))return args
  return Object.fromEntries(Object.entries(args).map(([key,value])=>{
    if(['where','cursor','having'].includes(key))return [key,where(model,value)]
    if(['data','create','update'].includes(key))return [key,data(model,value)]
    if(['include','select'].includes(key)&&plain(value))return [key,Object.fromEntries(Object.entries(value).map(([field,selection])=>[field,schema.tables[model]?.relations?.[field]?d1ModelArgs(schema.tables[model].relations[field],selection):selection]))]
    return [key,value]
  }))
}
