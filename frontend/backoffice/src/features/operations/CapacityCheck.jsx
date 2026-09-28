import {useEffect,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {api} from '../../core/auth/api.js'
import {Button} from '../../core/ui/Button.jsx'
import {SelectField} from '../../core/ui/SelectField.jsx'
import {capacityText,capacityLabel} from '../../../../../packages/contracts/capacity-copy.js'
export default function CapacityCheck({input,onSelect,disabled=false}) {
 const {locale}=useLocale(),c=key=>capacityText(key,locale),label=key=>capacityLabel(key,locale)
 const signature=JSON.stringify(input),[state,setState]=useState({}),[retry,setRetry]=useState(0)
 useEffect(()=>{
  const values=JSON.parse(signature)
  if(!values.customerRequestId&&!values.bookingId&&(!values.tourId||!values.serviceDate||Number(values.adults)+Number(values.children)<1))return
  const controller=new AbortController();setState({key:signature,loading:true})
  const timer=setTimeout(()=>(values.customerRequestId?api('/api/operations/customer-capacity?'+new URLSearchParams({requestId:values.customerRequestId,capacitySelections:JSON.stringify(values.capacitySelections||[])}),undefined,{signal:controller.signal}):api('/api/operations/capacity-check',values,{signal:controller.signal})).then(data=>{if(!controller.signal.aborted)setState({key:signature,data})}).catch(error=>{if(!controller.signal.aborted)setState({key:signature,error:error.message})}),300)
  return()=>{clearTimeout(timer);controller.abort()}
 },[signature,retry])
 const current=state.key===signature?state:{loading:true}
 return <section className="address-section" aria-label={label('check')} aria-live="polite"><h3>{label('check')}</h3>{current.loading?<p role="status">{c('loading')}</p>:current.error?<><p role="alert">{c('error')}</p><Button onClick={()=>setRetry(n=>n+1)}>{c('refresh')}</Button></>:current.data?<>
 <p><strong>{c(current.data.canConfirm?'available':'waiting')}</strong></p><p>{c('group')}: {current.data.groupSize} · {c('noSplit')}</p>
 {current.data.legs.map(leg=><div className="address-section" key={`${leg.resourceId}:${leg.direction}:${leg.serviceDate}`}><p>{leg.serviceDate} · {c(leg.direction)} · {c('remaining')}: <strong>{leg.remainingSeats??'—'}</strong> {c('seats')} · {c(leg.canFit?'fit':'noFit')}</p>{leg.choices?.length>0&&<SelectField disabled={disabled||!onSelect} label={`${label('window')} · ${leg.serviceDate} · ${c(leg.direction)}`} value={leg.poolId||''} onChange={event=>onSelect?.(leg,event.target.value)}><option value="">{c('choose')}</option>{leg.choices.map(choice=><option key={choice.id} value={choice.id}>{new Date(choice.startsAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})} – {new Date(choice.endsAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})}</option>)}</SelectField>}{leg.reason&&<p className="field-help">{c(leg.reason)}</p>}</div>)}
 {current.data.unresolvedReturn&&<p>{c('returnPending')}</p>}<p className="field-help">{c('notPromise')} {c('selectionHint')}</p><Button disabled={disabled} onClick={()=>setRetry(n=>n+1)}>{c('refresh')}</Button>
 </>:<p>{c('unknown')}</p>}</section>
}
