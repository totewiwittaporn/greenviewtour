// Preserve the price selector already shipped in the 10 October public release.
import {useLocale} from '../../core/useLocale.js'
import {Select} from '../../core/ui/Controls.jsx'
import {tourDirectPrice,directPriceZones,directPriceNationalities} from './tourPresentation.js'

export default function DirectPriceTable({tour,zone,nationality,onZone,onNationality}){
 const {locale,money}=useLocale(),english=locale==='en'
 const selected=tourDirectPrice(tour,zone,nationality)
 const zoneLabel=value=>value==='Kuraburi'?(english?'Khura Buri':'คุระบุรี'):(english?'Khao Lak':'เขาหลัก')
 const nationalityLabel=value=>value==='TH'?(english?'Thai':'คนไทย'):(english?'Foreign visitor':'ต่างชาติ')
 return <div className="tour-direct-prices">
  <h3>{english?'Prices per person':'ราคาต่อคน'}</h3>
  <div className="tour-price-table-scroll"><table>
   <caption>{english?'THB · choose your departure zone and visitor group':'บาท · แยกตามโซนเดินทางและประเภทผู้เดินทาง'}</caption>
   <thead><tr><th scope="col">{english?'Zone / visitor':'โซน / ผู้เดินทาง'}</th><th scope="col">{english?'Adult':'ผู้ใหญ่'}</th><th scope="col">{english?'Child':'เด็ก'}</th></tr></thead>
   <tbody>{directPriceZones.flatMap(z=>directPriceNationalities.map(n=><tr key={z+n}><th scope="row">{zoneLabel(z)} · {nationalityLabel(n)}</th><td>{money(tour.directPriceMatrix[z]?.[n]?.adult)}</td><td>{money(tour.directPriceMatrix[z]?.[n]?.child)}</td></tr>))}</tbody>
  </table></div>
  <Select label={english?'Departure zone':'โซนเดินทาง'} value={zone} onChange={event=>onZone(event.target.value)}><option value="">{english?'Choose zone':'เลือกโซน'}</option>{directPriceZones.map(z=><option key={z} value={z}>{zoneLabel(z)}</option>)}</Select>
  <Select label={english?'Visitor group':'ประเภทผู้เดินทาง'} value={nationality} onChange={event=>onNationality(event.target.value)}><option value="">{english?'Choose visitor group':'เลือกประเภทผู้เดินทาง'}</option>{directPriceNationalities.map(n=><option key={n} value={n}>{nationalityLabel(n)}</option>)}</Select>
  <p aria-live="polite">{zone&&nationality?`${english?'Selected fare':'ราคาที่เลือก'}: ${english?'adult':'ผู้ใหญ่'} ${money(selected.adultPrice)} · ${english?'child':'เด็ก'} ${money(selected.childPrice)}`:(english?'Select both fields to use the correct fare.':'เลือกทั้งสองช่องเพื่อใช้ราคาที่ตรงกับการเดินทาง')}</p>
 </div>
}
