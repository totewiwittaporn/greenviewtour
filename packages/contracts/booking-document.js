// Decimal money arithmetic uses integer satang. Unknown prices never become zero.
export function bookingAmount(booking) {
 let total=0n
 for(const [value,quantity] of [[booking.adultPrice,booking.adults],[booking.childPrice,booking.children],...(booking.lines||[]).filter(l=>l.selected!==false&&!l.included).map(l=>[l.unitPrice,l.quantity])]) {
  if(!quantity)continue
  if(value==null||!/^\d+(\.\d{1,2})?$/.test(String(value)))return null
  const [whole,fraction='']=String(value).split('.')
  total+=(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')))*BigInt(quantity)
 }
 return `${total/100n}.${String(total%100n).padStart(2,'0')}`
}
export function dailyBookingSummary(rows) {
 const programs=new Map(),payments=new Map();let adults=0,children=0,collect=0n,unknown=0
 for(const r of rows){
  adults+=r.adults;children+=r.children
  const p=programs.get(r.programId)||{name:r.programName,adults:0,children:0};p.adults+=r.adults;p.children+=r.children;programs.set(r.programId,p)
  const pay=payments.get(r.paymentTerms)||{terms:r.paymentTerms,bookings:0,guests:0};pay.bookings++;pay.guests+=r.adults+r.children;payments.set(r.paymentTerms,pay)
  if(r.paymentTerms==='COUNTER'){if(r.collectAmount==null)unknown++;else collect+=BigInt(r.collectAmount.replace('.',''))}
 }
 return {bookings:rows.length,adults,children,guests:adults+children,programs:[...programs.values()],payments:[...payments.values()],collectAmount:`${collect/100n}.${String(collect%100n).padStart(2,'0')}`,unknownPrices:unknown}
}
