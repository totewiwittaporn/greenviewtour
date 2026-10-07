import {tourContent} from './tourPresentation.js'
import ContactButton from '../company/ContactButton.jsx'
import {useEffect,useState} from 'react'
import {useLocale} from '../../core/useLocale.js'
import {Button,Field,Select} from '../../core/ui/Controls.jsx'
import {capacityText} from '../../../../../packages/contracts/capacity-copy.js'
export default function TourAvailability({tour,initialDate='',initialAdults='1',initialChildren='0'}) {
 const {locale,t,money}=useLocale(),c=key=>capacityText(key,locale),[date,setDate]=useState(initialDate),[adults,setAdults]=useState(initialAdults),[children,setChildren]=useState(initialChildren),[selected,setSelected]=useState([]),[state,setState]=useState({}),[retry,setRetry]=useState(0)
 const signature=JSON.stringify({date,adults,children,selected})
 useEffect(()=>{
  if(!date||!Number.isInteger(Number(adults))||Number(adults)<1||!Number.isInteger(Number(children))||Number(children)<0)return
  const controller=new AbortController();setState({key:signature,loading:true})
  const timer=setTimeout(()=>fetch('/api/public/quote?'+new URLSearchParams({tourId:tour.id,serviceDate:date,adults,children,capacitySelections:JSON.stringify(selected)}),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.code);return data}).then(data=>{if(!controller.signal.aborted)setState({key:signature,data})}).catch(error=>{if(!controller.signal.aborted)setState({key:signature,error:error.message})}),300)
  return()=>{clearTimeout(timer);controller.abort()}
 },[tour.id,date,adults,children,selected,signature,retry])
 const current=state.key===signature?state:{},availability=current.data?.availability
 return <section className="tour-availability" aria-label={c('check')}><h3>{c('check')}</h3><Field type="date" label={c('date')} value={date} onChange={e=>{setDate(e.target.value);setSelected([])}}/><div className="capacity-public-counts"><Field label={t('ผู้ใหญ่')} type="number" min={1} max={100} value={adults} onChange={e=>setAdults(e.target.value)}/><Field label={t('เด็ก')} type="number" min={0} max={99} value={children} onChange={e=>setChildren(e.target.value)}/></div>
 <div className="tour-availability-result" aria-live="polite">{current.loading?<p role="status">{c('loading')}</p>:current.error?<><p role="alert">{current.error==='ONLINE_DATE_UNAVAILABLE'?t('ยังไม่เปิดรับจองออนไลน์ กรุณาติดต่อบริษัท'):c('error')}</p><Button onClick={()=>setRetry(n=>n+1)}>{c('refresh')}</Button></>:availability?<><div className="tour-quote-total"><span>{t('ราคารวมโดยประมาณ')}</span><strong>{money(current.data.packageTotal)}</strong></div><strong>{c(!availability.legs.length?'serviceReview':availability.canConfirm?'available':'waiting')}</strong><p>{c('group')}: {availability.groupSize} · {c('noSplit')}</p>
 {availability.legs.map(leg=><div className="tour-availability-leg" key={`${leg.resourceId}:${leg.serviceDate}:${leg.direction}`}><p>{leg.serviceDate} · {c(leg.direction)} · {c('remaining')}: <strong>{leg.remainingSeats??'—'}</strong> {c('seats')} · {c(leg.canFit?'fit':'noFit')}</p>{leg.choices?.length>0&&<Select label={`${c('window')} · ${c(leg.direction)}`} value={leg.poolId||''} onChange={e=>setSelected(old=>[...old.filter(v=>!(v.resourceId===leg.resourceId&&v.serviceDate===leg.serviceDate&&v.direction===leg.direction)),...(e.target.value?[{resourceId:leg.resourceId,serviceDate:leg.serviceDate,direction:leg.direction,poolId:e.target.value}]:[])])}><option value="">{c('choose')}</option>{leg.choices.map(option=><option key={option.id} value={option.id}>{new Date(option.startsAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})} – {new Date(option.endsAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})}</option>)}</Select>}</div>)}
 {availability.unresolvedReturn&&<p>{c('returnPending')}</p>}<p className="tour-availability-note">{c('notPromise')} {c('noPay')}</p></>:<p>{t('เลือกวันและสอบถามทีมงาน')}</p>}</div><ContactButton inquiry={{tour:tourContent(tour,locale).name,date,adults,children}}/></section>
}
