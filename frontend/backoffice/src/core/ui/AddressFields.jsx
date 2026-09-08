import { useEffect, useState } from 'react'
import { addressFields } from '../../../../../packages/contracts/address.js'
import { postalCodeFor } from '../../../../../packages/contracts/thai-address.js'
import { FormField } from './FormField.jsx'
import { Button } from './Button.jsx'
import { AddressPicker } from './AddressPicker.jsx'
import { MapLocationField } from './MapLocationField.jsx'
export function AddressFields({values,onChange,errors={},disabled=false,legacyAddress,quick=false}){
 const [open,setOpen]=useState(false),[areas,setAreas]=useState(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let active=true;import('../../../../../packages/contracts/data/thai-areas.js').then(module=>{if(active)setAreas(module.default)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[attempt])
 const postal=postalCodeFor(values,areas)
 useEffect(()=>{if(areas&&!disabled&&(values.postalCode||'')!==postal)onChange('postalCode',postal)},[areas,disabled,postal,values.postalCode,onChange])
 function update(key,value){onChange(key,value);if(['province','district','subdistrict'].includes(key))onChange('postalCode',postalCodeFor({...values,[key]:value},areas))}
 return <><fieldset className="address-section"><legend>Address</legend><div className="address-summary"><p className="field-help">Enter your address below{quick?' or use Quick address to fill these fields.':'.'}</p>{quick&&<Button disabled={disabled} onClick={()=>setOpen(true)}>Quick address</Button>}</div><div className="address-grid">{addressFields.filter(f=>f.section==='Address').map(f=><FormField key={f.key} label={f.label} value={f.key==='postalCode'?postal:values[f.key]||''} onChange={e=>update(f.key,e.target.value)} error={errors[f.key]} disabled={disabled} readOnly={f.key==='postalCode'} hint={f.key==='postalCode'?(postal?'Filled automatically.':'Enter province, district and subdistrict; some areas also need a Moo number.'):undefined} placeholder={f.placeholder} maxLength={f.max}/>)}</div>{failed&&<div role="alert"><p>Unable to load postal codes.</p><Button disabled={disabled} onClick={()=>{setFailed(false);setAttempt(n=>n+1)}}>Retry postal codes</Button></div>}{legacyAddress&&<details><summary>Previous address</summary><p className="legacy-address">{legacyAddress}</p></details>}</fieldset><MapLocationField values={values} onChange={onChange} error={errors.mapUrl} disabled={disabled}/>{open&&<AddressPicker values={values} onClose={()=>setOpen(false)} onApply={draft=>{for(const[key,value]of Object.entries(draft))onChange(key,value);setOpen(false)}}/>}</>
}
