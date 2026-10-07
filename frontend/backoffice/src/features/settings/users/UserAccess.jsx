import {translateLabel as bilingualLabel} from '../../../core/i18n/runtime.js'
import {formatDate as displayDate} from '../../../core/i18n/runtime.js'
import {translate as t,useLocale} from '../../../core/i18n/locale.jsx'
import {useEffect,useRef,useState} from 'react'
import {effectiveAccess,roleDepartments,roleNames} from '../../../../../../packages/contracts/access.js'
import {api} from '../../../core/auth/api.js'
import {useUnsavedChanges} from '../../../core/navigation/Navigation.jsx'
import {Dialog} from '../../../core/ui/Dialog.jsx'
import {Button} from '../../../core/ui/Button.jsx'
import {FormField} from '../../../core/ui/FormField.jsx'

const groups=[
 ['operations','Operations',code=>code.startsWith('operations.')],
 ['finance','Finance & expenses',code=>code==='finance.receive'||code.startsWith('expenses.')],
 ['housekeeping','Housekeeping',code=>code.startsWith('housekeeping.')],
 ['inventory','Inventory & purchasing',code=>code.startsWith('inventory.')||code.startsWith('purchasing.')],
 ['people','Personnel & payroll',code=>code.startsWith('personnel.')||code.startsWith('payroll.')],
]
const grants=roles=>roles.map(roleCode=>({roleCode,scope:roleCode==='MANAGER'?'COMPANY':'SELF'}))
export function UserAccess({user,onClose,onSaved}){
 useLocale()
 const [data,setData]=useState(null),[roles,setRoles]=useState([]),[overrides,setOverrides]=useState([]),[reason,setReason]=useState('')
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[reload,setReload]=useState(0),[discard,setDiscard]=useState(false),[review,setReview]=useState(false)
 const lock=useRef(false),form=useRef(null)
 const dirty=Boolean(data&&(JSON.stringify(roles)!==JSON.stringify(data.roles.map(r=>r.roleCode))||JSON.stringify(overrides)!==JSON.stringify(data.overrides)||reason))
 useUnsavedChanges(dirty||busy)
 useEffect(()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let active=true
  setLoading(true);setError('')
  api(`/api/users/${user.id}/access`,undefined,{signal:controller.signal}).then(value=>{if(active){const clean={...value,overrides:value.overrides.map(({permissionCode,effect,startsAt,expiresAt})=>({permissionCode,effect,startsAt,expiresAt}))};setData(clean);setRoles(value.roles.map(r=>r.roleCode));setOverrides(clean.overrides);setReason('')}}).catch(error=>{if(active)setError(error.status===403?'You can no longer configure this account. Close this window and refresh the directory.':'Unable to load permissions. Check your connection and retry.')}).finally(()=>{clearTimeout(timer);if(active)setLoading(false)})
  return()=>{active=false;clearTimeout(timer);controller.abort()}
 },[user.id,reload])
 function close(){if(!busy){if(dirty)setDiscard(true);else onClose()}}
 function roleOnlyDraft(nextRoles=roles){return {status:'ACTIVE',roles:grants(nextRoles),permissionOverrides:[]}}
 function setPermission(code,allowed){
  setReview(false)
  const baseline=effectiveAccess(roleOnlyDraft(),code).allowed
  setOverrides(old=>{const existing=old.find(row=>row.permissionCode===code);if(allowed===baseline)return old.filter(row=>row.permissionCode!==code);return [...old.filter(row=>row.permissionCode!==code),{permissionCode:code,effect:allowed?'ALLOW':'DENY',startsAt:existing?.startsAt||null,expiresAt:existing?.expiresAt||null}]})
 }
 function setLimit(code,key,value){setReview(false);setOverrides(old=>old.map(row=>row.permissionCode===code?{...row,[key]:value}:row))}
 async function save(event){
  event.preventDefault();if(lock.current)return
  if(!roles.length||!reason.trim()){setError('Select at least one additional duty or keep the primary role, and enter a reason.');requestAnimationFrame(()=>form.current?.querySelector(!roles.length?'input[type=checkbox]':'input[required]')?.focus());return}
  if(!review){setError('');setReview(true);return}
  lock.current=true;setBusy(true);setError('')
  try{await api(`/api/users/${user.id}/access`,{version:data.version,roles,overrides,reason});onSaved()}
  catch(error){setError(error.status===409?'Permissions changed while you were editing, or an earlier save completed. Close and reopen this window to review the current permissions.':error.status===403?'Your authority to change this account has changed. Close this window and refresh.':error.message==='PRIMARY_ROLE_REQUIRED'?'The employee primary role cannot be removed here. Change the employee position first.':'The save could not be confirmed. Your entries are retained. Reopen this window to check the current permissions before retrying.');setReview(false)}
  finally{lock.current=false;setBusy(false)}
 }
 const primary=data?.primaryRoleCode||null
 const roleOptions=data?[...data.availableRoles].filter(role=>role.code===primary||roles.includes(role.code)||roleDepartments[role.code]!==user.department).sort((a,b)=>(a.code===primary?-1:b.code===primary?1:a.name.localeCompare(b.name))):[]
 return <Dialog title={discard?bilingualLabel('Discard permission changes?'):review?bilingualLabel('Review permissions'):bilingualLabel('Configure permissions')} onClose={close} busy={busy} variant="table">
  {discard?<><p>{t("These permission changes have not been saved.")}</p><div className="dialog-actions"><Button onClick={()=>setDiscard(false)}>{t("Keep editing")}</Button><Button onClick={onClose}>{t("Discard changes")}</Button></div></>:<>
   {error&&<p role="alert" className="inline-error">{t(error)}</p>}
   {loading?<p role="status">{t("Loading current permissions…")}</p>:!data?<Button onClick={()=>setReload(n=>n+1)}>{t("Retry")}</Button>:<form className="permission-editor" ref={form} onSubmit={save} noValidate aria-busy={busy}>
    <section className="permission-user-summary" aria-label={t("Employee access summary")}>
     <div className="permission-user-name"><strong>{user.displayName}</strong><span>{user.email}</span></div>
     <div><span>{t("Department")}</span><strong>{t(user.department||'Not assigned')}</strong></div>
     <div><span>{t("Primary role")}</span><strong>{t(roleNames[primary]||primary||'Not assigned')}</strong></div>
     <div><span>{t("Status")}</span><strong>{t(user.status)}</strong></div>
    </section>
    <p>{t("Keep the employee primary role, then add only the extra roles or permissions needed for special duties.")}</p>
    <div className="permission-editor-grid">
     <fieldset className="permission-panel" disabled={busy||review}><legend>{bilingualLabel("Additional roles")}</legend><p className="field-help">{t("The primary role is fixed here. Additional roles may come from another department when the employee has a special duty.")}</p>
      <div className="permission-role-list">{roleOptions.map(role=>{const isPrimary=role.code===primary,checked=roles.includes(role.code);return <label className="permission-role-option" data-selected={checked||undefined} key={role.code}><input type="checkbox" aria-label={role.name} checked={checked} disabled={busy||review||isPrimary} onChange={event=>{setReview(false);setRoles(old=>event.target.checked?[...old,role.code]:old.filter(code=>code!==role.code))}}/><span><strong>{t(role.name)}</strong><small>{t(roleDepartments[role.code]||'Not assigned')}</small></span>{isPrimary&&<em>{t("Primary")}</em>}</label>})}</div>
     </fieldset>
     <fieldset className="permission-panel" disabled={busy||review}><legend>{bilingualLabel("Additional permissions")}</legend><p className="field-help">{t("Checked means allowed. Role defaults are shown automatically; changing a checkbox creates an individual exception.")}</p>
      <div className="permission-groups">{groups.map(([key,label,match])=>{const permissions=data.permissions.filter(permission=>match(permission.code));if(!permissions.length)return null;return <section className="permission-group" key={key}><h3>{t(label)}</h3>{permissions.map(permission=>{const row=overrides.find(item=>item.permissionCode===permission.code),baseline=effectiveAccess(roleOnlyDraft(),permission.code).allowed,checked=row?row.effect==='ALLOW':baseline;return <div className="permission-check-row" key={permission.code}><label><input type="checkbox" aria-label={permission.label} checked={checked} onChange={event=>setPermission(permission.code,event.target.checked)}/><span><strong>{t(permission.label)}</strong><small>{t(row?row.effect==='ALLOW'?'Special permission':'Explicit restriction':baseline?'Included by role':'Not granted')}</small></span></label>{row&&<details className="permission-time-limit"><summary>{t("Time limit")}</summary><div className="permission-time-grid">{[['startsAt','Starts (UTC)'],['expiresAt','Expires (UTC)']].map(([field,labelText])=><FormField key={field} label={bilingualLabel(labelText)} type="datetime-local" disabled={busy||review} value={row[field]?new Date(row[field]).toISOString().slice(0,16):''} onChange={event=>setLimit(permission.code,field,event.target.value?`${event.target.value}:00.000Z`:null)} hint={t("Optional. Empty means no time limit.")}/>)}</div></details>}</div>})}</section>})}</div>
     </fieldset>
    </div>
    <FormField label={bilingualLabel("Reason for change")} value={reason} maxLength={1000} required disabled={busy||review} onChange={event=>setReason(event.target.value)}/>
    {review&&<p role="status">{t("Review the selected additional roles and permission exceptions before saving. This change will be recorded with your account and reason.")}</p>}
    <div className="dialog-actions">{review&&<Button disabled={busy} onClick={()=>setReview(false)}>{t("Back to edit")}</Button>}<Button type="submit" className="button-primary" busy={busy} disabled={busy||!dirty}>{review?t('Confirm permissions'):t('Review changes')}</Button></div>
    <details><summary>{t("Recent permission history (")}{data.history.length})</summary>{!data.history.length?<p>{t("No permission changes recorded.")}</p>:data.history.map(event=><p key={event.id}>{displayDate(new Date(event.createdAt),{dateStyle:'short',timeStyle:'medium',timeZone:'Asia/Bangkok'})}{' '}{t("Bangkok ·")}{' '}{event.details.reason}<br/>{t("Changed by")}{' '}{event.actorId}</p>)}</details>
   </form>}
  </>}
 </Dialog>
}