import {RecordLoader} from '../../core/ui/RecordLoader.jsx'
import CapacityCheck from './CapacityCheck.jsx'
import {capacityText} from '../../../../../packages/contracts/capacity-copy.js'
import {translateLabel as bilingualLabel} from '../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../core/i18n/locale.jsx'
import {useEffect,useRef,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {Button} from '../../core/ui/Button.jsx'
import {DataTable} from '../../core/ui/DataTable.jsx'
import {Pagination} from '../../core/ui/Pagination.jsx'
import {Dropdown} from '../../core/ui/Dropdown.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {FormField} from '../../core/ui/FormField.jsx'
import {DateField} from '../../core/ui/DateField.jsx'
import {TextAreaField} from '../../core/ui/TextAreaField.jsx'
import {SearchField} from '../../core/ui/SearchField.jsx'
import {RefreshButton} from '../../core/ui/RefreshButton.jsx'
import {useUnsavedChanges} from '../../core/navigation/Navigation.jsx'
import EvidenceAttachments from '../personnel-finance/EvidenceAttachments.jsx'
const messages={PROMOTION_HOLD_EXPIRED:'This promotion hold expired. Ask the customer to submit a new request.',PROGRAM_COMPONENTS_STALE:'The tour changed after this request. Contact the customer and request a new quote before accepting.',PROMOTION_PRICE_INVALID:'Promotion prices cannot exceed the master tour price.',PRICE_CHANGED_REVIEW_REQUIRED:'The package and selected services do not match the requested price. Review the tour configuration before accepting.',SETTINGS_CONFLICT:'This request changed. Close and refresh before reviewing again.',PAYMENT_AMOUNT_MISMATCH:'Enter the full confirmed amount and a valid received date.',BOOKING_LOCKED:'This action is unavailable in the current booking state.'}
const errorMessage=e=>messages[e.message]||e.detail||'Unable to complete the action. Review the request and retry.'
function Review({row,onClose,onSaved,canOpenBooking}){
 const {locale}=useLocale(),c=key=>capacityText(key,locale);
 const [proposedDate,setProposedDate]=useState(''),[capacitySelections,setCapacitySelections]=useState(row.snapshot.capacitySelections||[]);
 const [action,setAction]=useState(''),[note,setNote]=useState(''),[date,setDate]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[evidence,setEvidence]=useState(false),[discard,setDiscard]=useState(false),pending=useRef(false),command=useRef(null)
 const dirty=Boolean(note)||Boolean(proposedDate)||JSON.stringify(capacitySelections)!==JSON.stringify(row.snapshot.capacitySelections||[])
 useUnsavedChanges(dirty||busy)
 const close=()=>dirty&&!busy?setDiscard(true):!busy&&onClose()
 async function submit(e){e.preventDefault();if(pending.current)return;if(!note.trim()||action==='VERIFY_PAYMENT'&&!date||action==='PROPOSE_DATE'&&!proposedDate){setError('Enter a review note/reference and the received date for payments.');return}const values={requestId:row.id,version:row.version,action,note,proposedDate,capacitySelections,...(action==='ACCEPT'?{priceConfirmation:{confirmed:true,choice:'KEEP_STORED',serviceDate:String(row.serviceDate).slice(0,10),total:row.snapshot.packageTotal}}:{}),receivedOn:date,amount:row.snapshot.confirmedTotal};const signature=JSON.stringify(values);if(command.current?.signature!==signature)command.current={signature,id:crypto.randomUUID()};pending.current=true;setBusy(true);try{await api('/api/customers',{...values,id:command.current.id});onSaved()}catch(e){setError(errorMessage(e))}finally{pending.current=false;setBusy(false)}}
 return <Dialog title={bilingualLabel("Review customer request")} variant="table" onClose={close} busy={busy}>{discard?<><p>{t("Discard your review note?")}</p><Button onClick={()=>setDiscard(false)}>{t("Keep editing")}</Button><Button onClick={onClose}>{t("Discard changes")}</Button></>:<><h3>{row.snapshot.tourName}</h3>{row.snapshot.demoCheckout&&<section className="form-feedback" role="status"><p>{t("DEMO ONLY · Payment:")}{' '}{t(row.snapshot.demoCheckout.payment.status)}{t(". No real money received.")}</p>{row.snapshot.demoCheckout.notification&&<p>{t("LINE simulated, not sent:")}{' '}{row.snapshot.demoCheckout.notification.text}</p>}</section>}<dl className="catalog-details">{Object.entries({Customer:row.details.name,Phone:row.details.phone,'Service date':String(row.serviceDate).slice(0,10),Passengers:`${row.adults} adults · ${row.children} children`,Status:row.status,'Package total':row.snapshot.packageTotal,'Confirmed total':row.snapshot.confirmedTotal||'Not confirmed',Promotion:row.snapshot.promotion?.name||'Regular price',Allergies:row.details.allergyStatus==='NONE'?'None declared':row.details.allergies,Notes:row.details.notes||'—'}).map(([label,value])=><div key={label}><dt>{bilingualLabel(label)}</dt><dd>{value}</dd></div>)}</dl>{row.bookingId&&<p>{t("Operational booking:")}{' '}{row.snapshot.bookingCode}{canOpenBooking&&<> · <a href={"/operations/bookings?"+new URLSearchParams({source:"DIRECT",bookingId:row.bookingId})}>{t("Open booking")}</a></>}</p>}<div className="dialog-actions"><Button onClick={()=>setEvidence(true)}>{t("View payment evidence")}</Button>{['REQUESTED','WAITING_TEAM'].includes(row.status)&&<><Button onClick={()=>setAction('ACCEPT')}>{t("Review acceptance")}</Button><Button onClick={()=>setAction('REJECT')}>{t("Review rejection")}</Button><Button onClick={()=>setAction('PROPOSE_DATE')}>{c('propose')}</Button></>}{row.status==='DATE_PROPOSED'&&<><Button onClick={()=>setAction('PROPOSE_DATE')}>{c('propose')}</Button><Button onClick={()=>setAction('REJECT')}>{t('Review rejection')}</Button><p>{c('proposalHint')}</p></>}{row.status==='PAYMENT_REVIEW'&&<><Button onClick={()=>setAction('VERIFY_PAYMENT')}>{t("Review payment")}</Button><Button onClick={()=>setAction('RETURN_PROOF')}>{t("Request corrected evidence")}</Button></>}</div>{['REQUESTED','WAITING_TEAM'].includes(row.status)&&<CapacityCheck disabled={busy} input={{customerRequestId:row.id,capacitySelections}} onSelect={(leg,poolId)=>setCapacitySelections(old=>[...old.filter(x=>!(x.resourceId===leg.resourceId&&x.direction===leg.direction&&x.serviceDate===leg.serviceDate)),...(poolId?[{resourceId:leg.resourceId,direction:leg.direction,serviceDate:leg.serviceDate,poolId}]:[])])}/>}{action&&<form noValidate onSubmit={submit}>{action==='PROPOSE_DATE'&&<><DateField label={c('date')} disabled={busy} required value={proposedDate} onChange={e=>setProposedDate(e.target.value)}/><p>{c('proposalHint')}</p></>}<p>{action==='PROPOSE_DATE'?c('proposalHint'):action==='ACCEPT'?t('Confirm that availability and package details have been reviewed. This creates and confirms the operational Booking.'):action==='VERIFY_PAYMENT'?t('Verify the completed bank transfer against the evidence. This records payment; it does not transfer money.'):action==='RETURN_PROOF'?t('Your note will be shown to the customer so they can attach corrected payment evidence. No payment is recorded.'):t('The request will be rejected and its promotion quota released.')}</p>{action==='ACCEPT'&&<><p>{t('No new rate is available. Confirm the stored price below.')}</p><FormField label={bilingualLabel('Actual service date')} value={String(row.serviceDate).slice(0,10)} readOnly/><FormField label={bilingualLabel('Stored booking total')} value={row.snapshot.packageTotal+' THB'} readOnly/></>}{action==='VERIFY_PAYMENT'&&<><FormField label={bilingualLabel("Full amount (THB)")} value={row.snapshot.confirmedTotal} readOnly/><DateField label={bilingualLabel("Received date")} value={date} onChange={e=>setDate(e.target.value)}/></>}<TextAreaField label={action==='VERIFY_PAYMENT'?bilingualLabel('Bank transaction reference and review note'):bilingualLabel('Review note')} value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} disabled={busy}/>{error&&<p role="alert">{t(error)}</p>}<Button type="submit" disabled={busy} busy={busy}>{action==='PROPOSE_DATE'?c('propose'):action==='ACCEPT'?t('Confirm price and booking'):action==='REJECT'?t('Confirm rejection'):action==='RETURN_PROOF'?t('Send correction request'):t('Record verified payment')}</Button></form>}</>}{evidence&&<section><p>{t("Documents attached here are visible to this customer.")}</p><EvidenceAttachments targetKind="CUSTOMER_REQUEST" targetId={row.id}/><Button onClick={()=>setEvidence(false)}>{t("Close documents")}</Button></section>}</Dialog>
}
export default function CustomerRequestsPage({canOpenBooking=false}) {
 useLocale()
 const params=new URLSearchParams(window.location.search)
 const [query,setQuery]=useState(params.get('q')||''),[composing,setComposing]=useState(false)
 const [page,setPage]=useState(Math.max(1,Number(params.get('page'))||1)),[attempt,setAttempt]=useState(0)
 const [state,setState]=useState({loading:true,rows:[]}),[review,setReview]=useState(null),[notice,setNotice]=useState('')
 useEffect(()=>{
  if(composing)return
  const controller=new AbortController()
  const timer=setTimeout(()=>{
   const params=new URLSearchParams({tab:'requests',q:query,page})
   window.history.replaceState(window.history.state,'','/operations/bookings?'+params)
   setState({loading:true,rows:[]})
   api('/api/customers?'+new URLSearchParams({kind:'requests',q:query,page,view:'list'}),undefined,{signal:controller.signal})
    .then(result=>{if(!controller.signal.aborted)setState(result)})
    .catch(error=>{if(!controller.signal.aborted)setState({rows:[],error:errorMessage(error)})})
  },query?300:0)
  return()=>{clearTimeout(timer);controller.abort()}
 },[query,page,attempt,composing])
 return <><div className="page-heading"><div><h1 tabIndex={-1}>{bilingualLabel('Customer requests')}</h1><p>{t('Review website requests here. Accepted requests link to their existing Booking; do not create a duplicate.')}</p></div></div>
  <section className="panel table-panel"><div className="filterbar"><SearchField label={bilingualLabel('Search customer requests')} value={query} onChange={value=>{setQuery(value);setPage(1)}} onCompositionChange={setComposing}/><RefreshButton onClick={()=>setAttempt(n=>n+1)}/></div>
   {notice&&<p role="status">{t(notice)}</p>}
   <DataTable label={bilingualLabel('Customer requests')} columns={['Customer / Tour','Service date','Status','Package total','Actions']} busy={state.loading} error={state.error} onRetry={()=>setAttempt(n=>n+1)} isEmpty={!state.rows.length} empty="No matching customer requests.">
    {state.rows.map(row=><tr key={row.id}><td>{row.details.name}<span className="cell-sub">{row.snapshot.tourName}</span></td><td>{String(row.serviceDate).slice(0,10)}</td><td>{t(row.status)}</td><td>{row.snapshot.packageTotal}</td><td><Dropdown rowActions label={'Actions for '+row.details.name} items={[{label:'Review',icon:'view',onSelect:()=>setReview(row)}]}/></td></tr>)}
   </DataTable><Pagination page={state.page||page} pageSize={25} total={state.total} busy={state.loading} onPageChange={setPage}/>
  </section>{review&&<RecordLoader recordId={review.id} url={'/api/customers?'+new URLSearchParams({kind:'requests',requestId:review.id})} title='Review customer request' onClose={()=>setReview(null)}>{row=><Review row={row} canOpenBooking={canOpenBooking} onClose={()=>setReview(null)} onSaved={()=>{setReview(null);setNotice('Request updated.');setAttempt(n=>n+1)}}/>}</RecordLoader>}
 </>
}
