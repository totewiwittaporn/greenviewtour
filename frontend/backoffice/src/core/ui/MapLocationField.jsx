import {useLocale} from '../i18n/locale.jsx'
import { mapLinks, safeMapUrl } from '../../../../../packages/contracts/address.js'
import { FormField } from './FormField.jsx'
export function MapLocationField({values,onChange,error,disabled=false}) {
 const {t}=useLocale()
 const search=mapLinks(values).search,pin=safeMapUrl(values.mapUrl)
 return <fieldset className="address-section"><legend>{t("Map location")}</legend><FormField label="Google Maps pin link" value={values.mapUrl||''} onChange={e=>onChange('mapUrl',e.target.value)} error={error} disabled={disabled} placeholder="Paste the location’s Google Maps share link" maxLength={2048}/><p className="field-help">{t("Open Google Maps, drop a pin and paste its share link here.")}</p><div className="map-actions"><a className="button" href={search} target="_blank" rel="noopener noreferrer">{t("Find location on Google Maps")}</a>{pin&&<a className="button" href={pin} target="_blank" rel="noopener noreferrer">{t("Open saved pin")}</a>}</div></fieldset>
}
