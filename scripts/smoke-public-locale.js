
// Fixture-only public locale checks. All API requests are intercepted before network access.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const origin = process.env.GREENVIEW_PUBLIC_ORIGIN || 'http://localhost:5173'
const tour = {
  id:'locale-fixture',slug:'locale-fixture',name:'Tour CMS source',description:'Legacy CMS description',durationDays:1,ownership:'GREENVIEW',adultPrice:2500,childPrice:1500,
  tourType:'DAY_TRIP',journeyMode:'FIXED',homeBadge:'BEST_SELLER',confirmationMode:'REQUEST',operator:null,promotions:[],
  seasons:[{onlineStartsOn:'2026-09-21',onlineEndsOn:'2026-10-21',cutoffDays:2}],
  publicContent:[
    {locale:'th',name:'ทัวร์จาก CMS',summary:'เนื้อหาต้นฉบับ CMS',introduction:'เกริ่นนำภาษาไทย',longDescription:'รายละเอียดภาษาไทย',meetingPoint:'ท่าเรือกรีนวิว',suitableFor:'ครอบครัวและกลุ่มเพื่อน',weatherNotes:'ปรับตามสภาพทะเล',preparationNotes:'ชุดเล่นน้ำ',cancellationTerms:'ยกเลิกตามเงื่อนไข',inclusions:'เรือ\nอาหาร',exclusions:'ค่าธรรมเนียม',fees:'ค่าธรรมเนียมตามจริง',seoTitle:'ทัวร์เกาะสุรินทร์ CMS',metaDescription:'คำอธิบาย SEO ภาษาไทย'},
    {locale:'en',name:'CMS Surin Tour',summary:'Original CMS content',introduction:'English introduction',longDescription:'English long description',meetingPoint:'Greenview Tour Pier',suitableFor:'Families and friends',weatherNotes:'Subject to sea conditions',preparationNotes:'Swimwear',cancellationTerms:'Cancellation conditions apply',inclusions:'Boat\nLunch',exclusions:'Park fee',fees:'Official fees apply',seoTitle:'CMS Surin Tour',metaDescription:'English SEO description'}
  ],
  publicHighlights:[{id:'h1',sortOrder:0,titleTh:'ทะเลใส',titleEn:'Clear sea',descriptionTh:'จุดเด่นภาษาไทย',descriptionEn:'English highlight'}],
  itinerarySteps:[{id:'i1',day:1,sortOrder:0,timeLabel:'08:30',titleTh:'ออกเรือ',titleEn:'Departure',descriptionTh:'ออกจากคุระบุรี',descriptionEn:'Depart Khura Buri',locationTh:'คุระบุรี',locationEn:'Khura Buri'}],
  publicFaqs:[{id:'f1',sortOrder:0,questionTh:'รวมอาหารไหม?',answerTh:'รวมอาหารกลางวัน',questionEn:'Is lunch included?',answerEn:'Lunch is included.'}],
  publicMedia:[
    {id:'m1',sortOrder:0,kind:'HERO',url:'/images/home/surin-hero.webp',altTh:'ทะเลสุรินทร์',altEn:'Surin sea',captionTh:'ภาพหลัก',captionEn:'Hero view'},
    {id:'m2',sortOrder:1,kind:'GALLERY',url:'/images/home/surin-coral.webp',altTh:'ปะการังสุรินทร์',altEn:'Surin coral',captionTh:'แนวปะการัง',captionEn:'Coral view'},
  ],
  components:[
    {id:'component-required',selection:'REQUIRED',basis:'PER_PERSON',quantity:1,day:1,resource:{name:'Boat passage',category:'TOUR_BOAT',baseUnit:'PERSON',salePrice:'0'}},
    {id:'component-included',selection:'INCLUDED',basis:'PER_PERSON',quantity:1,day:1,resource:{name:'Lunch service',category:'MEAL',baseUnit:'PERSON_MEAL',salePrice:'0'}},
    {id:'component-excluded',selection:'EXCLUDED',basis:'PER_PERSON',quantity:1,day:1,resource:{name:'Park fee sample',category:'PARK_FEE',baseUnit:'PERSON',salePrice:'500'}},
    {id:'component-optional',selection:'OPTIONAL',basis:'PER_PERSON',quantity:1,day:1,resource:{name:'Hotel transfer',category:'TRANSFER',baseUnit:'PERSON',salePrice:'300'}},
  ]
}
const partner = {...tour,id:'partner-fixture',slug:'partner-fixture',name:'Partner CMS tour',ownership:'PARTNER',publicContent:tour.publicContent.map(row=>({...row,name:row.locale==='th'?'ทัวร์พันธมิตร CMS':'Partner CMS tour'}))}
const featuredTwo={...tour,id:'featured-two',slug:'featured-two',adultPrice:2900,homeBadge:'RECOMMENDED',publicContent:tour.publicContent.map(row=>({...row,name:row.locale==='th'?'ทัวร์ดำน้ำ CMS':'CMS Snorkel Explorer'}))}
const featuredThree={...tour,id:'featured-three',slug:'featured-three',adultPrice:4500,durationDays:2,tourType:'OVERNIGHT',homeBadge:'SIGNATURE',publicContent:tour.publicContent.map(row=>({...row,name:row.locale==='th'?'ทัวร์ค้างคืน CMS':'CMS Overnight Tour'}))}
let companyMode = 'ready'
let tourMode = 'ready'
let popupMode = false
const tourQueries = []
const company = {name: 'Greenview fixture company', address: 'Fixture address', phone: '+66 123 4567', email: 'fixture@example.com', mapUrl: 'https://maps.google.com/?q=Surin'}
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage()
  const errors = []
  const unexpectedApi = []
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/public/company') {
        if (companyMode === 'error') return route.fulfill({status: 503, json: {}})
        return route.fulfill({json: {company: companyMode === 'verified' ? {...company, mapUrl:'https://maps.app.goo.gl/1ErL2zJHXys3hdPX6'} : companyMode === 'empty' ? null : companyMode === 'unsafe' ? {...company, mapUrl: 'javascript:alert(1)'} : company}})
      }
      if (url.pathname === '/api/public/tours') {
        const ownership=url.searchParams.get('ownership'),featured=url.searchParams.get('featuredOnly')==='true'
        tourQueries.push(url.search)
        if(tourMode==='error'&&(ownership||featured))return route.fulfill({status:503,json:{}})
        const source=featured?[tour,featuredTwo,featuredThree]:ownership==='PARTNER'?[partner]:[tour]
        const duration=url.searchParams.get('duration')
        const rows=tourMode==='empty'&&(ownership||featured)?[]:source.filter(row=>!duration||(duration==='day'?row.durationDays===1:row.durationDays>1))
        return route.fulfill({json:{rows,page:tourMode==='paginated'?Number(url.searchParams.get('page')||1):1,total:tourMode==='paginated'?73:rows.length}})
      }
      if (url.pathname === '/api/public/popups') return route.fulfill({ json: { rows: popupMode ? [{id:'popup-fixture',version:1,frequency:'SESSION',title:'DEMO · ตรวจหน้าจอเท่านั้น',imageUrl:'/images/home/surin-hero.webp',imageAlt:'Demo popup'}] : [] } })
      unexpectedApi.push(url.pathname)
      return route.fulfill({ status: 404, json: { code: 'UNEXPECTED_FIXTURE_REQUEST' } })
    }
    if (url.origin !== new URL(origin).origin) return route.abort()
    return route.continue()
  })
  await page.goto(`${origin}/tours?tour=${tour.slug}`)
  await page.getByRole('heading',{name:'ทัวร์จาก CMS',exact:true}).waitFor()
  assert.equal(await page.locator('html').getAttribute('lang'),'th')
  assert.equal(await page.locator('h1').innerText(),'ทัวร์จาก CMS')
  const chooseLanguage=async code=>{
    await page.locator('.language-selector > button').click()
    await page.locator('.language-options button').filter({hasText:code}).click()
  }
  assert.match(await page.locator('.language-selector > button').innerText(),/TH/)
  await chooseLanguage('EN')
  await page.getByRole('heading',{name:'CMS Surin Tour',exact:true}).waitFor()
  await page.waitForFunction(()=>document.title==='CMS Surin Tour')
  assert.equal(await page.locator('html').getAttribute('lang'),'en')
  assert.equal(await page.evaluate(()=>localStorage.getItem('greenview.locale')),'en')
  const detailText=await page.locator('body').innerText()
  assert.ok(detailText.includes('Greenview Tour Pier'))
  assert.ok(detailText.includes('21 Sept 2026'))
  assert.ok(/(?:THB|฿)\s*2,500\.00/.test(detailText))
  assert.ok(detailText.includes('English introduction'))
  assert.ok(detailText.includes('Clear sea'))
  assert.ok(detailText.includes('Journey arrangement'))
  assert.ok(detailText.includes('Fixed return itinerary'))
  assert.ok(detailText.includes('Included · required'))
  assert.ok(detailText.includes('Optional services'))
  assert.ok(detailText.includes('Hotel transfer'))
  assert.ok(detailText.includes('Park fee sample'))
  assert.ok(/(?:THB|฿)\s*300\.00/.test(detailText))
  assert.ok(/(?:THB|฿)\s*500\.00/.test(detailText))
  assert.ok(detailText.includes('Is lunch included?'))
  const gallery=page.locator('.public-image-gallery')
  await gallery.waitFor();assert.equal(await gallery.getByRole('tab').count(),2)
  const mainImage=gallery.locator('.public-image-gallery-main img')
  assert.ok((await mainImage.getAttribute('src')).includes('surin-hero.webp'))
  await gallery.getByRole('tab').nth(1).click();assert.ok((await mainImage.getAttribute('src')).includes('surin-coral.webp'))
  await gallery.locator('.public-image-gallery-main').click();const preview=page.getByRole('dialog',{name:'Tour gallery',exact:true});await preview.waitFor();assert.ok((await preview.locator('figure img').getAttribute('src')).includes('surin-coral.webp'))
  await page.keyboard.press('ArrowLeft');assert.ok((await preview.locator('figure img').getAttribute('src')).includes('surin-hero.webp'));await preview.getByRole('button',{name:'Close image',exact:true}).click();assert.equal(await preview.count(),0)
  // Route changes retain the actual shell nodes and browser document, including query detail links.
  await page.evaluate(() => {
    window.shellFixture = {header: document.querySelector('.site-header'), footer: document.querySelector('.public-footer'), language: document.querySelector('.language-selector')}
  })
  const assertShell = async () => {
    assert.equal(await page.evaluate(() => Boolean(window.shellFixture && window.shellFixture.header === document.querySelector('.site-header') && window.shellFixture.footer === document.querySelector('.public-footer') && window.shellFixture.language === document.querySelector('.language-selector'))), true)
    assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  }
  await page.evaluate(() => {const link=document.createElement('a');link.href='/promotions';document.body.append(link);link.click();link.remove()})
  await page.getByRole('heading', {name: 'Tour promotions', exact: true}).waitFor()
  await assertShell()
  await page.locator('.public-main-nav a[href="/about"]').click()
  await page.waitForURL(`${origin}/about`)
  await page.getByRole('heading', {name: 'About Greenview Tour', exact: true}).waitFor()
  await assertShell()
  await page.locator('.editorial-home-link[href="/#company"]').click()
  await page.waitForURL(`${origin}/#company`)
  await page.waitForFunction(() => document.activeElement?.id === 'company')
  await page.waitForFunction(() => document.querySelector('#company').getBoundingClientRect().top < innerHeight)
  await assertShell()
  await page.locator('.public-main-nav a[href="/surin-islands"]').click()
  await page.waitForURL(`${origin}/surin-islands`)
  await page.getByRole('heading', {name: 'Discover the Surin Islands', exact: true}).waitFor()
  await assertShell()
  await page.locator('.editorial-home-link[href="/#surin"]').click()
  await page.waitForURL(`${origin}/#surin`)
  await page.waitForFunction(() => document.activeElement?.id === 'surin')
  await assertShell()
  await page.locator('.public-main-nav a[href="/tours"]').click()
  await page.getByRole('heading', {name: 'Tours', exact: true}).waitFor()
  await page.locator('.catalog-trip .catalog-outline-link[href="/tours?tour=locale-fixture"]').click()
  await page.waitForURL(`${origin}/tours?tour=locale-fixture`)
  await page.getByRole('heading',{name:'Tour overview',exact:true}).waitFor()
  await assertShell()
  await page.goBack()
  await page.waitForURL(`${origin}/tours`)
  await page.locator('.catalog-trip .catalog-outline-link[href="/tours?tour=locale-fixture"]').waitFor()
  await page.goForward()
  await page.waitForURL(`${origin}/tours?tour=locale-fixture`)
  await assertShell()
  // Modified clicks and explicit browser targets/downloads are never consumed by the router.
  const nativeChecks = await page.evaluate(() => {
    const results = []
    for (const setup of [{ctrlKey:true}, {metaKey:true}, {shiftKey:true}, {altKey:true}, {target:'_blank'}, {download:'tour'}, {href:'https://example.com/'}, {href:'/api/public/tours'}]) {
      const anchor = document.createElement('a')
      anchor.href = setup.href || '/tours'
      if (setup.target) anchor.target = setup.target
      if (setup.download) anchor.download = setup.download
      document.body.append(anchor)
      const event = new MouseEvent('click', {bubbles:true,cancelable:true,...setup})
      const observe = observed => { if(observed===event) { results.push(!observed.defaultPrevented); observed.preventDefault() } }
      document.addEventListener('click', observe)
      anchor.dispatchEvent(event)
      document.removeEventListener('click', observe)
      anchor.remove()
    }
    return results
  })
  assert.deepEqual(nativeChecks, Array(8).fill(true))
  await page.reload()
  await page.getByRole('heading',{name:'CMS Surin Tour',exact:true}).waitFor()
  await page.setViewportSize({width:375,height:812})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})))
  await page.waitForFunction(()=>document.documentElement.lang==='th'&&document.title==='ทัวร์เกาะสุรินทร์ CMS')
  await page.getByRole('heading',{name:'ทัวร์จาก CMS',exact:true}).waitFor()
  assert.ok((await page.locator('body').innerText()).includes('เนื้อหาต้นฉบับ CMS'))
  await chooseLanguage('EN')
  await page.goto(`${origin}/promotions`)
  await page.waitForFunction(() => document.title === 'Tour promotions | Greenview Tour')
  await page.goto(origin)
  await page.waitForFunction(() => document.title === 'Greenview Tour \u2014 Surin Islands trips')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  for (const locale of ['th','en']) {
    await chooseLanguage(locale.toUpperCase())
    for (const width of [320,390,834,1100,1440]) {
      await page.setViewportSize({width,height:900})
      for (const path of ['/', '/tours', '/promotions']) {
        await page.goto(`${origin}${path}`)
        if (path === '/') await page.locator('#company h3').waitFor()
        const language = page.locator('.language-selector > button')
        await language.waitFor()
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,`${locale} ${width} ${path} overflow`)
        const login=page.locator('.public-topbar-actions .customer-login')
        assert.equal(await login.getAttribute('href'),'http://localhost:5175/login')
        assert.equal(await login.innerText(),locale==='th'?'เข้าสู่ระบบ':'Login')
        const navigationText=await page.locator('.public-main-nav').innerText()
        if(locale==='th') assert.doesNotMatch(navigationText, /Tours|Promotions|Contact us|About Surin Islands/)
        assert.equal(await page.locator('.site-header .customer-login').count(),1)
        assert.equal(await page.locator('.customer-register').getAttribute('href'),'http://localhost:5175/login?mode=register')
        const account=page.locator('.public-account-toggle')
        if(width<=600){
          assert.equal(await account.isVisible(),true)
          assert.equal(await login.isVisible(),false)
          await account.focus()
          await page.keyboard.press('Enter')
          assert.equal(await login.isVisible(),true)
          assert.equal(await page.locator('.customer-register').isVisible(),true)
          await page.keyboard.press('Escape')
          assert.equal(await account.getAttribute('aria-expanded'),'false')
          assert.equal(await account.evaluate(el=>el===document.activeElement),true)
          await account.click()
          await page.locator('main').click({position:{x:8,y:180}})
          assert.equal(await login.isVisible(),false)
        }else{
          assert.equal(await account.isVisible(),false)
          assert.equal(await login.isVisible(),true)
          assert.equal(await page.locator('.customer-register').isVisible(),true)
        }
        assert.equal(await page.locator('.public-brand img').count(),2)
        assert.equal(await page.locator('.public-brand img').evaluateAll(nodes=>nodes.every(img=>img.complete && img.naturalWidth>0)),true)
        await language.click()
        await page.locator('.language-options').waitFor()
        await page.keyboard.press('Escape')
        assert.equal(await language.getAttribute('aria-expanded'),'false')
        assert.equal(await language.evaluate(el=>el===document.activeElement),true)
        await language.click()
        await page.locator('main').click({position:{x:8,y:180}})
        assert.equal(await page.locator('.language-options').count(),0)
        const hamburger=page.locator('.public-menu-toggle')
        if(width<=1100){
          assert.equal(await page.locator('.public-main-nav').isVisible(),false)
          await hamburger.click()
          assert.equal(await page.locator('.public-main-nav').isVisible(),true)
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false)
          await page.keyboard.press('Escape')
          assert.equal(await hamburger.getAttribute('aria-expanded'),'false')
          assert.equal(await hamburger.evaluate(el=>el===document.activeElement),true)
          await hamburger.focus()
          await page.keyboard.press('Enter')
          await page.evaluate(() => { window.mobileShell = document.querySelector('.site-header') })
          await page.locator('.public-main-nav a[href="/tours"]').click()
          await page.waitForURL(`${origin}/tours`)
          assert.equal(await page.evaluate(() => window.mobileShell === document.querySelector('.site-header')),true)
          assert.equal(await page.locator('.public-main-nav').isVisible(),false)
        }else{
          assert.equal(await hamburger.isVisible(),false)
          const links=await page.locator('.public-main-nav a').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top))
          assert.ok(links.every(top=>top===links[0]))
        }
      }
    }
  }
  await page.goto(origin)
  await page.locator('.public-footer').scrollIntoViewIfNeeded()
  const backTop = page.locator('.public-back-top')
  assert.equal(await backTop.evaluate(el => getComputedStyle(el).position), 'fixed')
  const staffLogin=page.locator('.public-footer-bottom .staff-login')
  await staffLogin.waitFor()
  assert.equal(await staffLogin.getAttribute('href'),'http://localhost:5174/login')
  assert.equal(await staffLogin.innerText(),'Staff login')
  assert.equal(await page.locator('.public-footer-bottom').evaluate(el=>getComputedStyle(el).display),'grid')
  assert.equal(await staffLogin.evaluate(el=>getComputedStyle(el).gridColumnStart),'2')
  await backTop.click()
  await page.waitForFunction(() => window.scrollY < 2)
  // Home consumes public company data and exactly three explicitly featured tours.
  await page.setViewportSize({width:1440,height:1000})
  await page.goto(origin)
  await page.locator('#company h3').waitFor()
  assert.equal(await page.locator('#company h3').innerText(),company.name)
  assert.deepEqual(await page.locator('main > section').evaluateAll(nodes=>nodes.map(n=>n.id||n.className)),['hero home-hero','tours','home-welcome home-container','surin','company','home-final-cta'])
  const homeEditorialImages=page.locator('.home-page>.hero .hero-image, .home-surin-layout>img')
  for(const image of await homeEditorialImages.all()){
    await image.scrollIntoViewIfNeeded();await image.evaluate(el=>el.decode());assert.ok(await image.evaluate(el=>el.naturalWidth>0))
  }
  assert.equal(await homeEditorialImages.count(),2)
  const featured=page.locator('.featured-tour-card')
  await featured.first().waitFor();assert.equal(await featured.count(),3)
  assert.deepEqual(await featured.locator('h3').allTextContents(),['CMS Surin Tour','CMS Snorkel Explorer','CMS Overnight Tour'])
  assert.ok((await featured.nth(0).innerText()).includes('Best seller'))
  assert.ok((await featured.nth(1).innerText()).includes('Recommended'))
  assert.ok((await featured.nth(2).innerText()).includes('Signature'))
  assert.ok(tourQueries.some(q=>{const p=new URLSearchParams(q);return p.get('featuredOnly')==='true'&&p.get('pageSize')==='3'}))
  assert.equal(await page.locator('.published-highlight-options').count(),0)
  assert.equal(await page.locator('.home-all-tours').getAttribute('href'),'/tours')
  await page.evaluate(()=>{window.homeShell=document.querySelector('.site-header')})
  await page.locator('.home-all-tours').click()
  await page.waitForURL(`${origin}/tours`)
  await page.getByRole('heading',{name:'Tours',exact:true}).waitFor()
  assert.equal(await page.evaluate(()=>window.homeShell===document.querySelector('.site-header')),true)
  companyMode = 'verified'
  await page.goto(origin)
  const mapOptions = page.locator('.home-map-options button')
  await mapOptions.first().waitFor()
  const regionSource = await page.locator('.home-location-map').getAttribute('src')
  assert.ok(regionSource.includes('!1m10!'))
  await mapOptions.nth(1).click()
  assert.equal(await mapOptions.nth(1).getAttribute('aria-pressed'), 'true')
  assert.ok((await page.locator('.home-location-map').getAttribute('src')).includes('0x8396d375139ef9df'))
  await mapOptions.first().click()
  assert.equal(await page.locator('.home-location-map').getAttribute('src'), regionSource)
  companyMode = 'empty'
  tourMode = 'empty'
  await page.goto(origin)
  await page.getByText('Company information is not available yet.', {exact:true}).waitFor()
  assert.equal(await page.locator('#company a').count(), 0)
  await page.locator('.home-empty').first().waitFor()
  assert.equal(await page.locator('.home-empty').count(),1)
  assert.equal(await page.locator('.featured-tour-card').count(),0)
  companyMode='unsafe';tourMode='ready'
  await page.reload()
  await page.locator('#company h3').waitFor()
  assert.equal(await page.locator('#company a[target="_blank"]').count(),0)
  companyMode='error';tourMode='error'
  await page.reload()
  await page.locator('#company [role="alert"]').waitFor()
  await page.locator('.home-featured [role="alert"]').waitFor()
  companyMode='ready';tourMode='ready'
  await page.locator('#company button').click()
  await page.locator('#company h3').waitFor()
  assert.equal(await page.locator('#company a[target="_blank"]').getAttribute('href'),company.mapUrl)
  await page.locator('.home-featured button').click()
  await page.locator('.featured-tour-card').first().waitFor()
  assert.equal(await page.locator('.featured-tour-card').count(),3)
  assert.equal(await page.locator('[role="alert"]').count(),0)
  // Catalog filters affect requests, reset paging and remain navigable through browser history.
  tourMode = 'paginated'
  await page.goto(`${origin}/tours`)
  await page.locator('.catalog-trip').waitFor()
  const pagination=page.getByRole('navigation',{name:'Tours'})
  assert.equal(await pagination.locator('.public-pagination-ellipsis').count(),1)
  await pagination.getByRole('button', {name:'Next', exact:true}).click()
  await pagination.locator('.public-pagination-page[aria-current="page"]').filter({hasText:'2'}).waitFor()
  await pagination.getByRole('button',{name:'7',exact:true}).click()
  await pagination.locator('.public-pagination-page[aria-current="page"]').filter({hasText:'7'}).waitFor()
  assert.ok(await pagination.getByRole('button',{name:'Next',exact:true}).isDisabled())
  assert.ok(tourQueries.some(q => new URLSearchParams(q).get('page')==='7'))
  await page.locator('.catalog-duration a').nth(1).click()
  await page.waitForURL('**/tours?ownership=GREENVIEW&duration=day')
  await page.getByRole('navigation',{name:'Tours'}).locator('.public-pagination-page[aria-current="page"]').filter({hasText:'1'}).waitFor()
  assert.ok(tourQueries.some(q => {const p = new URLSearchParams(q); return p.get('page')==='1' && p.get('duration')==='day' && p.get('ownership')==='GREENVIEW'}))
  tourMode = 'ready'
  await page.locator('.catalog-duration a').nth(2).click()
  await page.locator('.catalog-message').waitFor()
  assert.equal(await page.locator('.catalog-trip').count(),0)
  assert.equal(await page.locator('.catalog-duration a[aria-current]').innerText(),'Overnight trips')
  await page.goBack()
  await page.locator('.catalog-trip').waitFor()
  assert.equal(await page.locator('.catalog-duration a[aria-current]').innerText(),'Day trips')
  await page.locator('.catalog-ownership a').nth(1).click()
  await page.getByRole('heading',{name:partner.name,exact:true}).waitFor()
  assert.equal(await page.locator('.catalog-trip').count(),1)
  assert.equal(await page.locator('.catalog-trip h2').innerText(),partner.name)
  tourMode='error'
  await page.reload()
  await page.locator('.catalog-results [role="alert"]').waitFor()
  tourMode='ready'
  await page.getByRole('button',{name:'Try again',exact:true}).click()
  await page.locator('.catalog-trip').waitFor()
  assert.equal(await page.locator('.catalog-results [role="alert"]').count(),0)
  popupMode=true
  await page.goto(origin+'/?popup-test=1')
  const popup=page.getByRole('dialog',{name:'DEMO · ตรวจหน้าจอเท่านั้น',exact:true})
  await popup.waitFor()
  const close=popup.locator('.public-close-button')
  const closeStyle=await close.evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth}))
  assert.deepEqual(closeStyle,{background:'rgba(0, 0, 0, 0)',border:'0px'})
  await popup.getByRole('button',{name:'Close announcement',exact:true}).click()
  assert.equal(await popup.count(),0)
  popupMode=false
  assert.deepEqual(unexpectedApi, [])
  assert.deepEqual(errors, [])
  console.log('Public locale fixtures passed: titles, language, persistence, custom event, dates/currency, mobile layout, Core numbered pagination, transparent Core close button, original CMS content, persistent shell nodes, history, anchors, native link behavior, Home section order, real photos, ownership queries, company safety and empty/error/retry states.')
} finally {
  await browser.close()
}
