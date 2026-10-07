import {useEffect,useRef,useState} from 'react'
import {AuthLayout} from '../../core/ui/AuthLayout.jsx'
import {FormField} from '../../core/ui/FormField.jsx'
import {AddressFields} from '../../core/ui/AddressFields.jsx'
import {addressValues} from '../../../../../packages/contracts/address.js'
import {Button} from '../../core/ui/Button.jsx'
import {useLocale} from '../../core/i18n/locale.jsx'
import {api,authMessage} from '../../core/auth/api.js'
import {validateEmployeeInformation} from '../../../../../packages/contracts/employee-onboarding.js'
const isOnboarding=window.location.pathname.startsWith('/onboarding')
const fragment=new URLSearchParams(isOnboarding?window.location.hash.slice(1):'')
const query=new URLSearchParams(isOnboarding?window.location.search:'')
const callback=isOnboarding?{invitationCode:fragment.get('invitation'),code:query.get('code'),state:query.get('state'),denied:query.has('error')}:{}
if(isOnboarding&&(window.location.hash||window.location.search))window.history.replaceState(null,'',window.location.pathname)
const empty={firstName:'',lastName:'',primaryPhone:'',...addressValues({})}
const stepTitles=['Verify email','Employee information','Set password','Connect LINE']
export default function EmployeeOnboardingPage(){
 const {t}=useLocale(),[data,setData]=useState(null),[values,setValues]=useState(empty),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('')
 const [errors,setErrors]=useState({}),[failure,setFailure]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true)
 const form=useRef(null),lock=useRef(false),[revision,setRevision]=useState(0),[retryUntil,setRetryUntil]=useState(0),[now,setNow]=useState(Date.now())
 const retrySeconds=Math.max(0,Math.ceil((retryUntil-now)/1000))
 const stage=data?.state,step=stage==='PASSWORD_SET'?3:stage==='PROFILE_COMPLETED'?2:stage==='EMAIL_VERIFIED'?1:0
 useEffect(()=>{document.title=t('Activate your employee account')+' | Greenview Tour'},[t])
 const dirty=JSON.stringify(values)!==JSON.stringify(data?.profile||empty)||Boolean(password||confirm)
 useEffect(()=>{if(!dirty)return;const prevent=event=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent)},[dirty])
 useEffect(()=>{if(!retryUntil)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[retryUntil])
 useEffect(()=>{
  let active=true
  async function load(){
   try{
    if(callback.invitationCode){callback.exchange||=api('/api/onboarding/exchange',{invitationCode:callback.invitationCode}).finally(()=>{delete callback.invitationCode});await callback.exchange}
    if(callback.code&&callback.state){callback.finish||=api('/api/onboarding/line/finish',{code:callback.code,state:callback.state}).finally(()=>{delete callback.code;delete callback.state});await callback.finish}
    const result=await api('/api/onboarding')
    if(!active)return
    if(result.state==='ACTIVE'){window.location.replace('/dashboard');return}
    setData(result);setValues(result.profile)
    if(callback.denied){setFailure('LINE sign-in was cancelled. You can try again.');callback.denied=false}
   }catch(error){
    if(active){setFailure(authMessage(error));try{const result=await api('/api/onboarding');if(active){if(result.state==='ACTIVE'){window.location.replace('/dashboard');return}setData(result);setValues(result.profile)}}catch{/* Keep the recovery instructions visible. */}}
   }finally{if(active)setLoading(false)}
  }
  load();return()=>{active=false}
 },[revision])
 const change=key=>event=>{setValues(old=>({...old,[key]:event.target.value}));setErrors(old=>({...old,[key]:''}))}
 async function submit(event){
  event.preventDefault();if(event.nativeEvent.isComposing||lock.current||retrySeconds)return
  let next={}
  if(step===1)next=validateEmployeeInformation(values).errors
  if(step===2){if(password.length<12||password.length>128)next.password='Use 12–128 characters.';if(password!==confirm)next.confirm='Passwords must match.'}
  setErrors(next)
  if(Object.keys(next).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return}
  lock.current=true;setBusy(true);setFailure('')
  try{
   if(step===3){const result=await api('/api/onboarding/line/start',{});window.location.assign(result.redirectUrl);return}
   const result=await api(step===1?'/api/onboarding/profile':'/api/onboarding/password',step===1?values:{password,confirmPassword:confirm})
   setData(result);setValues(result.profile);setPassword('');setConfirm('');setRevision(n=>n+1)
  }catch(error){setFailure(authMessage(error));setErrors(error.fields||{});if(error.status===429){const at=Date.now();setNow(at);setRetryUntil(at+Math.min(3600,error.retryAfterSeconds||60)*1000)}}
  finally{lock.current=false;setBusy(false)}
 }
 return <AuthLayout title={t('Activate your employee account')} description={t('Complete these steps to open your Greenview Tour workspace.')}>
  <ol className="onboarding-steps" aria-label={t('Account setup progress')}>{stepTitles.map((title,index)=><li key={title} aria-current={index===step?'step':undefined}>{t(title)}{index<step?' ✓':''}</li>)}</ol>
  {loading?<p role="status">{t('Checking your account…')}</p>:<>
   {failure&&<p className="field-error" role="alert">{t(failure)}</p>}
   {!data?<div className="auth-result"><p>{t('Open your invitation email. If the link has expired or was already used, ask your Manager to resend it. If you have set a password, sign in to continue.')}</p><Button onClick={()=>{setLoading(true);setRevision(n=>n+1)}}>{t('Retry')}</Button><a href="/login">{t('Return to sign in')}</a></div>:<form ref={form} noValidate onSubmit={submit} aria-busy={busy}>
    <p><strong>{data.email}</strong></p>
    <p className="field-help">{t('Your role and department are assigned by your Manager.')}</p>
    {step===1&&<>
     <FormField label="Legal first name" name="firstName" autoComplete="given-name" maxLength={49} value={values.firstName} onChange={change('firstName')} error={errors.firstName} disabled={busy}/>
     <FormField label="Legal last name" name="lastName" autoComplete="family-name" maxLength={49} value={values.lastName} onChange={change('lastName')} error={errors.lastName} disabled={busy}/>
     <AddressFields values={values} onChange={(key,value)=>{setValues(old=>({...old,[key]:value}));setErrors(old=>({...old,[key]:''}))}} errors={errors} disabled={busy} legacyAddress={data.previousAddress}/>
     <FormField label="Phone number" name="primaryPhone" type="tel" autoComplete="tel" maxLength={32} value={values.primaryPhone} onChange={change('primaryPhone')} error={errors.primaryPhone} disabled={busy}/>
    </>}
    {step===2&&<>
     <FormField label="New password" type="password" autoComplete="new-password" maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} error={errors.password} hint={t('Use 12–128 characters. Password managers and paste are welcome.')} disabled={busy}/>
     <FormField label="Confirm password" type="password" autoComplete="new-password" maxLength={128} value={confirm} onChange={event=>setConfirm(event.target.value)} error={errors.confirm} disabled={busy}/>
    </>}
    {step===3&&<><p>{t('Connect your own LINE account and add Greenview Staff OA to receive work notifications. Your legal name will remain the name you entered.')}</p>{data.line&&!data.line.available&&<p role="status">{t('LINE Login is not enabled in this Local environment. Your progress is saved. An administrator must configure the LINE Login channel before real activation can be tested.')}</p>}<a href="https://line.me/R/ti/p/%40335bydey" target="_blank" rel="noreferrer">{t('Add Greenview Staff OA')}</a></>}
    <Button type="submit" className="button-primary auth-submit" busy={busy} disabled={busy||retrySeconds>0||(step===3&&!data.line?.available)}>{retrySeconds?t('Wait {seconds}s',{seconds:retrySeconds}):t(step===1?'Save employee information':step===2?'Save password and continue':'Continue with LINE')}</Button>
    <p className="field-help">{t('Completed steps are saved. Passwords are never saved in this browser.')}</p>
   </form>}
  </>}
 </AuthLayout>
}
