import test from 'node:test'
import assert from 'node:assert/strict'
import { operationHref } from '../src/core/navigation/operationContext.js'
test('service date follows dispatch and preparation, but vehicle ids do not', () => {
  assert.equal(operationHref('/operations/guide', '/operations/driver?date=2026-09-20&runId=vehicle'), '/operations/guide?date=2026-09-20')
  assert.equal(operationHref('/operations/stock?date=2026-09-13&runId=old', '/operations/guide?date=2026-09-20'), '/operations/stock?date=2026-09-20')
  assert.equal(operationHref('/operations/issues', '/operations/stock?date=2026-09-20&runId=boat'), '/operations/issues?date=2026-09-20&runId=boat')
  assert.equal(operationHref('/users', '/operations/stock?date=2026-09-20'), '/users')
})
