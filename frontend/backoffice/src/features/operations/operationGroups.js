import { operationCatalog } from '../../../../../packages/contracts/operations.js'
export const operationGroups = [
 {id:'booking',label:'Booking',icon:'calendar',capability:'booking',entities:['bookings']},
 {id:'driver',label:'Driver',icon:'briefcase',capability:'driver',section:'Operations',entities:['driver']},
 {id:'guide',label:'Boat',icon:'globe',capability:'guide',section:'Operations',entities:['guide']},
 {id:'stock',label:'Stock',icon:'grid',capability:'stock',section:'Operations',entities:['stock','issues']},
 {id:'schedules',label:'Schedules',icon:'calendar',capability:'booking',entities:['trips','slots']},
 {id:'stock-history',label:'Inventory',icon:'grid',capability:'stock',managerOnly:true,entities:['inventory','movements']},
 {id:'daily-summary',label:'Daily summaries',icon:'grid',capability:'booking',entities:['daily-close']},
]
export const operationTitles={...Object.fromEntries(Object.entries(operationCatalog).map(([key,value])=>[key,value.title])),'daily-close':'Daily summaries',guide:'Boat assignments',driver:'Transfer assignments',bookings:'Bookings',stock:'Supplies · ของใช้',issues:'Loans & returns · ยืมของใช้',inventory:'Stock balances',movements:'Stock movements'}
