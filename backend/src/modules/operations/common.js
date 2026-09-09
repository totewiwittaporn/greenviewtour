import { createHash } from 'node:crypto'
import { AccessError } from '../identity-access/membership.js'
import { profileInclude } from '../identity-access/policy.js'
import { managementScope } from '../identity-access/user-management.js'
import { isUUID, whole } from '../../../../packages/contracts/operations.js'
export function fail(code,status=409){throw new AccessError(code,status)}
export function uuid(value){if(!isUUID(value))fail('INVALID_REFERENCE',400);return value}
export function int(value,min=1,max=1000000){try{return whole(value,min,max)}catch{fail('INVALID_QUANTITY',400)}}
export function string(value,max=200,required=true){if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim())||[...value].some(c=>(c.charCodeAt(0)<32&&!['\n','\r','\t'].includes(c))||c.charCodeAt(0)===127))fail('INVALID_INPUT',400);return value.trim()||null}
export function hash(input){return createHash('sha256').update(JSON.stringify(input)).digest('hex')}
export async function authorize(tx,actorId){const actor=await tx.userProfile.findUnique({where:{id:actorId},include:profileInclude});if(!managementScope(actor)?.company)fail('PERMISSION_DENIED',403)}
export function write(prisma,actorId,fn){return prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`;await authorize(tx,actorId);return fn(tx)},{maxWait:15000,timeout:30000}).catch(error=>{if(error.code==='P2002')fail('SETTINGS_DUPLICATE');throw error})}
export async function active(tx,model,id){const row=await tx[model].findUnique({where:{id:uuid(id)}});if(!row||!['ACTIVE','OPEN'].includes(row.status))fail('RELATED_RECORD_UNAVAILABLE');return row}
export async function audit(tx,actorId,targetId,action,details={}){await tx.auditEvent.create({data:{actorId,targetId,action:`operations.${action}`,details}})}
export function money(value){if(value===null||value===undefined||value==='')return null;const s=String(value);if(!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(s))fail('INVALID_PRICE',400);return s}
export function dateOnly(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))fail('INVALID_DATE',400);const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==value)fail('INVALID_DATE',400);return date}
export function keys(input,allowed){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))fail('INVALID_INPUT',400)}
