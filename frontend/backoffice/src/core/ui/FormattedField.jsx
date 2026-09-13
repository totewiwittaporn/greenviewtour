import { useState } from 'react'
import { contactValue, normalizePhone, formatTaxId, formatPhone } from '../../../../../packages/contracts/contact.js'
import { FormField } from './FormField.jsx'
export function FormattedField({format,value,onChange,...props}) {
 const [editing,setEditing]=useState(false),tax=format==='taxId'
 return <FormField {...props} type={tax?'text':'tel'} inputMode={tax?'numeric':'tel'} autoComplete={tax?'off':'tel'} maxLength={tax?30:32} placeholder={tax?'0-1234-56789-01-2':'+66-81-234-5678'} value={editing?value:(tax?formatTaxId(value):formatPhone(value))} onFocus={()=>setEditing(true)} onBlur={()=>{setEditing(false);onChange({target:{value:tax?contactValue(value):normalizePhone(value)}})}} onChange={onChange}/>
}
