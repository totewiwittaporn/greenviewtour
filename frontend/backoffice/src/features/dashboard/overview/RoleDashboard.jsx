import { roleNames } from '../../../../../../packages/contracts/access.js'
import { useState } from 'react'
import { useLocale } from '../../../core/i18n/locale.jsx'
import { formatNumber, formatDate, translateLabel as label } from '../../../core/i18n/runtime.js'
import { DataTable } from '../../../core/ui/DataTable.jsx'
import { Tabs } from '../../../core/ui/Tabs.jsx'
import { TabPanel } from '../../../core/ui/TabPanel.jsx'
import { Panel, Stat } from './ReferenceDashboard.jsx'
import './role-dashboard.css'

const number = value => value == null ? '—' : formatNumber(value)
const dayLabel = day => formatDate(day + 'T00:00:00Z', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const dateTabs = [{ id: 'today', label: 'Today' }, { id: 'tomorrow', label: 'Tomorrow' }]
function statsFor(persona, overview, widgets) {
 const widget = id => widgets.find(row => row.id === id)
 const run = overview.dispatch.find(s => s.kind === (persona.includes('driver') ? 'VEHICLE' : 'BOAT')) || overview.dispatch[0]
 const today = run?.days[0], tomorrow = run?.days[1]
 if (persona.includes('housekeeping')) return [['Jobs due today', overview.jobs?.days[0]?.total], ['Pending work', widget('cleaning-jobs')?.pending], ['Awaiting acceptance', widget('cleaning-jobs')?.review], ['Overdue jobs', widget('cleaning-jobs')?.overdue]]
 if (persona === 'account') return [['Open agent bills', widget('receivables')?.pending], ['Reimbursements to follow up', widget('expenses')?.pending], ['Supplier payments to follow up', widget('supplier-payments')?.pending], ['Work advances to follow up', widget('advances')?.pending]]
 if (persona === 'sales') return [['My customer requests', null], ['Awaiting service confirmation', null], ['Sales follow-ups', null], ['My stock requests', widget('stock-requests')?.pending]]
 if (persona === 'assistant-guide') return [['My runs today', today?.total], ['Preparation lines pending', today?.pendingLines], ['Unsettled issue lines', today?.unsettledLines], ['My runs tomorrow', tomorrow?.total]]
 if (run || ['guide', 'head-guide', 'captain', 'head-captain', 'assistant-captain', 'driver', 'head-driver'].includes(persona)) return [['Assigned runs today', today?.total], [run?.kind === 'VEHICLE' ? 'Pickup passengers' : 'Outbound guests', today?.outboundPax], [run?.kind === 'VEHICLE' ? 'Drop-off passengers' : 'Return guests', today?.returnPax], ['Assigned runs tomorrow', tomorrow?.total]]
 return [['My stock requests', widget('stock-requests')?.pending], ['My stock counts', widget('stock-counts')?.pending], ['My maintenance jobs', widget('maintenance')?.pending], ['Jobs due today', overview.jobs?.days[0]?.total]]
}
function Status({value}) {
 const {t} = useLocale()
 return <span className={`reference-badge ${String(value).toLowerCase()}`}>{t(value)}</span>
}
function RunTable({section, day}) {
 const {t} = useLocale()
 return <div className="role-work-table"><h3>{label(section.title)}</h3><DataTable label={label(section.title)} columns={['Run / vehicle', 'Direction', 'Guests / capacity', 'Status']} layout="content" isEmpty={!day.rows.length} empty={<p>{t('No assigned runs on this date.')}</p>}>
  {day.rows.map(row => <tr key={row.id}><td><a href={row.href}>{row.code}</a><small className="role-secondary">{row.vehicle || t('No vehicle recorded')}</small></td><td>{t(row.kind === 'VEHICLE' ? row.direction === 'OUTBOUND' ? 'Pickup' : 'Drop-off' : row.direction === 'OUTBOUND' ? 'Outbound' : 'Return')}</td><td>{number(row.passengers)} / {number(row.capacity)}</td><td><Status value={row.status}/></td></tr>)}
 </DataTable><p className="reference-range">{t('Scheduled runs')}: {number(day.total)} · {t('Up to 10 rows shown. Open the work area for the complete list.')}</p></div>
}
function JobTable({rows, title = 'Assigned jobs'}) {
 const {t} = useLocale()
 return <DataTable label={label(title)} columns={['Work item', 'Responsible person', 'Due date', 'Status']} layout="content" isEmpty={!rows.length} empty={<p>{t('No work in this queue.')}</p>}>
  {rows.map(row => <tr key={row.id}><td><a href={row.href}>{row.name}</a></td><td>{row.assignee || t('Unassigned')}</td><td>{row.date ? dayLabel(row.date) : '—'}</td><td><Status value={row.status}/></td></tr>)}
 </DataTable>
}
function RunDetails({sections, dayIndex}) {
 const {t} = useLocale()
 const rows = sections.flatMap(s => s.days[dayIndex].rows)
 return <Panel title="Crew & handover" icon="users" tone="green"><p className="reference-range">{t('Recorded assignments only. No live vehicle location or guessed pickup times.')}</p>
  {!rows.length ? <p>{t('No assigned runs on this date.')}</p> : <div className="role-handover" tabIndex="0" role="region" aria-label={t('Crew & handover')}>{rows.map(row => <article key={row.id}><a href={row.href}>{row.code}</a><p>{row.vehicle || t('No vehicle recorded')}</p>{row.crew.length ? <ul>{row.crew.map((person, i) => <li key={i}>{person.name}<small>{t(roleNames[person.role] || person.role)}</small></li>)}</ul> : <p>{t('No crew recorded')}</p>}{row.kind === 'VEHICLE' && <p><strong>{t('Recorded pickup / drop-off points')}: </strong>{row.stops.length ? row.stops.join(' · ') : t('Not recorded')}</p>}</article>)}</div>}
 </Panel>
}
function Preparation({sections, dayIndex}) {
 const {t} = useLocale(), rows = sections.flatMap(s => s.days[dayIndex].rows.filter(r => r.preparation).flatMap(r => r.preparation.items.map(item => ({...item, runId:r.id, code:r.code, href:r.href}))))
 const runs = sections.flatMap(section => section.days[dayIndex].rows)
 return <Panel title="Preparation & returns" icon="briefcase" tone="purple"><div className="role-preparation-links">{runs.map(run => <div key={run.id}><strong>{run.code}</strong><a href={`/operations/stock?date=${run.date}&runId=${encodeURIComponent(run.id)}`}>{t("Prepare / issue")}</a><a href={`/operations/issues?date=${run.date}&runId=${encodeURIComponent(run.id)}`}>{t("Loans & returns")}</a></div>)}</div><p className="reference-range">{t('Quantities are grouped only by the same item, size and unit. Issue lines are not total item quantities.')}</p><DataTable label={label('Preparation & returns')} columns={['Run / item', 'Unit', 'Required', 'Issued', 'Still to prepare', 'Unsettled']} layout="content" isEmpty={!rows.length} empty={<p>{t('No preparation items for assigned runs on this date.')}</p>}>
  {rows.map(row => <tr key={row.runId + row.id}><td><a href={row.href}>{row.code}</a><small className="role-secondary">{row.name}{row.size ? ` · ${row.size}` : ''}</small></td><td>{t(row.unit)}</td><td>{number(row.required)}</td><td>{number(row.issued)}</td><td>{number(row.remaining)}</td><td>{number(row.outstanding)}</td></tr>)}
 </DataTable><p className="reference-range">{t('Up to 20 item groups per displayed run. Open the run for complete preparation details.')}</p></Panel>
}
function FinanceQueue({rows}) {
 const {t} = useLocale()
 return <Panel title="Finance work to follow up" icon="briefcase"><DataTable label={label('Finance work to follow up')} columns={['Work item', 'Work area', 'Due date', 'Outstanding balance', 'Status']} layout="content" isEmpty={!rows.length} empty={<p>{t('No work in this queue.')}</p>}>
  {rows.map(row => <tr key={row.id}><td><a href={row.href}>{row.title}</a></td><td>{t(row.area)}</td><td>{row.dueOn ? dayLabel(row.dueOn) : '—'}</td><td>{row.balance == null ? '—' : `${formatNumber(row.balance, {minimumFractionDigits:2, maximumFractionDigits:2})} THB`}</td><td><Status value={row.status}/></td></tr>)}
 </DataTable><p className="reference-range">{t('Up to 5 records per permitted finance area. Payroll requires separate permission.')}</p></Panel>
}
function FollowUp({widgets}) {
 const {t} = useLocale()
 return <Panel title="Work to follow up" icon="calendar" tone="purple"><div className="reference-pending-list role-follow-ups">{widgets.map(row => <a key={row.id} href={row.href}><span>{t(row.title)}<small>{t('Pending')}: {number(row.pending)}{row.overdue != null && ` · ${t('Overdue')}: ${number(row.overdue)}`}{row.review != null && ` · ${t('Awaiting acceptance')}: ${number(row.review)}`}</small></span><b>{number(row.pending)}</b></a>)}</div>{!widgets.length && <p>{t('No permitted work queues for this account.')}</p>}<p className="reference-range">{t('Each queue is counted separately. These counts must not be added together.')}</p></Panel>
}
export function RoleDashboard({data, persona}) {
 const {t} = useLocale(), [active, setActive] = useState('today')
 const overview = data.workOverview, widgets = data.widgets || [], dayIndex = active === 'today' ? 0 : 1
 if (!overview) return <section className="panel dashboard-state" role="status">{t('Work overview is unavailable. Refresh your account to check your access.')}</section>
 const showJobs = overview.jobs && (persona.includes('housekeeping') || overview.jobs.days.some(day => day.total > 0) || overview.jobs.pending.length > 0)
 const stats = statsFor(persona, overview, widgets), hasDatedWork = overview.dispatch.length > 0 || showJobs
 const finance = widgets.some(w => ['receivables', 'expenses', 'supplier-payments', 'advances', 'payroll', 'salary-advances', 'allowances'].includes(w.id))
 const preparation = overview.dispatch.filter(s => s.prepare)
 return <div className="reference-dashboard-content role-dashboard-content">
  <div className="reference-stat-grid">{stats.map(([title, value], i) => <Stat key={title} title={title} value={value} tone={['blue', 'red', 'purple', 'green'][i]} icon={i === 1 || i === 2 ? 'users' : 'calendar'} detail={value == null ? 'No permitted source or not configured' : persona.includes('housekeeping') || persona === 'account' || persona === 'sales' ? 'From your authorized work records' : 'From assigned runs; passengers exclude crew'}/>)}</div>
  {persona === 'sales' && <section className="panel role-notice" role="status">{t('Sales request ownership is not configured. No customer queue or conversion figures are invented. Your permitted work areas remain available below.')}</section>}
  <div className="reference-main-grid">
   {hasDatedWork && <Panel title="Today & tomorrow · work" icon="calendar" href={overview.dispatch[0]?.href || overview.jobs?.href}>
    <Tabs items={dateTabs} value={active} onChange={setActive} label="Work date" idPrefix="role-work"/>
    {dateTabs.map((item, i) => <TabPanel key={item.id} active={active === item.id} id={`role-work-panel-${item.id}`} labelledBy={`role-work-tab-${item.id}`}><p className="reference-range">{dayLabel(overview.days[i])} · {t('Thailand time')}</p>{overview.dispatch.map(section => <RunTable key={section.id} section={section} day={section.days[i]}/>)}{showJobs && <><JobTable rows={overview.jobs.days[i].rows}/><p className="reference-range">{t('Jobs due on this date')}: {number(overview.jobs.days[i].total)} · {t('Up to 10 rows shown. Open the work area for the complete list.')}</p></>}</TabPanel>)}
   </Panel>}
   {overview.dispatch.length > 0 && <RunDetails sections={overview.dispatch} dayIndex={dayIndex}/>}
   {overview.jobs && persona.includes('housekeeping') && <Panel title="Awaiting acceptance" icon="users" tone="green" href={overview.jobs.href}><p className="reference-range">{t('DONE means submitted for review, not accepted. The worker cannot accept their own work.')}</p><JobTable rows={overview.jobs.review} title="Awaiting acceptance"/></Panel>}
   {finance && <FinanceQueue rows={overview.finance}/>}
  </div>
  {preparation.length > 0 && <Preparation sections={preparation} dayIndex={dayIndex}/>}
  <div className="reference-main-grid"><FollowUp widgets={widgets}/><Panel title="Scope & handover" icon="users" tone="green"><p><strong>{t(data.scope?.endsWith('department') ? 'Assigned department work' : 'My assigned work')}</strong></p><p>{t('Only records allowed by your current permissions are shown. Open each work area to continue the workflow.')}</p>
   {persona === 'head-captain' && <p>{t('Head Captain sees assigned runs only. A captain is not permanently attached to a boat.')}</p>}
   {['head-guide', 'head-driver'].includes(persona) && <p>{t('Unassigned bookings have no department owner. Company-wide allocation totals are not exposed to this scope.')}</p>}
   {persona.includes('housekeeping') && <p>{t('An empty work list does not mean absence. Completion and acceptance remain separate steps.')}</p>}
   <a href="/manuals">{t('User guides')}</a>
  </Panel></div>
  {overview.jobs && persona.includes('housekeeping') && <Panel title="Pending work" icon="calendar" href={overview.jobs.href}><JobTable rows={overview.jobs.pending} title="Pending work"/><p className="reference-range">{t('Up to 10 rows shown. Open the work area for the complete list.')}</p></Panel>}
 </div>
}
