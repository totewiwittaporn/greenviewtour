import { catalog } from '../../../../../packages/contracts/catalog.js'
import {companyRoutes} from '../../../../../packages/contracts/company-routes.js'
import { settingsGroups } from '../../features/settings/shared/settingsGroups.js'
import { operationGroups, operationTitles } from '../../features/operations/operationGroups.js'

const settingsEntities = new Set(settingsGroups.flatMap(group => group.entities))
export const normalizePath = path => path.replace(/\/+$/, '') || '/'
export function workspaceRoute(pathname) {
 const path = normalizePath(pathname)
 if (path === '/' || path === '/dashboard') return { kind: 'dashboard', title: 'Dashboard', path: '/dashboard' }
 if (path === '/customers') return {kind:'legacy-customers',title:'Customers',path}
 if (path === '/settings/customers') return {kind:'customers',title:'Customers',path}
 if (path === '/manuals') return {kind:'manuals',title:'User guides',path,role:null}
 const manualMatch=path.match(/^\/manuals\/([^/]+)$/)
 if(manualMatch)return {kind:'manuals',title:'User guides',path,role:manualMatch[1]}
 if (path === '/profile') return { kind: 'profile', title: 'Edit profile', path }
 if (path === '/settings/users') return { kind: 'users', title: 'Users', path }
 const tourEditor=path.match(/^\/settings\/tours\/(new|[0-9a-f-]{36})$/i)
 if(tourEditor)return {kind:'tour-editor',entity:'tours',tourId:tourEditor[1],title:'Tour program',path}
 const [, scope, entity, extra] = path.split('/')
 if (extra !== undefined) return null
 if(scope==='company'&&Object.hasOwn(companyRoutes,entity))return {kind:'company',entity,definition:companyRoutes[entity],title:companyRoutes[entity].title,path}
 if ((scope === 'settings' || scope === 'operations') && settingsEntities.has(entity)) return {kind:'settings',entity,title:catalog[entity].title,path:`/settings/${entity}`}
 const group = scope === 'operations' && operationGroups.find(item => item.entities.includes(entity))
 return group ? {kind:'operations',entity,group,title:operationTitles[entity],path} : null
}
export const canUseOperation = (user, group) => Boolean((!group.managerOnly || user?.management?.company) && (user?.operations?.[group.capability] || group.anyCapabilities?.some(key=>user?.operations?.[key]) || (group.id==='booking' && (user?.operations?.islandBooking || user?.management?.company))))
