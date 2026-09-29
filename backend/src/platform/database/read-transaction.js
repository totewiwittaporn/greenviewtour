import {isD1Client} from './d1-runtime.js'

export function readTransaction(client,reader,options){
  return isD1Client(client)?reader(client):client.$transaction(reader,options)
}
