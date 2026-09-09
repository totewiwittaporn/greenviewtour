import TripPreparation from '../../operations/TripPreparation.jsx'
import { FormattedField } from '../../../core/ui/FormattedField.jsx'
import { AddressFields } from '../../../core/ui/AddressFields.jsx'
import { addressKeys, mapLinks } from '../../../../../../packages/contracts/address.js'
import { useUnsavedChanges } from '../../../core/navigation/Navigation.jsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { catalog, initialValues, labelFor, validateCatalog, visibleField } from '../../../../../../packages/contracts/catalog.js'
import { api } from '../../../core/auth/api.js'
import { Button } from '../../../core/ui/Button.jsx'
import { Pagination } from '../../../core/ui/Pagination.jsx'
import { SummaryCards } from '../../../core/ui/SummaryCards.jsx'
import { DataTable } from '../../../core/ui/DataTable.jsx'
import { Dialog } from '../../../core/ui/Dialog.jsx'
import { Dropdown } from '../../../core/ui/Dropdown.jsx'
import { FormField } from '../../../core/ui/FormField.jsx'
import { SelectField } from '../../../core/ui/SelectField.jsx'
import { TextAreaField } from '../../../core/ui/TextAreaField.jsx'
import { SearchField } from '../../../core/ui/SearchField.jsx'
import { ReferenceField } from '../../../core/ui/ReferenceField.jsx'
const messages={SETTINGS_CONFLICT:'This record changed. Close this form and refresh the list before editing again.',SETTINGS_DUPLICATE:'This code or agent–tour price already exists. Edit the existing record.',RELATED_RECORD_UNAVAILABLE:'A selected partner or tour is no longer active or has a different role. Choose an available record.',PARTNER_IN_USE:'This partner is used by active tours, prices or vehicles. Update those records before removing its role or deactivating it.',TOUR_IN_USE:'Deactivate this tour’s agent prices before deactivating the tour.',PERMISSION_DENIED:'Your account cannot manage company settings.',INVALID_SETTINGS:'Check the fields and try again.'}
const message=error=>messages[error.message]||error.detail||'Unable to save or load right now. Check your connection and retry. Your entries are still here.'
const summaryFeature={services:['Prices set','Services with an explicit selling price'],equipment:['Sizes specified','Equipment items with size or variant details'],consumables:['Packaging set','Items with a pack or case conversion'],stores:['Boat stores','Stock locations on boats'],components:['Required','Mandatory package components'],slots:['Fleet assigned','Slots linked to a vehicle or boat'],trips:['Tour departures','Trips linked to a tour program'],partners:['Sales agents','Partners with the sales agent role'],tours:['Greenview tours','Organized by Greenview Tour'],rates:['Child prices set','Price records with a child fare'],locations:['Hotels','Pickup locations classified as hotels'],vehicles:['Greenview fleet','Vehicles and boats provided by Greenview'],channels:['Direct channels','Sales channels with a direct source']}
const endpoint=entity=>catalog[entity]?.operation||entity==='resources'?'/api/operations':'/api/settings'
const relation=key=>({agentId:'agent',tourId:'tour',operatorId:'operator',providerId:'provider',resourceId:'resource',vehicleId:'vehicle'}[key])
const operationFieldHints={selection:'Included: covered by the package price. Required: included and cannot be removed. Optional: a separately priced choice. Excluded: unavailable in this package.',basis:'Per person uses adults + children. Per booking uses the entered quantity once. Per person night also multiplies by the number of overnight stays.',baseUnit:'This is the unit used for prices and quantities. Choose the actual unit sold or counted; it cannot change after use.',quantity:'Enter whole units for the selected quantity basis. Example: one towel per person uses 1 and Per person.',packSize:'Actual number of bottles in one pack. Leave empty if packs are not used.',caseSize:'Actual number of bottles in one case, independent of the pack size. Leave empty if cases are not used.',day:'Itinerary day, starting at 1. Add the activity and timing in Notes.',capacity:'Enter capacity in the units shown for this service, or passengers for a trip.'}
const operationHints={services:'Define separately sellable services and their pricing units. Prices may remain unset.',equipment:'Track reusable items by type and size. Receive quantities in Stock balances.',consumables:'Keep each bottle size or variant separate. Set the actual bottles per pack and case before using those units.',stores:'Create the warehouse, boat and island locations where stock is held.',components:'Build a reusable package. Included items do not add a selling charge; required extras cannot be deselected.',slots:'Reserve availability in the service pricing unit. Times use Thailand time (UTC+7).',trips:'Create dated departures, including standalone services. Times use Thailand time (UTC+7).'}
const money=value=>value===null||value===undefined||value===''?'Not set':new Intl.NumberFormat('en-GB',{style:'currency',currency:'THB'}).format(Number(value))
function Related({field,value,label,onChange,error,disabled}){
 const load=useCallback(({q,page,signal})=>api(`${endpoint(field.entity)}/${field.entity}?${new URLSearchParams({q,page:String(page),status:'ACTIVE',...(field.role?{role:field.role}:{})})}`,undefined,{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])}),[field.entity,field.role])
 return <ReferenceField label={field.label} value={value} selectedLabel={label} onChange={onChange} error={error} load={load} disabled={disabled}/>
}
function EditorSurface({inline,children,...props}) { return inline?<section className="panel">{children}</section>:<Dialog {...props}>{children}</Dialog> }
function Editor({entity,row,onClose,onSaved,readOnly=false,inline=false}){
 const definition=catalog[entity], [values,setValues]=useState(()=>initialValues(entity,row)),[errors,setErrors]=useState({}),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[discard,setDiscard]=useState(false),[confirm,setConfirm]=useState(false)
 const form=useRef(null),id=useRef(row?.id||crypto.randomUUID()),pending=useRef(false),base=useRef(JSON.stringify(initialValues(entity,row)))
 const dirty=JSON.stringify(values)!==base.current
 useUnsavedChanges(!readOnly && (dirty || busy))
 const close=()=>{if(busy)return;if(dirty&&!readOnly)setDiscard(true);else onClose()}
 const update=(key,value)=>{setValues(v=>({...v,[key]:value}));setErrors(e=>({...e,[key]:undefined}));setNotice('');setConfirm(false)}
 async function save(event){
  event.preventDefault();if(pending.current)return
  const checked=validateCatalog(entity,values);setErrors(checked.errors)
  if(Object.keys(checked.errors).length){setTimeout(()=>form.current?.querySelector('[aria-invalid="true"], .field-error input')?.focus(),0);return}
  const sensitive=row&&(row.status!==values.status||entity==='partners'&&row.roles.some(role=>!values.roles.includes(role)))
  if(sensitive&&!confirm){setConfirm(true);return}
  pending.current=true;setBusy(true);setNotice('')
  try{await api(`${endpoint(entity)}/${entity}`,{...values,id:id.current,version:row?.version||0});onSaved()}
  catch(error){setNotice(message(error))}finally{pending.current=false;setBusy(false)}
 }
 return <EditorSurface inline={inline} title={`${readOnly?'View':row?'Edit':'Add'} ${definition.singular}`} onClose={close} busy={busy}>
 {discard?<section><p>Discard your unsaved changes?</p><div className="dialog-actions"><Button autoFocus onClick={()=>setDiscard(false)}>Keep editing</Button><Button onClick={onClose}>Discard changes</Button></div></section>:readOnly?<dl className="catalog-details">{definition.fields.filter(f=>!f.hidden&&visibleField(f,values)).map(f=><div key={f.key}><dt>{f.label}</dt><dd>{f.type==='money'?money(row[f.key]):f.type==='roles'?values[f.key].map(labelFor).join(', '):f.type==='select'?labelFor(values[f.key]):f.type==='reference'?(row[relation(f.key)]?.name||'Not set'):f.key==='mapUrl'&&mapLinks(row).pin?<a href={mapLinks(row).pin} target="_blank" rel="noopener noreferrer">Open saved pin</a>:values[f.key]||'Not set'}</dd></div>)}</dl>:<form className={inline?'profile-form company-form':undefined} ref={form} noValidate onSubmit={save}>
 {definition.operation&&<p>{operationHints[entity]}</p>}
 {entity==='rates'&&<p>Prices charged by Greenview to this agent, per passenger. These do not change direct customer prices. Leave an unavailable passenger price empty.</p>}
 {entity==='tours'&&<p>Prices are per passenger in THB. Empty means not set; zero is an explicit free price. Booking and Public publishing are configured separately.</p>}
 {definition.fields.filter(f=>!f.hidden&&visibleField(f,values)).map(field=>{
 if(addressKeys.includes(field.key))return field.key==='province'?<AddressFields quick={entity==='company'} key="address" values={values} onChange={update} errors={errors} disabled={busy} legacyAddress={row?.address}/>:null
 const props={label:field.label,hint:field.type==='timestamp'?'YYYY-MM-DD HH:mm · Thailand time (UTC+7)':definition.operation?operationFieldHints[field.key]:entity==='company'&&['name','legalName'].includes(field.key)?'English preferred / ใช้ภาษาอังกฤษเป็นหลัก และใส่ภาษาไทยได้':undefined,placeholder:field.placeholder,value:values[field.key],onChange:e=>update(field.key,e.target.value),error:errors[field.key],disabled:busy}
 if(entity==='company'&&['taxId','phone'].includes(field.key))return <FormattedField key={field.key} {...props} format={field.key}/>
 if(field.type==='select')return <SelectField key={field.key} {...props}>{field.options.map(option=><option key={option} value={option}>{labelFor(option)}</option>)}</SelectField>
 if(field.type==='reference')return <Related key={field.key} field={field} value={values[field.key]} label={row?.[relation(field.key)]?.name} onChange={props.onChange} error={props.error} disabled={busy}/>
 if(field.type==='roles')return <fieldset key={field.key} className="catalog-roles" aria-describedby={`${field.key}-error`}><legend>{field.label}</legend>{field.options.map(role=><label key={role}><input type="checkbox" disabled={busy} checked={values[field.key].includes(role)} aria-invalid={Boolean(errors[field.key])} onChange={e=>update(field.key,e.target.checked?[...values[field.key],role]:values[field.key].filter(item=>item!==role))}/>{labelFor(role)}</label>)}<span id={`${field.key}-error`} className="field-error">{errors[field.key]}</span></fieldset>
 if(field.max>500)return <TextAreaField key={field.key} {...props} maxLength={field.max}/>
 return <FormField key={field.key} {...props} maxLength={field.max||30} inputMode={['money','integer'].includes(field.type)?'decimal':undefined} required={field.required}/>
 })}
 {notice&&<div role="alert"><p>{notice}</p>{inline&&<Button disabled={busy} onClick={close}>Reload company details</Button>}</div>}{confirm&&<p role="alert">This changes availability or partner roles. Existing references will be checked before saving. Confirm to continue.</p>}
 <div className="dialog-actions"><Button type="submit" className={inline?'button-primary':undefined} busy={busy} disabled={busy}>{confirm?'Confirm changes':inline?'Save company details':'Save changes'}</Button></div><span className="sr-only" role="status">{busy?'Saving changes…':''}</span>
 </form>}
 </EditorSurface>
}
export default function CatalogPage({entity}){
 const definition=catalog[entity],params=new URLSearchParams(window.location.search)
 const [query,setQuery]=useState(params.get('q')||''),[composing,setComposing]=useState(false),[page,setPage]=useState(Math.max(1,Number(params.get('page'))||1)),[status,setStatus]=useState(params.get('status')||''),[attempt,setAttempt]=useState(0),[state,setState]=useState({loading:true,rows:[]}),[editor,setEditor]=useState(null),[preparation,setPreparation]=useState(null),[notice,setNotice]=useState('')
 useEffect(()=>{
  if(composing)return
  const controller=new AbortController(),timer=setTimeout(()=>{
   const p=new URLSearchParams({q:query,page:String(page),status});window.history.replaceState(window.history.state,'',`${window.location.pathname}?${p}`)
   setState(s=>({...s,loading:true,error:null}))
   api(`${endpoint(entity)}/${entity}?${p}`,undefined,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(data=>{if(!controller.signal.aborted){setState({...data,loading:false});if(data.page!==page)setPage(data.page)}}).catch(error=>{if(!controller.signal.aborted)setState({rows:[],error:message(error),loading:false})})
  },query?300:0)
  return()=>{controller.abort();clearTimeout(timer)}
 },[entity,query,page,status,attempt,composing])
 const isRates=entity==='rates',columns=isRates?['Agent / Tour','Adult price','Child price','Status','Actions']:['Name / Code',definition.operation?'Details':entity==='partners'?'Roles':entity==='tours'?'Organizer':entity==='vehicles'?'Type / Capacity':entity==='locations'?'Type / Zone':entity==='channels'?'Source type':'Contact','Status','Actions']
 function detail(row){if(definition.operation)return entity==='components'?`${row.tour?.name||'Tour'} · ${labelFor(row.selection)} · ${row.quantity} ${labelFor(row.basis)}`:entity==='slots'?`${row.resource?.name||'Service'} · ${row.capacity} units`:entity==='trips'?`${row.tour?.name||'Standalone service'} · ${row.capacity} passengers`:entity==='stores'?labelFor(row.kind):`${labelFor(row.category)} · ${labelFor(row.baseUnit)}${row.size?` · ${row.size}`:''}`;return entity==='channels'?labelFor(row.kind):entity==='partners'?row.roles.map(labelFor).join(' · '):entity==='tours'?(row.operator?.name||'Greenview Tour'):entity==='vehicles'?`${labelFor(row.kind)} · ${row.capacity} passengers`:entity==='locations'?`${labelFor(row.kind)}${row.zone?` · ${row.zone}`:''}`:row.email||row.phone||'Not set'}
 if(entity==='company')return <><div className="page-heading"><div><span className="eyebrow">COMPANY SETTINGS</span><h1 tabIndex={-1}>Company</h1><p>Your company details. One shared record for Greenview Tour.</p></div></div>{notice&&<p role="status">{notice}</p>}{state.loading?<section className="panel auth-result"><p role="status">Loading company details…</p></section>:state.error?<section className="panel auth-result"><p role="alert">{state.error}</p><Button onClick={()=>setAttempt(n=>n+1)}>Retry</Button></section>:<Editor key={state.rows[0]?.version||0} entity="company" row={state.rows[0]} inline onClose={()=>setAttempt(n=>n+1)} onSaved={()=>{setNotice('Company details saved.');setAttempt(n=>n+1)}}/>}</>
 return <><div className="page-heading"><div><span className="eyebrow">{definition.operation?'TOUR OPERATIONS':'COMPANY SETTINGS'}</span><h1 tabIndex={-1}>{definition.title}</h1><p>{definition.operation?operationHints[entity]:entity==='rates'?'Set a separate price for each agent and tour program.':'Manage the information your team uses for tour bookings.'}</p></div><Button disabled={state.loading||Boolean(state.error)||(entity==='company'&&state.rows.length>0)} onClick={()=>setEditor({})}>+ Add {definition.singular}</Button></div>
 <SummaryCards label={`${definition.title} summary — all records, independent of filters`} items={[
 {label:'Total records',icon:'grid',value:state.summary?.total??'—',detail:'All records · before filters'},
 {label:'Active',icon:'check',value:state.summary?.active??'—',detail:'All active records'},
 {label:'Inactive',icon:'close',value:state.summary?.inactive??'—',detail:'All inactive records'},
 {label:(summaryFeature[entity]||['Configured records','Records with operational details'])[0],icon:'briefcase',value:state.summary?.featured??'—',detail:(summaryFeature[entity]||['Configured records','Records with operational details'])[1]},
 ]}/>
 <section className="panel table-panel"><div className="panel-heading"><div><h2>{definition.title}</h2><p>Search records and open Actions to view or edit.</p></div></div><div className="filterbar">{entity!=='company'&&<><SearchField label={`Search ${definition.title.toLowerCase()}`} placeholder={isRates?'Search agent or tour…':'Search by name or code…'} value={query} onChange={q=>{setQuery(q);setPage(1)}} onCompositionChange={setComposing}/><SelectField label="Status filter" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">All statuses</option>{entity==='trips'?<option value="OPEN">Open</option>:<><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></>}</SelectField></>}<Button disabled={state.loading} onClick={()=>setAttempt(n=>n+1)}>Refresh</Button></div>
 {notice&&<p className="catalog-notice" role="status">{notice}</p>}
 <DataTable columns={columns} busy={state.loading} label={`${definition.title} table`} error={state.error} onRetry={()=>setAttempt(n=>n+1)} isEmpty={!state.rows.length} loadingLabel={`Loading ${definition.title.toLowerCase()}…`} empty={query||status?'No matching records. Clear your filters to see more.':`No ${definition.title.toLowerCase()} yet. Add your first record to get started.`}>
 {state.rows.map(row=><tr key={row.id}><td><strong>{isRates?row.agent?.name:row.name}</strong><span className="cell-sub">{isRates?row.tour?.name:row.code||row.legalName||'Company details'}</span></td>{isRates?<><td>{money(row.adultPrice)}</td><td>{money(row.childPrice)}</td></>:<td>{detail(row)}</td>}<td>{labelFor(row.status)||'Company'}</td><td><Dropdown label={`Actions for ${row.name||row.agent?.name}`} items={[{label:'View',icon:'view',onSelect:()=>setEditor({row,readOnly:true})},{label:'Edit',icon:'edit',onSelect:()=>setEditor({row})},...(entity==='trips'?[{label:'Preparation',icon:'briefcase',onSelect:()=>setPreparation(row)}]:[]),...(mapLinks(row).pin?[{label:'Open saved pin',icon:'pin',href:mapLinks(row).pin,target:'_blank'}]:[])]}>•••</Dropdown></td></tr>)}
 </DataTable><Pagination page={state.page||page} pageSize={state.pageSize||25} total={state.error||state.loading?undefined:state.total} busy={state.loading} onPageChange={setPage} label={`${definition.title} pagination`}/></section>
 {preparation&&<TripPreparation trip={preparation} onClose={()=>setPreparation(null)}/>}
 {editor&&<Editor entity={entity} {...editor} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setNotice('Changes saved.');setAttempt(n=>n+1)}}/>}</>
}
