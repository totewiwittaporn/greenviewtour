import {Prisma} from '@prisma/client'
import {createHash} from 'node:crypto'
import {d1Date} from '../../backend/src/platform/database/d1-atomic.js'
export const fail=code=>{throw new Error(code)}
export const hash=value=>createHash('sha256').update(value).digest('hex')
export class ExactNumber{constructor(text){this.text=text}}
export function parseExact(text){
  return JSON.parse(text,(_key,value,context)=>{
    if(typeof value!=='number')return value
    if(typeof context?.source!=='string')fail('NODE_LOSSLESS_JSON_SUPPORT_REQUIRED')
    return new ExactNumber(context.source)
  })
}
export function exactJSON(value){
  if(value instanceof ExactNumber)return new Prisma.Decimal(value.text).toFixed()
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value)
  if(typeof value==='number'){if(!Number.isFinite(value))fail('NONFINITE_JSON_NUMBER');return new Prisma.Decimal(String(value)).toFixed()}
  if(Array.isArray(value))return '['+value.map(exactJSON).join(',')+']'
  if(typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+exactJSON(value[key])).join(',')+'}'
  fail('UNSUPPORTED_JSON_VALUE')
}
export const textNumber=value=>value instanceof ExactNumber?value.text:String(value)
export const quote=name=>{if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))fail('INVALID_SQL_IDENTIFIER');return '"'+name+'"'}
export const keyFor=(row,primary)=>exactJSON(primary.map(name=>row[name]))
export const sameNames=(left,right)=>JSON.stringify([...left].sort())===JSON.stringify([...right].sort())
export function schemaModels(text){
  const models=new Map(),enums=new Map()
  for(const match of text.matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm))enums.set(match[1],match[2].split('\n').map(line=>line.trim()).filter(line=>/^[A-Z_]+$/.test(line)))
  for(const match of text.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)){
    const fields=[];let primary=[]
    for(const line of match[2].split('\n')){
      const item=line.trim().match(/^(\w+)\s+(\w+)(\[\]|\?)?(?:\s+(.*))?$/)
      if(!item)continue
      const [,name,type,modifier='',attributes='']=item
      if(!['String','Int','BigInt','Float','Boolean','DateTime','Json','Decimal','Bytes'].includes(type)&&!enums.has(type))continue
      const money=attributes.match(/@db\.Decimal\((\d+),\s*(\d+)\)/)
      const length=attributes.match(/@db\.(?:VarChar|Char)\((\d+)\)/)
      const field={name,type,optional:modifier==='?',array:modifier==='[]',attributes,values:enums.get(type),precision:money?Number(money[1]):null,scale:money?Number(money[2]):null,maxLength:length?Number(length[1]):null}
      if(attributes.includes('@map('))fail('MAPPED_FIELD_REVIEW_REQUIRED')
      if(/@id\b/.test(attributes))primary=[name]
      fields.push(field)
    }
    const composite=match[2].match(/@@id\(\[([^\]]+)\]/)
    if(composite)primary=composite[1].split(',').map(name=>name.trim())
    if(!primary.length)fail('PRIMARY_KEY_REQUIRED:'+match[1])
    models.set(match[1],{name:match[1],fields,primary})
  }
  if(!models.size)fail('SCHEMA_MODELS_REQUIRED')
  return models
}
export function convertValue(value,field,{sqlNull=value===null}={}){
  const label=field.name
  if(field.type==='Json'&&value===null&&!sqlNull)return 'null'
  if(value===null){if(!field.optional)fail('REQUIRED_VALUE_NULL:'+label);return null}
  if(field.array){
    if(!Array.isArray(value)||value.some(item=>typeof item!=='string'))fail('INVALID_SCALAR_ARRAY:'+label)
    return exactJSON(value)
  }
  if(field.type==='Json')return exactJSON(value)
  if(field.type==='Decimal'){
    if(field.scale===null||field.precision===null)fail('DECIMAL_CONTRACT_REQUIRED:'+label)
    const amount=new Prisma.Decimal(textNumber(value))
    if(!amount.isFinite()||amount.decimalPlaces()>field.scale||amount.abs().gte(new Prisma.Decimal(10).pow(field.precision-field.scale)))fail('DECIMAL_PRECISION_LOSS:'+label)
    return amount.toFixed(field.scale)
  }
  if(field.type==='Int'){
    const number=Number(textNumber(value))
    if(!Number.isSafeInteger(number)||number< -2147483648||number>2147483647)fail('INTEGER_RANGE:'+label)
    return number
  }
  if(field.type==='Boolean'){if(typeof value!=='boolean')fail('BOOLEAN_REQUIRED:'+label);return value?1:0}
  if(field.type==='DateTime'){
    if(typeof value!=='string')fail('DATETIME_STRING_REQUIRED:'+label)
    const fraction=value.match(/\.(\d+)/)?.[1]||''
    if(/[1-9]/.test(fraction.slice(3)))fail('SUBMILLISECOND_REVIEW_REQUIRED:'+label)
    const isDate=/@db\.Date(?:\s|$)/.test(field.attributes)
    if(isDate&&!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('DATE_ONLY_REQUIRED:'+label)
    if(!isDate&&!/(Z|[+-]\d{2}:\d{2})$/.test(value))fail('EXPLICIT_TIMEZONE_REQUIRED:'+label)
    const date=d1Date(isDate?value+'T00:00:00.000Z':value)
    if(isDate&&date.slice(0,10)!==value)fail('INVALID_DATE_ONLY:'+label)
    return date
  }
  if(field.type==='String'||field.values){
    if(typeof value!=='string')fail('TEXT_REQUIRED:'+label)
    if(field.maxLength!==null&&Array.from(value).length>field.maxLength)fail('TEXT_LENGTH_EXCEEDED:'+label)
    if(field.values&&!field.values.includes(value))fail('INVALID_ENUM:'+label)
    if(/@db\.Uuid\b/.test(field.attributes)&&!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value))fail('INVALID_UUID:'+label)
    return value
  }
  fail('UNREVIEWED_SCALAR_TYPE:'+field.type)
}
export function decodeCopy(text){
  if(text==='\\N')return null
  return text.replace(/\\([0-7]{1,3}|.)/g,(_whole,part)=>{
    if(/^[0-7]{1,3}$/.test(part))return String.fromCharCode(parseInt(part,8))
    return ({t:'\t',n:'\n',r:'\r',b:'\b',f:'\f',v:'\v','\\':'\\'})[part]??part
  })
}
export const decimalSum=values=>values.reduce((total,value)=>value===null?total:total.add(textNumber(value)),new Prisma.Decimal(0)).toFixed(2)
