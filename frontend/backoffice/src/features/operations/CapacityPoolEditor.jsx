import {useCallback,useRef,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {api} from '../../core/auth/api.js'
import {useUnsavedChanges} from '../../core/navigation/Navigation.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {FormField} from '../../core/ui/FormField.jsx'
import {DateField} from '../../core/ui/DateField.jsx'
import {SelectField} from '../../core/ui/SelectField.jsx'
import {ReferenceField} from '../../core/ui/ReferenceField.jsx'
import {TextAreaField} from '../../core/ui/TextAreaField.jsx'
import {capacityText,capacityLabel} from '../../../../../packages/contracts/capacity-copy.js'
const stamp=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))
export default function CapacityPoolEditor({record,kind,date,onClose,onSaved}) {
 const {locale,t}=useLocale(),c=key=>capacityText(key,locale),label=key=>capacityLabel(key,locale)
 const initial=useRef(record?{...record,serviceDate:record.serviceDate.slice(0,10),startsAt:stamp(record.startsAt),endsAt:stamp(record.endsAt),factor:String(record.overnightLoadTenths/10)}:{id:crypto.randomUUID(),version:0,code:'',name:'',kind,serviceDate:date,direction:'OUTBOUND',startsAt:'',endsAt:'',status:'ACTIVE',holdMinutes:'',factor:'1.2',resourceIds:[''],offers:[],notes:''})
 const [draft,setDraft]=useState(initial.current),[busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false),lock=useRef(false),command=useRef(null)
 const dirty=JSON.stringify(draft)!==JSON.stringify(initial.current);useUnsavedChanges(dirty||busy)
 const set=(key,value)=>setDraft(old=>({...old,[key]:value}))
 const resources=useCallback(({q,page,signal})=>api('/api/operations/dispatch-options?'+new URLSearchParams({kind,entity:'services',q,page}),undefined,{signal}),[kind])
 const vehicles=useCallback(({q,page,signal})=>api('/api/operations/dispatch-options?'+new URLSearchParams({kind,entity:'vehicles',q,page}),undefined,{signal}),[kind])
 async function save(event){
  event.preventDefault();if(lock.current)return
  if(!event.currentTarget.checkValidity()){event.currentTarget.querySelector(':invalid')?.focus();setError(t('Complete the required fields.'));return}
  const values={id:draft.id,version:draft.version,code:draft.code,name:draft.name,kind,serviceDate:draft.serviceDate,direction:draft.direction,startsAt:draft.startsAt,endsAt:draft.endsAt,status:draft.status,resourceIds:draft.resourceIds,holdMinutes:Number(draft.holdMinutes),overnightLoadTenths:Math.round(Number(draft.factor)*10),notes:draft.notes||'',offers:draft.offers.map(o=>({vehicleId:o.vehicleId,capacity:Number(o.capacity),status:o.status}))}
  const signature=JSON.stringify(values);if(command.current?.signature!==signature)command.current={id:crypto.randomUUID(),signature}
  lock.current=true;setBusy(true);setError('')
  try{const result=await api('/api/operations/capacity',{...values,commandId:command.current.id});onSaved(result)}catch(e){setError(c(e.message))}finally{lock.current=false;setBusy(false)}
 }
 return <><Dialog title={label(record?'editWindow':'newWindow')} variant="table" busy={busy} onClose={()=>dirty?setDiscard(true):onClose()}><form noValidate onSubmit={save}>
 <fieldset className="address-section" disabled={busy}><legend>{c(kind)}</legend><p>{c('verified')}</p>
 <FormField label={t('Code')} required maxLength={40} value={draft.code} onChange={e=>set('code',e.target.value.toUpperCase())}/><FormField label={t('Name')} required maxLength={200} value={draft.name} onChange={e=>set('name',e.target.value)}/>
 <DateField label={label('date')} required value={draft.serviceDate} onChange={e=>set('serviceDate',e.target.value)}/>
 <SelectField label={t('Direction')} value={draft.direction} onChange={e=>set('direction',e.target.value)}>{['OUTBOUND','RETURN'].map(value=><option key={value} value={value}>{c(value)}</option>)}</SelectField>
 <FormField label={label('start')} hint="YYYY-MM-DD HH:mm" required value={draft.startsAt} onChange={e=>set('startsAt',e.target.value)}/><FormField label={label('end')} hint="YYYY-MM-DD HH:mm" required value={draft.endsAt} onChange={e=>set('endsAt',e.target.value)}/>
 <SelectField label={t('Status')} value={draft.status} onChange={e=>set('status',e.target.value)}>{['ACTIVE','INACTIVE'].map(value=><option key={value} value={value}>{c(value)}</option>)}</SelectField>
 <FormField label={label('ttl')} type="number" min={1} max={1440} step={1} required value={draft.holdMinutes} hint={c('ttlHint')} onChange={e=>set('holdMinutes',e.target.value)}/>
 {kind==='VEHICLE'&&<FormField label={label('factor')} type="number" min={1} max={10} step={0.1} required value={draft.factor} onChange={e=>set('factor',e.target.value)}/>}
 </fieldset>
 <fieldset className="address-section" disabled={busy}><legend>{label('services')}</legend>{draft.resourceIds.map((id,index)=><div key={index} className="address-section"><ReferenceField label={`${t('Service')} ${index+1}`} value={id} load={resources} onChange={e=>set('resourceIds',draft.resourceIds.map((value,i)=>i===index?e.target.value:value))}/><Button disabled={draft.resourceIds.length===1} onClick={()=>set('resourceIds',draft.resourceIds.filter((_,i)=>i!==index))}>{t('Remove')}</Button></div>)}<Button onClick={()=>set('resourceIds',[...draft.resourceIds,''])}>{c('addService')}</Button></fieldset>
 <fieldset className="address-section" disabled={busy}><legend>{label('vehicles')}</legend>{draft.offers.map((offer,index)=><div className="address-section" key={index}>
 <ReferenceField label={`${c(kind)} ${index+1}`} value={offer.vehicleId||''} selectedLabel={offer.vehicle?.name} load={vehicles} onChange={(e,v)=>set('offers',draft.offers.map((old,i)=>i===index?{...old,vehicleId:e.target.value,vehicle:v,capacity:v?.capacity??''}:old))}/>
 <FormField label={label('usable')} type="number" required min={1} step={1} value={offer.capacity} onChange={e=>set('offers',draft.offers.map((old,i)=>i===index?{...old,capacity:e.target.value}:old))}/>
 <SelectField label={t('Status')} value={offer.status} onChange={e=>set('offers',draft.offers.map((old,i)=>i===index?{...old,status:e.target.value}:old))}>{['PROPOSED','READY','UNAVAILABLE'].map(value=><option key={value} value={value}>{c(value)}</option>)}</SelectField>
 <Button onClick={()=>set('offers',draft.offers.filter((_,i)=>i!==index))}>{t('Remove')}</Button></div>)}<Button onClick={()=>set('offers',[...draft.offers,{vehicleId:'',capacity:'',status:'PROPOSED'}])}>{c('addVehicle')}</Button></fieldset>
 <TextAreaField label={t('Notes')} maxLength={1000} value={draft.notes||''} onChange={e=>set('notes',e.target.value)}/>{error&&<p role="alert">{error}</p>}<div className="dialog-actions"><Button type="submit" disabled={busy} busy={busy} className="button-primary">{c('save')}</Button></div>
 </form></Dialog>{discard&&<Dialog title={t('Discard changes?')} onClose={()=>setDiscard(false)}><Button onClick={()=>setDiscard(false)}>{t('Keep editing')}</Button><Button onClick={onClose}>{t('Discard changes')}</Button></Dialog>}</>
}
