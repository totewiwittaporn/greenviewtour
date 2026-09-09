import { operationCatalog } from '../../../../../packages/contracts/operations.js'
export const operationGroups = [
 {id:'services',label:'Services',icon:'briefcase',entities:['services','components','slots']},
 {id:'assets',label:'Assets & Equipment',icon:'grid',entities:['equipment','consumables','stores','stock','issues','movements']},
 {id:'bookings',label:'Bookings & Trips',icon:'calendar',entities:['bookings','trips']},
]
export const operationTitles={...Object.fromEntries(Object.entries(operationCatalog).map(([key,value])=>[key,value.title])),bookings:'Bookings',stock:'Stock balances',issues:'Issued items',movements:'Stock movements'}
