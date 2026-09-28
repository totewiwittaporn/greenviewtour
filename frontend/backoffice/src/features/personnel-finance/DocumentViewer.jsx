import {translateLabel as bilingualLabel} from '../../core/i18n/runtime.js'
import {LanguageSwitcher} from '../../core/ui/LanguageSwitcher.jsx'
import { translate as t, useLocale } from '../../core/i18n/locale.jsx'
import {useEffect,useState} from 'react'
import {readPrivateDocument,saveDownload} from '../../core/auth/download.js'
import {Button} from '../../core/ui/Button.jsx'

export default function DocumentViewer({documentId}){
 const {locale} = useLocale()
 const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0),[zoom,setZoom]=useState(100)
 useEffect(()=>{
  const controller=new AbortController();let url
  setState({loading:true})
  readPrivateDocument(`/api/evidence/${documentId}`,{signal:controller.signal}).then(({blob,filename})=>{
   if(controller.signal.aborted)return
   if(blob.type==='application/pdf'){window.location.replace(`/api/evidence/${documentId}?view=inline`);return}
   url=URL.createObjectURL(blob);setState({blob,url,filename,loading:false})
  }).catch(e=>{if(!controller.signal.aborted)setState({error:['LOGIN_REQUIRED','SESSION_REQUIRED','SESSION_EXPIRED'].includes(e.message)?'Your session expired. Sign in again to view this document.':e.message==='PERMISSION_DENIED'?'You no longer have permission to view this document.':'Unable to open this document. Check your connection and retry.',loading:false})})
  return()=>{controller.abort();if(url)URL.revokeObjectURL(url)}
 },[documentId,attempt])
 useEffect(()=>{document.title=state.filename?`${state.filename} · Greenview Tour`:`${t('View document')} · Greenview Tour`},[state.filename,locale])
 const pdf=state.blob?.type==='application/pdf'
 return <main className="document-viewer-page"><header><span>Greenview Tour</span><h1>{bilingualLabel("View document")}</h1><p className="document-viewer-name">{state.filename||t("Opening document…")}</p><p>{t("Your original workspace remains in its tab.")}</p></header><div className="document-viewer-toolbar"><LanguageSwitcher/>{state.url&&!pdf&&<><Button disabled={zoom<=50} aria-label={t("Zoom out")} onClick={()=>setZoom(n=>Math.max(50,n-25))}>−</Button><span role="status">{zoom}%</span><Button disabled={zoom>=250} aria-label={t("Zoom in")} onClick={()=>setZoom(n=>Math.min(250,n+25))}>+</Button><Button onClick={()=>setZoom(100)}>{t("Fit image")}</Button></>}{state.blob&&<Button onClick={()=>saveDownload(state.blob,state.filename)}>{t("Download")}</Button>}</div><div className="document-viewer-surface" aria-busy={state.loading}>{state.loading?<p role="status">{t("Opening document…")}</p>:state.error?<div role="alert"><p>{t(state.error)}</p><Button onClick={()=>setAttempt(n=>n+1)}>{t("Retry")}</Button></div>:pdf?<iframe title={bilingualLabel("PDF document: {value0}", {value0: state.filename})} src={`${state.url}#page=1&view=FitH&navpanes=0`} className="document-viewer-pdf"/>:<img src={state.url} alt={state.filename} className="document-viewer-image" style={{width:`${zoom}%`,maxWidth:'none'}} onError={()=>setState(s=>({...s,loading:false,error:'This image cannot be displayed. Try downloading the original file.'}))}/>}</div>{pdf&&<p className="field-help">{t("Use the PDF controls to change pages or zoom. If your browser cannot display it, use Download.")}</p>}<p className="document-viewer-footer">{t("Close this tab to return to your workspace.")}</p></main>
}
