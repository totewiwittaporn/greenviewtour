import {useEffect,useState} from 'react'
import {readPrivateDocument,saveDownload} from '../../core/auth/download.js'
import {Button} from '../../core/ui/Button.jsx'

export default function DocumentViewer({documentId}){
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
 useEffect(()=>{document.title=state.filename?`${state.filename} · Greenview Tour`:'View document · Greenview Tour'},[state.filename])
 const pdf=state.blob?.type==='application/pdf'
 return <main className="document-viewer-page"><header><span>Greenview Tour</span><h1>View document</h1><p className="document-viewer-name">{state.filename||'Opening document…'}</p><p>Your original workspace remains in its tab.</p></header><div className="document-viewer-toolbar">{state.url&&!pdf&&<><Button disabled={zoom<=50} aria-label="Zoom out" onClick={()=>setZoom(n=>Math.max(50,n-25))}>−</Button><span role="status">{zoom}%</span><Button disabled={zoom>=250} aria-label="Zoom in" onClick={()=>setZoom(n=>Math.min(250,n+25))}>+</Button><Button onClick={()=>setZoom(100)}>Fit image</Button></>}{state.blob&&<Button onClick={()=>saveDownload(state.blob,state.filename)}>Download</Button>}</div><div className="document-viewer-surface" aria-busy={state.loading}>{state.loading?<p role="status">Opening document…</p>:state.error?<div role="alert"><p>{state.error}</p><Button onClick={()=>setAttempt(n=>n+1)}>Retry</Button></div>:pdf?<iframe title={`PDF document: ${state.filename}`} src={`${state.url}#page=1&view=FitH&navpanes=0`} className="document-viewer-pdf"/>:<img src={state.url} alt={state.filename} className="document-viewer-image" style={{width:`${zoom}%`,maxWidth:'none'}} onError={()=>setState(s=>({...s,loading:false,error:'This image cannot be displayed. Try downloading the original file.'}))}/>}</div>{pdf&&<p className="field-help">Use the PDF controls to change pages or zoom. If your browser cannot display it, use Download.</p>}<p className="document-viewer-footer">Close this tab to return to your workspace.</p></main>
}
