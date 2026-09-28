import {useRef,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {api} from '../../core/auth/api.js'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {TextAreaField} from '../../core/ui/TextAreaField.jsx'
import {useUnsavedChanges} from '../../core/navigation/Navigation.jsx'
import {capacityText} from '../../../../../packages/contracts/capacity-copy.js'
export default function LegacyCapacityBinding({pool,group,onClose,onSaved}){
 const {locale,t}=useLocale(),c=key=>capacityText(key,locale),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false),lock=useRef(false),command=useRef(null)
 useUnsavedChanges(Boolean(reason)||busy)
 async function save(e){e.preventDefault();if(lock.current||!reason.trim())return
  const input={bookingId:group.id,version:group.version,poolId:pool.id,reason},signature=JSON.stringify(input)
  if(command.current?.signature!==signature)command.current={id:crypto.randomUUID(),signature}
  lock.current=true;setBusy(true)
  try{onSaved(await api('/api/operations/bind-booking-window',{...input,id:command.current.id}))}catch(e){setError(c(e.message))}finally{lock.current=false;setBusy(false)}
 }
 return <><Dialog title={c('bindLegacy')} busy={busy} onClose={()=>reason?setDiscard(true):onClose()}><p>{group.code} · {pool.name} · {String(pool.serviceDate).slice(0,10)} · {c(pool.direction)}</p><p>{c('bindLegacyHint')}</p><form onSubmit={save}><TextAreaField required maxLength={1000} label={c('reason')} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/>{error&&<p role="alert">{error}</p>}<div className="dialog-actions"><Button type="submit" disabled={busy||!reason.trim()} busy={busy}>{c('bindLegacy')}</Button></div></form></Dialog>{discard&&<Dialog title={t('Discard changes?')} onClose={()=>setDiscard(false)}><Button onClick={()=>setDiscard(false)}>{t('Keep editing')}</Button><Button onClick={onClose}>{t('Discard changes')}</Button></Dialog>}</>
}
