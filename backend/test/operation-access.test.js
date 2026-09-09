import test from 'node:test'
import assert from 'node:assert/strict'
import { operationAccess } from '../../packages/contracts/operation-access.js'
const profile = (roleCode, scope = 'SELF', status = 'ACTIVE') => ({ status, roles: [{ roleCode, scope }] })
test('Booking, Guide and Head Driver have independent operational duties', () => {
  const booking = operationAccess(profile('BOOKING'))
  assert.equal(booking.booking, true); assert.equal(booking.manageGuide, false); assert.equal(booking.manageDriver, false); assert.equal(booking.stock, false)
  const guide = operationAccess(profile('GUIDE'))
  assert.equal(guide.manageGuide, true); assert.equal(guide.booking, false); assert.equal(guide.manageDriver, false)
  const headDriver = operationAccess(profile('HEAD_DRIVER'))
  assert.equal(headDriver.manageDriver, true); assert.equal(headDriver.manageGuide, false); assert.equal(headDriver.booking, false)
})
test('Ordinary crew have job-read eligibility but no dispatch or directory override', () => {
  const driver = operationAccess(profile('DRIVER')), captain = operationAccess(profile('CAPTAIN'))
  assert.equal(driver.driver, true); assert.equal(driver.manageDriver, false); assert.equal(driver.manager, false)
  assert.equal(captain.guide, true); assert.equal(captain.manageGuide, false); assert.equal(captain.booking, false)
})
test('Suspended accounts and SELF-only management grants cannot gain manager override', () => {
  assert.ok(Object.values(operationAccess(profile('MANAGER', 'COMPANY', 'SUSPENDED'))).every(value => value === false))
  assert.equal(operationAccess(profile('MANAGER')).manager, false)
  assert.ok(Object.values(operationAccess(profile('MANAGER', 'COMPANY'))).every(value => value === true))
})
