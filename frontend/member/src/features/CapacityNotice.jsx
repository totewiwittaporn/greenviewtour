import {useLocale} from '../core/locale.js'
import {Select} from '../core/ui.jsx'
import {capacityText} from '../../../../packages/contracts/capacity-copy.js'
export default function CapacityNotice({availability,onSelect,disabled=false}) {
 const {locale}=useLocale(),c=key=>capacityText(key,locale)
 if(!availability)return <section className="quote-panel"><p>{c('unknown')}</p></section>
 return <section className="quote-panel" aria-live="polite"><h3>{c('check')}</h3><strong>{c(!availability.legs.length?'serviceReview':availability.canConfirm?'available':'waiting')}</strong><p>{c('group')}: {availability.groupSize} · {c('noSplit')}</p>
 {availability.legs.map(leg=><div key={`${leg.resourceId}:${leg.serviceDate}:${leg.direction}`}><p>{leg.serviceDate} · {c(leg.direction)} · {c('remaining')}: <strong>{leg.remainingSeats??'—'}</strong> {c('seats')}</p><p>{c(leg.canFit?'fit':'noFit')}</p>{leg.choices?.length>0&&<Select disabled={disabled||!onSelect} label={`${c('window')} · ${leg.serviceDate} · ${c(leg.direction)}`} value={leg.poolId||''} onChange={e=>onSelect?.(leg,e.target.value)}><option value="">{c('choose')}</option>{leg.choices.map(option=><option key={option.id} value={option.id}>{new Date(option.startsAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})} – {new Date(option.endsAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})}</option>)}</Select>}</div>)}
 {availability.unresolvedReturn&&<p>{c('returnPending')}</p>}<p>{c('notPromise')}</p>{!availability.canConfirm&&<p>{c('noPay')}</p>}</section>
}
