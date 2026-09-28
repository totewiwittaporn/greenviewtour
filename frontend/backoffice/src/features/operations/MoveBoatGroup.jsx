import {useCallback,useRef,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {api} from '../../core/auth/api.js'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {ReferenceField} from '../../core/ui/ReferenceField.jsx'
import {TextAreaField} from '../../core/ui/TextAreaField.jsx'
import {useUnsavedChanges} from '../../core/navigation/Navigation.jsx'
import {capacityText,capacityLabel} from '../../../../../packages/contracts/capacity-copy.js'
export default function MoveBoatGroup({run,assignment,date,onClose,onSaved}) {
 const {locale,t}=useLocale(),c=key=>capacityText(key,locale),label=key=>capacityLabel(key,locale),[target,setTarget]=useState(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false),command=useRef(null),lock=useRef(false)
 const dirty=Boolean(target)||Boolean(reason);useUnsavedChanges(dirty||busy)
 const load=useCallback(async({q,page,signal})=>{const data=await api('/api/operations/jobs?'+new URLSearchParams({kind:'BOAT',date,direction:run.direction,page,q,view:'options',resourceId:run.slot.resourceId,excludeRunId:run.id}),undefined,{signal});return {...data,rows:data.rows.filter(row=>row.id!==run.id&&row.slot.resourceId===run.slot.resourceId).map(row=>({...row,name:`${row.slot.vehicle.name} · ${row.passengers}/${row.capacity}`}))}},[date,run.direction,run.id,run.slot.resourceId])
 async function save(e){e.preventDefault();if(lock.current||!target||!reason.trim())return
  const input={runId:run.id,version:run.version,assignmentId:assignment.id,targetRunId:target.id,targetVersion:target.version,reason}
  const signature=JSON.stringify(input);if(command.current?.signature!==signature)command.current={id:crypto.randomUUID(),signature}
  lock.current=true;setBusy(true);setError('');try{await api('/api/operations/move-boat-group',{...input,id:command.current.id});onSaved()}catch(e){setError(c(e.message))}finally{lock.current=false;setBusy(false)}
 }
 return <><Dialog title={label('move')} busy={busy} onClose={()=>dirty?setDiscard(true):onClose()}><p>{assignment.booking.name} · {assignment.adults+assignment.children} {c('seats')}</p><p>{c('moveHint')}</p><form noValidate onSubmit={save}><ReferenceField label={label('target')} value={target?.id||''} load={load} disabled={busy} onChange={(_,value)=>setTarget(value)}/><TextAreaField label={label('reason')} required maxLength={1000} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/>{error&&<p role="alert">{error}</p>}<div className="dialog-actions"><Button type="submit" busy={busy} disabled={busy||!target||!reason.trim()}>{c('move')}</Button></div></form></Dialog>{discard&&<Dialog title={t('Discard changes?')} onClose={()=>setDiscard(false)}><Button onClick={()=>setDiscard(false)}>{t('Keep editing')}</Button><Button onClick={onClose}>{t('Discard changes')}</Button></Dialog>}</>
}
