import {isD1Client} from './d1-runtime.js'
import {atomicUnit} from './atomic/executor.js'
export function readTransaction(client,reader,options){
  return isD1Client(client)?atomicUnit(client,reader,{...options,readOnly:true}):client.$transaction(reader,options)
}
