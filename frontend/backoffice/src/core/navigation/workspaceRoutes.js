import { catalog } from '../../../../../packages/contracts/catalog.js'
import { settingsGroups } from '../../features/settings/shared/settingsGroups.js'
import { operationGroups, operationTitles } from '../../features/operations/operationGroups.js'

const settingsEntities = new Set(settingsGroups.flatMap(group => group.entities))
export const normalizePath = path => path.replace(/\/+$/, '') || '/'
export function workspaceRoute(pathname) {
 const path = normalizePath(pathname)
 if (path === '/') return { kind: 'home', title: 'Workspace', path }
 if (path === '/profile') return { kind: 'profile', title: 'Edit profile', path }
 if (path === '/settings/users') return { kind: 'users', title: 'Users', path }
 const [, scope, entity, extra] = path.split('/')
 if (extra !== undefined) return null
 if ((scope === 'settings' || scope === 'operations') && settingsEntities.has(entity)) return {kind:'settings',entity,title:catalog[entity].title,path:`/settings/${entity}`}
 const group = scope === 'operations' && operationGroups.find(item => item.entities.includes(entity))
 return group ? {kind:'operations',entity,group,title:operationTitles[entity],path} : null
}
export const canUseOperation = (user, group) => Boolean(user?.management?.company || (!group.managerOnly && (user?.operations?.[group.capability] || (group.id==='booking' && user?.operations?.islandBooking))))
