import {canManageBookingTeam} from '../../../../../packages/contracts/access.js'
// Navigation projections only; the existing API remains the authorization boundary.
export const canReadBookingList = user => Boolean(user?.operations?.booking || user?.operations?.islandBooking)
export const canReviewCustomerRequests = user => Boolean(user?.management?.company||canManageBookingTeam(user))
export function bookingTabs(user) {
 return [
  ...(canReadBookingList(user) ? [{id:'',label:'All bookings'},{id:'DIRECT',label:'Direct bookings'},{id:'AGENT',label:'Agent bookings'}] : []),
  ...(canReviewCustomerRequests(user) ? [{id:'requests',label:'Customer requests'}] : []),
 ]
}
export function bookingTab(search) {
 const params = new URLSearchParams(search)
 return params.get('tab') === 'requests' ? 'requests' : ['DIRECT','AGENT'].includes(params.get('source')) ? params.get('source') : ''
}
export function bookingTabHref(tab, search = '') {
 const params = new URLSearchParams(search)
 params.delete('kind'); params.delete('bookingId'); params.delete('tab'); params.delete('source')
 if (tab === 'requests') { params.set('tab','requests'); params.delete('status') }
 else if (['DIRECT','AGENT'].includes(tab)) params.set('source',tab)
 return '/operations/bookings' + (params.size ? '?' + params : '')
}
export function legacyCustomersHref(user, search = '') {
 const params = new URLSearchParams(search), kind = params.get('tab') || params.get('kind')
 const requests = kind === 'requests' || kind !== 'customers' && canReviewCustomerRequests(user)
 if (requests) return bookingTabHref('requests',search)
 params.delete('tab'); params.delete('kind')
 return '/settings/customers' + (params.size ? '?' + params : '')
}
