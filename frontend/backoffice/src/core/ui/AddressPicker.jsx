import { postalCodeFor, validateThaiAddress } from '../../../../../packages/contracts/thai-address.js'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addressFields, formatAddress, validateAddress } from '../../../../../packages/contracts/address.js'
import { useUnsavedChanges } from '../navigation/Navigation.jsx'
import { Dialog } from './Dialog.jsx'
import { Button } from './Button.jsx'
import { FormField } from './FormField.jsx'
import { SelectField } from './SelectField.jsx'
const keys=['province','district','subdistrict','postalCode','houseNumber','moo','villageName']
const snapshot=value=>Object.fromEntries(keys.map(key=>[key,value[key]||'']))
const matches=(row,value)=>row&&(row.th===value||row.en.toLowerCase()===value.toLowerCase())
export function AddressPicker({values,onApply,onClose}) {
 const [draft,setDraft]=useState(()=>snapshot(values)),[data,setData]=useState(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[errors,setErrors]=useState({}),[discard,setDiscard]=useState(false)
 const initial=useRef(JSON.stringify(snapshot(values))),form=useRef(null),dirty=JSON.stringify(draft)!==initial.current
 useUnsavedChanges(dirty)
 useEffect(()=>{let active=true;import('../../../../../packages/contracts/data/thai-areas.js').then(module=>{if(active)setData(module.default)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[attempt])
 const provinces=data?.provinces||[],province=provinces.find(row=>matches(row,draft.province)),districts=(data?.districts||[]).filter(row=>row.parent===province?.id),district=districts.find(row=>matches(row,draft.district)),subdistricts=(data?.subdistricts||[]).filter(row=>row.parent===district?.id),subdistrict=subdistricts.find(row=>matches(row,draft.subdistrict))
 function change(key,value) {setDraft(current=>({...current,[key]:value,...(key==='province'?{district:'',subdistrict:''}:key==='district'?{subdistrict:''}:{})}));setErrors({})}
 function apply(event) {
  event.preventDefault();event.stopPropagation()
  const checked={...validateAddress(draft),...validateThaiAddress(draft,data)}
  setErrors(checked)
  if(Object.keys(checked).length){setTimeout(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus(),0);return}
  onApply({...draft,postalCode:postalCodeFor(draft,data),province:province?.th||'',district:district?.th||'',subdistrict:subdistrict?.th||''})
 }
 const close=()=>dirty?setDiscard(true):onClose()
 return createPortal(<Dialog title="Quick address" onClose={close}>{discard?<section><p>Discard the address changes?</p><div className="dialog-actions"><Button autoFocus onClick={()=>setDiscard(false)}>Keep editing</Button><Button onClick={onClose}>Discard changes</Button></div></section>:<form ref={form} noValidate onSubmit={apply}>
 <p>Select a province, district and subdistrict. Then add any house details you have.</p>
 {!data?<div className="address-loading">{failed?<><p role="alert">Unable to load address choices.</p><Button onClick={()=>{setFailed(false);setAttempt(n=>n+1)}}>Retry</Button></>:<p role="status">Loading address choices…</p>}</div>:<>
 {[[ 'province','Province',provinces,province,false ],['district','District / Amphoe',districts,district,!province],['subdistrict','Subdistrict / Tambon',subdistricts,subdistrict,!district]].map(([key,label,rows,selected,disabled])=><SelectField key={key} label={label} value={selected?String(selected.id):draft[key]?'legacy':''} error={errors[key]} disabled={disabled} hint={disabled?`Select a ${key==='district'?'province':'district'} first.`:undefined} onChange={e=>change(key,rows.find(row=>String(row.id)===e.target.value)?.th||'')}><option value="">Select {key}</option>{!selected&&draft[key]&&<option value="legacy" disabled>{draft[key]} — select from list</option>}{rows.map(row=><option key={row.id} value={String(row.id)}>{row.th} · {row.en}</option>)}</SelectField>)}
 <FormField label="Postal code" value={postalCodeFor(draft,data)} readOnly placeholder="Filled automatically from your address" hint="Filled after selecting a subdistrict; some areas also need a Moo number."/>
 <fieldset className="address-section"><legend>House details (optional)</legend><p className="field-help">{subdistrict?'Leave any details you do not need empty.':'Select a subdistrict to enter house details.'}</p>{addressFields.filter(f=>['houseNumber','moo','villageName'].includes(f.key)).map(field=><FormField key={field.key} label={field.label} placeholder={field.placeholder} value={draft[field.key]} error={errors[field.key]} maxLength={field.max} disabled={!subdistrict} onChange={e=>change(field.key,e.target.value)}/>)}</fieldset>
 </>}
 <p className="legacy-address" aria-live="polite">{formatAddress(draft)||'No address selected.'}</p><div className="dialog-actions"><Button disabled={!data} onClick={()=>{setDraft(snapshot({}));setErrors({})}}>Clear address</Button><Button type="submit" className="button-primary" disabled={!data}>Save address</Button></div><p className="field-help">This updates the form. Save changes on the page to finish.</p>
 </form>}</Dialog>,document.body)
}
