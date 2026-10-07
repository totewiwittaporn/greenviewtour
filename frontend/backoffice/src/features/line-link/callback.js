export function readLineCallback(location,history){
 if(location.pathname!=='/line/connect')return null
 const input=new URLSearchParams(location.hash.slice(1))
 if(location.hash)history.replaceState(null,'',location.pathname)
 if([...input.keys()].sort().join(',')!=='linkToken,request')return null
 const request=input.get('request'),linkToken=input.get('linkToken')
 if(!/^[A-Za-z0-9_-]{43}$/.test(request||'')||!linkToken||linkToken.length<10||linkToken.length>512)return null
 return {request,linkToken}
}
export function safeLineRedirect(value,expectedToken){
 const url=new URL(value)
 if(url.origin!=='https://access.line.me'||url.username||url.password||url.pathname!=='/dialog/bot/accountLink'||url.hash||[...url.searchParams.keys()].sort().join(',')!=='linkToken,nonce'||url.searchParams.get('linkToken')!==expectedToken||!/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('nonce')||''))throw new Error('LINE_LINK_INVALID')
 return url.href
}
// Module-level memory only; fragments never enter storage, analytics, or application logs.
export const lineCallback=typeof window==='undefined'?null:readLineCallback(window.location,window.history)
export function listenLineCallback(target){
 const handle=()=>{if(target.location.pathname==='/line/connect'&&new URLSearchParams(target.location.hash.slice(1)).has('request'))target.location.reload()}
 target.addEventListener('hashchange',handle)
 return()=>target.removeEventListener('hashchange',handle)
}
