import {dateOnly,fail} from './common.js'
export async function requireOpenServiceDays(tx,values){
 const dates=[...new Set(values.filter(Boolean).map(v=>typeof v==='string'?v.slice(0,10):v.toISOString().slice(0,10)))]
 if(dates.length&&await tx.serviceDayClose.count({where:{serviceDate:{in:dates.map(dateOnly)},status:'CLOSED'}}))fail('SERVICE_DAY_CLOSED')
}
