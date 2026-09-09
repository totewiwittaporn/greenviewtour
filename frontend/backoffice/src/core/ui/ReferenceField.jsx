import { useEffect, useState } from 'react'
import { SearchField } from './SearchField.jsx'
import { SelectField } from './SelectField.jsx'
import { Button } from './Button.jsx'
// Caller owns domain requests. Core owns bounded lookup, cancellation and selection UI.
export function ReferenceField({ label, value, selectedLabel, onChange, error, load, disabled }) {
 const [query,setQuery]=useState(''),[composing,setComposing]=useState(false),[page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[state,setState]=useState({loading:true,rows:[]})
 useEffect(()=>{
  if(composing)return
  const controller=new AbortController()
  const timer=setTimeout(()=>{
   setState(s=>({...s,loading:true,error:false}))
   load({q:query,page,signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({...data,loading:false})}).catch(()=>{if(!controller.signal.aborted)setState({rows:[],error:true,loading:false})})
  },query?300:0)
  return()=>{clearTimeout(timer);controller.abort()}
 },[query,page,attempt,composing,load])
 const options=state.rows.some(row=>row.id===value)||!value?state.rows:[{id:value,name:selectedLabel||'Selected record'},...state.rows]
 return <div className="reference-field"><SearchField label={`Search ${label.toLowerCase()}`} placeholder="Search by name or code…" value={query} onChange={q=>{setQuery(q);setPage(1)}} onCompositionChange={setComposing}/>
 <SelectField label={label} value={value} onChange={event=>onChange(event,options.find(row=>row.id===event.target.value))} error={error} disabled={disabled||state.loading} hint={state.loading?'Loading options…':state.error?'Unable to load options. Retry below.':`${state.total||0} available records`}><option value="">Select a record</option>{options.map(row=><option key={row.id} value={row.id}>{row.code?`${row.code} · `:''}{row.name}</option>)}</SelectField>
 {state.error?<Button onClick={()=>setAttempt(n=>n+1)}>Retry options</Button>:<div className="catalog-paging"><Button aria-label={`Previous ${label} options`} disabled={disabled||state.loading||page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button><span>Page {state.page||1} of {state.pages||1}</span><Button aria-label={`Next ${label} options`} disabled={disabled||state.loading||page>=(state.pages||1)} onClick={()=>setPage(p=>p+1)}>Next</Button></div>}</div>
}
