import {useLocale} from '../i18n/locale.jsx'
import { englishAddress, postalCodeFor, validateThaiAddress } from '../../../../../packages/contracts/thai-address.js'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addressFields, formatAddress, validateAddress } from '../../../../../packages/contracts/address.js'
import { useUnsavedChanges } from '../navigation/Navigation.jsx'
import { Dialog } from './Dialog.jsx'
import { Button } from './Button.jsx'
import { FormField } from './FormField.jsx'
import { GeographyFields } from './GeographyFields.jsx'
const keys=['province','district','subdistrict','postalCode','houseNumber','moo','villageName']
const snapshot=value=>Object.fromEntries(keys.map(key=>[key,value[key]||'']))
export function AddressPicker({values,onApply,onClose}) {
 const {t}=useLocale()
 const [draft,setDraft]=useState(()=>snapshot(values)),[data,setData]=useState(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[errors,setErrors]=useState({}),[discard,setDiscard]=useState(false)
 const initial=useRef(JSON.stringify(snapshot(values))),form=useRef(null),dirty=JSON.stringify(draft)!==initial.current
 useUnsavedChanges(dirty)
 useEffect(()=>{let active=true;import('../../../../../packages/contracts/data/thai-areas.js').then(module=>{if(active)setData(module.default)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[attempt])
 const complete=Boolean(data&&!Object.keys(validateThaiAddress(draft,data)).length&&draft.subdistrict)
 function change(key,value) {setDraft(current=>({...current,[key]:value,...(key==='province'?{district:'',subdistrict:''}:key==='district'?{subdistrict:''}:{})}));setErrors({})}
 function apply(event) {
  event.preventDefault();event.stopPropagation()
  const checked={...validateAddress(draft),...validateThaiAddress(draft,data)}
  setErrors(checked)
  if(Object.keys(checked).length){setTimeout(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus(),0);return}
  onApply({...draft,...englishAddress(draft,data),postalCode:postalCodeFor(draft,data)})
 }
 const close=()=>dirty?setDiscard(true):onClose()
 return createPortal(<Dialog title={t("Quick address")} onClose={close}>{discard?<section><p>{t("Discard the address changes?")}</p><div className="dialog-actions"><Button autoFocus onClick={()=>setDiscard(false)}>{t("Keep editing")}</Button><Button onClick={onClose}>{t("Discard changes")}</Button></div></section>:<form ref={form} noValidate onSubmit={apply}>
 <p>{t("Select a province, district and subdistrict. / \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e08\u0e31\u0e07\u0e2b\u0e27\u0e31\u0e14 \u0e2d\u0e33\u0e40\u0e20\u0e2d \u0e41\u0e25\u0e30\u0e15\u0e33\u0e1a\u0e25 \u0e41\u0e25\u0e49\u0e27\u0e23\u0e30\u0e1a\u0e38\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e1a\u0e49\u0e32\u0e19\u0e17\u0e35\u0e48\u0e21\u0e35")}</p>
 {!data?<div className="address-loading">{failed?<><p role="alert">{t("Unable to load address choices.")}</p><Button onClick={()=>{setFailed(false);setAttempt(n=>n+1)}}>{t("Retry")}</Button></>:<p role="status">{t("Loading address choices\u2026")}</p>}</div>:<>
 <GeographyFields values={draft} areas={data} onChange={change} errors={errors}/>
 <FormField label="Postal code" value={postalCodeFor(draft,data)} readOnly placeholder="Filled automatically from your address" hint="Filled after selecting a subdistrict; some areas also need a Moo number."/>
 <fieldset className="address-section"><legend>{t("House details (optional)")}</legend><p className="field-help">{t(complete?'Leave unneeded details empty':'Select a subdistrict to enter house details.')}</p>{addressFields.filter(f=>['houseNumber','moo','villageName'].includes(f.key)).map(field=><FormField key={field.key} label={field.label} placeholder={field.placeholder} value={draft[field.key]} error={errors[field.key]} maxLength={field.max} disabled={!complete} onChange={e=>change(field.key,e.target.value)}/>)}</fieldset>
 </>}
 <p className="legacy-address" aria-live="polite">{formatAddress(draft)||t('No address selected.')}</p><div className="dialog-actions"><Button disabled={!data} onClick={()=>{setDraft(snapshot({}));setErrors({})}}>{t("Clear address")}</Button><Button type="submit" className="button-primary" disabled={!data}>{t("Save address")}</Button></div><p className="field-help">{t("This updates the form. Save changes on the page to finish.")}</p>
 </form>}</Dialog>,document.body)
}
