import { dutyPermissions, effectiveAccess, isManager } from './access.js'
export function operationAccess(profile) {
 return {manager:Boolean(isManager(profile)),...Object.fromEntries(Object.keys(dutyPermissions).map(key=>[key,effectiveAccess(profile,`operations.${key}`).allowed]))}
}
