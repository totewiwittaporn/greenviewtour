import {useEffect,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {useLocale} from '../../core/i18n/locale.jsx'
import {translateLabel} from '../../core/i18n/runtime.js'
import {Button} from '../../core/ui/Button.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import CapacityCheck from './CapacityCheck.jsx'
import BookingPriceConfirmation from './BookingPriceConfirmation.jsx'
export default function BookingConfirmationLoader({bookingId,onClose,onConfirmed}){
 const {t}=useLocale(),[data,setData]=useState(null),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{const controller=new AbortController();setData(null);setError(false);api('/api/operations/booking-price-review?'+new URLSearchParams({bookingId}),undefined,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setData(result)}).catch(()=>{if(!controller.signal.aborted)setError(true)});return()=>controller.abort()},[bookingId,retry])
 if(!data)return <Dialog title={translateLabel('Confirm price and booking')} onClose={onClose}>{error?<><p role="alert">{t('Unable to load the current price review. Retry before confirming.')}</p><Button onClick={()=>setRetry(value=>value+1)}>{t('Retry')}</Button></>:<p role="status">{t('Loading current booking…')}</p>}</Dialog>
 return <BookingPriceConfirmation review={data.review} bookingCode={data.bookingCode} onClose={onClose} onConfirm={input=>api('/api/operations/booking-status',input)} onConfirmed={onConfirmed}><CapacityCheck input={{bookingId}}/></BookingPriceConfirmation>
}
