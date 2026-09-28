import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import {useEffect,useState} from 'react'
import {SearchField} from './SearchField.jsx'
import {SelectField} from './SelectField.jsx'
import {Button} from './Button.jsx'
// Domain callers own filters/authorization. Core owns on-demand loading,
// cancellation, selected labels and pagination; it never caches across accounts.
export function ReferenceField({label,value,selectedLabel,onChange,error,load,disabled}){
 const {t}=useLocale()
 const [activated,setActivated]=useState(Boolean(value&&!selectedLabel))
 const [query,setQuery]=useState(''),[composing,setComposing]=useState(false)
 const [page,setPage]=useState(1),[attempt,setAttempt]=useState(0)
 const [response,setResponse]=useState({rows:[]}),[chosen,setChosen]=useState(null)
 const key=JSON.stringify([query,page,attempt])
 const current=response.key===key&&response.load===load
 const state=current?response:{rows:[],loading:activated}
 const loading=activated&&(composing||!current||state.loading)
 useEffect(()=>{
  if(composing||disabled||!activated)return
  const controller=new AbortController()
  setResponse({rows:[],key,load,loading:true})
  const timer=setTimeout(()=>{
   const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])
   load({q:query,page,signal}).then(data=>{
    if(!Array.isArray(data.rows))throw new Error('INVALID_LOOKUP_RESPONSE')
    if(!controller.signal.aborted)setResponse({...data,key,load,loading:false})
   }).catch(()=>{if(!controller.signal.aborted)setResponse({rows:[],key,load,error:true,loading:false})})
  },query?300:0)
  return()=>{clearTimeout(timer);controller.abort()}
 },[query,page,attempt,composing,load,activated,disabled,key])
 const retained=chosen?.id===value?chosen:{id:value,name:selectedLabel||t('Selected record')}
 const options=state.rows.some(row=>row.id===value)||!value?state.rows:[retained,...state.rows]
 const known=Number.isInteger(state.total)&&state.total>=0
 const pages=Number.isInteger(state.pages)&&state.pages>0?state.pages:known?Math.max(1,Math.ceil(state.total/(state.pageSize||25))):null
 const currentPage=state.page||page
 const hint=!activated?'Open to load options.':loading?'Loading options…':state.error?'Unable to load options. Retry below.':t('{count} available records',{count:state.total||0})
 function choose(event){
  if(disabled||loading)return
  const row=options.find(row=>row.id===event.target.value)
  setChosen(row||null);onChange(event,row)
 }
 return <div className="reference-field" onFocusCapture={event=>{if(!disabled&&event.target.tagName==='INPUT')setActivated(true)}}>
  <SearchField label={bilingualLabel('Search {label}',{label:bilingualLabel(label)})} placeholder="Search by name or code…" value={query} disabled={disabled} onChange={q=>{setActivated(true);setQuery(q);setPage(1)}} onCompositionChange={setComposing}/>
  <SelectField label={label} value={value} onOpenChange={open=>{if(open)setActivated(true)}} onChange={choose} error={error} disabled={disabled} hint={hint}>
   <option value="" disabled={loading}>{t(loading?'Loading options…':'Select a record')}</option>
   {options.map(row=><option key={row.id} value={row.id} disabled={loading}>{row.code?`${row.code} · `:''}{row.name}</option>)}
  </SelectField>
  {state.error?<Button disabled={disabled} onClick={()=>setAttempt(n=>n+1)}>{t('Retry options')}</Button>:<div className="catalog-paging">
   <Button aria-label={t('Previous {label} options',{label:t(label)})} disabled={disabled||loading||!known||currentPage<=1} onClick={()=>setPage(currentPage-1)}>{t('Previous')}</Button>
   <span>{t('Page {page} of {pages}',{page:known?currentPage:1,pages:pages||1})}</span>
   <Button aria-label={t('Next {label} options',{label:t(label)})} disabled={disabled||loading||!known||currentPage>=pages} onClick={()=>setPage(currentPage+1)}>{t('Next')}</Button>
  </div>}
 </div>
}
