import {useEffect,useRef,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {useLocale} from '../../core/i18n/locale.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {FormField} from '../../core/ui/FormField.jsx'
import {lineCopy,lineError} from './copy.js'
import {lineCallback,listenLineCallback,safeLineRedirect} from './callback.js'
import './line-link.css'
export default function StaffLineConnectPage(){
 const {locale}=useLocale(),copy=lineCopy(locale),lock=useRef(false)
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[ticket,setTicket]=useState(null)
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[consent,setConsent]=useState(false)
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState(null),[required,setRequired]=useState(false)
 useEffect(()=>listenLineCallback(window),[])
 useEffect(()=>{document.title=copy.title+' · Greenview Tour'},[copy.title])
 useEffect(()=>{
  const controller=new AbortController()
  api('/api/me',undefined,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setUser(data.user)}).catch(error=>{if(!controller.signal.aborted&&error.status!==401)setFailure(error)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[])
 useEffect(()=>{
  if(!user||!lineCallback)return
  const controller=new AbortController()
  api('/api/me/line',{action:'inspect',...lineCallback},{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setTicket(data)}).catch(error=>{if(!controller.signal.aborted)setFailure(error)})
  return()=>controller.abort()
 },[user])
 async function submit(event){
  event.preventDefault();if(lock.current)return
  if(!password||(user&&!consent)||(!user&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))){setRequired(true);return}
  lock.current=true;setBusy(true);setFailure(null);setRequired(false)
  try{
   if(!user){const data=await api('/api/auth/login',{email,password});setUser(data.user);setPassword('');return}
   const result=await api('/api/me/line',{action:'confirm',...lineCallback,password,accepted:consent})
   const url=safeLineRedirect(result.redirectUrl,lineCallback.linkToken)
   setPassword('');window.location.assign(url)
  }catch(error){setFailure(error);setPassword('')}
  finally{lock.current=false;setBusy(false)}
 }
 return <main className="staff-line-connect"><section className="panel">
  <p className="eyebrow">GREENVIEW STAFF</p><h1>{copy.title}</h1><p>{copy.intro}</p>
  {loading?<p role="status">{copy.loading}</p>:!lineCallback?<p>{copy.noLink}</p>:<>
   {!user?<h2>{copy.login}</h2>:<div className="staff-line-summary"><p>{copy.as}: <strong>{user.displayName}</strong></p><p>{user.email}</p><p>{user.roles.map(role=>role.name).join(' · ')}</p>{ticket&&<p>{copy.lineName}: <strong>{ticket.displayName}</strong></p>}</div>}
   {ticket?.mode==='test'&&<p className="staff-line-hint">{copy.test}</p>}
   {user&&!ticket&&!failure&&<p role="status">{copy.loading}</p>}
   {(!user||ticket)&&<form noValidate onSubmit={submit} aria-busy={busy}>
    {!user&&<FormField label={copy.email} type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} maxLength={254} disabled={busy}/>}
    <FormField label={copy.password} type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} maxLength={128} disabled={busy}/>
    {user&&<label className="staff-line-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} disabled={busy}/><span>{copy.consent}</span></label>}
    {required&&<p role="alert" className="field-error">{copy.required}</p>}
    <Button type="submit" className="button-primary" disabled={busy} busy={busy}>{user?copy.confirm:copy.signIn}</Button>
   </form>}
  </>}
  {failure&&<p className="field-error" role="alert">{lineError(failure,copy)}</p>}
  <p className="muted">{copy.privacy}</p><p className="muted">{copy.after}</p>
  <a className="button" href="/profile">{copy.return}</a>
 </section></main>
}
