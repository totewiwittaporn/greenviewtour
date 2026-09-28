import {Fragment,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
import {jobCodeGuide} from '../../../../../packages/contracts/job-code-guide.js'
import {manifestPrograms} from '../../../../../packages/contracts/job-print.js'
export function JobOrderCodes({runs}) {
 const {locale,t}=useLocale(),[open,setOpen]=useState(false)
 const programs=manifestPrograms(runs.filter(r=>r.status!=='CANCELLED'))
 return <><Button onClick={()=>setOpen(true)}>Codes</Button>{open&&<Dialog title={t('Job Order codes')} onClose={()=>setOpen(false)}>
  <div className="job-code-guide">
   <p>{t('Reference only. These explanations are not printed on each Job Order.')}</p>
   <section><h3>{t('Programs in this document')}</h3><dl>{programs.map(p=><Fragment key={p.key}><dt>{p.code===p.name?'—':p.code}</dt><dd>{p.name}</dd></Fragment>)}</dl></section>
   {jobCodeGuide.map(g=><section key={g.en}><h3>{locale==='th'?`${g.th} / ${g.en}`:g.en}</h3><dl>{g.rows.map(([code,en,th])=><Fragment key={code}><dt>{code}</dt><dd>{locale==='th'?th:en}</dd></Fragment>)}</dl></section>)}
   <a href="/manuals">{t('User guides')}</a>
  </div>
 </Dialog>}</>
}
