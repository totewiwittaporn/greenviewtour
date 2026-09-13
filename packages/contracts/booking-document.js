// Decimal money arithmetic uses integer satang. Unknown prices never become zero.
import { bookingQuote } from './booking-plan.js'
export const bookingAmount = booking => bookingQuote(booking).total
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
