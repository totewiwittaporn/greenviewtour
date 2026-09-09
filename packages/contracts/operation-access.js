// Operational duties are separate from user-directory / settings permissions.
export function operationAccess(profile) {
  const active = profile?.status === 'ACTIVE'
  const roles = active ? (profile.roles || []).filter(g => ['SELF', 'COMPANY'].includes(g.scope)).map(g => g.roleCode || g.code) : []
  const manager = active && (profile.roles || []).some(g => g.scope === 'COMPANY' && ['ADMIN_MANAGER', 'MANAGER'].includes(g.roleCode || g.code))
  const has = codes => manager || roles.some(role => codes.includes(role))
  return {
    manager: Boolean(manager),
    booking: has(['BOOKING', 'HEAD_BOOKING']),
    guide: has(['GUIDE', 'HEAD_GUIDE', 'ASSISTANT_TOUR_GUIDE', 'CAPTAIN', 'HEAD_CAPTAIN', 'ASSISTANT_CAPTAIN']),
    manageGuide: has(['GUIDE', 'HEAD_GUIDE']),
    driver: has(['DRIVER', 'HEAD_DRIVER']),
    manageDriver: has(['HEAD_DRIVER']),
    prepareStock: has(['GUIDE', 'HEAD_GUIDE', 'ASSISTANT_TOUR_GUIDE']),
    islandBooking: has(['BOOKING', 'HEAD_BOOKING', 'GUIDE', 'HEAD_GUIDE', 'ASSISTANT_TOUR_GUIDE']),
    stock: Boolean(manager),
  }
}
