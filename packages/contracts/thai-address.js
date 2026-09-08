export const normalizeAreaSearch=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s-]/g,'')
export const englishAreaName=row=>row.id===82&&!row.parent?'Phang-Nga':row.en
export const areaMatches=(row,name)=>[row.th,row.en,englishAreaName(row)].some(text=>normalizeAreaSearch(text)===normalizeAreaSearch(name))
export function selectedAreas(value,areas){
 const province=areas?.provinces.find(row=>areaMatches(row,value.province))
 const districts=areas?.districts.filter(row=>row.parent===province?.id)||[]
 const district=districts.find(row=>areaMatches(row,value.district))
 const subdistricts=areas?.subdistricts.filter(row=>row.parent===district?.id)||[]
 return {province,district,subdistrict:subdistricts.find(row=>areaMatches(row,value.subdistrict)),districts,subdistricts}
}
export function englishAddress(value,areas){
 const selected=selectedAreas(value,areas)
 if(!selected.subdistrict)return {}
 return Object.fromEntries(['province','district','subdistrict'].filter(key=>selected[key]).map(key=>[key,englishAreaName(selected[key])]))
}
// Validate a selected hierarchy while retaining untouched legacy names on updates.
export function validateThaiAddress(value,areas) {
 const same=areaMatches
 const keys=['province','district','subdistrict','houseNumber','moo','villageName']
 if(!keys.some(key=>value[key]))return {}
 const province=areas.provinces.find(row=>same(row,value.province)),district=areas.districts.find(row=>row.parent===province?.id&&same(row,value.district)),subdistrict=areas.subdistricts.find(row=>row.parent===district?.id&&same(row,value.subdistrict))
 return {...(!province?{province:'Select a province.'}:{}),...(!district?{district:'Select a district in this province.'}:{}),...(!subdistrict?{subdistrict:'Select a subdistrict in this district.'}:{})}
}

export function postalCodeFor(value,areas) {
 if(!areas)return ''
 const same=areaMatches
 const province=areas.provinces.find(row=>same(row,value.province))
 const district=areas.districts.find(row=>row.parent===province?.id&&same(row,value.district))
 const matches=areas.subdistricts.filter(row=>row.parent===district?.id&&same(row,value.subdistrict))
 // Reviewed local delivery exceptions; source notes in data/README.md.
 if(matches.length===1&&matches[0].id===810116){const moo=String(value.moo||'').trim();return /^0?[1-6]$/.test(moo)?'81180':/^0?[78]$/.test(moo)?'81210':''}
 if(matches.length===1&&matches[0].id===810117)return '81180'
 const codes=[...new Set(matches.map(row=>row.postalCode))]
 return codes.length===1&&/^\d{5}$/.test(codes[0])?codes[0]:''
}
