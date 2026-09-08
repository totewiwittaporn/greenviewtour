import { englishAreaName, selectedAreas } from '../../../../../packages/contracts/thai-address.js'
import { SearchableSelectField } from './SearchableSelectField.jsx'
export function GeographyFields({values,areas,onChange,errors={},disabled=false}) {
 const selected=selectedAreas(values,areas)
 function change(key,value){onChange(key,value);if(key==='province'){onChange('district','');onChange('subdistrict','')}if(key==='district')onChange('subdistrict','')}
 return [['province','Province',areas?.provinces||[],false],['district','District / Amphoe',selected.districts,!selected.province],['subdistrict','Subdistrict / Tambon',selected.subdistricts,!selected.district]].map(([key,label,rows,blocked])=>{
 const current=selected[key],options=[{value:'',label:'Not selected / ยังไม่ระบุ'},...rows.toSorted((a,b)=>englishAreaName(a).localeCompare(englishAreaName(b),'en')).map(row=>({value:englishAreaName(row),label:`${englishAreaName(row)} · ${row.th}`}))]
 if(values[key]&&!current)options.push({value:values[key],label:`${values[key]} — select from list / เลือกจากรายการ`,disabled:true})
 return <SearchableSelectField key={key} label={label} value={current?englishAreaName(current):values[key]||''} options={options} onChange={e=>change(key,e.target.value)} error={errors[key]} disabled={disabled||blocked||!areas} hint={!areas?'Loading areas…':blocked?'Select the previous area first / เลือกพื้นที่ก่อนหน้า':undefined}/>
 })
}
