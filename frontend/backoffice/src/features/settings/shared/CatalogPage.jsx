import { useCallback, useEffect, useRef, useState } from 'react'
import { catalog, initialValues, labelFor, validateCatalog, visibleField } from '../../../../../../packages/contracts/catalog.js'
import { api } from '../../../core/auth/api.js'
import { Button } from '../../../core/ui/Button.jsx'
import { DataTable } from '../../../core/ui/DataTable.jsx'
import { Dialog } from '../../../core/ui/Dialog.jsx'
import { Dropdown } from '../../../core/ui/Dropdown.jsx'
import { FormField } from '../../../core/ui/FormField.jsx'
import { SelectField } from '../../../core/ui/SelectField.jsx'
import { TextAreaField } from '../../../core/ui/TextAreaField.jsx'
import { SearchField } from '../../../core/ui/SearchField.jsx'
import { ReferenceField } from '../../../core/ui/ReferenceField.jsx'
const messages={SETTINGS_CONFLICT:'This record changed. Close this form and refresh the list before editing again.',SETTINGS_DUPLICATE:'This code or agent–tour price already exists. Edit the existing record.',RELATED_RECORD_UNAVAILABLE:'A selected partner or tour is no longer active or has a different role. Choose an available record.',PARTNER_IN_USE:'This partner is used by active tours, prices or vehicles. Update those records before removing its role or deactivating it.',TOUR_IN_USE:'Deactivate this tour’s agent prices before deactivating the tour.',PERMISSION_DENIED:'Your account cannot manage company settings.',INVALID_SETTINGS:'Check the fields and try again.'}
const message=error=>messages[error.message]||'Unable to save or load right now. Check your connection and retry. Your entries are still here.'
const money=value=>value===null||value===undefined||value===''?'Not set':new Intl.NumberFormat('en-GB',{style:'currency',currency:'THB'}).format(Number(value))
function Related({field,value,label,onChange,error,disabled}){
 const load=useCallback(({q,page,signal})=>api(`/api/settings/${field.entity}?${new URLSearchParams({q,page:String(page),status:'ACTIVE',...(field.role?{role:field.role}:{})})}`,undefined,{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])}),[field.entity,field.role])
 return <ReferenceField label={field.label} value={value} selectedLabel={label} onChange={onChange} error={error} load={load} disabled={disabled}/>
}
function Editor({entity,row,onClose,onSaved,readOnly=false}){
 const definition=catalog[entity], [values,setValues]=useState(()=>initialValues(entity,row)),[errors,setErrors]=useState({}),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[discard,setDiscard]=useState(false),[confirm,setConfirm]=useState(false)
 const form=useRef(null),id=useRef(row?.id||crypto.randomUUID()),pending=useRef(false),base=useRef(JSON.stringify(initialValues(entity,row)))
 const dirty=JSON.stringify(values)!==base.current
 useEffect(()=>{if(!dirty||readOnly)return;const leave=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave)},[dirty,readOnly])
 const close=()=>{if(busy)return;if(dirty&&!readOnly)setDiscard(true);else onClose()}
 const update=(key,value)=>{setValues(v=>({...v,[key]:value}));setErrors(e=>({...e,[key]:undefined}));setNotice('');setConfirm(false)}
 async function save(event){
  event.preventDefault();if(pending.current)return
  const checked=validateCatalog(entity,values);setErrors(checked.errors)
  if(Object.keys(checked.errors).length){setTimeout(()=>form.current?.querySelector('[aria-invalid="true"], .field-error input')?.focus(),0);return}
  const sensitive=row&&(row.status!==values.status||entity==='partners'&&row.roles.some(role=>!values.roles.includes(role)))
  if(sensitive&&!confirm){setConfirm(true);return}
  pending.current=true;setBusy(true);setNotice('')
  try{await api(`/api/settings/${entity}`,{...values,id:id.current,version:row?.version||0});onSaved()}
  catch(error){setNotice(message(error))}finally{pending.current=false;setBusy(false)}
 }
 return <Dialog title={`${readOnly?'View':row?'Edit':'Add'} ${definition.singular}`} onClose={close} busy={busy}>
 {discard?<section><p>Discard your unsaved changes?</p><div className="dialog-actions"><Button autoFocus onClick={()=>setDiscard(false)}>Keep editing</Button><Button onClick={onClose}>Discard changes</Button></div></section>:readOnly?<dl className="catalog-details">{definition.fields.filter(f=>visibleField(f,values)).map(f=><div key={f.key}><dt>{f.label}</dt><dd>{f.type==='money'?money(row[f.key]):f.type==='roles'?values[f.key].map(labelFor).join(', '):f.type==='select'?labelFor(values[f.key]):f.type==='reference'?(row[f.key==='agentId'?'agent':f.key==='tourId'?'tour':f.key==='operatorId'?'operator':'provider']?.name||'Not set'):values[f.key]||'Not set'}</dd></div>)}</dl>:<form ref={form} noValidate onSubmit={save}>
 {entity==='rates'&&<p>Prices charged by Greenview to this agent, per passenger. These do not change direct customer prices. Leave an unavailable passenger price empty.</p>}
 {entity==='tours'&&<p>Prices are per passenger in THB. Empty means not set; zero is an explicit free price. Booking and Public publishing are configured separately.</p>}
 {definition.fields.filter(f=>visibleField(f,values)).map(field=>{
 const props={label:field.label,value:values[field.key],onChange:e=>update(field.key,e.target.value),error:errors[field.key],disabled:busy}
 if(field.type==='select')return <SelectField key={field.key} {...props}>{field.options.map(option=><option key={option} value={option}>{labelFor(option)}</option>)}</SelectField>
 if(field.type==='reference')return <Related key={field.key} field={field} value={values[field.key]} label={row?.[field.key==='agentId'?'agent':field.key==='tourId'?'tour':field.key==='operatorId'?'operator':'provider']?.name} onChange={props.onChange} error={props.error} disabled={busy}/>
 if(field.type==='roles')return <fieldset key={field.key} className="catalog-roles" aria-describedby="partner-role-error"><legend>{field.label}</legend>{field.options.map(role=><label key={role}><input type="checkbox" disabled={busy} checked={values.roles.includes(role)} aria-invalid={Boolean(errors.roles)} onChange={e=>update('roles',e.target.checked?[...values.roles,role]:values.roles.filter(item=>item!==role))}/>{labelFor(role)}</label>)}<span id="partner-role-error" className="field-error">{errors.roles}</span></fieldset>
 if(field.max>500)return <TextAreaField key={field.key} {...props} maxLength={field.max}/>
 return <FormField key={field.key} {...props} maxLength={field.max||30} inputMode={['money','integer'].includes(field.type)?'decimal':undefined} required={field.required}/>
 })}
 {notice&&<p role="alert">{notice}</p>}{confirm&&<p role="alert">This changes availability or partner roles. Existing references will be checked before saving. Confirm to continue.</p>}
 <div className="dialog-actions"><Button type="submit" busy={busy} disabled={busy}>{confirm?'Confirm changes':'Save changes'}</Button></div><span className="sr-only" role="status">{busy?'Saving changes…':''}</span>
 </form>}
 </Dialog>
}
export default function CatalogPage({entity}){
 const definition=catalog[entity],params=new URLSearchParams(window.location.search)
 const [query,setQuery]=useState(params.get('q')||''),[composing,setComposing]=useState(false),[page,setPage]=useState(Math.max(1,Number(params.get('page'))||1)),[status,setStatus]=useState(params.get('status')||''),[attempt,setAttempt]=useState(0),[state,setState]=useState({loading:true,rows:[]}),[editor,setEditor]=useState(null),[notice,setNotice]=useState('')
 useEffect(()=>{
  if(composing)return
  const controller=new AbortController(),timer=setTimeout(()=>{
   const p=new URLSearchParams({q:query,page:String(page),status});window.history.replaceState(null,'',`${window.location.pathname}?${p}`)
   setState(s=>({...s,loading:true,error:null}))
   api(`/api/settings/${entity}?${p}`,undefined,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(data=>{if(!controller.signal.aborted){setState({...data,loading:false});if(data.page!==page)setPage(data.page)}}).catch(error=>{if(!controller.signal.aborted)setState({rows:[],error:message(error),loading:false})})
  },query?300:0)
  return()=>{controller.abort();clearTimeout(timer)}
 },[entity,query,page,status,attempt,composing])
 const isRates=entity==='rates',columns=isRates?['Agent / Tour','Adult price','Child price','Status','Actions']:['Name / Code',entity==='partners'?'Roles':entity==='tours'?'Organizer':entity==='vehicles'?'Type / Capacity':entity==='locations'?'Type / Zone':entity==='channels'?'Source type':'Contact','Status','Actions']
 function detail(row){return entity==='channels'?labelFor(row.kind):entity==='partners'?row.roles.map(labelFor).join(' · '):entity==='tours'?(row.operator?.name||'Greenview Tour'):entity==='vehicles'?`${labelFor(row.kind)} · ${row.capacity} passengers`:entity==='locations'?`${labelFor(row.kind)}${row.zone?` · ${row.zone}`:''}`:row.email||row.phone||'Not set'}
 return <><div className="page-heading"><div><span className="eyebrow">COMPANY SETTINGS</span><h1>{definition.title}</h1><p>{entity==='rates'?'Set a separate price for each agent and tour program.':'Manage the information your team uses for tour bookings.'}</p></div><Button disabled={state.loading||Boolean(state.error)||(entity==='company'&&state.rows.length>0)} onClick={()=>setEditor({})}>+ Add {definition.singular}</Button></div>
 <section className="panel"><div className="catalog-toolbar">{entity!=='company'&&<><SearchField label={`Search ${definition.title.toLowerCase()}`} placeholder={isRates?'Search agent or tour…':'Search by name or code…'} value={query} onChange={q=>{setQuery(q);setPage(1)}} onCompositionChange={setComposing}/><SelectField label="Status filter" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></SelectField></>}<Button disabled={state.loading} onClick={()=>setAttempt(n=>n+1)}>Refresh</Button></div>
 {notice&&<p className="catalog-notice" role="status">{notice}</p>}
 <DataTable columns={columns} busy={state.loading} label={`${definition.title} table`}>
 {state.loading?<tr><td colSpan={columns.length}><p role="status">Loading {definition.title.toLowerCase()}…</p></td></tr>:state.error?<tr><td colSpan={columns.length}><p role="alert">{state.error}</p><Button onClick={()=>setAttempt(n=>n+1)}>Retry</Button></td></tr>:!state.rows.length?<tr><td colSpan={columns.length}>{query||status?'No matching records. Clear your filters to see more.':`No ${definition.title.toLowerCase()} yet. Add your first record to get started.`}</td></tr>:state.rows.map(row=><tr key={row.id}><td><strong>{isRates?row.agent?.name:row.name}</strong><span className="cell-sub">{isRates?row.tour?.name:row.code||row.legalName||'Company details'}</span></td>{isRates?<><td>{money(row.adultPrice)}</td><td>{money(row.childPrice)}</td></>:<td>{detail(row)}</td>}<td>{labelFor(row.status)||'Company'}</td><td><Dropdown label={`Actions for ${row.name||row.agent?.name}`} items={[{label:'View',onSelect:()=>setEditor({row,readOnly:true})},{label:'Edit',onSelect:()=>setEditor({row})}]}>•••</Dropdown></td></tr>)}
 </DataTable><div className="catalog-paging"><span>{state.total??0} {state.total===1?'record':'records'} · Page {state.page||1} of {state.pages||1}</span><Button disabled={state.loading||page===1} onClick={()=>setPage(n=>n-1)}>Previous</Button><Button disabled={state.loading||page>=(state.pages||1)} onClick={()=>setPage(n=>n+1)}>Next</Button></div></section>
 {editor&&<Editor entity={entity} {...editor} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setNotice('Changes saved.');setAttempt(n=>n+1)}}/>}</>
}
