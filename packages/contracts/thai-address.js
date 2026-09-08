// Validate a selected hierarchy while retaining untouched legacy names on updates.
export function validateThaiAddress(value,areas) {
 const same=(row,name)=>row.th===name||row.en.toLowerCase()===String(name||'').toLowerCase()
 const keys=['province','district','subdistrict','houseNumber','moo','villageName']
 if(!keys.some(key=>value[key]))return {}
 const province=areas.provinces.find(row=>same(row,value.province)),district=areas.districts.find(row=>row.parent===province?.id&&same(row,value.district)),subdistrict=areas.subdistricts.find(row=>row.parent===district?.id&&same(row,value.subdistrict))
 return {...(!province?{province:'Select a province.'}:{}),...(!district?{district:'Select a district in this province.'}:{}),...(!subdistrict?{subdistrict:'Select a subdistrict in this district.'}:{})}
}
