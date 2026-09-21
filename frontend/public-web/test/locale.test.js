import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {messages,thaiMessages,pageTitle} from '../src/core/locale.js'

test('public titles follow locale and route with a Thai fallback',()=>{
  assert.equal(pageTitle('en','/tours'),'Tours | Greenview Tour')
  assert.equal(pageTitle('en','/promotions'),'Tour promotions | Greenview Tour')
  assert.match(pageTitle('en','/'),/Surin Islands/)
  assert.equal(pageTitle('invalid','/unknown'),pageTitle('th','/'))
  assert.notEqual(pageTitle('th','/tours'),pageTitle('en','/tours'))
})

test('every static translation reference has both language variants',()=>{
  for(const file of ['features/home/HomePage.jsx','features/catalog/Catalog.jsx','features/catalog/PublishedHighlights.jsx','features/catalog/Popup.jsx','core/ui/Controls.jsx','core/ui/SiteNavigation.jsx']) {
    const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8')
    for(const match of source.matchAll(/\bt\(["']([^"']+)["']\)/g)) {
      const key=match[1]
      assert.ok(messages[key],file+': missing English '+key)
      assert.ok(/[\u0e00-\u0e7f]/.test(key)||thaiMessages[key],file+': missing Thai '+key)
    }
  }
})
