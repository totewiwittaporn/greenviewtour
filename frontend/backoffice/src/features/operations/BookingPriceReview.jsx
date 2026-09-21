import { formatNumber } from '../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../core/i18n/locale.jsx'
import { useEffect,useRef,useState } from 'react'
import { api } from '../../core/auth/api.js'
import { useUnsavedChanges } from '../../core/navigation/Navigation.jsx'
import { Button } from '../../core/ui/Button.jsx'
import { Dialog } from '../../core/ui/Dialog.jsx'
import { FormField } from '../../core/ui/FormField.jsx'
import { TextAreaField } from '../../core/ui/TextAreaField.jsx'
import { bookingQuote } from '../../../../../packages/contracts/booking-plan.js'
const amount=value=>value==null?'Not configured':`${formatNumber(Number(value), {minimumFractionDigits:2,maximumFractionDigits:2})} THB`
const labels={REQUEST:'Request price approval',APPROVE:'Approve price',REJECT:'Reject price',WITHDRAW:'Use standard price'}

export function BookingPriceReview({bookingId,onClose,onSaved}){
 useLocale();
 const [row,setRow]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[draft,setDraft]=useState({adultPrice:'',childPrice:'',reason:''}),[reviewReason,setReviewReason]=useState(''),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[discard,setDiscard]=useState(false)
 const lock=useRef(false),command=useRef(null)
 useUnsavedChanges(dirty||busy)
 useEffect(()=>{const c=new AbortController();setRow(null);setError('');api(`/api/operations/bookings?${new URLSearchParams({bookingId})}`,undefined,{signal:c.signal}).then(data=>{if(c.signal.aborted)return;const current=data.rows.find(r=>r.id===bookingId);if(!current)throw Error('Booking not available');setRow(current);const request=current.programSnapshot?.priceException;setDraft({adultPrice:request?.adultPrice??current.adultPrice??'',childPrice:request?.childPrice??current.childPrice??'',reason:request?.reason||''})}).catch(e=>{if(!c.signal.aborted)setError(e.detail||'Unable to load the latest booking. Retry before reviewing.')});return()=>c.abort()},[bookingId,retry])
 const change=(key,value)=>{setDirty(true);command.current=null;setDraft(d=>({...d,[key]:value}))}
 const close=()=>dirty?setDiscard(true):onClose()
 async function save(action){
  if(lock.current)return
  const reason=action==='REQUEST'?draft.reason:reviewReason
  if(!reason.trim()){setError(action==='REQUEST'?'Enter the negotiated price reason.':'Enter a review or withdrawal reason.');return}
  if(action==='REQUEST'&&(!/^\d+(\.\d{1,2})?$/.test(draft.adultPrice)||!/^\d+(\.\d{1,2})?$/.test(draft.childPrice))){setError('Enter both per-person prices with at most two decimal places. Zero is allowed.');return}
  const payload={bookingId,version:row.version,action,reason,...(action==='REQUEST'?{adultPrice:draft.adultPrice,childPrice:draft.childPrice}:{})}
  const key=JSON.stringify(payload);if(command.current?.key!==key)command.current={key,id:crypto.randomUUID()}
  lock.current=true;setBusy(true);setError('')
  try{await api('/api/operations/booking-price',{id:command.current.id,...payload});onSaved()}catch(e){setError(e.detail||'Unable to save. Entries are preserved. For a revision conflict, close and reopen this booking.')}finally{lock.current=false;setBusy(false)}
 }
 const request=row?.programSnapshot?.priceException,standard=request?.standard||row
 const proposed=row?bookingQuote({...row,adultPrice:draft.adultPrice,childPrice:draft.childPrice}):null
 return <><Dialog title={t("Agent negotiated price")} busy={busy} onClose={close}>{!row?<>{error?<><p role="alert">{t(error)}</p><Button onClick={()=>setRetry(n=>n+1)}>{t("Retry")}</Button></>:<p role="status">{t("Loading current booking…")}</p>}</>:<>
 <h3>{row.code} · {row.name}</h3><p>{row.agentName} · {row.adults}{' '}{t("adults /")}{' '}{row.children}{' '}{t("children · Revision")}{' '}{row.version}</p>
 <p>{t("Program:")}{' '}{row.programSnapshot?.name||row.trip?.name} · {row.outboundDate?.slice(0,10)||row.returnDate?.slice(0,10)} · {row.paymentTerms}</p>
 <p>{t("Standard adult:")}{' '}{amount(standard.adultPrice)}{' '}{t("· child:")}{' '}{amount(standard.childPrice)}</p>
 <p>{t("Current booking total:")}{' '}{amount(bookingQuote(row).total)}{' '}{t("· Add-ons:")}{' '}{amount(bookingQuote(row).addons)}{' '}{t("· Removal credits:")}{' '}{amount(bookingQuote(row).credit)}</p><details><summary>{t("Review services and quantities")}</summary><ul>{row.lines.map(line=><li key={line.id}>{line.snapshot?.name||line.resource?.name} · {line.quantity} · {line.selected?t('Selected'):t('Removed')}</li>)}</ul></details>
 {request&&<section className="address-section"><h3>{t("Saved request ·")}{' '}{t(request.status)}</h3><p>{t("Adult:")}{' '}{amount(request.adultPrice)}{' '}{t("· child:")}{' '}{amount(request.childPrice)}{' '}{t("· Proposed total:")}{' '}{amount(bookingQuote({...row,adultPrice:request.adultPrice,childPrice:request.childPrice}).total)}</p><p>{t("Reason:")}{' '}{request.reason}</p><p>{t("Requested by")}{' '}{request.requestedByName} · {request.requestedAt}</p>{request.reviewedByName&&<p>{t("Reviewed by")}{' '}{request.reviewedByName} · {request.reviewReason}</p>}</section>}
 <p>{t("Prices are per person. Existing add-ons and removal credits still apply. A different Manager must approve before confirmation. Saving edits to this booking restores standard prices and clears the request; submit a new request afterward.")}</p>
 {(row.priceActions||[]).includes('REQUEST')&&<form noValidate onSubmit={e=>{e.preventDefault();if(!e.currentTarget.checkValidity()){e.currentTarget.querySelector(':invalid')?.focus();setError('Complete the prices and reason.');return}save('REQUEST')}}><fieldset className="address-section" disabled={busy}><legend>{t("Propose price")}</legend><FormField label={t("Proposed adult price (THB)")} type="number" min="0" max="99999999.99" step="0.01" required value={draft.adultPrice} onChange={e=>change('adultPrice',e.target.value)}/><FormField label={t("Proposed child price (THB)")} type="number" min="0" max="99999999.99" step="0.01" required value={draft.childPrice} onChange={e=>change('childPrice',e.target.value)}/><TextAreaField label={t("Negotiation reason")} required maxLength={1000} value={draft.reason} onChange={e=>change('reason',e.target.value)}/><p>{t("Proposed total:")}{' '}{amount(proposed.total)}</p><Button type="submit" busy={busy}>{t("Request price approval")}</Button></fieldset></form>}
 {(row.priceActions||[]).some(a=>a!=='REQUEST')&&<section className="address-section"><h3>{t("Review saved request")}</h3><p>{t("Approval applies to the saved request displayed above, not unsaved proposal edits.")}</p><TextAreaField label={t("Review / withdrawal reason")} disabled={busy} maxLength={1000} value={reviewReason} onChange={e=>{setDirty(true);setReviewReason(e.target.value)}}/><div className="dialog-actions">{row.priceActions.filter(a=>a!=='REQUEST').map(action=><Button key={action} disabled={busy} onClick={()=>save(action)}>{t(labels[action])}</Button>)}</div></section>}
 {request?.status==='PENDING'&&!row.priceActions?.includes('APPROVE')&&<p>{t("A different authorized Manager must review this request.")}</p>}
 {error&&<p role="alert">{t(error)}</p>}
 </>}</Dialog>{discard&&<Dialog title={t("Discard price entries?")} onClose={()=>setDiscard(false)}><p>{t("These entries have not been saved.")}</p><Button onClick={()=>setDiscard(false)}>{t("Keep editing")}</Button><Button onClick={onClose}>{t("Discard changes")}</Button></Dialog>}</>
}
