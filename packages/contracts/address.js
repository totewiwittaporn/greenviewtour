// Shared structured Thai-address fields. Names are entered as supplied; no guessed geocoding.
export const addressFields = [
 ['province','Province','e.g. Phuket',100],
 ['district','District / Amphoe','e.g. Mueang Phuket',100],
 ['subdistrict','Subdistrict / Tambon','e.g. Rawai',100],
 ['houseNumber','House number','e.g. 12/34',50],
 ['moo','Moo number','e.g. 5',20],
 ['villageName','Village name (optional)','e.g. Baan Saiyuan',150],
 ['mapUrl','Google Maps pin link','Paste the location’s Google Maps share link',2048],
 ['latitude','Latitude (optional)','e.g. 7.7797',30],
 ['longitude','Longitude (optional)','e.g. 98.3253',30],
].map(([key,label,placeholder,max])=>({key,label,placeholder,max,type:'text',section:['mapUrl','latitude','longitude'].includes(key)?'Map location':'Address'}))
export const addressKeys=addressFields.map(f=>f.key)
export const addressValues=value=>Object.fromEntries(addressKeys.map(key=>[key,value?.[key]??'']))
export function safeMapUrl(value){
 if(typeof value!=='string'||value.length>2048)return null
 try{const url=new URL(value.trim());if(url.protocol!=='https:'||url.username||url.password||url.port)return null
 const valid=(['www.google.com','google.com','www.google.co.th','google.co.th'].includes(url.hostname)&&/^\/maps(?:\/|$)/.test(url.pathname))||['maps.google.com','maps.google.co.th','maps.app.goo.gl'].includes(url.hostname)||(url.hostname==='goo.gl'&&url.pathname.startsWith('/maps/'))
 return valid?url.href:null
 }catch{return null}
}
export function validateAddress(input){
 const errors={}
 for(const f of addressFields){const value=input[f.key];if(value===undefined||value===null||value==='')continue
 if(typeof value!=='string'||value.length>f.max||[...value].some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))errors[f.key]=`Enter up to ${f.max} characters.`}
 if(input.mapUrl&&!safeMapUrl(input.mapUrl))errors.mapUrl='Paste an HTTPS Google Maps location link.'
 for(const[key,limit]of[['latitude',90],['longitude',180]])if(input[key]&&(!/^-?\d+(\.\d+)?$/.test(input[key])||Math.abs(Number(input[key]))>limit))errors[key]=`Enter a coordinate from -${limit} to ${limit}.`
 if(Boolean(input.latitude)!==Boolean(input.longitude))errors.latitude='Enter both coordinates, or leave both empty.'
 return errors
}
export function mapLinks(value){
 const valid=validateAddress(value),coordinates=value.latitude&&value.longitude&&!valid.latitude&&!valid.longitude?`${value.latitude},${value.longitude}`:null
 const saved=safeMapUrl(value.mapUrl),query=[value.houseNumber,value.moo?`Moo ${value.moo}`:'',value.villageName,value.subdistrict,value.district,value.province].filter(Boolean).join(' ')
 return {pin:saved||(coordinates?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`:null),directions:!saved&&coordinates?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}&travelmode=driving`:null,search:query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:'https://www.google.com/maps/'}
}
export function formatAddress(value){return[value.houseNumber,value.moo?`Moo ${value.moo}`:'',value.villageName,value.subdistrict,value.district,value.province].filter(Boolean).join(', ')||value.address||''}
