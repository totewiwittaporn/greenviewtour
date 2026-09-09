import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { api } from '../../core/auth/api.js'
import { Button } from '../../core/ui/Button.jsx'
const Brand=createContext(null)
export function DocumentPreview({children}){
 const [brand,setBrand]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[busy,setBusy]=useState(false)
 const root=useRef(null)
 useEffect(()=>{const c=new AbortController();setBrand(null);setError('');api('/api/operations/document-brand',undefined,{signal:c.signal}).then(b=>{if(!c.signal.aborted){if(!b.logo)throw Error('Company logo has not been configured.');setBrand(b)}}).catch(e=>{if(!c.signal.aborted)setError(e.message==='Company logo has not been configured.'?e.message:'Unable to load the company logo. Retry before printing.')});return()=>c.abort()},[retry])
 async function print(){setBusy(true);setError('');try{await document.fonts.ready;await Promise.all([...root.current.querySelectorAll('img')].map(img=>img.decode()));window.print()}catch{setError('Unable to prepare the logo for printing. Please retry.')}finally{setBusy(false)}}
 return <div ref={root} className="document-preview">{error&&<p role="alert">{error}</p>}{!brand?<div className="job-actions">{error?<Button onClick={()=>setRetry(v=>v+1)}>Retry logo</Button>:<p role="status">Loading document logo…</p>}</div>:<><div className="job-actions"><Button busy={busy} onClick={print}>Print A4 landscape</Button></div><Brand.Provider value={brand}>{children}</Brand.Provider></>}</div>
}
export function DocumentHeader({title,code,date,revision}){
 const brand=useContext(Brand)
 return <header className="document-masthead"><img src={brand?.logo} alt="Greenview Tour" width="212" height="55"/><div><h2>{title}</h2><p>{code} · {date} {revision?`· Rev. ${revision}`:''}</p></div></header>
}
