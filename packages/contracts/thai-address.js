// Validate a selected hierarchy while retaining untouched legacy names on updates.
export function validateThaiAddress(value,areas) {
 const same=(row,name)=>row.th===name||row.en.toLowerCase()===String(name||'').toLowerCase()
 const keys=['province','district','subdistrict','houseNumber','moo','villageName']
 if(!keys.some(key=>value[key]))return {}
 const province=areas.provinces.find(row=>same(row,value.province)),district=areas.districts.find(row=>row.parent===province?.id&&same(row,value.district)),subdistrict=areas.subdistricts.find(row=>row.parent===district?.id&&same(row,value.subdistrict))
 return {...(!province?{province:'Select a province.'}:{}),...(!district?{district:'Select a district in this province.'}:{}),...(!subdistrict?{subdistrict:'Select a subdistrict in this district.'}:{})}
}

export function postalCodeFor(value,areas) {
 if(!areas)return ''
 const same=(row,name)=>row.th===String(name||'').trim()||row.en.toLowerCase()===String(name||'').trim().toLowerCase()
 const province=areas.provinces.find(row=>same(row,value.province))
 const district=areas.districts.find(row=>row.parent===province?.id&&same(row,value.district))
 const matches=areas.subdistricts.filter(row=>row.parent===district?.id&&same(row,value.subdistrict))
 // Reviewed local delivery exceptions; source notes in data/README.md.
 if(matches.length===1&&matches[0].id===810116){const moo=String(value.moo||'').trim();return /^0?[1-6]$/.test(moo)?'81180':/^0?[78]$/.test(moo)?'81210':''}
 if(matches.length===1&&matches[0].id===810117)return '81180'
 const codes=[...new Set(matches.map(row=>row.postalCode))]
 return codes.length===1&&/^\d{5}$/.test(codes[0])?codes[0]:''
}
