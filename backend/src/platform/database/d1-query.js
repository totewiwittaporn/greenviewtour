const identifier=/^[A-Za-z_][A-Za-z0-9_]*$/
const jsonPath=parts=>{
  if(!Array.isArray(parts)||!parts.length||parts.some(part=>typeof part!=='string'||!identifier.test(part)))throw new Error('D1_JSON_PATH_UNSUPPORTED')
  return '$.'+parts.join('.')
}

export function d1QueryArgs(value){
  if(Array.isArray(value))return value.map(d1QueryArgs)
  if(!value||typeof value!=='object'||value instanceof Date||value instanceof Uint8Array)return value
  if(![Object.prototype,null].includes(Object.getPrototypeOf(value)))return value
  const next={}
  for(const [key,item] of Object.entries(value)){
    if(key==='mode'&&item==='insensitive')continue
    if(key==='path'&&Array.isArray(item)){next.path=jsonPath(item);continue}
    next[key]=d1QueryArgs(item)
  }
  return next
}
