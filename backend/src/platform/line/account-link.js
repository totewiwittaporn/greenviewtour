// Account-link preparation. Production binding requires verified LINE identity and
// an authenticated app session; names, phone numbers and editable profile Line IDs are not proof.
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto'
const digest=value=>createHash('sha256').update(value).digest('hex')
export function lineAccountReadiness(){return {status:'NOT_CONNECTED',liveEnabled:false,canLink:false,missing:['LINE_LOGIN_CHANNEL','LINE_MESSAGING_CHANNEL','HTTPS_CALLBACK'],supportedAudiences:['CUSTOMER','STAFF']}}
export function createLinkChallenge({accountId,audience,sessionId},now=new Date()){
 if(!accountId||!sessionId||!['CUSTOMER','STAFF'].includes(audience))throw new Error('INVALID_LINK_ACCOUNT')
 const state=randomBytes(32).toString('base64url')
 return {state,record:{accountId,audience,sessionHash:digest(sessionId),stateHash:digest(state),expiresAt:new Date(+now+600000).toISOString(),used:false}}
}
// Pure validation only; caller must consume and insert a unique binding in one transaction.
export function validateLinkChallenge(record,{state,sessionId,accountId,audience},now=new Date()){
 if(record.used||!Number.isFinite(+new Date(record.expiresAt))||new Date(record.expiresAt)<=now)throw new Error('LINE_LINK_EXPIRED')
 if(typeof state!=='string'||typeof sessionId!=='string'||state.length>200||record.accountId!==accountId||record.audience!==audience)throw new Error('LINE_LINK_MISMATCH')
 for(const [actual,expected] of [[digest(state),record.stateHash],[digest(sessionId),record.sessionHash]]){
  if(typeof expected!=='string'||expected.length!==64||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))throw new Error('LINE_LINK_MISMATCH')
 }
 return {...record,used:true}
}
export function resolveNotificationRecipient(binding,{accountId,audience,providerKey}){
 if(!binding||binding.status!=='LINKED'||binding.accountId!==accountId||binding.audience!==audience||binding.providerKey!==providerKey||!/^U[0-9a-f]{32}$/i.test(binding.lineUserId||''))throw new Error('LINE_ACCOUNT_NOT_LINKED')
 return binding.lineUserId
}
