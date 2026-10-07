import {useEffect,useRef,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {useLocale} from '../../core/i18n/locale.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {lineCopy,lineError} from './copy.js'
import './line-link.css'
export default function StaffLineCard({disabled=false,onLinked}){
 const {locale}=useLocale(),copy=lineCopy(locale),lock=useRef(false),linkedCallback=useRef(onLinked)
 linkedCallback.current=onLinked
 const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0),[dialog,setDialog]=useState(null)
 const [connection,setConnection]=useState({loading:true}),[connectionAttempt,setConnectionAttempt]=useState(0)
 useEffect(()=>{
  if(dialog!=='connection')return
  const controller=new AbortController()
  api('/api/me/line',undefined,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setConnection({data});setState({data});window.dispatchEvent(new Event('greenview:line-changed'))}}).catch(error=>{if(!controller.signal.aborted)setConnection({error})})
  return()=>controller.abort()
 },[dialog,connectionAttempt])
 function openConnection(){setConnection({loading:true});setDialog('connection')}
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(null),[notice,setNotice]=useState(false)
 useEffect(()=>{
  const controller=new AbortController()
  api('/api/me/line',undefined,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted){setState({data});window.dispatchEvent(new Event('greenview:line-changed'));if(data.status==='LINKED')linkedCallback.current?.()}}).catch(error=>{if(!controller.signal.aborted)setState({error})})
  return()=>controller.abort()
 },[attempt])
 async function change(action){
  if(lock.current)return;lock.current=true;setBusy(true);setFailure(null);setNotice(false)
  try{const result=await api('/api/me/line',action==='unlink'?{action,version:state.data.version,confirmed:true}:{action});window.dispatchEvent(new Event('greenview:line-changed'));setDialog(null);setNotice(result.warning==='LINE_RICH_MENU_SYNC_PENDING'?'menuPending':'done');setAttempt(value=>value+1)}
  catch(error){setFailure(error);if(error.message==='LINE_LINK_CHANGED')setAttempt(value=>value+1)}
  finally{setBusy(false);lock.current=false}
 }
 const data=state.data,status=data?.pendingUntil?copy.pending:({LINKED:copy.linked,BLOCKED:copy.blocked,SUSPENDED:copy.suspended})[data?.status]||copy.unlinked
 return <section className="panel staff-line-card" aria-labelledby="staff-line-title">
  <div className="panel-heading"><div><h2 id="staff-line-title">{copy.title}</h2><p>{copy.intro}</p></div></div>
  {state.loading?<p role="status">{copy.loading}</p>:state.error?<p role="alert">{lineError(state.error,copy)}</p>:<>
   <p className="staff-line-state" data-status={data.status}>{status}</p>
   {data.displayName&&<p>{copy.lineName}: <strong>{data.displayName}</strong></p>}
   {data.linkedAt&&data.status==='LINKED'&&<p className="muted">{new Intl.DateTimeFormat(locale==='th'?'th-TH':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(data.linkedAt))}</p>}
   {!data.available&&<p className="staff-line-hint">{copy.local}</p>}
   {data.mode==='test'&&<p className="staff-line-hint">{copy.test}</p>}
   {data.status!=='LINKED'&&['FAILED','EXPIRED','CONFLICT'].includes(data.lastAttempt)&&<p role="status" className="field-error">{data.lastAttempt==='CONFLICT'?copy.conflict:copy.invalid}</p>}
   <p className="muted">{copy.contact}</p><p className="muted">{copy.paused}</p>
  </>}
  {failure&&<p role="alert" className="field-error">{lineError(failure,copy)}</p>}{notice&&<p role="status">{notice==='menuPending'?copy.menuPending:copy.done}</p>}
  {disabled&&<p className="muted">{copy.saveFirst}</p>}
  <div className="staff-line-actions">
   <Button className="button-primary" disabled={busy||disabled} onClick={openConnection}>{copy.connect}</Button>
   <Button disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{copy.refresh}</Button>
   {data&&data.status!=='UNLINKED'&&<Button disabled={busy||disabled} onClick={()=>setDialog('unlink')}>{copy.unlink}</Button>}
   {data?.pendingUntil&&<Button disabled={busy||disabled} onClick={()=>change('cancel')}>{copy.cancelPending}</Button>}
  </div>
  {dialog==='connection'&&<Dialog title={copy.title} onClose={()=>setDialog(null)}>
   {connection.loading?<p role="status">{copy.loading}</p>:connection.error?<><p role="alert">{lineError(connection.error,copy)}</p><Button onClick={()=>{setConnection({loading:true});setConnectionAttempt(n=>n+1)}}>{copy.refresh}</Button></>:connection.data.status==='LINKED'?<>
    <p role="status" className="staff-line-state" data-status="LINKED">{copy.linked}</p>
    <p>{copy.lineName}: <strong>{connection.data.displayName||copy.identityUnavailable}</strong></p>
    {connection.data.linkedAt&&<p className="muted">{new Intl.DateTimeFormat(locale==='th'?'th-TH':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(connection.data.linkedAt))}</p>}
   </>:<><p>{connection.data.pendingUntil?copy.pending:({BLOCKED:copy.blocked,SUSPENDED:copy.suspended})[connection.data.status]||copy.unlinked}</p><p>{copy.instructions}</p>{!connection.data.available&&<p>{copy.local}</p>}<p>{copy.privacy}</p></>}
   <div className="dialog-actions"><Button autoFocus onClick={()=>setDialog(null)}>{copy.close}</Button>{connection.data&&connection.data.status!=='LINKED'&&<a className="button button-primary" href="https://line.me/R/ti/p/%40335bydey" target="_blank" rel="noreferrer">{copy.friend}</a>}</div>
  </Dialog>}
  {dialog==='unlink'&&<Dialog title={copy.confirmUnlink} onClose={()=>{if(!busy)setDialog(null)}}><p>{copy.unlinkText}</p><div className="dialog-actions"><Button autoFocus disabled={busy} onClick={()=>setDialog(null)}>{copy.keep}</Button><Button disabled={busy} busy={busy} onClick={()=>change('unlink')}>{copy.unlink}</Button></div></Dialog>}
 </section>
}
