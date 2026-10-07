import {useRef,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {translateLabel} from '../../core/i18n/runtime.js'
import {Button} from '../../core/ui/Button.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {SelectField} from '../../core/ui/SelectField.jsx'

// Mount only with a server-resolved review. A new token resets the choice to
// KEEP_STORED. Changing locale does not remount or submit the dialog.
export default function BookingPriceConfirmation(props){
 return <PriceConfirmation key={props.review.reviewToken} {...props}/>
}
function PriceConfirmation({review,bookingCode,onClose,onConfirm,onConfirmed,children}){
 const {t,formatNumber}=useLocale()
 const [choice,setChoice]=useState('KEEP_STORED'),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const lock=useRef(false),completed=useRef(false),command=useRef(null)
 const amount=value=>value==null?t('Not configured'):`${formatNumber(Number(value),{minimumFractionDigits:2,maximumFractionDigits:2})} THB`
 const selected=choice==='USE_NEW'?review.latest:review.stored
 async function confirm(){
  if(lock.current||completed.current)return
  const payload={bookingId:review.bookingId,version:review.bookingVersion,action:'CONFIRM',priceConfirmation:{confirmed:true,choice,serviceDate:review.serviceDate,reviewToken:review.reviewToken}}
  const key=JSON.stringify(payload)
  if(command.current?.key!==key)command.current={key,id:crypto.randomUUID()}
  lock.current=true;setBusy(true);setError('')
  try{const result=await onConfirm({id:command.current.id,...payload});completed.current=true;onConfirmed(result)}catch{setError('Price confirmation was not completed. Retry with the same choice, or close and reload if the booking or rate changed.')}finally{lock.current=false;setBusy(false)}
 }
 return <Dialog title={translateLabel('Confirm price and booking')} busy={busy} onClose={onClose}>
  <h3>{bookingCode}</h3>
  <p>{t('Review and confirm the price every time you confirm a booking. The stored price is selected by default.')}</p>
  <dl className="catalog-details">
   <div><dt>{translateLabel('Actual service date')}</dt><dd>{review.serviceDate||t('Not configured')}</dd></div>
   <div><dt>{translateLabel('Stored adult price')}</dt><dd>{amount(review.stored.adultPrice)}</dd></div>
   <div><dt>{translateLabel('Stored child price')}</dt><dd>{amount(review.stored.childPrice)}</dd></div>
   <div><dt>{translateLabel('Stored booking total')}</dt><dd>{amount(review.stored.total)}</dd></div>
   {review.latest&&<><div><dt>{translateLabel('New adult price')}</dt><dd>{amount(review.latest.adultPrice)}</dd></div><div><dt>{translateLabel('New child price')}</dt><dd>{amount(review.latest.childPrice)}</dd></div><div><dt>{translateLabel('New booking total')}</dt><dd>{amount(review.latest.total)}</dd></div><div><dt>{translateLabel('Price difference')}</dt><dd>{amount(review.delta)}</dd></div></>}
  </dl>
  {!review.latest&&<p>{t('No new rate is available. Confirm the stored price below.')}</p>}
  {review.latest&&!review.canUseNew&&<p>{t('The new rate cannot be used for this booking. Keep the stored price or close to review pricing.')}</p>}
  <SelectField label={translateLabel('Price to confirm')} value={choice} disabled={busy} onChange={e=>{setChoice(e.target.value);setError('')}}>
   <option value="KEEP_STORED">{t('Keep stored price')}</option>
   {review.canUseNew&&<option value="USE_NEW">{t('Use new rate')}</option>}
  </SelectField>
  <p aria-live="polite">{t('Total to confirm')}: <strong>{amount(selected?.total)}</strong></p>
  <p>{t('This choice does not change recorded deposits or payments and does not issue a charge or refund.')}</p>
  {children}
  {error&&<p role="alert">{t(error)}</p>}
  <div className="dialog-actions"><Button disabled={busy} onClick={onClose}>{t('Keep booking')}</Button><Button className="button-primary" busy={busy} disabled={busy||completed.current||!review.serviceDate||selected?.total==null} onClick={confirm}>{t('Confirm price and booking')}</Button></div>
 </Dialog>
}
