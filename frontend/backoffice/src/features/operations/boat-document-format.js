import { formatDate } from '../../core/i18n/runtime.js'
export const countGuests = rows => ({ adults:rows.reduce((n,a)=>n+a.adults,0), children:rows.reduce((n,a)=>n+a.children,0) })
export const legName = leg => leg === 'RETURN' ? 'Return' : 'Outbound'
export const documentDay = value => value ? formatDate(value,{day:'2-digit',month:'short',year:'numeric'},'en') : 'Not set'
export function documentDateCode(value) {
 if (!value) return 'UNDATED'
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]))
 return parts.year+parts.month+parts.day
}
