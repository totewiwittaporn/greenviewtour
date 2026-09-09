import { operationCatalog } from '../../../../../packages/contracts/operations.js'
export const operationGroups = [
 {id:'booking',label:'Booking',icon:'calendar',capability:'booking',entities:['bookings','trips','daily-close']},
 {id:'guide',label:'Guide operations',icon:'globe',capability:'guide',entities:['guide','slots']},
 {id:'driver',label:'Driver operations',icon:'briefcase',capability:'driver',entities:['driver']},
 {id:'stock',label:'Stock operations',icon:'grid',capability:'stock',entities:['stock','issues','movements']},
]
export const operationTitles={...Object.fromEntries(Object.entries(operationCatalog).map(([key,value])=>[key,value.title])),'daily-close':'Daily summaries',guide:'Boat assignments',driver:'Transfer assignments',bookings:'Bookings',stock:'Stock balances',issues:'Issued items',movements:'Stock movements'}
