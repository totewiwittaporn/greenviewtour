import { operationAccess } from '../../../../packages/contracts/operation-access.js'
import { addressKeys } from '../../../../packages/contracts/address.js'
import { managementScope } from './user-management.js'
export const roles = {
  ADMIN_MANAGER: 'Admin Manager', MANAGER: 'Manager', BOOKING: 'Booking', ACCOUNT: 'Account',
  GUIDE: 'Guide', ASSISTANT_TOUR_GUIDE: 'Assistant tour guide', CAPTAIN: 'Captain',
  ASSISTANT_CAPTAIN: 'Assistant Captain', DRIVER: 'Driver', HEAD_BOOKING: 'Head Booking',
  HEAD_GUIDE: 'Head Guide', HEAD_CAPTAIN: 'Head Captain', HEAD_DRIVER: 'Head Driver',
}
export const permissionDefinitions = {
  'users.profile.edit': 'Edit account profile within delegated department',
  'profile.read': 'Read own account', 'users.read': 'Read company user directory',
  'users.invite': 'Invite ordinary staff', 'users.roles': 'Assign ordinary roles',
  'users.suspend': 'Suspend ordinary staff', 'managers.manage': 'Manage Manager accounts',
  'administrators.manage': 'Manage Admin Manager grants', 'audit.read': 'Read account audit events',
}
export function grantsFor(role) {
  if (role === 'ADMIN_MANAGER') return Object.keys(permissionDefinitions)
  if (role === 'MANAGER') return ['users.profile.edit', 'profile.read', 'users.read', 'users.invite', 'users.roles', 'users.suspend', 'audit.read']
  if (['HEAD_BOOKING','HEAD_GUIDE','HEAD_CAPTAIN','HEAD_DRIVER'].includes(role)) return ['profile.read','users.read','users.profile.edit']
  return ['profile.read']
}
export function can(profile, permission, scope = 'COMPANY') {
  return profile?.status === 'ACTIVE' && profile.roles.some(grant =>
    grant.scope === scope && grant.role.permissions.some(item => item.permissionCode === permission))
}
export const profileInclude = { roles: { include: { role: { include: { permissions: true } } } } }
export function publicProfile(profile, email) {
  return { ...Object.fromEntries(addressKeys.map(key=>[key,profile[key]])), id: profile.id, email, displayName: profile.displayName, status: profile.status, department: profile.department, updatedAt: profile.updatedAt, createdAt: profile.createdAt, address: profile.address, primaryPhone: profile.primaryPhone, emergencyPhone: profile.emergencyPhone, lineId: profile.lineId, management: managementScope(profile), operations: operationAccess(profile),
    roles: profile.roles.map(item => ({ code: item.roleCode, name: item.role.name, scope: item.scope })),
    permissions: [...new Set(profile.roles.flatMap(grant => grant.role.permissions.map(item => `${item.permissionCode}:${grant.scope}`)))],
  }
}
