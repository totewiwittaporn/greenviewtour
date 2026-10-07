// A mail link may reuse an already-open /login document (hash-only navigation).
// Reload once so bootstrap consumes/removes the new token before rendering.
export function watchMemberAuthCallbacks(target=window){
 const onHash=()=>{
  if(target.location.pathname!=='/login')return
  const fragment=new URLSearchParams(target.location.hash.slice(1))
  if(fragment.get('recovery')||fragment.get('verify'))target.location.reload()
 }
 target.addEventListener('hashchange',onHash)
 return ()=>target.removeEventListener('hashchange',onHash)
}
