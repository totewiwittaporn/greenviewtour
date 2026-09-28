import {useState} from 'react'
import {useLocale} from '../../../core/i18n/locale.jsx'
import {formatNumber} from '../../../core/i18n/runtime.js'
import {DataTable} from '../../../core/ui/DataTable.jsx'
import {SelectField} from '../../../core/ui/SelectField.jsx'
const colors=['#0781ec','#16826f','#d17b18','#8159ad','#c04655','#497083']
const money=value=>value==null?'—':formatNumber(value/100,{style:'currency',currency:'THB'})
function CashPie({title,values}){
 const {t}=useLocale(),entries=Object.entries(values).filter(([,value])=>value>0),total=entries.reduce((n,[,v])=>n+v,0)
 let at=0;const stops=entries.map(([,v],i)=>{const start=at;at+=100*v/total;return `${colors[i%colors.length]} ${start}% ${at}%`})
 return <section className="panel reference-panel"><div className="reference-panel-heading"><h2>{t(title)}</h2></div><div className="reference-expense-empty"><div className="reference-ring" role="img" aria-label={`${t(title)} ${money(total)}`} style={{background:total?`conic-gradient(${stops.join(',')})`:'var(--reference-line)'}}><strong style={{background:'white',borderRadius:'50%',padding:12}}>{money(total)}</strong></div></div><DataTable columns={['Category','Amount']} isEmpty={!entries.length} empty={<p>{t('No recorded cash movements in this period.')}</p>}>{entries.map(([category,value],index)=><tr key={category}><td><span aria-hidden="true" style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:colors[index%colors.length],marginRight:8}}/>{t(category)}</td><td>{money(value)}</td></tr>)}</DataTable></section>
}
export default function CashOverview({data}){
 const {t}=useLocale(),[timing,setTiming]=useState('NEXT_30_DAYS')
 if(!data)return <p>{t('Cash summary is unavailable for your permissions.')}</p>
 const rows=data.forecast.rows.filter(row=>row.timing===timing)
 return <><p className="reference-range">{t('Actual cash movements')}: {data.actual.from} – {data.actual.through} · {t('Agent money held is separate from Greenview receipts.')}</p><div className="reference-main-grid"><CashPie title="Actual money received" values={data.actual.incoming}/><CashPie title="Actual money paid" values={data.actual.outgoing}/></div><section className="panel reference-panel"><div className="reference-panel-heading"><h2>{t('Cash forecast · next 30 days')}</h2></div><p className="reference-range">{data.forecast.from} – {data.forecast.through} · {t('Expected receipts')}: {money(data.forecast.incomingCents)} · {t('Approved planned payments')}: {money(data.forecast.approvedOutgoingCents)}</p><p className="reference-range">{t('Forecast is not a cash balance or profit. Submitted expenses are awaiting approval. Unknown dates and overdue items remain separate.')}</p>{!data.payrollIncluded&&<p className="reference-range">{t('Confidential payroll is excluded under your current permissions.')}</p>}<div className="filterbar"><SelectField label="Payment timing" value={timing} onChange={e=>setTiming(e.target.value)}>{['NEXT_30_DAYS','OVERDUE','UNSCHEDULED','LATER'].map(value=><option value={value} key={value}>{t(value)}</option>)}</SelectField></div><DataTable columns={['Date','Document','Direction','Category','Status','Amount']} isEmpty={!rows.length} empty={<p>{t('No forecast items in this period.')}</p>}>{rows.map(row=><tr key={`${row.category}-${row.id}`}><td>{row.date||'—'}</td><td><a href={row.href}>{row.title}</a></td><td>{t(row.direction)}</td><td>{t(row.category)}</td><td>{t(row.status)}</td><td>{money(row.amountCents)}</td></tr>)}</DataTable></section></>
}
