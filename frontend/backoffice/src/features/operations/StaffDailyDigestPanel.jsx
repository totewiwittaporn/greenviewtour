import {useEffect,useRef,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {useLocale} from '../../core/i18n/locale.jsx'
import {translateLabel as bilingualLabel} from '../../core/i18n/runtime.js'
import {Button} from '../../core/ui/Button.jsx'
import {DataTable} from '../../core/ui/DataTable.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {Dropdown} from '../../core/ui/Dropdown.jsx'
import {Pagination} from '../../core/ui/Pagination.jsx'
import {RefreshButton} from '../../core/ui/RefreshButton.jsx'
const reasons={NOT_LINKED:'No active LINE connection',STAFF_UNAVAILABLE:'Staff account unavailable',NO_AUTHORIZED_WORK:'No currently authorized assignments',UNCERTAIN_DELIVERY_REQUIRES_RETRY:'Review the previous attempt before preparing again'}
const statuses={PREPARED:'Prepared for simulation',SIMULATED:'Simulation completed — no message sent',BLOCKED:'Assignments or connection changed; refresh and prepare again',EXPIRED:'Prepared message expired',SUPERSEDED:'Replaced by a newer preparation',FAILED:'Test failed; review and retry',SENDING:'Test in progress'}
const errorText=error=>error.status===403?'Manager access is required to review staff digests.':error.message==='DIGEST_LIMIT_EXCEEDED'?'Too many assignments to prepare safely. Ask a Manager to review the selected date.':'Unable to load or test staff digests. Please retry.'
export default function StaffDailyDigestPanel({serviceDate,disabled=false,onBusyChange}){
 const {t}=useLocale()
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[actionError,setActionError]=useState(''),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0),[page,setPage]=useState(1),[view,setView]=useState(null),[prepared,setPrepared]=useState({}),[skipped,setSkipped]=useState({}),[busy,setBusy]=useState(false)
 const lock=useRef(false),resendCommands=useRef(new Map())
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('')
  api('/api/operations/staff-digests?'+new URLSearchParams({date:serviceDate}),undefined,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setData(result);setLoading(false)}}).catch(value=>{if(!controller.signal.aborted){setError(errorText(value));setLoading(false)}})
  return()=>controller.abort()
 },[serviceDate,refresh])
 function reload(){setPrepared({});setSkipped({});setPage(1);setNotice('');setActionError('');setRefresh(value=>value+1)}
 async function command(action,row){
  if(lock.current||disabled)return
  lock.current=true;setBusy(true);onBusyChange?.(true);setActionError('');setNotice('')
  try{
   let body={action,serviceDate}
   if(action!=='prepare'){const id=prepared[row.userId].id;body={action,id};if(action==='resend'){if(!resendCommands.current.has(id))resendCommands.current.set(id,crypto.randomUUID());body.commandId=resendCommands.current.get(id)}}
   const result=await api('/api/operations/staff-digests',body)
   if(action==='prepare'){
    setPrepared(Object.fromEntries((result.rows||[]).map(item=>[item.userId,item])))
    setSkipped(Object.fromEntries((result.skipped||[]).map(item=>[item.userId,item.reason])))
    setNotice('Preparation saved. Review each message before running a simulation. No LINE message was sent.')
   }else{
    setPrepared(old=>({...old,[row.userId]:result}))
    if(action==='resend'){resendCommands.current.delete(body.id);setNotice('Resend prepared for simulation. No LINE message was sent.')}
    else if(result.status==='SIMULATED')setNotice('Simulation completed — no message sent')
    else setActionError(statuses[result.status]||'The test did not complete. Refresh and review the staff digest.')
   }
  }catch(value){setActionError(errorText(value))}finally{lock.current=false;setBusy(false);onBusyChange?.(false)}
 }
 const rows=data?.rows||[],locked=disabled||busy
 const readiness=row=>row.reason?reasons[row.reason]||'Staff account unavailable':'LINE connection verified'
 const resultLabel=row=>skipped[row.userId]?reasons[skipped[row.userId]]||'Preparation unavailable':statuses[prepared[row.userId]?.status]||'Not prepared'
 const shownMessages=row=>prepared[row.userId]?.messages||row.messages
 const canResend=row=>prepared[row.userId]?.status==='SIMULATED'
 const canTest=row=>prepared[row.userId]&&['PREPARED','FAILED'].includes(prepared[row.userId].status)
 return <section className="panel table-panel" aria-labelledby="staff-digests-title">
  <div className="panel-heading"><div><h2 id="staff-digests-title">{bilingualLabel('Daily Work Assignment')}</h2><p>{t('Review Daily Work Assignment for each employee on {date}.',{date:serviceDate})}</p></div></div>
  <div className="address-section"><p>{t('Role-based Daily Work Assignment. Passenger totals and preparation details follow each employee role.')}</p><p>{t('Local tests simulate delivery only. They do not send LINE messages or confirm receipt.')}</p>
   <div className="dialog-actions"><Button disabled={locked||loading||Boolean(error)||!rows.some(row=>row.jobs.length)} busy={busy} onClick={()=>command('prepare')}>{t('Prepare Daily Work Assignment tests')}</Button><RefreshButton disabled={locked} onClick={reload}/></div>
   {notice&&<p role="status">{t(notice)}</p>}{actionError&&<p role="alert">{t(actionError)}</p>}
  </div>
  <DataTable label="Daily Work Assignment previews" columns={['Employee','Assigned work','LINE connection','Test status','Actions']} busy={loading} error={t(error)} onRetry={reload} isEmpty={!rows.length} empty={<p>{t('No Daily Work Assignment is available for this service date.')}</p>}>
   {rows.slice((page-1)*25,page*25).map(row=><tr key={row.userId}><td>{row.name}</td><td>{[...new Set(row.jobs.map(job=>job.role))].map(role=>t(role)).join(' · ')||'—'} · {row.jobs.length}</td><td>{t(readiness(row))}</td><td>{t(resultLabel(row))}</td><td><Dropdown rowActions disabled={locked} label={bilingualLabel('Actions for {value0}',{value0:row.name})} items={[{label:'View message preview',icon:'view',onSelect:()=>setView(row)},...(canTest(row)?[{label:'Test manual send (simulation)',icon:'mail',onSelect:()=>setView(row)}]:[]),...(canResend(row)?[{label:'Prepare resend (simulation)',icon:'refresh',onSelect:()=>setView(row)}]:[])]}/></td></tr>)}
  </DataTable><Pagination page={page} pageSize={25} total={error?undefined:rows.length} busy={loading||locked} onPageChange={setPage} label="Daily Work Assignment pagination"/>
  {view&&<Dialog title={bilingualLabel('Daily Work Assignment preview')} onClose={()=>setView(null)} busy={busy} variant="table"><p>{view.name} · {serviceDate}</p><p>{t(readiness(view))}</p><p>{t('Local tests simulate delivery only. They do not send LINE messages or confirm receipt.')}</p>
   {shownMessages(view).length?shownMessages(view).map((message,index)=><dl className="catalog-details" key={index}><dt>{t('Message text')} {index+1}</dt><dd>{message.text}</dd></dl>):<p>{t('No currently authorized assignments')}</p>}
   <p role="status">{t(resultLabel(view))}</p>{actionError&&<p role="alert">{t(actionError)}</p>}
   <div className="dialog-actions"><Button disabled={busy} onClick={()=>setView(null)}>{t('Close')}</Button>{canResend(view)&&<Button busy={busy} disabled={locked} onClick={()=>command('resend',view)}>{t('Prepare resend (simulation)')}</Button>}{canTest(view)&&<Button busy={busy} disabled={locked} onClick={()=>command('simulate',view)}>{t('Test manual send (simulation)')}</Button>}</div>
  </Dialog>}
 </section>
}
