// Presentation only. Every count, row and destination is authorized by the API.
const roles = [
 ['HEAD_BOOKING', 'booking-manager', 'Booking Manager Dashboard'],
 ['BOOKING', 'booking-assistant', 'Booking Assistant Dashboard'],
 ['HEAD_GUIDE', 'head-guide', 'Head Guide Dashboard'],
 ['GUIDE', 'guide', 'Guide Dashboard'],
 ['ASSISTANT_TOUR_GUIDE', 'assistant-guide', 'Assistant Tour Guide Dashboard'],
 ['HEAD_CAPTAIN', 'head-captain', 'Head Captain Dashboard'],
 ['CAPTAIN', 'captain', 'Captain Dashboard'],
 ['ASSISTANT_CAPTAIN', 'assistant-captain', 'Assistant Captain Dashboard'],
 ['HEAD_DRIVER', 'head-driver', 'Head Driver Dashboard'],
 ['DRIVER', 'driver', 'Driver Dashboard'],
 ['HEAD_HOUSEKEEPING', 'head-housekeeping', 'Head Housekeeping Dashboard'],
 ['HOUSEKEEPING', 'housekeeping', 'Housekeeping Dashboard'],
 ['ACCOUNT', 'account', 'Account Dashboard'],
 ['SALES', 'sales', 'Sales Dashboard'],
]
export const dashboardTitles = Object.fromEntries(roles.map(([, persona, title]) => [persona, title]))
dashboardTitles.programmer = 'Programmer / System Administrator Dashboard'
dashboardTitles.gm = 'General Manager Dashboard'
dashboardTitles.staff = 'My Work Dashboard'
export function dashboardPersona(user) {
 if (user?.status !== 'ACTIVE') return null
 const grants = (user.roles || []).filter(r => ['SELF', 'COMPANY'].includes(r.scope))
 if (grants.some(r => r.scope === 'COMPANY' && (r.roleCode || r.code) === 'ADMIN_MANAGER')) return 'programmer'
 if (grants.some(r => r.scope === 'COMPANY' && (r.roleCode || r.code) === 'MANAGER')) return 'gm'
 return roles.find(([code]) => grants.some(r => (r.roleCode || r.code) === code))?.[1] || 'staff'
}
