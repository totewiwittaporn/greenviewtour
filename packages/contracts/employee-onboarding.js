import {normalizePhone} from './contact.js'
import {addressKeys,addressValues,validateAddress} from './address.js'
import {validateThaiAddress,postalCodeFor} from './thai-address.js'
export function validateEmployeeInformation(input,areas){
 const data={},errors={}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['firstName','lastName','primaryPhone',...addressKeys].includes(k)))return {data,errors:{form:'Only employee information can be changed here.'}}
 for(const key of ['firstName','lastName']){
  const value=typeof input[key]==='string'?input[key].trim():''
  if(!value||value.length>49||Array.from(value).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))errors[key]='Enter your legal name (up to 49 characters per name).'
  data[key]=value
 }
 Object.assign(data,addressValues(input))
 Object.assign(errors,validateAddress(data))
 for(const key of addressKeys)if(typeof data[key]==='string')data[key]=data[key].trim()
 for(const [key,message]of [['province','Select a province.'],['district','Select a district in this province.'],['subdistrict','Select a subdistrict in this district.'],['houseNumber','Enter a house number.']])if(!data[key])errors[key]=message
 if(areas){Object.assign(errors,validateThaiAddress(data,areas));data.postalCode=postalCodeFor(data,areas)}
 if(!/^\d{5}$/.test(data.postalCode))errors.postalCode='Enter province, district and subdistrict; some areas also need a Moo number.'
 data.primaryPhone=typeof input.primaryPhone==='string'?normalizePhone(input.primaryPhone):''
 if(!/^\+?\d{7,15}$/.test(data.primaryPhone))errors.primaryPhone='Enter 7–15 digits, with an optional + country code.'
 return {data,errors}
}
