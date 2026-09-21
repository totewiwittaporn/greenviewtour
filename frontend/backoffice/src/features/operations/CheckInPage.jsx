import {translateLabel as bilingualLabel} from '../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../core/i18n/locale.jsx'
import {useEffect,useRef,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {Button} from '../../core/ui/Button.jsx'
import {FormField} from '../../core/ui/FormField.jsx'
import {DateField} from '../../core/ui/DateField.jsx'
import {DataTable} from '../../core/ui/DataTable.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {Dropdown} from '../../core/ui/Dropdown.jsx'
import {Pagination} from '../../core/ui/Pagination.jsx'
import {RefreshButton} from '../../core/ui/RefreshButton.jsx'
import {SummaryCards} from '../../core/ui/SummaryCards.jsx'
import {SelectField} from '../../core/ui/SelectField.jsx'
import {useUnsavedChanges} from '../../core/navigation/Navigation.jsx'
const today=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10)
const errors={SETTINGS_CONFLICT:'This record changed. Close this dialog and refresh before trying again.',CHECK_IN_REVIEW_REQUIRED:'Review every remaining guest before closing this service day.',SERVICE_DAY_CLOSED:'This service day is closed. A manager must reopen it with a reason.',CHECK_IN_WRONG_DAY:'Check-in is available on the service date in Thailand.',SERVICE_DATE_IN_FUTURE:'Future service days cannot be closed or marked as no-show.',CHECK_IN_BOOKING_UNAVAILABLE:'This booking is cancelled, unavailable or belongs to another date.',NO_REMAINING_PASSENGERS:'All guests have already been accounted for.',OUTSTANDING_ISSUES:'Resolve outstanding equipment for this group before reducing its allocation.',PERMISSION_DENIED:'Your account does not have permission for this action.',INVALID_QUANTITY:'Enter a positive arrival count within the remaining adults and children.'}
const message=e=>errors[e.message]||e.detail||'Unable to save. Your entries are retained; check your connection and retry.'
const statusLabel={WAITING:'Waiting',PARTIAL:'Partly checked in',CHECKED_IN:'Checked in',NO_SHOW:"No-show",PARTIAL_NO_SHOW:"Partial arrival · some no-shows"}
const financeLabel={NONE:'—',PENDING:'Awaiting finance review',RETAIN_CHARGES:'Retain agreed charges',ADJUSTMENT_REQUIRED:'Adjustment required',REFUND_REQUIRED:'Refund review required'}
function Review({row,action,serviceDate,close,onClose,onSaved}){
 useLocale();
 const [adults,setAdults]=useState(row?.remainingAdults||0),[children,setChildren]=useState(row?.remainingChildren||0),[reason,setReason]=useState(''),[decision,setDecision]=useState('RETAIN_CHARGES'),[preview,setPreview]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const lock=useRef(false),command=useRef(null)
 useUnsavedChanges(busy||Boolean(reason)||Boolean(command.current))
 const base={serviceDate,...(row?{bookingId:row.bookingId,bookingVersion:row.bookingVersion,version:row.version,direction:row.direction}:{version:close?.version||0})}
 useEffect(()=>{
  if(action!=='NO_SHOW')return
  const controller=new AbortController()
  api('/api/operations/check-in',{id:crypto.randomUUID(),action:'PREVIEW_NO_SHOW',serviceDate,bookingId:row.bookingId,bookingVersion:row.bookingVersion,version:row.version,direction:row.direction},{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setPreview(data)}).catch(e=>{if(!controller.signal.aborted)setError(message(e))})
  return()=>controller.abort()
 },[action,serviceDate,row])
 async function save(e){
  e.preventDefault();if(lock.current)return
  if(['NO_SHOW','REOPEN','FINANCE_REVIEW'].includes(action)&&!reason.trim()){setError('Enter a reason before confirming.');return}
  if(action==='CHECK_IN'&&(![adults,children].every(v=>String(v).trim()!==''&&Number.isSafeInteger(Number(v))&&Number(v)>=0)||Number(adults)>row.remainingAdults||Number(children)>row.remainingChildren||Number(adults)+Number(children)<1)){setError(errors.INVALID_QUANTITY);return}
  const payload={...base,action,...(action==='CHECK_IN'?{adults:Number(adults),children:Number(children)}:{}),...(['NO_SHOW','REOPEN','FINANCE_REVIEW'].includes(action)?{reason}:{}),...(action==='NO_SHOW'?{previewHash:preview?.previewHash}:{}),...(action==='FINANCE_REVIEW'?{financeStatus:decision}:{})}
  const signature=JSON.stringify(payload)
  if(command.current?.signature!==signature)command.current={id:crypto.randomUUID(),signature}
  lock.current=true;setBusy(true);setError('')
  try{await api('/api/operations/check-in',{id:command.current.id,...payload});onSaved()}catch(e){setError(message(e))}finally{lock.current=false;setBusy(false)}
 }
 const title={VIEW:'Attendance details',CHECK_IN:'Confirm arrivals',NO_SHOW:'Review no-show and allocations',CLOSE:'Close service day',REOPEN:'Reopen service day',FINANCE_REVIEW:'Review financial impact'}[action]
 return <Dialog title={title} variant={['NO_SHOW','VIEW'].includes(action)?'table':undefined} busy={busy} onClose={onClose}>
  <form noValidate onSubmit={save}>
   <p>{row?`${row.code} · ${row.name} · ${row.direction}`:serviceDate}</p>
   {action==='VIEW'&&<><p>{t("Arrived:")}{' '}{row.adults}{' '}{t("adults /")}{' '}{row.children}{' '}{t("children · No-show:")}{' '}{row.noShowAdults}{' '}{t("adults /")}{' '}{row.noShowChildren}{' '}{t("children")}</p><p>{t("Reason:")}{' '}{row.reason||'—'}</p><p>{t("Finance:")}{' '}{t(financeLabel[row.financeStatus])} · {row.financeReason||t("No financial decision recorded.")}</p><DataTable label={bilingualLabel("Recorded allocation changes")} columns={['Run','Original','After review','Result']} isEmpty={!row.changes.length} empty={<p>{t("No allocation changes recorded.")}</p>}>{row.changes.map(c=><tr key={c.id}><td>{c.run}</td><td>{c.beforeAdults} / {c.beforeChildren}</td><td>{c.adults} / {c.children}</td><td>{c.preserved?t('Recorded service preserved'):c.status==='CANCELLED'?t("Cancelled · no-show"):t('Passengers reduced')}</td></tr>)}</DataTable></>}
   {row?.demo&&<p role="status">{t("DEMO booking · simulated payment. No real payment was received.")}</p>}
   {action==='CHECK_IN'&&<><p>{t("Confirm only guests who are here now. Remaining:")}{' '}{row.remainingAdults}{' '}{t("adults /")}{' '}{row.remainingChildren}{' '}{t("children.")}</p><div className="form-grid"><FormField label={bilingualLabel("Adults arriving now")} type="number" min="0" max={row.remainingAdults} step="1" value={adults} onChange={e=>setAdults(e.target.value)} disabled={busy}/><FormField label={bilingualLabel("Children arriving now")} type="number" min="0" max={row.remainingChildren} step="1" value={children} onChange={e=>setChildren(e.target.value)} disabled={busy}/></div></>}
   {action==='NO_SHOW'&&<><p>{t("Mark the remaining")}{' '}{row.remainingAdults}{' '}{t("adults /")}{' '}{row.remainingChildren}{' '}{t("children as no-show. Review each allocation below before confirming.")}</p><DataTable label={bilingualLabel("Allocation changes")} columns={['Run','Original','After review','Result']} busy={!preview&&!error} isEmpty={Boolean(preview&&!preview.changes.length)} empty={<p>{t("No unserved allocations need changing.")}</p>}>{preview?.changes.map(c=><tr key={c.id}><td>{c.run}</td><td>{c.beforeAdults} / {c.beforeChildren}</td><td>{c.adults} / {c.children}</td><td>{c.preserved?t('Recorded service preserved'):c.status==='CANCELLED'?t("Cancelled · no-show"):t('Reduce passengers')}</td></tr>)}</DataTable><p>{t("Booking prices and received funds remain unchanged. Finance must review billing, adjustment or refund conditions separately.")}</p></>}
   {action==='FINANCE_REVIEW'&&<><p>{t("Record the decision and its reason. This does not issue a refund, alter a bill or move money.")}</p><SelectField label={bilingualLabel("Financial decision")} value={decision} onChange={e=>setDecision(e.target.value)} disabled={busy}><option value="RETAIN_CHARGES">{t("Retain agreed charges")}</option><option value="ADJUSTMENT_REQUIRED">{t("Adjustment required")}</option><option value="REFUND_REQUIRED">{t("Refund review required")}</option></SelectField></>}
   {action==='CLOSE'&&<p>{t("Close attendance for")}{' '}{serviceDate}{t(". All guests must be checked in or reviewed as no-show. Outstanding financial reviews remain open.")}</p>}
   {['NO_SHOW','REOPEN','FINANCE_REVIEW'].includes(action)&&<FormField label={bilingualLabel("Reason")} value={reason} maxLength={1000} required onChange={e=>setReason(e.target.value)} disabled={busy}/>}
   {error&&<p role="alert">{t(error)}</p>}<div className="dialog-actions"><Button type="button" onClick={onClose} disabled={busy}>{t("Cancel")}</Button>{action!=='VIEW'&&<Button type="submit" busy={busy} disabled={busy||(action==='NO_SHOW'&&!preview)}>{t(title)}</Button>}</div>
  </form>
 </Dialog>
}
export default function CheckInPage({actor}){
 useLocale();
 const [date,setDate]=useState(today),[query,setQuery]=useState(''),[filter,setFilter]=useState({date:today(),q:''}),[page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[review,setReview]=useState(null),[notice,setNotice]=useState('')
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');api(`/api/operations/check-in?${new URLSearchParams({...filter,page})}`,undefined,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setData(result);setLoading(false)}}).catch(e=>{if(!controller.signal.aborted){setError(message(e));setLoading(false)}});return()=>controller.abort()},[filter,page,attempt])
 const closed=data?.close?.status==='CLOSED',manager=actor?.management?.company
 function search(e){e.preventDefault();if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+new Date(date))||new Date(date).toISOString().slice(0,10)!==date){setError('Enter a valid service date.');return}setFilter({date,q:query.trim()});setPage(1);setAttempt(n=>n+1)}
 return <><div className="page-heading"><div><h1>{bilingualLabel("Customer check-in")}</h1><p>{t("Verify the booking, count arrivals and confirm service attendance.")}</p></div></div>
  <SummaryCards items={[{label:'Expected guests / legs',value:data?.summary.expected??'—'},{label:'Checked in',value:data?.summary.present??'—'},{label:'No-show',value:data?.summary.noShow??'—'},{label:'Groups to review',value:data?.summary.unresolved??'—'}]}/>
  <section className="panel table-panel"><form noValidate className="filterbar" onSubmit={search}><DateField label={bilingualLabel("Service date (Thailand)")} value={date} onChange={e=>setDate(e.target.value)}/><FormField label={bilingualLabel("Scan or enter booking code")} value={query} maxLength={100} onChange={e=>setQuery(e.target.value)} hint={t("Use a keyboard barcode scanner, or enter a code / guest name.")}/><Button type="submit" disabled={loading}>{t("Find booking")}</Button><RefreshButton disabled={loading} onClick={()=>setAttempt(n=>n+1)}/></form>
  <div className="address-section"><p>{t("Service day:")}{' '}{filter.date} · {closed?t('Closed'):t('Open')}{' '}{t("· Financial reviews outstanding:")}{' '}{data?.summary.financePending??'—'}</p>{manager&&<Button disabled={loading||Boolean(error)||!data} onClick={()=>setReview({action:closed?'REOPEN':'CLOSE'})}>{closed?t('Reopen service day'):t('Close service day')}</Button>}</div>
  {notice&&<p role="status">{t(notice)}</p>}
  <DataTable label={bilingualLabel("Service attendance")} columns={['Booking / guest','Leg','Arrived / expected','Status','Finance','Actions']} busy={loading} error={t(error)} onRetry={()=>setAttempt(n=>n+1)} isEmpty={!data?.rows.length} empty={<p>{t("No bookings match this service date and search. Check the date or booking code.")}</p>}>
   {data?.rows.map(row=><tr key={`${row.bookingId}:${row.direction}`}><td>{row.code}<div className="field-help">{row.name}</div></td><td>{row.direction==='OUTBOUND'?t('Outbound'):t('Return')}</td><td>{row.adults+row.children} / {row.expectedAdults+row.expectedChildren}</td><td>{t(statusLabel[row.status])}</td><td>{t(financeLabel[row.financeStatus])}</td><td><Dropdown rowActions label={bilingualLabel("Actions for {value0} {value1}", {value0: row.code, value1: row.direction})} items={[{label:'View attendance',icon:'view',onSelect:()=>setReview({row,action:'VIEW'})},{label:'Confirm arrivals',icon:'check',disabled:closed||!row.remainingAdults&&!row.remainingChildren,onSelect:()=>setReview({row,action:'CHECK_IN'})},...(manager?[{label:'Review no-show',icon:'edit',disabled:closed||!row.remainingAdults&&!row.remainingChildren,onSelect:()=>setReview({row,action:'NO_SHOW'})}]:[]),...(row.financeStatus!=='NONE'?[{label:'Review financial impact',icon:'view',onSelect:()=>setReview({row,action:'FINANCE_REVIEW'})}]:[])]}/></td></tr>)}
  </DataTable><Pagination page={data?.page||page} pageSize={25} total={error?undefined:data?.total} busy={loading} onPageChange={setPage}/></section>
  {review&&<Review {...review} serviceDate={filter.date} close={data?.close} onClose={()=>setReview(null)} onSaved={()=>{setReview(null);setNotice('Attendance review saved.');setAttempt(n=>n+1)}}/>}
 </>
}
