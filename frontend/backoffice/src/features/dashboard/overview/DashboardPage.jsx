import { useEffect, useState } from 'react'
import { api } from '../../../core/auth/api.js'
import { Button } from '../../../core/ui/Button.jsx'
import { RefreshButton } from '../../../core/ui/RefreshButton.jsx'
import { Dialog } from '../../../core/ui/Dialog.jsx'
import { DataTable } from '../../../core/ui/DataTable.jsx'
import './dashboard.css'

const dateLabel = value => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'))
const number = value => value.toLocaleString('en-GB')
export function AttentionWidget({ widget }) {
 return <article className="panel dashboard-attention"><span className="eyebrow">{widget.scope}</span><h3><a href={widget.href}>{widget.title}</a></h3><strong>{number(widget.pending)}</strong><p>Pending{widget.today != null && ` · ${number(widget.today)} today`}{widget.overdue != null && ` · ${number(widget.overdue)} overdue`}{widget.review != null && ` · ${number(widget.review)} awaiting acceptance`}</p><p className="field-help">{widget.detail}</p><a href={widget.href}>Open work area →</a></article>
}
export default function DashboardPage() {
 const [state, setState] = useState({ loading: true }), [attempt, setAttempt] = useState(0), [selected, setSelected] = useState(null)
 useEffect(() => {
  const controller = new AbortController()
  api('/api/dashboard', undefined, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ data }) }).catch(error => { if (!controller.signal.aborted) setState({ error: error.status === 403 ? 'Your access has changed. Refresh your account or contact your Manager.' : 'Unable to load your work. Check your connection and retry.' }) })
  return () => controller.abort()
 }, [attempt])
 function reload() { setSelected(null); setState({ loading: true }); setAttempt(n => n + 1) }
 const data = state.data
 return <div className="dashboard"><div className="page-heading"><div><span className="eyebrow">{data?.scope || 'YOUR WORKSPACE'}</span><h1 tabIndex="-1">Dashboard</h1><p>Your work, upcoming customers and items needing attention.</p></div><RefreshButton onClick={reload} disabled={state.loading}/></div>
 {state.loading ? <section className="panel dashboard-state" role="status">Loading your work…</section> : state.error ? <section className="panel dashboard-state" role="alert"><p>{state.error}</p><Button onClick={reload}>Retry</Button></section> : <>
 <p className="field-help">{dateLabel(data.today)} · Thailand time · Updated {new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: data.timezone }).format(new Date(data.generatedAt))}</p>
 {data.calendar && <section className="panel dashboard-calendar" aria-labelledby="customer-calendar-title"><h2 id="customer-calendar-title">Customers · next 14 days</h2><p>Confirmed and completed bookings, counted once on arrival. Return-only bookings use their return service date.</p><div className="dashboard-days">{data.calendar.map(day => <button type="button" key={day.date} className="dashboard-day" aria-label={`${dateLabel(day.date)}, ${number(day.pax)} guests, ${number(day.bookings)} bookings`} onClick={() => setSelected(day)}><time dateTime={day.date}>{dateLabel(day.date)}</time><strong>{number(day.pax)}</strong><span>guests</span><small>{number(day.bookings)} bookings</small></button>)}</div></section>}
 <section aria-labelledby="attention-title"><h2 id="attention-title">Work needing attention</h2><p>Counts follow each work area's permissions. Overdue uses a recorded due date or scheduled end time.</p>{data.widgets.length ? <div className="dashboard-widgets">{data.widgets.map(widget => <AttentionWidget key={widget.id} widget={widget}/>)}</div> : <section className="panel dashboard-state"><h3>No work areas available yet</h3><p>Your account has no supported work permissions. Contact your Manager to check your assignments.</p><a href="/profile">Open my profile →</a></section>}</section>
 </>}
 {selected && <Dialog title={dateLabel(selected.date)} onClose={() => setSelected(null)}><p>{number(selected.pax)} guests · {number(selected.bookings)} bookings</p><DataTable label="Guests by tour program" layout="content" columns={['Tour program', 'Bookings', 'Guests']} isEmpty={!selected.programs.length} empty={<p>No confirmed customers arriving on this date.</p>}>{selected.programs.map(program => <tr key={program.id}><td>{program.name}</td><td>{number(program.bookings)}</td><td>{number(program.pax)}</td></tr>)}</DataTable><div className="dialog-actions"><a href="/operations/bookings" onClick={() => setSelected(null)}>Open bookings →</a><Button onClick={() => setSelected(null)}>Close</Button></div></Dialog>}
 </div>
}
