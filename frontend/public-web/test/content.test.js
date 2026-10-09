import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {publicInfoRoutes, publicInfo, ownsPublicPath, normalizePublicPath} from '../src/core/publicRoutes.js'
import {contentPages, editorialCopy} from '../src/features/content/pages.js'
import {pageTitle} from '../src/core/locale.js'
const editorialRoutes=Object.fromEntries(Object.entries(publicInfoRoutes).filter(([path])=>path!=='/information'))

test('23 editorial paths have complete bilingual sections and unique document anchors', () => {
  assert.equal(Object.keys(editorialRoutes).length, 23)
  assert.deepEqual(Object.keys(contentPages).sort(), Object.keys(editorialRoutes).sort())
  for (const [path, page] of Object.entries(contentPages)) {
    assert.ok(page.sections.length >= 2)
    assert.equal(new Set(page.sections.map(section => section.id)).size, page.sections.length)
    for (const section of page.sections) {
      assert.match(section.id, /^[a-z][a-z-]+$/)
      for (const locale of ['th', 'en']) {
        assert.ok(section.title[locale].length > 5)
        assert.ok(section.paragraphs[locale].every(text => text.length > 30))
      }
      assert.equal(section.paragraphs.th.length, section.paragraphs.en.length)
    }
    assert.ok(['surin-hero.webp', 'surin-coral.webp'].includes(page.image))
    for (const locale of ['th', 'en']) assert.ok(publicInfoRoutes[path].description[locale].length > 50)
  }
  for (const copy of Object.values(editorialCopy)) assert.ok(copy.th && copy.en)
})
test('legacy FAQ/contact paths keep trailing-slash support without taking over unowned URLs', () => {
  for (const path of ['/faq/', '/contact-us/', '/surin-islands/travel-guide/']) {
    assert.equal(ownsPublicPath(path), true)
    assert.ok(publicInfo(path))
    assert.equal(normalizePublicPath(path), path.slice(0, -1))
  }
  for (const path of ['/api/public/company', '/admin', '/surin-islands/unknown']) assert.equal(ownsPublicPath(path), false)
  assert.equal(normalizePublicPath('/'), '/')
})
test('editorial titles are localized and distinct while commercial titles remain unchanged', () => {
  for (const locale of ['th', 'en']) {
    const titles = Object.keys(editorialRoutes).map(path => pageTitle(locale, path))
    assert.equal(new Set(titles).size, 23)
    assert.ok(titles.every(title => title.includes('Greenview Tour')))
  }
  assert.notEqual(pageTitle('th', '/faq'), pageTitle('en', '/faq'))
  assert.equal(pageTitle('en', '/tours'), 'Tours | Greenview Tour')
})
test('editorial copy contains no stale contact, payment account, fake staff or guaranteed availability', () => {
  const text = JSON.stringify(contentPages)
  assert.doesNotMatch(text, /0954266847|greenviewtour99@gmail|Jacob Jones|Jane Cooper|Ecoland|sk_live_/)
  const component = readFileSync(new URL('../src/features/content/ContentPage.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/)
  assert.equal(contentPages['/faq'].sections.length, 8)
  assert.match(contentPages['/faq'].sections[0].paragraphs.en[0], /not confirmation/)
  assert.ok(contentPages['/contact-us'].contact && contentPages['/about'].contact)
})

test('Information is a hub and preserves all five existing editorial URLs',()=>{
 assert.equal(ownsPublicPath('/information/'),true)
 assert.equal(pageTitle('en','/information'),'Information | Greenview Tour')
 assert.equal(Object.keys(publicInfoRoutes).length,24)
 for(const path of ['/about','/surin-islands','/surin-islands/travel-guide','/faq','/contact-us'])assert.ok(contentPages[path])
 const source=readFileSync(new URL('../src/core/ui/SiteNavigation.jsx',import.meta.url),'utf8')
 assert.ok(source.includes("const links=[['/','หน้าแรก'],['/tours','โปรแกรมทัวร์'],['/information','ข้อมูลการท่องเที่ยว']]"))
 assert.equal(source.includes('customerLogin'),false)
 assert.equal(source.includes('<CustomerAccess/>'),false)
 assert.ok(source.includes('className="staff-login"'))
})

test('20 reviewed Surin articles retain concise bilingual copy and curated related links', () => {
  const suffixes = ['', '/getting-there', '/piers', '/best-time', '/weather', '/how-many-days', '/costs', '/accommodation', '/facilities', '/snorkeling', '/beginner-snorkeling', '/marine-life', '/coral-reefs', '/beaches', '/moken-community', '/with-children', '/travel-guide', '/park-rules', '/responsible-travel', '/surin-vs-similan']
  const paths = suffixes.map(suffix => '/surin-islands' + suffix)
  assert.deepEqual(Object.keys(contentPages).filter(path => path.startsWith('/surin-islands')).sort(), paths.sort())
  for (const path of paths) {
    const page = contentPages[path]
    assert.equal(page.sections.length, 2)
    assert.equal(page.reviewed.en, 'Content reviewed 9 October 2026')
    assert.equal(page.reviewed.th, 'ตรวจเนื้อหา 9 ตุลาคม 2026')
    assert.equal(page.homeAnchor, 'surin')
    assert.equal(page.source, undefined, 'Do not use the legacy fixed TAT label')
    assert.ok(page.relatedPaths.length >= 2 && page.relatedPaths.length <= 3)
    assert.equal(new Set(page.relatedPaths).size, page.relatedPaths.length)
    for (const related of page.relatedPaths) assert.ok(related !== path && paths.includes(related))
    for (const section of page.sections) for (const locale of ['th', 'en']) assert.equal(section.paragraphs[locale].length, 1)
    assert.ok(page.sources.length > 0)
    for (const source of page.sources) {
      assert.equal(new URL(source.url).protocol, 'https:')
      assert.ok(!source.url.includes('&amp;'), 'HTML entities must be decoded in href values')
      assert.ok(source.label.th.length > 5 && source.label.en.length > 5)
      if (source.url.includes('news.dnp.go.th')) {
        assert.match(source.label.en, /historical.*26 December 2021.*not current/)
        assert.match(source.label.th, /ย้อนหลัง.*2021.*ไม่ใช่/)
      }
      if (!source.url.includes('tourismthailand.org')) assert.doesNotMatch(source.label.en, /Tourism Authority of Thailand/)
    }
  }
  assert.equal(paths.reduce((total, path) => total + contentPages[path].relatedPaths.length, 0), 52)
})

test('phase-one guidance uses staff confirmation and does not direct customers to Member payments',()=>{
 const faq=contentPages['/faq'],contact=contentPages['/contact-us']
 const confirmation=faq.sections.find(section=>section.id==='request-confirmation')
 const payment=faq.sections.find(section=>section.id==='payment')
 assert.match(confirmation.paragraphs.en[0],/Member self-service booking is not currently available/)
 assert.match(payment.paragraphs.en[0],/Online payment is not currently available/)
 assert.match(confirmation.paragraphs.th[0],/ยังไม่เปิดจองผ่านบัญชีสมาชิก/)
 assert.match(payment.paragraphs.th[0],/ยังไม่มีระบบชำระเงินออนไลน์/)
 assert.equal(contact.sections[1].paragraphs.en[1].includes('system’s designated channels'),false)
 for(const page of [faq,contact])assert.equal(page.reviewed.en,'Content reviewed 1 October 2026')
})
