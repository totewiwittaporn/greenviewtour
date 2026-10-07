import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto'
export const lineHash=value=>createHash('sha256').update(value).digest('hex')
export const lineSecret=()=>randomBytes(32).toString('base64url')
export function sealTicket(value,secret,context){
 if(typeof secret!=='string'||secret.length<32)throw new Error('LINE_ENCRYPTION_REQUIRED')
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',createHash('sha256').update('staff-line:'+secret).digest(),iv)
 cipher.setAAD(Buffer.from(context))
 const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()])
 return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url')
}
export function openTicket(value,secret,context){
 const bytes=Buffer.from(value,'base64url'),cipher=createDecipheriv('aes-256-gcm',createHash('sha256').update('staff-line:'+secret).digest(),bytes.subarray(0,12))
 cipher.setAAD(Buffer.from(context));cipher.setAuthTag(bytes.subarray(12,28))
 return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'))
}
export const isLineUser=value=>typeof value==='string'&&/^U[0-9a-f]{32}$/.test(value)
export const isLinkSecret=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value)
