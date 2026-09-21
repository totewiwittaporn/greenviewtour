import test from 'node:test'
import assert from 'node:assert/strict'
import {activateLocale, translate, readLocale, formatDate, formatNumber} from '../src/core/i18n/runtime.js'
import {catalog, labelFor} from '../../../packages/contracts/catalog.js'
import {workDefinitions, workStatusNames} from '../../../packages/contracts/company-work.js'
import {personnelFinanceKinds} from '../../../packages/contracts/personnel-finance.js'
import {accessDefinitions, roleNames} from '../../../packages/contracts/access.js'
import {operationGroups,operationTitles} from '../src/features/operations/operationGroups.js'
import {settingsGroups} from '../src/features/settings/shared/settingsGroups.js'
import {companyRoutes} from '../../../packages/contracts/company-routes.js'

test('localization preserves unknown text and record values, interpolates values verbatim', () => {
  assert.equal(translate('CUSTOMER-001', {}, 'th'), 'CUSTOMER-001')
  assert.equal(translate('ชื่อโปรแกรมจริง', {}, 'en'), 'ชื่อโปรแกรมจริง')
  assert.equal(translate('Page {page} of {pages}', {page:3,pages:8}, 'th'), 'หน้า 3 จาก 8')
  assert.equal(translate('Enter {label}', {label:'Name <script>'}, 'th'), 'กรอกName <script>')
  assert.equal(translate(undefined, {}, 'th'), undefined)
})
test('locale activation validates values and storage denial retains an English fallback', () => {
  assert.equal(readLocale(), 'en')
  activateLocale('th')
  assert.equal(translate('Dashboard'), 'ภาพรวมงาน')
  activateLocale('unsupported')
  assert.equal(translate('Dashboard'), 'ภาพรวมงาน')
  activateLocale('en')
  assert.equal(translate('Dashboard'), 'Dashboard')
})
test('date-only values do not move across time zones or change the business year', () => {
  assert.match(formatDate('2026-09-21', {year:'numeric',month:'long',day:'numeric'}, 'th'), /2026/)
  assert.match(formatDate('2026-09-21', {year:'numeric',month:'long',day:'numeric'}, 'th'), /กันยายน/)
  assert.equal(formatDate('2026-09-21', {year:'numeric',month:'long',day:'numeric'}, 'en'), '21 September 2026')
  assert.equal(formatDate('invalid', {}, 'th'), '—')
  assert.equal(formatNumber(1234.5, {minimumFractionDigits:2}, 'en'), '1,234.50')
})
test('catalog field names, status choices and company navigation have Thai translations', () => {
  const labels = new Set(Object.values(companyRoutes).map(route=>route.title))
  for (const definition of Object.values(catalog)) {
    labels.add(definition.title)
    for (const field of definition.fields) {
      labels.add(field.label)
      for (const option of field.options || []) labels.add(labelFor(option))
    }
  }
  for (const definition of Object.values(workDefinitions)) { labels.add(definition.title); for (const field of definition.fields) labels.add(field.label) }
  for (const definition of Object.values(personnelFinanceKinds)) { labels.add(definition.title); for (const field of definition.fields) labels.add(field[1]) }
  for (const label of [...Object.values(workStatusNames),...Object.values(roleNames),...Object.values(accessDefinitions).map(value=>value.label)]) labels.add(label)
  for (const label of [...Object.values(operationTitles),...operationGroups.map(x=>x.label),...settingsGroups.map(x=>x.label)]) labels.add(label)
  for (const label of labels) {
    if (!label || label === 'Greenview Tour') continue
    assert.notEqual(translate(label, {}, 'th'), label, `Missing Thai UI translation: ${label}`)
  }
})
