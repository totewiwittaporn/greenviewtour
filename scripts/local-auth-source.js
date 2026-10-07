// Pure conversion of offline Auth metadata; no passwords or tokens are logged.
export function sourceAuthDate(value){
 if(value===null||value===undefined||value==='')return null
 if(typeof value!=='string')throw new Error('SOURCE_AUTH_DATE_INVALID')
 const result=new Date(value)
 if(!Number.isFinite(+result))throw new Error('SOURCE_AUTH_DATE_INVALID')
 return result.toISOString().replace('Z','+00:00')
}
export function sourceAuthAccess(row){
 // PostgreSQL +infinity means a ban with no expiry, not an invalid/missing ban.
 const permanentlyBanned=row.banned_until==='infinity'
 return {
  permanentlyBanned,
  disabled:Boolean(row.deleted_at||row.is_anonymous||permanentlyBanned),
  bannedUntil:permanentlyBanned||row.banned_until==='-infinity'?null:sourceAuthDate(row.banned_until),
 }
}
