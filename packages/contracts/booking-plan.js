// Booking dates are service dates in Thailand, independent of the time of entry.
export function serviceDay(value) {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('INVALID_DATE')
 const d=new Date(value+'T00:00:00Z')
 if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==value)throw Error('INVALID_DATE')
 return value
}
export function bookingJourney(program,date,status='PENDING',returnDate=null) {
 serviceDay(date)
 const mode=program.journeyMode||'FIXED'
 if(mode==='RETURN_ONLY')return {outboundDate:null,returnDate:date,returnStatus:'OUR'}
 if(mode==='OUTBOUND_ONLY')return {outboundDate:date,returnDate:null,returnStatus:'NONE'}
 if(mode==='FIXED'){
  if(!Number.isInteger(program.durationDays)||program.durationDays<1||program.durationDays>366)throw Error('PROGRAM_DURATION_REQUIRED')
  return {outboundDate:date,returnDate:new Date(Date.parse(date)+(program.durationDays-1)*86400000).toISOString().slice(0,10),returnStatus:'OUR'}
 }
 if(mode!=='OPEN_RETURN'||!['PENDING','OUR','OTHER'].includes(status))throw Error('INVALID_RETURN_STATUS')
 if(status==='OUR'&&(!returnDate||serviceDay(returnDate)<date))throw Error('INVALID_RETURN_DATE')
 return {outboundDate:date,returnDate:status==='OUR'?returnDate:null,returnStatus:status}
}
function satang(value){if(value==null||!/^\d+(\.\d{1,2})?$/.test(String(value)))return null;const [a,b='']=String(value).split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'))}
const amount=n=>n==null?null:`${n/100n}.${String(n%100n).padStart(2,'0')}`
export function bookingQuote(booking){
 let base=0n,credit=0n,addons=0n
 const add=(value,qty)=>{if(!Number.isSafeInteger(Number(qty))||Number(qty)<0)return null;if(!Number(qty))return 0n;const n=satang(value);return n==null?null:n*BigInt(qty)}
 for(const [v,q]of [[booking.adultPrice,booking.adults],[booking.childPrice,booking.children]]){const n=add(v,q);base=n==null||base==null?null:base+n}
 for(const line of booking.lines||[]){
  if(line.selected!==false&&!line.included){const n=add(line.unitPrice,line.quantity);addons=n==null||addons==null?null:addons+n}
  if(line.selected===false&&line.included){const n=add(line.removalCredit??line.snapshot?.removalCredit,line.quantity);credit=n==null||credit==null?null:credit+n}
 }
 const total=[base,credit,addons].some(n=>n==null)?null:base+addons-credit
 return {base:amount(base),credit:amount(credit),addons:amount(addons),total:total==null||total<0n?null:amount(total)}
}
export const specialRequirements=['VEGAN','VEGETARIAN','OWN_TENT','OWN_BUNGALOW','NO_MEALS','NO_PARK_FEE','NO_TRANSFER','OTHER']
