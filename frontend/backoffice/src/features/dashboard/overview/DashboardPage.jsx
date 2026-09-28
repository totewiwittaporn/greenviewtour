import {translateLabel as bilingualLabel, formatDate as displayDate, formatNumber} from '../../../core/i18n/runtime.js'
import {translate as t, useLocale} from '../../../core/i18n/locale.jsx'
import {useEffect, useState} from 'react'
import {api} from '../../../core/auth/api.js'
import {Button} from '../../../core/ui/Button.jsx'
import {RefreshButton} from '../../../core/ui/RefreshButton.jsx'
import {Dialog} from '../../../core/ui/Dialog.jsx'
import {DataTable} from '../../../core/ui/DataTable.jsx'
import './dashboard.css'
import {RoleDashboard} from './RoleDashboard.jsx'
import {BookingDashboard} from './BookingDashboard.jsx'
import {dashboardPersona} from '../../../core/ui/dashboardPersona.js'
import {DashboardHero, ManagementDashboard, ProgrammerDashboard} from './ReferenceDashboard.jsx'

const dateLabel = value => displayDate(new Date(value + 'T00:00:00Z'), {weekday:'short', day:'numeric', month:'short', timeZone:'UTC'})
const number = value => formatNumber(value, {})
export default function DashboardPage({user}) {
 useLocale()
 const persona=dashboardPersona(user)
 const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0),[selected,setSelected]=useState(null)
 useEffect(()=>{
  if(!persona)return
  const controller=new AbortController(), started=performance.now()
  const timer=setTimeout(()=>api('/api/dashboard',undefined,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({data,requestDuration:Math.round(performance.now()-started)})}).catch(error=>{if(!controller.signal.aborted)setState({error:error.status===403?'Your access has changed. Refresh your account or contact your Manager.':'Unable to load your work. Check your connection and retry.'})}),0)
  return()=>{clearTimeout(timer);controller.abort()}
 },[attempt,persona])
 function reload(){setSelected(null);setState({loading:true});setAttempt(value=>value+1)}
 const data=state.data
 const title='Dashboard'
 return <div className={`dashboard${persona?' dashboard-reference':''}`}>{persona?<DashboardHero persona={persona} data={data} refresh={<RefreshButton onClick={reload} disabled={state.loading}/>}/>:<div className="page-heading dashboard-heading"><h1 tabIndex="-1">{bilingualLabel(title)}</h1></div>}
 {!persona?<section className="panel dashboard-state dashboard-coming-soon"><h2>{bilingualLabel('Your new dashboard is being prepared')}</h2><p>{t('The previous dashboard has been removed. Use the navigation to open your work areas while your role’s new dashboard is being designed.')}</p></section>:state.loading?<section className="panel dashboard-state" role="status">{t('Loading your work…')}</section>:state.error?<section className="panel dashboard-state" role="alert"><p>{t(state.error)}</p><Button onClick={reload}>{t('Retry')}</Button></section>:<>
 {persona==='programmer'&&<ProgrammerDashboard data={data} requestDuration={state.requestDuration}/>}
 {persona==='gm'&&<ManagementDashboard data={data} onSelect={setSelected}/>}
 {persona.startsWith('booking-')&&<BookingDashboard data={data} persona={persona} onSelect={setSelected}/>}
 {!['programmer','gm'].includes(persona)&&!persona.startsWith('booking-')&&<RoleDashboard data={data} persona={persona}/>}

 </>}
 {selected&&(persona==='gm'||persona?.startsWith('booking-'))&&<Dialog title={dateLabel(selected.date)} onClose={()=>setSelected(null)}><p>{number(selected.pax)} {t('guests ·')} {number(selected.bookings)} {t('bookings')}</p><DataTable label={bilingualLabel('Guests by tour program')} layout="content" columns={['Tour program','Bookings','Guests']} isEmpty={!selected.programs.length} empty={<p>{t('No confirmed customers arriving on this date.')}</p>}>{selected.programs.map(program=><tr key={program.id}><td>{program.id==='standalone'?t('Standalone services'):program.name}</td><td>{number(program.bookings)}</td><td>{number(program.pax)}</td></tr>)}</DataTable><div className="dialog-actions"><a href="/operations/bookings" onClick={()=>setSelected(null)}>{t('Open bookings →')}</a><Button onClick={()=>setSelected(null)}>{t('Close')}</Button></div></Dialog>}
 </div>
}
