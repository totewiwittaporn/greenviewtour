import {useRef,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {api} from '../../core/auth/api.js'
import {Button} from '../../core/ui/Button.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {FormField} from '../../core/ui/FormField.jsx'
import {DateField} from '../../core/ui/DateField.jsx'
import {SelectField} from '../../core/ui/SelectField.jsx'
import {useUnsavedChanges} from '../../core/navigation/Navigation.jsx'
export default function BookingCollection({booking,onClose,onSaved}){
 const {t}=useLocale(),[payer,setPayer]=useState('CUSTOMER'),[basis,setBasis]=useState('NET_ONLY'),[received,setReceived]=useState(''),[receivedOn,setReceivedOn]=useState(''),[reference,setReference]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false)
 const id=useRef(crypto.randomUUID()),lock=useRef(false),form=useRef(null),dirty=Boolean(received||receivedOn||reference);useUnsavedChanges(dirty)
 const close=()=>dirty?setDiscard(true):onClose(),change=setter=>event=>{id.current=crypto.randomUUID();setError('');setter(event.target.value)}
 async function submit(event){
  event.preventDefault();if(lock.current)return
  if(!received||!receivedOn||!reference.trim()){setError('Complete all required fields.');form.current?.querySelector('input')?.focus();return}
  lock.current=true;setBusy(true)
  try{await api('/api/booking-collections',{id:id.current,bookingId:booking.id,version:booking.version,payer,basis,received,receivedOn,reference});onSaved()}catch(e){setError(e.message==='RECORD_PAYMENT_ON_CUSTOMER_REQUEST'?'Verify this payment in Customer requests to preserve its payment proof and avoid duplicate receipts.':e.message==='STATEMENT_ALLOCATION_REQUIRED'?'This statement has unallocated partial payments. Reconcile its booking allocation before collecting again.':e.message==='BOOKING_ALREADY_PAID'?'This booking is already paid.':e.message==='INVALID_AGENT_COLLECTION'?'Enter the full outstanding Greenview net amount, plus any Agent margin collected.':e.message==='RECORD_CONFLICT'?'This booking changed. Close and reopen before recording payment.':'Unable to confirm the action. Your entries are retained. Check them and retry.')}finally{lock.current=false;setBusy(false)}
 }
 return <Dialog title={t('Record received payment')} onClose={close} busy={busy}><form ref={form} noValidate onSubmit={submit}><p>{booking.code} · {booking.name}</p><p>{t('Record money already received. Agent margin settles existing Agent debt first; any remainder awaits refund. No transfer is sent.')}</p><SelectField label="Payer" value={payer} onChange={change(setPayer)} disabled={busy}><option value="CUSTOMER">{t('Customer')}</option>{booking.agentId&&<option value="AGENT">{t('Agent')}</option>}</SelectField><SelectField label="Collection basis" value={basis} onChange={change(setBasis)} disabled={busy}><option value="NET_ONLY">{t('Greenview net only')}</option>{booking.agentId&&<option value="FULL">{t('Full amount including Agent margin')}</option>}</SelectField><FormField label="Received amount (THB)" inputMode="decimal" required value={received} onChange={change(setReceived)} disabled={busy}/><DateField label="Received date" required value={receivedOn} onChange={change(setReceivedOn)} disabled={busy}/><FormField label="Payment reference" required maxLength={300} value={reference} onChange={change(setReference)} disabled={busy}/>{error&&<p role="alert">{t(error)}</p>}<div className="dialog-actions"><Button disabled={busy} onClick={close}>{t('Cancel')}</Button><Button type="submit" disabled={busy} busy={busy}>{t('Record received payment')}</Button></div></form>{discard&&<Dialog title={t('Discard changes?')} onClose={()=>setDiscard(false)}><Button onClick={()=>setDiscard(false)}>{t('Keep editing')}</Button><Button onClick={onClose}>{t('Discard changes')}</Button></Dialog>}</Dialog>
}
