import { countGuests, legName } from './boat-document-format.js'
import { DocumentHeader } from './DocumentCore.jsx'
import { formatDate } from '../../core/i18n/runtime.js'
import { compactGroupName } from '../../../../../packages/contracts/job-print.js'
const time = value => value ? formatDate(value,{hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Bangkok'},'en') : '?'
const roleLabels = {CAPTAIN:'Captain',HEAD_CAPTAIN:'Head Captain',ASSISTANT_CAPTAIN:'Asst. Captain',GUIDE:'Guide',HEAD_GUIDE:'Head Guide',ASSISTANT_TOUR_GUIDE:'Asst. Guide'}
function CrewTeam({runs, guide}) {
 const allowed = guide ? ['GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE'] : ['CAPTAIN','HEAD_CAPTAIN','ASSISTANT_CAPTAIN']
 const people = new Map()
 for (const run of runs) for (const member of run.staff.filter(p=>allowed.includes(p.role))) {
  const key = `${member.userId || member.name}:${member.role}`
  if (!people.has(key)) people.set(key,{...member,legs:[]})
  people.get(key).legs.push(`${legName(run.direction)} ${time(run.slot?.startsAt)}`)
 }
 return <section className={`compact-crew-team ${guide?'guide-team':'captain-team'}`}>
  <h3>{guide?'GUIDE TEAM':'CAPTAIN TEAM'}</h3>
  <dl>{[...people].map(([key,p])=><div key={key}><dt>{roleLabels[p.role]}</dt><dd><strong>{p.name}</strong><small>{[...new Set(p.legs)].join(' / ')}</small></dd></div>)}</dl>
  {!people.size&&<p>Not assigned</p>}
 </section>
}
export function BoatIntro({model, continued=false}) {
 const totals = leg => {const runs=model.runs.filter(r=>r.direction===leg);const n=countGuests(runs.flatMap(r=>r.assignments));return runs.length?n.adults+n.children:'—'}
 return <div className={`job-intro ${continued?'job-intro-continued':''}`}>
  <DocumentHeader title="JOB ORDER" code={model.code} date={model.date}/>
  {model.demo&&<p className="compact-demo">DEMO · Synthetic passenger records. Not for operational use.</p>}
  {continued?<p className="job-continuation-identity">{model.boat} · {model.date} · Continued</p>:<>
   <div className="compact-overview"><div><small>SERVICE DATE</small><strong>{model.date}</strong></div><div><small>BOAT</small><strong>{model.boat}</strong></div><div><small>OUTBOUND PAX</small><strong>{totals('OUTBOUND')}</strong></div><div><small>RETURN PAX</small><strong>{totals('RETURN')}</strong></div></div>
   <div className="compact-crew"><CrewTeam runs={model.runs}/><CrewTeam runs={model.runs} guide/></div>
  </>}
 </div>
}
function JourneyDates({booking}) {
 if (!booking.arrivalAt&&!booking.departureAt) return null
 const short = v => v ? formatDate(v,{day:'2-digit',month:'2-digit'},'en') : '?'
 const back = booking.returnStatus==='PENDING'?'?':booking.returnStatus==='OTHER'?'OTHER':booking.returnStatus==='NONE'?'-':short(booking.departureAt)
 return <small className="compact-date">{short(booking.arrivalAt)} → {back}</small>
}
export function BoatManifest({model, run, rows, final=true, continued=false}) {
 const totals=countGuests(run.assignments), recorded=run.assignments.filter(a=>a.actualAdults!=null&&a.actualChildren!=null)
 return <section className="compact-manifest" data-leg={run.direction}>
  <table className="compact-manifest-table"><colgroup>{[4,27,11,4,4,5,10,10,25].map((width,i)=><col key={i} style={{width:`${width}%`}}/>)}</colgroup>
   <thead><tr><th className="compact-leg-heading" colSpan="9"><span>{legName(run.direction).toUpperCase()} · {time(run.slot?.startsAt)}<b>{totals.adults+totals.children} PAX</b></span><small>{run.code} · Rev. {run.version}{continued?' · CONTINUED':''}</small></th></tr><tr>{['No.','Agent / Group','Prg.','A','C','Pax','Accom.','Meal','Remarks'].map(label=><th lang="en" key={label} scope="col">{label}</th>)}</tr></thead>
   <tbody>{rows.map(row=>{
    const b=row.booking, program=model.programs.find(p=>p.key===(b.programId||b.programName||'standalone'))
    return <tr key={row.printKey} data-row="true" data-continuation={row.continued||undefined} className="compact-booking-row">
     <td>{row.number}{row.continued&&<small>cont.</small>}</td>
     <td><strong className="compact-agent">{b.agentShortName||b.agentName||'Direct'}</strong><span className="compact-group" title={b.name} aria-label={b.name}>{compactGroupName(b.name)}</span></td>
     <td><strong className="compact-program" title={program?.name}>{program?.code||b.programName||'Standalone service'}</strong><JourneyDates booking={b}/></td>
     <td>{row.continued?'—':row.adults}</td><td>{row.continued?'—':row.children}</td><td className="compact-pax">{row.continued?'—':row.adults+row.children}</td>
     <td>{row.continued?'—':b.printServices?.accommodation||'?'}</td><td>{row.continued?'—':b.printServices?.meals||'?'}</td>
     <td className={`compact-remarks ${b.allergies||b.assistance?'has-care-note':''}`}><span>{row.remarks||'—'}</span>{row.continues&&<small>Instruction continues in the next row.</small>}</td>
    </tr>
   })}{!rows.length&&<tr data-row="true" className="compact-empty-row"><td colSpan="9">No assigned groups</td></tr>}
   </tbody>
   {final&&<tfoot><tr className="compact-total"><th colSpan="3">{legName(run.direction)} total</th><td>{totals.adults}</td><td>{totals.children}</td><td>{totals.adults+totals.children}</td><td colSpan="3">Crew {run.staff.length} · On board {totals.adults+totals.children+run.staff.length}</td></tr></tfoot>}
  </table>
  {final&&recorded.length>0&&<p className="compact-actual">Actual recorded: {recorded.reduce((n,a)=>n+a.actualAdults+a.actualChildren,0)} pax · {recorded.length}/{run.assignments.length} groups. Other groups are not yet recorded.</p>}
 </section>
}
export function BoatSignoff({printedAt}) {
 return <div className="compact-signoff"><span>Prepared by __________________</span><span>Checked by __________________</span><small>Printed {formatDate(printedAt,{dateStyle:'short',timeStyle:'short'},'en')} (TH)</small></div>
}
