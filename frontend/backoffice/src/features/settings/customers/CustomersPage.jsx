import {useEffect,useState} from 'react'
import {translateLabel as bilingualLabel} from '../../../core/i18n/runtime.js'
import {translate as t,useLocale} from '../../../core/i18n/locale.jsx'
import {api} from '../../../core/auth/api.js'
import {Button} from '../../../core/ui/Button.jsx'
import {DataTable} from '../../../core/ui/DataTable.jsx'
import {Pagination} from '../../../core/ui/Pagination.jsx'
import {Dropdown} from '../../../core/ui/Dropdown.jsx'
import {SearchField} from '../../../core/ui/SearchField.jsx'
import {RefreshButton} from '../../../core/ui/RefreshButton.jsx'
import CustomerEditor from './CustomerEditor.jsx'

export default function CustomersPage({readOnly=false}) {
 useLocale()
 const params=new URLSearchParams(window.location.search)
 const [query,setQuery]=useState(params.get('q')||''),[composing,setComposing]=useState(false)
 const [page,setPage]=useState(Math.max(1,Number(params.get('page'))||1)),[attempt,setAttempt]=useState(0)
 const [state,setState]=useState({loading:true,rows:[]}),[editor,setEditor]=useState(null),[notice,setNotice]=useState('')
 useEffect(()=>{
  if(composing)return
  const controller=new AbortController()
  const timer=setTimeout(()=>{
   window.history.replaceState(window.history.state,'','/settings/customers?'+new URLSearchParams({q:query,page}))
   setState({loading:true,rows:[]})
   api('/api/customers?'+new URLSearchParams({kind:'customers',q:query,page,view:'list'}),undefined,{signal:controller.signal})
    .then(result=>{if(!controller.signal.aborted)setState(result)})
    .catch(error=>{if(!controller.signal.aborted)setState({rows:[],error:error.detail||'Unable to load customers. Please retry.'})})
  },query?300:0)
  return()=>{clearTimeout(timer);controller.abort()}
 },[query,page,attempt,composing])
 return <><div className="page-heading"><div><h1 tabIndex={-1}>{bilingualLabel('Customers')}</h1><p>{t('Manage website customer profiles. Review booking requests in Booking → Customer requests.')}</p></div>{!readOnly&&<Button onClick={()=>setEditor({})}>{t('Add customer')}</Button>}</div>
  <section className="panel table-panel"><div className="filterbar"><SearchField label={bilingualLabel('Search customers')} value={query} onChange={value=>{setQuery(value);setPage(1)}} onCompositionChange={setComposing}/><RefreshButton onClick={()=>setAttempt(n=>n+1)}/></div>
   {notice&&<p role="status">{t(notice)}</p>}
   <DataTable label={bilingualLabel('Customers')} columns={['Customer','Email','Phone','Status','Actions']} busy={state.loading} error={state.error} onRetry={()=>setAttempt(n=>n+1)} isEmpty={!state.rows.length} empty="No matching customers.">
    {state.rows.map(row=><tr key={row.id}><td>{row.displayName}</td><td>{row.email||'—'}</td><td>{row.phone||'—'}</td><td>{t(row.status)}</td><td>{readOnly?t('View only'):<Dropdown rowActions label={'Actions for '+row.displayName} items={[{label:'Edit',icon:'edit',onSelect:()=>setEditor(row)}]}/>}</td></tr>)}
   </DataTable><Pagination page={state.page||page} pageSize={25} total={state.total} busy={state.loading} onPageChange={setPage}/>
  </section>{editor&&<CustomerEditor row={editor.id?editor:null} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setNotice('Customer saved.');setAttempt(n=>n+1)}}/>}
 </>
}
