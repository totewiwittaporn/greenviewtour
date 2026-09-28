import { documentDay, documentDateCode } from './boat-document-format.js'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../../core/i18n/locale.jsx'
import { documentRows, manifestPrograms } from '../../../../../packages/contracts/job-print.js'
import { paginateJobRuns } from '../../../../../packages/contracts/job-pagination.js'
import { BoatIntro, BoatManifest, BoatSignoff } from './BoatDocumentParts.jsx'
import './compact-job.css'
function createModel(runs) {
 const active=runs.filter(r=>r.status!=='CANCELLED').map(r=>({...r,assignments:r.assignments.filter(a=>a.status!=='CANCELLED'&&['CONFIRMED','COMPLETED'].includes(a.booking.status))})).sort((a,b)=>a.direction===b.direction?String(a.slot?.startsAt).localeCompare(String(b.slot?.startsAt)):a.direction==='OUTBOUND'?-1:1)
 if (!active.length) return null
 const first=active[0], date=documentDay(first.slot?.startsAt)
 return { runs:active, rows:active.map(r=>documentRows(r.assignments)), programs:manifestPrograms(active), date,
  boat:first.slot?.vehicle?.name||first.name,
  code:`BOAT-${first.slot?.vehicle?.id?.slice(0,8)||first.code}-${documentDateCode(first.slot?.startsAt)}`,
  demo:active.some(r=>r.assignments.some(a=>a.booking.demoDataset==='greenview-demo45-20260925')),
 }
}
export function CompactBoatSheet({runs}) {
 const {locale,t}=useLocale(), measure=useRef(null), model=useMemo(()=>createModel(runs),[runs])
 const [layout,setLayout]=useState(null),[attempt,setAttempt]=useState(0),[printedAt]=useState(()=>new Date())
 const ready=layout?.model===model&&layout.locale===locale&&layout.attempt===attempt
 useLayoutEffect(()=>{
  if (!model) return
  let cancelled=false
  const prepare=async()=>{
   try {
    await document.fonts.ready
    await Promise.all([...measure.current.querySelectorAll('img')].map(img=>img.decode()))
    if (cancelled) return
    const root=measure.current, scale=root.getBoundingClientRect().width/parseFloat(getComputedStyle(root).width), natural=el=>el.getBoundingClientRect().height/scale, height=selector=>natural(root.querySelector(selector))
    const blocks=[...root.querySelectorAll('.compact-manifest')].map(el=>({
     head:natural(el.querySelector('thead'))+10,
     foot:natural(el.querySelector('tfoot'))+(el.querySelector('.compact-actual')?natural(el.querySelector('.compact-actual'))+4:0),
     rows:[...el.querySelectorAll('[data-row]')].map(row=>natural(row)),
    }))
    const pages=paginateJobRuns(blocks,{pageHeight:height('.job-height-probe')-8,firstHeader:height('.measure-first'),nextHeader:height('.measure-next'),tail:height('.compact-signoff')+12,maxRows:20})
    if (!cancelled) setLayout({model,locale,attempt,pages})
   } catch(error) { if (!cancelled) setLayout({model,locale,attempt,error:error.message}) }
  }
  prepare()
  return ()=>{cancelled=true}
 },[model,locale,attempt])
 if (!model) return <p>{t('No active boat runs for this document.')}</p>
 return <section className="job-sheet compact-boat-sheet" data-document-pending={!ready||undefined} data-document-error={ready&&layout.error?layout.error:undefined}>
  <div className="job-measure" ref={measure} aria-hidden="true" inert>
   <div className="job-height-probe"/>
   <div className="measure-first"><BoatIntro model={model}/></div>
   <div className="measure-next"><BoatIntro model={model} continued/></div>
   {model.runs.map((run,i)=><BoatManifest key={run.id} model={model} run={run} rows={model.rows[i]}/>)}
   <BoatSignoff printedAt={printedAt}/>
  </div>
  {!ready&&<p className="job-preparing" role="status">{t('Preparing document pages…')}</p>}
  {ready&&layout.error&&<div role="alert" className="job-layout-error"><p>{t('The document could not be paginated safely. Retry or review unusually long records before printing.')}</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>{t('Retry')}</button></div>}
  {ready&&!layout.error&&<div className="job-pages" data-page-count={layout.pages.length}>
   {layout.pages.map((page,i)=><article className="job-page" key={i} aria-label={`${t('Page')} ${i+1} / ${layout.pages.length}`}>
    <div className="job-page-body">
     <BoatIntro model={model} continued={i>0}/>
     {page.parts.map(part=><BoatManifest key={`${part.run}:${part.start}`} model={model} run={model.runs[part.run]} rows={model.rows[part.run].slice(part.start,part.end)} final={part.final} continued={part.start>0}/>)}
     {i===layout.pages.length-1&&<BoatSignoff printedAt={printedAt}/>}
    </div>
    <footer className="job-page-footer"><span>Page {i+1} / {layout.pages.length}</span><span>{model.code}</span></footer>
   </article>)}
  </div>}
 </section>
}
