import {translateLabel as bilingualLabel, formatDate as displayDate, formatNumber} from '../../../core/i18n/runtime.js'
import {translate as t, useLocale} from '../../../core/i18n/locale.jsx'
import {useEffect, useState} from 'react'
import {api} from '../../../core/auth/api.js'
import {Button} from '../../../core/ui/Button.jsx'
import {RefreshButton} from '../../../core/ui/RefreshButton.jsx'
import {Dialog} from '../../../core/ui/Dialog.jsx'
import {DataTable} from '../../../core/ui/DataTable.jsx'
import {SelectField} from '../../../core/ui/SelectField.jsx'
import {Icon} from '../../../core/ui/Icon.jsx'
import './dashboard.css'

const dateLabel = value => displayDate(new Date(value + 'T00:00:00Z'), {weekday:'short', day:'numeric', month:'short', timeZone:'UTC'})
const number = value => formatNumber(value, {})
function Metric({value, alert=false}) {
 return value == null ? <span className="dashboard-unavailable" aria-label={t('Not available')}>—</span> : <span className={alert && value > 0 ? 'dashboard-count is-overdue' : 'dashboard-count'}>{number(value)}</span>
}
function CustomerCalendar({days,today,onSelect}) {
 return <section className="panel dashboard-calendar" aria-labelledby="customer-calendar-title">
  <div className="dashboard-section-heading"><h2 id="customer-calendar-title"><Icon name="calendar"/>{bilingualLabel('Customers · next 14 days')}</h2><span className="dashboard-range">{dateLabel(days[0].date)} – {dateLabel(days.at(-1).date)}</span></div>
  <p className="dashboard-calendar-hint">{t('Select a date to see bookings and guests by tour program.')}</p>
  <div className="dashboard-calendar-scroll" role="region" aria-label={t('Customer calendar')} tabIndex="0">
   <div className="dashboard-weekdays" aria-hidden="true">{days.slice(0,7).map(day=><span key={day.date}>{displayDate(day.date,{weekday:'short'})}</span>)}</div>
   <div className="dashboard-days">{days.map(day=>{
    const weekend=[0,6].includes(new Date(day.date+'T00:00:00Z').getUTCDay())
    return <button type="button" key={day.date} className={`dashboard-day${weekend?' is-weekend':''}${day.date===today?' is-today':''}`} aria-current={day.date===today?'date':undefined} aria-label={t('{value0}, {value1} guests, {value2} bookings',{value0:dateLabel(day.date),value1:number(day.pax),value2:number(day.bookings)})} onClick={()=>onSelect(day)}><div className="dashboard-day-date"><time dateTime={day.date}>{displayDate(day.date,{day:'numeric',month:'short'})}</time>{day.date===today&&<span className="dashboard-today-label">{t('Today')}</span>}</div><strong>{number(day.pax)}</strong><span>{t('guests')}</span></button>
   })}</div>
  </div>
  <p className="dashboard-calendar-definition">{t('Confirmed and completed bookings, counted once on arrival. Return-only bookings use their return service date.')}</p>
 </section>
}
function AttentionTable({widgets,scope}) {
 const [selectedScope,setScope]=useState('all'),[status,setStatus]=useState('all')
 const scopes=[...new Set(widgets.map(widget=>widget.scope))]
 const rows=widgets.filter(widget=>(selectedScope==='all'||widget.scope===selectedScope)&&(status==='all'||(widget[status]??0)>0))
 const heading=scope==='Company'?'Work needing attention':scope.endsWith(' department')?'Team work overview':'My work overview'
 return <section className="panel dashboard-attention-table" aria-labelledby="attention-title">
  <div className="dashboard-section-heading"><h2 id="attention-title"><Icon name="briefcase"/>{bilingualLabel(heading)}</h2><span className="dashboard-scope">{bilingualLabel(scope)}</span></div>
  <div className="dashboard-table-toolbar"><p>{t('Open a work area to review records and continue your work.')}</p><div className="dashboard-filters"><SelectField label="Work scope" value={selectedScope} onChange={event=>setScope(event.target.value)}><option value="all">{t('All available scopes')}</option>{scopes.map(value=><option value={value} key={value}>{t(value)}</option>)}</SelectField><SelectField label="Show work" value={status} onChange={event=>setStatus(event.target.value)}>{[['all','All work'],['today','Today'],['overdue','Overdue'],['review','Awaiting acceptance']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</SelectField></div></div>
  <DataTable label="Work needing attention" layout="content" columns={[{label:'Work area',weight:2.8},{label:'Scope',weight:1.6},{label:'Today',weight:.8},{label:'Pending',weight:.9},{label:'Overdue',weight:.9},{label:'Awaiting acceptance',weight:1.2},{label:'Actions',weight:1.1}]} isEmpty={!rows.length} empty={<><h3>{t('No work matches these filters')}</h3><Button variant="secondary" onClick={()=>{setScope('all');setStatus('all')}}>{t('Reset filters')}</Button></>}>
   {rows.map(widget=><tr key={widget.id}><td><a className="dashboard-work-title" href={widget.href}>{bilingualLabel(widget.title)}</a><span className="dashboard-work-detail">{t(widget.detail)}</span></td><td>{bilingualLabel(widget.scope)}</td><td><Metric value={widget.today}/></td><td><Metric value={widget.pending}/></td><td><Metric value={widget.overdue} alert/></td><td><Metric value={widget.review}/></td><td><a className="dashboard-open-work" href={widget.href} aria-label={`${t('Open work area →')} ${t(widget.title)}`}>{t('View work')}<Icon name="arrow" width="15" height="15"/></a></td></tr>)}
  </DataTable>
  <p className="dashboard-table-note">{t('Counts follow each work area’s permissions. A dash means this measure is not available; categories may overlap.')}</p>
 </section>
}
export default function DashboardPage() {
 useLocale()
 const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0),[selected,setSelected]=useState(null)
 useEffect(()=>{
  const controller=new AbortController()
  api('/api/dashboard',undefined,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({data})}).catch(error=>{if(!controller.signal.aborted)setState({error:error.status===403?'Your access has changed. Refresh your account or contact your Manager.':'Unable to load your work. Check your connection and retry.'})})
  return()=>controller.abort()
 },[attempt])
 function reload(){setSelected(null);setState({loading:true});setAttempt(value=>value+1)}
 const data=state.data
 const title=!data||data.scope==='Company'?'Dashboard':data.scope.endsWith(' department')?'Department overview':'My work'
 return <div className="dashboard"><div className="page-heading dashboard-heading"><div><h1 tabIndex="-1">{bilingualLabel(title)}</h1>{data&&<p className="dashboard-updated">{dateLabel(data.today)} · {t('Thailand time')} · {t('Updated')} {displayDate(new Date(data.generatedAt),{hour:'2-digit',minute:'2-digit',timeZone:data.timezone})}</p>}</div><RefreshButton onClick={reload} disabled={state.loading}/></div>
 {state.loading?<section className="panel dashboard-state" role="status">{t('Loading your work…')}</section>:state.error?<section className="panel dashboard-state" role="alert"><p>{t(state.error)}</p><Button onClick={reload}>{t('Retry')}</Button></section>:<>
 {data.calendar?.length>0&&<CustomerCalendar days={data.calendar} today={data.today} onSelect={setSelected}/>}
 {data.widgets.length?<AttentionTable widgets={data.widgets} scope={data.scope}/>:<section className="panel dashboard-state"><h3>{bilingualLabel('No work areas available yet')}</h3><p>{t('Your account has no supported work permissions. Contact your Manager to check your assignments.')}</p><a href="/profile">{t('Open my profile →')}</a></section>}
 </>}
 {selected&&<Dialog title={dateLabel(selected.date)} onClose={()=>setSelected(null)}><p>{number(selected.pax)} {t('guests ·')} {number(selected.bookings)} {t('bookings')}</p><DataTable label={bilingualLabel('Guests by tour program')} layout="content" columns={['Tour program','Bookings','Guests']} isEmpty={!selected.programs.length} empty={<p>{t('No confirmed customers arriving on this date.')}</p>}>{selected.programs.map(program=><tr key={program.id}><td>{program.id==='standalone'?t('Standalone services'):program.name}</td><td>{number(program.bookings)}</td><td>{number(program.pax)}</td></tr>)}</DataTable><div className="dialog-actions"><a href="/operations/bookings" onClick={()=>setSelected(null)}>{t('Open bookings →')}</a><Button onClick={()=>setSelected(null)}>{t('Close')}</Button></div></Dialog>}
 </div>
}
