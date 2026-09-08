import { useState } from 'react'
import { addressFields, formatAddress } from '../../../../../packages/contracts/address.js'
import { FormField } from './FormField.jsx'
import { Button } from './Button.jsx'
import { AddressPicker } from './AddressPicker.jsx'
import { MapLocationField } from './MapLocationField.jsx'
export function AddressFields({values,onChange,errors={},disabled=false,legacyAddress,quick=false}){
 const [open,setOpen]=useState(false),addressErrors=addressFields.filter(f=>f.section==='Address'&&errors[f.key])
 return <><fieldset className="address-section"><legend>Address</legend>{quick?<><div className="address-summary"><p className="legacy-address">{formatAddress(values)||legacyAddress||'No address added.'}</p><Button disabled={disabled} onClick={()=>setOpen(true)}>Quick address</Button></div>{addressErrors.map(f=><p className="field-error" role="alert" key={f.key}>{f.label}: {errors[f.key]}</p>)}</>:<><p className="field-help">Enter province, district and subdistrict first, then the house details.</p><div className="address-grid">{addressFields.filter(f=>f.section==='Address').map(f=><FormField key={f.key} label={f.label} value={values[f.key]||''} onChange={e=>onChange(f.key,e.target.value)} error={errors[f.key]} disabled={disabled} placeholder={f.placeholder} maxLength={f.max}/>)}</div></>}{legacyAddress&&<details><summary>Previous address</summary><p className="legacy-address">{legacyAddress}</p></details>}</fieldset><MapLocationField values={values} onChange={onChange} error={errors.mapUrl} disabled={disabled}/>{open&&<AddressPicker values={values} onClose={()=>setOpen(false)} onApply={draft=>{for(const[key,value]of Object.entries(draft))onChange(key,value);setOpen(false)}}/>}</>
}
