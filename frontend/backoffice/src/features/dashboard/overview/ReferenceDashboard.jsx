import CashOverview from './CashOverview.jsx'
import {dashboardTitles} from '../../../core/ui/dashboardPersona.js'
import {useState} from 'react'
import {useLocale} from '../../../core/i18n/locale.jsx'
import {translateLabel as label, formatNumber, formatDate} from '../../../core/i18n/runtime.js'
import {Icon} from '../../../core/ui/Icon.jsx'
import {DataTable} from '../../../core/ui/DataTable.jsx'
import {Tabs} from '../../../core/ui/Tabs.jsx'
import {TabPanel} from '../../../core/ui/TabPanel.jsx'
import './reference-dashboard.css'
const num=value=>value==null?'—':formatNumber(value)
const shortDate=value=>formatDate(value,{day:'numeric',month:'short'})
export function Panel({title,icon='grid',tone='blue',href,children,className=''}){
 const {t}=useLocale()
 return <section className={`panel reference-panel ${className}`}><div className="reference-panel-heading"><h2><span className={`reference-icon ${tone}`}><Icon name={icon}/></span>{label(title)}</h2>{href&&<a href={href}>{t('View all')}<span className="sr-only"> · {t(title)}</span></a>}</div>{children}</section>
}
export function Stat({title,value,icon='grid',tone='blue',detail,children}){
 const {t}=useLocale()
 return <article className={`reference-stat ${tone}`}><span className={`reference-icon ${tone}`}><Icon name={icon}/></span><div><h2>{label(title)}</h2><strong>{typeof value==='number'?num(value):value??'—'}</strong><p>{t(detail)}</p>{children}</div></article>
}
function Unconnected({message='This source is not connected yet.'}){
 const {t}=useLocale()
 return <div className="reference-unconnected"><span className="reference-source-dot"/><strong>{t('Not connected')}</strong><p>{t(message)}</p></div>
}
export function DashboardHero({persona,data,refresh}){
 const {t}=useLocale(),programmer=persona==='programmer',booking=persona.startsWith('booking-'),staff=!programmer&&!booking&&persona!=='gm'
 return <header className="reference-hero"><div className="reference-hero-copy"><h1 tabIndex="-1">{label(dashboardTitles[persona]||'My Work Dashboard')}</h1><p className="reference-hero-duties">{staff?t('Review · Prepare · Coordinate · Follow up'):booking?'Plan · Book · Coordinate · Follow up':programmer?'Monitor · Debug · Maintain · Improve':'Overview · Control · Verify · Plan'}</p><p className="reference-hero-intro">{staff?t('Your assigned work, ready for the next journey.'):booking?'“เห็นลูกค้าล่วงหน้า ดูแลงานจองให้ทุกการเดินทางราบรื่น”':programmer?'“ระบบที่เสถียร คือรากฐานของการเดินทางที่ราบรื่น”':'“เห็นภาพรวม ควบคุมได้ ทุกการเดินทางเป็นไปตามแผน”'}</p></div><div className="reference-hero-motto"><Icon name="globe"/><p>{programmer?'Keep The System Running':'More Happy Customers'}<span>{programmer?'For Better Journeys':'A Brighter Tomorrow'}</span></p></div><div className="reference-hero-updated">{data&&<time dateTime={data.generatedAt}>{formatDate(data.generatedAt,{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:data.timezone})} · {t('Thailand time')}</time>}{refresh}</div></header>
}
export function Bars({days,onSelect,monthly=false}){
 const {t}=useLocale(),max=Math.max(1,...days.map(day=>day.pax))
 return <div className={`reference-chart ${monthly?'is-monthly':''}`}><div className="reference-chart-scale" aria-hidden="true">{[max,Math.round(max*.75),Math.round(max*.5),Math.round(max*.25),0].map((n,i)=><span key={i}>{num(n)}</span>)}</div><div className="reference-bars">{days.map((day,i)=>{
 const title=monthly?formatDate(`${day.month}-01`,{month:'short',year:'2-digit'}):shortDate(day.date)
 const content=<><span className="reference-bar-track"><span className="reference-bar-fill" style={{height:`${100*day.pax/max}%`}}/></span><span className="reference-bar-label">{monthly||i%5===0||i===days.length-1?title:''}</span></>
 return onSelect?<button key={day.date} type="button" onClick={()=>onSelect(day)} aria-label={`${title}: ${num(day.pax)} ${t('guests')}`} title={`${title}: ${num(day.pax)} ${t('guests')}`}>{content}</button>:<div className="reference-bar" key={day.month} role="img" aria-label={`${title}: ${num(day.pax)} ${t('guests')}`} title={`${title}: ${num(day.pax)} ${t('guests')}`}>{content}</div>
 })}</div></div>
}
function BookingStatus({days}){
 const {t}=useLocale(),[active,setActive]=useState('today')
 const items=[{id:'today',label:'Today'},{id:'tomorrow',label:'Tomorrow'}]
 return <Panel title="Today & tomorrow · booking status" icon="calendar" tone="green" href="/operations/bookings" className="reference-booking-status"><Tabs items={items} value={active} onChange={setActive} label="Booking date" idPrefix="dashboard-booking"/>{items.map((item,i)=><TabPanel key={item.id} active={active===item.id} id={`dashboard-booking-panel-${item.id}`} labelledBy={`dashboard-booking-tab-${item.id}`}><p className="reference-range">{shortDate(days[i].date)}</p><div className="reference-status-metrics">{[['Total bookings',days[i].total,'blue'],['Confirmed',days[i].confirmed,'green'],['Draft',days[i].draft,'orange'],['Cancelled',days[i].cancelled,'red']].map(([title,value,tone])=><div key={title} className={tone}><span>{t(title)}</span><strong>{num(value)}</strong></div>)}</div><DataTable columns={['Booking no.','Tour program','Guests','Status']} label={`${item.label} bookings`} layout="content" isEmpty={!days[i].rows.length} empty={<p>{t('No bookings on this date.')}</p>}>{days[i].rows.map(row=><tr key={row.id}><td>{row.code}</td><td>{row.program}</td><td>{num(row.pax)}</td><td><span className={`reference-badge ${row.status.toLowerCase()}`}>{t(row.status)}</span></td></tr>)}</DataTable><p className="reference-range">{t('Up to 5 bookings shown. Completed bookings:')} {num(days[i].completed)}</p></TabPanel>)}</Panel>
}
function Assignment({widgets}){
 const {t}=useLocale()
 const rows=[['guide','Boat jobs','guide-allocation'],['driver','Vehicle jobs','driver-allocation']].map(([id,title,allocation])=>({id,title,job:widgets.find(w=>w.id===id),pending:widgets.find(w=>w.id===allocation)})).filter(row=>row.job||row.pending)
 return <Panel title="Transport & boat assignment" icon="briefcase" tone="green"><div className="reference-assignment-grid">{rows.map(row=><div className="reference-assignment-row" key={row.id}>{row.job&&<a href={row.job.href} className="green"><Icon name="briefcase"/><span>{t(row.title)}<strong>{num(row.job.today)}</strong><small>{t('Open today')}</small></span></a>}{row.pending&&<a href={row.pending.href} className="red"><Icon name="calendar"/><span>{t('Awaiting allocation')}<strong>{num(row.pending.today)}</strong><small>{t('Bookings today')}</small></span></a>}</div>)}</div>{!rows.length&&<p className="reference-range">{t('No allocation summaries available for your permissions.')}</p>}<div className="reference-pending-list"><h3>{t('Work to follow up')}</h3>{widgets.filter(w=>['guide-crew','driver-crew','guide-allocation','driver-allocation'].includes(w.id)).map(w=><a key={w.id} href={w.href}><span>{t(w.title)}<small>{t('Next 14 days')}</small></span><b>{num(w.pending)}</b><Icon name="arrow"/></a>)}</div></Panel>
}
export function ManagementDashboard({data,onSelect}){
 const {t}=useLocale(),overview=data.managementOverview
 if(!overview)return <div className="reference-overview-unavailable"><Panel title="Management overview"><Unconnected message="Management summaries are unavailable for this account or server version."/></Panel></div>
 const {calendar30,monthly,bookingDays}=overview,topAgents=overview.seasonAgents||overview.topAgents
 return <div className="reference-dashboard-content"><div className="reference-stat-grid"><Stat title="Customers (today)" value={calendar30[0]?.pax} icon="users" detail="Confirmed and completed arrivals"/><Stat title="Customers (next 30 days)" value={calendar30.reduce((n,d)=>n+d.pax,0)} icon="users" tone="red" detail="Confirmed and completed arrivals"/><Stat title="Total bookings (next 30 days)" value={calendar30.reduce((n,d)=>n+d.bookings,0)} icon="calendar" tone="purple" detail="Confirmed and completed arrivals"/><Stat title="Total revenue" value={null} icon="briefcase" tone="green" detail="Revenue summary not connected"/></div><div className="reference-main-grid"><Panel title="Customers next 30 days" icon="users" href="/operations/bookings"><Bars days={calendar30} onSelect={onSelect}/><p className="reference-range">{shortDate(overview.from)} – {shortDate(overview.through)} · {t('Select a bar for tour program totals.')}</p></Panel><Panel title="Top agents" icon="users" tone="green" href="/settings/partners"><p className="reference-range">{t('Reporting season')}: {formatDate(topAgents.from,{day:'numeric',month:'short',year:'numeric'})} – {formatDate(topAgents.through,{day:'numeric',month:'short',year:'numeric'})}</p><p className="reference-range">{t('Season: 15 October – 15 May. Confirmed and completed arrivals only.')}</p><DataTable label="Top agents" columns={['#','Agent','Guests','Share']} layout="content" isEmpty={!topAgents.rows.length} empty={<p>{t('No confirmed arrivals in this period.')}</p>}>{topAgents.rows.map((row,i)=><tr key={row.id??'direct'}><td><span className="reference-rank">{i+1}</span></td><td>{row.name}</td><td>{num(row.pax)}</td><td>{num(row.share)}%</td></tr>)}</DataTable></Panel><BookingStatus days={bookingDays}/><Assignment widgets={data.widgets}/></div><CashOverview data={data.cashOverview}/><div className="reference-bottom-grid"><Panel title="Monthly overview" icon="calendar"><p className="reference-range">{t('Customers · last 6 months')} · {shortDate(monthly.from)} – {shortDate(monthly.through)}</p><Bars days={monthly.rows} monthly/></Panel><Panel title="Quick reports" icon="grid"><div className="reference-report-links">{data.widgets.filter(w=>w.href.startsWith('/company/')).slice(0,4).map(w=><a key={w.id} href={w.href}><Icon name="briefcase"/><span>{t(w.title)}</span><Icon name="arrow"/></a>)}<a href="/manuals" target="_blank" rel="noreferrer"><Icon name="view"/><span>{t('Dashboard guide')}</span><Icon name="arrow"/></a></div></Panel></div></div>
}
export function ProgrammerDashboard({data,requestDuration}){
 const {t}=useLocale(),system=data.systemOverview
 return <div className="reference-dashboard-content"><div className="reference-main-grid programmer-grid"><Panel title="Error / Bug" tone="red"><p className="reference-range">{t('Recorded API errors from this process only; up to 100 entries. History resets when the server restarts.')}</p><DataTable columns={['Time','Type','Code']} isEmpty={!system?.errors?.length} empty={<p>{t('No API errors recorded in this process.')}</p>}>{(system?.errors||[]).map((error,index)=><tr key={index}><td>{formatDate(error.at,{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})}</td><td>{error.type}</td><td>{error.code}</td></tr>)}</DataTable></Panel><Panel title="API status"><p className="reference-range">{t(system?.api==='RESPONDING'?'Responding':'Status unavailable')}</p><p className="reference-range">{num(requestDuration)} ms · {t('Latest dashboard request · this browser')}</p><p className="reference-range">{t('External providers are not probed or activated by this dashboard.')}</p></Panel></div></div>
}
