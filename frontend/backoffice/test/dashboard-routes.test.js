import test from 'node:test'
import assert from 'node:assert/strict'
import { workspaceRoute } from '../src/core/navigation/workspaceRoutes.js'
test('root and dashboard share one canonical workspace route; existing destinations survive', () => {
 for (const path of ['/', '/dashboard', '/dashboard/']) assert.deepEqual(workspaceRoute(path), { kind: 'dashboard', title: 'Dashboard', path: '/dashboard' })
 for (const path of ['/settings/users', '/operations/bookings', '/operations/guide', '/operations/driver', '/operations/guide-assignments', '/company/maintenance', '/company/expenses', '/profile']) assert.equal(workspaceRoute(path).path, path)
 assert.equal(workspaceRoute('/missing-page'), null)
})
