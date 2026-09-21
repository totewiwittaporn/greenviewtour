import {translateLabel as bilingualLabel} from '../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../core/i18n/locale.jsx'
import {useRef,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {FormField} from '../../core/ui/FormField.jsx'
import {SelectField} from '../../core/ui/SelectField.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {useUnsavedChanges} from '../../core/navigation/Navigation.jsx'
export default function CustomerEditor({row,onClose,onSaved}){
 useLocale();
 const [values,setValues]=useState({displayName:row?.displayName||'',phone:row?.phone||'',email:row?.email||'',status:row?.status||'ACTIVE'}),base=useRef(JSON.stringify(values)),id=useRef(row?.id||crypto.randomUUID()),lock=useRef(false)
 const form=useRef(null)
 const [fieldErrors,setFieldErrors]=useState({})
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[discard,setDiscard]=useState(false)
 const dirty=JSON.stringify(values)!==base.current;useUnsavedChanges(dirty||busy)
 async function save(e){e.preventDefault();if(lock.current)return;const invalid={};if(!values.displayName.trim())invalid.displayName='Enter a customer name.';if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))invalid.email='Enter a valid email address.';setFieldErrors(invalid);setError('');if(Object.keys(invalid).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return}if(row&&values.status!==row.status&&!confirm){setConfirm(true);return}lock.current=true;setBusy(true);try{await api('/api/customer-profile',{...values,id:id.current,version:row?.version||0});onSaved()}catch(e){setError(e.message==='SETTINGS_CONFLICT'?'This customer changed. Close and reload before editing.':'Unable to save. Check the fields and retry.')}finally{lock.current=false;setBusy(false)}}
 return <Dialog title={row?bilingualLabel('Edit customer'):bilingualLabel('Add customer')} busy={busy} onClose={()=>dirty?setDiscard(true):onClose()}>{discard?<><p>{t("Discard unsaved customer details?")}</p><Button onClick={()=>setDiscard(false)}>{t("Keep editing")}</Button><Button onClick={onClose}>{t("Discard changes")}</Button></>:<form ref={form} noValidate onSubmit={save}>{['displayName','email','phone'].map(key=><FormField key={key} label={{displayName:'Customer name',email:'Email',phone:'Phone'}[key]} type={key==='email'?'email':key==='phone'?'tel':'text'} value={values[key]} error={fieldErrors[key]} maxLength={{displayName:200,email:254,phone:32}[key]} disabled={busy||key==='email'&&Boolean(row?.authUserId)} onChange={e=>{setValues(v=>({...v,[key]:e.target.value}));setConfirm(false);setError('');setFieldErrors(v=>({...v,[key]:undefined}))}}/>)}<SelectField label={bilingualLabel("Account status")} value={values.status} disabled={busy} onChange={e=>{setValues(v=>({...v,status:e.target.value}));setConfirm(false)}}><option value="ACTIVE">{t("Active")}</option><option value="SUSPENDED">{t("Suspended")}</option></SelectField><p>{t("Creating a customer does not create a login or link historical bookings by email.")}</p>{confirm&&<p role="alert">{t("Confirm the status change. A suspended customer cannot access the member portal.")}</p>}{error&&<p role="alert">{t(error)}</p>}<Button type="submit" disabled={busy} busy={busy}>{confirm?t('Confirm status change'):t('Save customer')}</Button></form>}</Dialog>
}
