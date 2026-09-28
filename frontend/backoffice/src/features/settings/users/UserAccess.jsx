import {translateLabel as bilingualLabel} from '../../../core/i18n/runtime.js'
import { formatDate as displayDate } from '../../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../../core/i18n/locale.jsx'
import { useEffect, useRef, useState } from 'react'
import { effectiveAccess } from '../../../../../../packages/contracts/access.js'
import { api } from '../../../core/auth/api.js'
import { useUnsavedChanges } from '../../../core/navigation/Navigation.jsx'
import { Dialog } from '../../../core/ui/Dialog.jsx'
import { Button } from '../../../core/ui/Button.jsx'
import { FormField } from '../../../core/ui/FormField.jsx'
import { SelectField } from '../../../core/ui/SelectField.jsx'
export function UserAccess({user,onClose,onSaved}) {
 useLocale();
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
 function override(code,key,value){setReview(false);setOverrides(old=>{const row=old.find(r=>r.permissionCode===code)||{permissionCode:code,effect:'ALLOW',startsAt:null,expiresAt:null};return key==='effect'&&value==='INHERIT'?old.filter(r=>r.permissionCode!==code):[...old.filter(r=>r.permissionCode!==code),{...row,[key]:value}]})}
 async function save(event){
  event.preventDefault();if(lock.current)return
  if(!roles.length||!reason.trim()){setError('Select at least one role and enter a reason.');requestAnimationFrame(()=>form.current?.querySelector(!roles.length?'input[type=checkbox]':'input[required]')?.focus());return}
  if(!review){setError('');setReview(true);return}
  lock.current=true;setBusy(true);setError('')
  try {await api(`/api/users/${user.id}/access`,{version:data.version,roles,overrides,reason});onSaved()}
  catch(error){setError(error.status===409?'Permissions changed while you were editing, or an earlier save completed. Close and reopen this window to review the current permissions.':error.status===403?'Your authority to change this account has changed. Close this window and refresh.':'The save could not be confirmed. Your entries are retained. Reopen this window to check the current permissions before retrying.');setReview(false)}
  finally{lock.current=false;setBusy(false)}
 }
 const draft={status:user.status,roles:roles.map(roleCode=>({roleCode,scope:roleCode==='MANAGER'?'COMPANY':'SELF'})),permissionOverrides:overrides}
 return <Dialog title={discard?bilingualLabel('Discard permission changes?'):review?bilingualLabel('Review permissions'):bilingualLabel('Configure permissions')} onClose={close} busy={busy}>
  <p className="action-subject">{user.displayName} · {user.email}</p>
  {discard?<><p>{t("These permission changes have not been saved.")}</p><div className="dialog-actions"><Button onClick={()=>setDiscard(false)}>{t("Keep editing")}</Button><Button onClick={onClose}>{t("Discard changes")}</Button></div></>:<>
   {error&&<p role="alert" className="inline-error">{t(error)}</p>}
   {loading?<p role="status">{t("Loading current permissions…")}</p>:!data?<Button onClick={()=>setReload(n=>n+1)}>{t("Retry")}</Button>:<form ref={form} onSubmit={save} noValidate aria-busy={busy}>
    <p>{t("Roles describe duties. Explicit restrictions take priority over all role grants. Changes apply to subsequent requests.")}</p><p>{t("Inventory access covers all locations. Preparation duties retain job-assignment checks. Head directory access also requires a matching department; this form does not change the department.")}</p>
    <fieldset className="address-section" disabled={busy||review}><legend>{bilingualLabel("Main duties · select one or more roles")}</legend><div className="access-role-grid">{data.availableRoles.map(role=><label key={role.code}><input type="checkbox" checked={roles.includes(role.code)} onChange={e=>setRoles(old=>e.target.checked?[...old,role.code]:old.filter(r=>r!==role.code))}/>{bilingualLabel(role.name)}</label>)}</div></fieldset>
    <fieldset className="address-section" disabled={busy||review}><legend>{bilingualLabel("Role permissions and special permissions")}</legend>
     {data.permissions.map(permission=>{const row=overrides.find(r=>r.permissionCode===permission.code),effective=effectiveAccess(draft,permission.code);return <div className="access-permission" key={permission.code}>
      <SelectField label={permission.label} value={row?.effect||'INHERIT'} disabled={busy||review} onChange={e=>override(permission.code,'effect',e.target.value)} hint={t("{value0} now · {value1}", {value0: t(effective.allowed?'Allowed':'Denied'), value1: t(effective.source)})}><option value="INHERIT">{t("Use role default")}</option><option value="ALLOW">{t("Allow for this user")}</option><option value="DENY">{t("Deny for this user")}</option></SelectField>
      {row&&<div className="access-role-grid">{[['startsAt','Starts (UTC)'],['expiresAt','Expires (UTC)']].map(([key,label])=><FormField key={key} label={`${bilingualLabel(permission.label)} — ${bilingualLabel(label)}`} type="datetime-local" disabled={busy||review} value={row[key]?new Date(row[key]).toISOString().slice(0,16):''} onChange={e=>override(permission.code,key,e.target.value?`${e.target.value}:00.000Z`:null)} hint={t("Optional. Empty means no time limit.")}/>)}</div>}
     </div>})}
    </fieldset>
    <FormField label={bilingualLabel("Reason for change")} value={reason} maxLength={1000} required disabled={busy||review} onChange={e=>setReason(e.target.value)}/>
    {review&&<p role="status">{t("Save")}{' '}{roles.length}{' '}{t("roles and")}{' '}{overrides.length}{' '}{t("individual permission overrides for")}{' '}{user.displayName}{t("? This change will be recorded with your account and reason.")}</p>}
    <div className="dialog-actions">{review&&<Button disabled={busy} onClick={()=>setReview(false)}>{t("Back to edit")}</Button>}<Button type="submit" className="button-primary" busy={busy} disabled={busy||!dirty}>{review?t('Confirm permissions'):t('Review changes')}</Button></div>
    <details><summary>{t("Recent permission history (")}{data.history.length})</summary>{!data.history.length?<p>{t("No permission changes recorded.")}</p>:data.history.map(event=><p key={event.id}>{displayDate(new Date(event.createdAt), {dateStyle:'short', timeStyle:'medium', ...{timeZone:'Asia/Bangkok'}})}{' '}{t("Bangkok ·")}{' '}{event.details.reason}<br/>{t("Changed by")}{' '}{event.actorId}</p>)}</details>
   </form>}
  </>}
 </Dialog>
}
