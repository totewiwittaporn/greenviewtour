import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { activateLocale, tableHeading, translate, translateLabel } from '../src/core/i18n/runtime.js'
test('table headings remain English while controls and page headings still change locale',()=>{
 for(const locale of ['en','th']){
  activateLocale(locale)
  assert.equal(tableHeading('Agent / Group'),'Agent / Group')
  assert.equal(tableHeading('Status'),'Status')
 }
 assert.equal(translate('Cancel'),'ยกเลิก')
 assert.match(translateLabel('Dashboard'),/Dashboard/)
 activateLocale('en')
})
test('core tables use the fixed heading owner, not bilingual labels, and keep localized tooltip',()=>{
 const source=readFileSync(new URL('../src/core/ui/DataTable.jsx',import.meta.url),'utf8')
 assert.match(source,/tableHeading\(typeof col/)
 assert.match(source,/lang="en"/)
 assert.match(source,/title=\{t\(typeof col/)
})
