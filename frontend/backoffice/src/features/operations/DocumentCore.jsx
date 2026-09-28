import {translateLabel as bilingualLabel} from '../../core/i18n/runtime.js'
import {LanguageSwitcher} from '../../core/ui/LanguageSwitcher.jsx'
import {FitDocument} from '../../core/ui/FitDocument.jsx'
import {translate as t,useLocale} from '../../core/i18n/locale.jsx'
import {createContext,useContext,useEffect,useRef,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {Button} from '../../core/ui/Button.jsx'
import './document-viewer.css'
const Brand=createContext(null)
export function DocumentPreview({children,orientation='landscape',tools}) {
 useLocale()
 const [brand,setBrand]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[busy,setBusy]=useState(false)
 const root=useRef(null),portrait=orientation==='portrait'
 useEffect(()=>{const c=new AbortController();setBrand(null);setError('');api('/api/operations/document-brand',undefined,{signal:c.signal}).then(b=>{if(!c.signal.aborted){if(!b.logo)throw Error('Company logo has not been configured.');setBrand(b)}}).catch(e=>{if(!c.signal.aborted)setError(e.message==='Company logo has not been configured.'?e.message:'Unable to load the company logo. Retry before printing.')});return()=>c.abort()},[retry])
 async function print() {
  setBusy(true);setError('')
  try {
   await document.fonts.ready
   await Promise.all([...root.current.querySelectorAll('img')].map(img=>img.decode()))
   const until=performance.now()+8000
   while(root.current.querySelector('[data-document-pending]')) {
    if(performance.now()>until)throw Error('Pagination not ready')
    await new Promise(resolve=>setTimeout(resolve,40))
   }
   if(root.current.querySelector('[data-document-error]'))throw Error('Unsafe document layout')
   window.print()
  }catch{setError('Unable to prepare the document for printing. Retry after all pages have loaded.')}
  finally{setBusy(false)}
 }
 return <div ref={root} className="document-preview" data-orientation={orientation}>
  {portrait&&<style>{'@media print { @page { size:210mm 297mm; margin:0; @bottom-left { content:none; } @bottom-right { content:none; } } }'}</style>}
  {error&&<p role="alert">{t(error)}</p>}
  {!brand?<div className="job-actions">{error?<Button onClick={()=>setRetry(v=>v+1)}>{t('Retry logo')}</Button>:<p role="status">{t('Loading document logo…')}</p>}</div>:<>
   <div className={`job-actions ${portrait?'document-toolbar':''}`}>
    {portrait&&<span className="document-view-label">{t('A4 portrait · Fit width · Scroll to read')}</span>}
    <div className="document-toolbar-actions"><LanguageSwitcher/>{tools}<Button busy={busy} onClick={print}>{t(portrait?'Print A4 portrait':'Print A4 landscape')}</Button></div>
   </div>
   <Brand.Provider value={brand}>{portrait?<FitDocument>{children}</FitDocument>:children}</Brand.Provider>
  </>}
 </div>
}
export function DocumentHeader({title,code,date,revision}) {
 useLocale()
 const brand=useContext(Brand)
 return <header className="document-masthead"><img src={brand?.logo} alt="Greenview Tour" width="212" height="55"/><div><h2>{bilingualLabel(title)}</h2><p>{code} · {date} {revision?`· Rev. ${revision}`:''}</p></div></header>
}
