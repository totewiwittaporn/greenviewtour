import { formatDate as displayDate, formatNumber } from '../../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../../core/i18n/locale.jsx'
import { useEffect, useState } from 'react'
import { api } from '../../../core/auth/api.js'
import { Button } from '../../../core/ui/Button.jsx'
import { RefreshButton } from '../../../core/ui/RefreshButton.jsx'
import { Dialog } from '../../../core/ui/Dialog.jsx'
import { DataTable } from '../../../core/ui/DataTable.jsx'
import './dashboard.css'

const dateLabel = value => displayDate(new Date(value + 'T00:00:00Z'), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const number = value => formatNumber(value, {})
export function AttentionWidget({ widget }) {
 useLocale();
 return <article className="panel dashboard-attention"><span className="eyebrow">{t(widget.scope)}</span><h3><a href={widget.href}>{t(widget.title)}</a></h3><strong>{number(widget.pending)}</strong><p>{t("Pending")}{widget.today != null && ` · ${t('{count} today', {count: number(widget.today)})}`}{widget.overdue != null && ` · ${t('{count} overdue', {count: number(widget.overdue)})}`}{widget.review != null && ` · ${t('{count} awaiting acceptance', {count: number(widget.review)})}`}</p><p className="field-help">{t(widget.detail)}</p><a href={widget.href}>{t("Open work area →")}</a></article>
}
export default function DashboardPage() {
 useLocale();
 const [state, setState] = useState({ loading: true }), [attempt, setAttempt] = useState(0), [selected, setSelected] = useState(null)
 useEffect(() => {
  const controller = new AbortController()
  api('/api/dashboard', undefined, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ data }) }).catch(error => { if (!controller.signal.aborted) setState({ error: error.status === 403 ? 'Your access has changed. Refresh your account or contact your Manager.' : 'Unable to load your work. Check your connection and retry.' }) })
  return () => controller.abort()
 }, [attempt])
 function reload() { setSelected(null); setState({ loading: true }); setAttempt(n => n + 1) }
 const data = state.data
 return <div className="dashboard"><div className="page-heading"><div><span className="eyebrow">{t(data?.scope || 'YOUR WORKSPACE')}</span><h1 tabIndex="-1">{t("Dashboard")}</h1><p>{t("Your work, upcoming customers and items needing attention.")}</p></div><RefreshButton onClick={reload} disabled={state.loading}/></div>
 {state.loading ? <section className="panel dashboard-state" role="status">{t("Loading your work…")}</section> : state.error ? <section className="panel dashboard-state" role="alert"><p>{t(state.error)}</p><Button onClick={reload}>{t("Retry")}</Button></section> : <>
 <p className="field-help">{dateLabel(data.today)}{' '}{t("· Thailand time · Updated")}{' '}{displayDate(new Date(data.generatedAt), { hour: '2-digit', minute: '2-digit', timeZone: data.timezone })}</p>
 {data.calendar && <section className="panel dashboard-calendar" aria-labelledby="customer-calendar-title"><h2 id="customer-calendar-title">{t("Customers · next 14 days")}</h2><p>{t("Confirmed and completed bookings, counted once on arrival. Return-only bookings use their return service date.")}</p><div className="dashboard-days">{data.calendar.map(day => <button type="button" key={day.date} className="dashboard-day" aria-label={t("{value0}, {value1} guests, {value2} bookings", {value0: dateLabel(day.date), value1: number(day.pax), value2: number(day.bookings)})} onClick={() => setSelected(day)}><time dateTime={day.date}>{dateLabel(day.date)}</time><strong>{number(day.pax)}</strong><span>{t("guests")}</span><small>{number(day.bookings)}{' '}{t("bookings")}</small></button>)}</div></section>}
 <section aria-labelledby="attention-title"><h2 id="attention-title">{t("Work needing attention")}</h2><p>{t("Counts follow each work area's permissions. Overdue uses a recorded due date or scheduled end time.")}</p>{data.widgets.length ? <div className="dashboard-widgets">{data.widgets.map(widget => <AttentionWidget key={widget.id} widget={widget}/>)}</div> : <section className="panel dashboard-state"><h3>{t("No work areas available yet")}</h3><p>{t("Your account has no supported work permissions. Contact your Manager to check your assignments.")}</p><a href="/profile">{t("Open my profile →")}</a></section>}</section>
 </>}
 {selected && <Dialog title={dateLabel(selected.date)} onClose={() => setSelected(null)}><p>{number(selected.pax)}{' '}{t("guests ·")}{' '}{number(selected.bookings)}{' '}{t("bookings")}</p><DataTable label={t("Guests by tour program")} layout="content" columns={['Tour program', 'Bookings', 'Guests']} isEmpty={!selected.programs.length} empty={<p>{t("No confirmed customers arriving on this date.")}</p>}>{selected.programs.map(program => <tr key={program.id}><td>{program.id === 'standalone' ? t('Standalone services') : program.name}</td><td>{number(program.bookings)}</td><td>{number(program.pax)}</td></tr>)}</DataTable><div className="dialog-actions"><a href="/operations/bookings" onClick={() => setSelected(null)}>{t("Open bookings →")}</a><Button onClick={() => setSelected(null)}>{t("Close")}</Button></div></Dialog>}
 </div>
}
