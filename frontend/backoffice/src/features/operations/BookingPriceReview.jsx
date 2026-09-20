import { useEffect,useRef,useState } from 'react'
import { api } from '../../core/auth/api.js'
import { useUnsavedChanges } from '../../core/navigation/Navigation.jsx'
import { Button } from '../../core/ui/Button.jsx'
import { Dialog } from '../../core/ui/Dialog.jsx'
import { FormField } from '../../core/ui/FormField.jsx'
import { TextAreaField } from '../../core/ui/TextAreaField.jsx'
import { bookingQuote } from '../../../../../packages/contracts/booking-plan.js'
const amount=value=>value==null?'Not configured':`${Number(value).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})} THB`
const labels={REQUEST:'Request price approval',APPROVE:'Approve price',REJECT:'Reject price',WITHDRAW:'Use standard price'}

export function BookingPriceReview({bookingId,onClose,onSaved}){
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
 return <><Dialog title="Agent negotiated price" busy={busy} onClose={close}>{!row?<>{error?<><p role="alert">{error}</p><Button onClick={()=>setRetry(n=>n+1)}>Retry</Button></>:<p role="status">Loading current booking…</p>}</>:<>
 <h3>{row.code} · {row.name}</h3><p>{row.agentName} · {row.adults} adults / {row.children} children · Revision {row.version}</p>
 <p>Program: {row.programSnapshot?.name||row.trip?.name} · {row.outboundDate?.slice(0,10)||row.returnDate?.slice(0,10)} · {row.paymentTerms}</p>
 <p>Standard adult: {amount(standard.adultPrice)} · child: {amount(standard.childPrice)}</p>
 <p>Current booking total: {amount(bookingQuote(row).total)} · Add-ons: {amount(bookingQuote(row).addons)} · Removal credits: {amount(bookingQuote(row).credit)}</p><details><summary>Review services and quantities</summary><ul>{row.lines.map(line=><li key={line.id}>{line.snapshot?.name||line.resource?.name} · {line.quantity} · {line.selected?'Selected':'Removed'}</li>)}</ul></details>
 {request&&<section className="address-section"><h3>Saved request · {request.status}</h3><p>Adult: {amount(request.adultPrice)} · child: {amount(request.childPrice)} · Proposed total: {amount(bookingQuote({...row,adultPrice:request.adultPrice,childPrice:request.childPrice}).total)}</p><p>Reason: {request.reason}</p><p>Requested by {request.requestedByName} · {request.requestedAt}</p>{request.reviewedByName&&<p>Reviewed by {request.reviewedByName} · {request.reviewReason}</p>}</section>}
 <p>Prices are per person. Existing add-ons and removal credits still apply. A different Manager must approve before confirmation. Saving edits to this booking restores standard prices and clears the request; submit a new request afterward.</p>
 {(row.priceActions||[]).includes('REQUEST')&&<form noValidate onSubmit={e=>{e.preventDefault();if(!e.currentTarget.checkValidity()){e.currentTarget.querySelector(':invalid')?.focus();setError('Complete the prices and reason.');return}save('REQUEST')}}><fieldset className="address-section" disabled={busy}><legend>Propose price</legend><FormField label="Proposed adult price (THB)" type="number" min="0" max="99999999.99" step="0.01" required value={draft.adultPrice} onChange={e=>change('adultPrice',e.target.value)}/><FormField label="Proposed child price (THB)" type="number" min="0" max="99999999.99" step="0.01" required value={draft.childPrice} onChange={e=>change('childPrice',e.target.value)}/><TextAreaField label="Negotiation reason" required maxLength={1000} value={draft.reason} onChange={e=>change('reason',e.target.value)}/><p>Proposed total: {amount(proposed.total)}</p><Button type="submit" busy={busy}>Request price approval</Button></fieldset></form>}
 {(row.priceActions||[]).some(a=>a!=='REQUEST')&&<section className="address-section"><h3>Review saved request</h3><p>Approval applies to the saved request displayed above, not unsaved proposal edits.</p><TextAreaField label="Review / withdrawal reason" disabled={busy} maxLength={1000} value={reviewReason} onChange={e=>{setDirty(true);setReviewReason(e.target.value)}}/><div className="dialog-actions">{row.priceActions.filter(a=>a!=='REQUEST').map(action=><Button key={action} disabled={busy} onClick={()=>save(action)}>{labels[action]}</Button>)}</div></section>}
 {request?.status==='PENDING'&&!row.priceActions?.includes('APPROVE')&&<p>A different authorized Manager must review this request.</p>}
 {error&&<p role="alert">{error}</p>}
 </>}</Dialog>{discard&&<Dialog title="Discard price entries?" onClose={()=>setDiscard(false)}><p>These entries have not been saved.</p><Button onClick={()=>setDiscard(false)}>Keep editing</Button><Button onClick={onClose}>Discard changes</Button></Dialog>}</>
}
