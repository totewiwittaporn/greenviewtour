import {useRef,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {translateLabel as label} from '../../core/i18n/runtime.js'
import {api} from '../../core/auth/api.js'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {ReferenceField} from '../../core/ui/ReferenceField.jsx'
import {useUnsavedChanges} from '../../core/navigation/Navigation.jsx'
const load=async({q,page,signal})=>{const data=await api('/api/operations/booking-assignees?'+new URLSearchParams({q,page}),undefined,{signal});return {...data,rows:data.rows.map(r=>({...r,name:r.displayName}))}}
export default function BookingAssignment({booking,onClose,onSaved}){
 const {t}=useLocale(),[assigneeId,setAssignee]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false),lock=useRef(false),command=useRef(null)
 useUnsavedChanges(Boolean(assigneeId)||busy)
 async function save(event){event.preventDefault();if(!assigneeId){setError('Select a responsible person.');return}if(lock.current)return;lock.current=true;setBusy(true);setError('');if(command.current?.assigneeId!==assigneeId)command.current={id:crypto.randomUUID(),bookingId:booking.id,version:booking.version,assigneeId};try{await api('/api/operations/booking-assignment',command.current);onSaved()}catch{setError('Unable to assign this booking. Refresh if the booking or permissions changed.')}finally{lock.current=false;setBusy(false)}}
 return <><Dialog title={label('Assign booking')} busy={busy} onClose={()=>assigneeId?setDiscard(true):onClose()}><form noValidate onSubmit={save}><p>{booking.code}</p><ReferenceField label="Responsible person" value={assigneeId} load={load} disabled={busy} onChange={e=>setAssignee(e.target.value)}/><p>{t('Reassigning work preserves the recorded commission beneficiary.')}</p>{error&&<p role="alert">{t(error)}</p>}<div className="dialog-actions"><Button type="submit" busy={busy}>{t('Save assignment')}</Button></div></form></Dialog>{discard&&<Dialog title={label('Discard changes?')} onClose={()=>setDiscard(false)}><Button onClick={()=>setDiscard(false)}>{t('Keep editing')}</Button><Button onClick={onClose}>{t('Discard changes')}</Button></Dialog>}</>
}
