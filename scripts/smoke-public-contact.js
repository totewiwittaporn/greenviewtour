// Fixture-only contact regression. Every API and external request is intercepted; no business writes.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const origin=process.env.GREENVIEW_PUBLIC_ORIGIN||'http://localhost:5173'
const company={name:'Contact fixture company',address:'Fixture pier',phone:'+66954266847',email:null,lineId:'@greenviewtour',instagramUrl:'https://www.instagram.com/greenviewtour/',mapUrl:null}
const tour={id:'contact-fixture',slug:'contact-fixture',name:'Contact fixture tour',description:'Contact fixture',durationDays:1,ownership:'GREENVIEW',adultPrice:2500,childPrice:1500,tourType:'DAY_TRIP',journeyMode:'FIXED',confirmationMode:'REQUEST',operator:null,promotions:[],seasons:[],components:[],publicContent:[],publicHighlights:[],itinerarySteps:[],publicFaqs:[],publicMedia:[]}
let mode='ready',popup=false,companyReads=0
const errors=[],unexpected=[],expectedHttpErrors=[]
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'})
 await context.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(window.denyCopy)throw new Error('denied');window.copiedInquiry=value}}})})
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url())
  if(url.origin!==new URL(origin).origin)return route.fulfill({status:200,contentType:'text/plain',body:''})
  if(!url.pathname.startsWith('/api/'))return route.continue()
  if(req.method()!=='GET'){unexpected.push(req.method()+' '+url.pathname);return route.fulfill({status:405,json:{}})}
  if(url.pathname==='/api/public/company'){companyReads++;return route.fulfill({status:mode==='error'?503:200,json:{company:mode==='empty'?null:mode==='blank'?{...company,phone:null,lineId:null,instagramUrl:null}:company}})}
  if(url.pathname==='/api/public/tours')return route.fulfill({json:{rows:[tour],page:1,total:1}})
  if(url.pathname==='/api/public/popups')return route.fulfill({json:{rows:popup?[{id:'contact-popup',version:1,frequency:'SESSION',title:'Fixture announcement',imageUrl:'/images/home/surin-hero.webp',imageAlt:'Fixture',linkUrl:'https://member.greenviewtour.com/tours?tour=contact-fixture',buttonLabel:'Buy fixture'}]:[]}})
  if(url.pathname==='/api/public/quote')return route.fulfill({status:503,json:{code:'QUOTE_UNAVAILABLE'}})
  unexpected.push(url.pathname);return route.fulfill({status:404,json:{}})
 })
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'){if(message.text().includes('503'))expectedHttpErrors.push(message.text());else errors.push(message.text())}})
 const dialog=()=>page.getByRole('dialog',{name:/ติดต่อทีมงาน|Contact our team/,exact:true})
 const openContact=async()=>{await page.getByRole('button',{name:/ติดต่อทีมงาน|Contact our team/,exact:true}).first().click();await dialog().waitFor()}
 const closeContact=async()=>{await page.keyboard.press('Escape');await dialog().waitFor({state:'hidden'})}
 const noMemberLinks=async()=>assert.equal(await page.locator('a[href*="member.greenviewtour"],a[href*="localhost:5175"],a[href^="/checkout"],a[href^="/member"]').count(),0)
 await page.setViewportSize({width:1440,height:1000})
 await page.goto(origin+'/tours?tour='+tour.slug+'&date=2026-11-02&pax=3')
 await openContact()
 assert.match(await page.title(),/Contact fixture tour/);assert.equal(await page.locator('vite-error-overlay').count(),0)
 await dialog().locator('a[href="tel:+66954266847"]').waitFor()
 assert.equal(await dialog().locator('a[href*="line.me"]').count(),1)
 assert.equal(await dialog().locator('a[href="https://www.instagram.com/greenviewtour/"]').count(),1)
 assert.equal(await dialog().locator('a[href^="mailto:"]').count(),0)
 await page.screenshot({path:'/tmp/greenview-public-contact-desktop.png'})
 const inquiry=dialog().getByRole('textbox',{name:/ข้อความสอบถาม|Inquiry message/})
 assert.equal(await inquiry.getAttribute('readonly'),'')
 const message=await inquiry.inputValue();assert.match(message,/Contact fixture tour/);assert.match(message,/2026-11-02/);assert.match(message,/3/)
 await dialog().getByRole('button',{name:/คัดลอกข้อความสอบถาม|Copy inquiry message/}).click()
 assert.equal(await page.evaluate(()=>window.copiedInquiry),message)
 await page.evaluate(()=>{window.denyCopy=true})
 await dialog().getByRole('button',{name:/คัดลอกข้อความสอบถาม|Copy inquiry message/}).click()
 assert.equal(await inquiry.inputValue(),message)
 assert.equal(await inquiry.evaluate(node=>node.selectionEnd-node.selectionStart),message.length)
 assert.equal(await dialog().getByRole('alert').count()+await dialog().getByRole('status').count()>0,true)
 await page.keyboard.press('Tab');assert.equal(await dialog().evaluate(node=>node.contains(document.activeElement)),true)
 await closeContact();assert.match(await page.evaluate(()=>document.activeElement.textContent),/ติดต่อทีมงาน|Contact our team/)
 await noMemberLinks()
 assert.match(await page.locator('.staff-login').getAttribute('href'),/5174\/login$/)
 await page.locator('.language-selector > button').click();await page.locator('.language-options button').filter({hasText:'EN'}).click()
 await openContact();assert.match(await inquiry.inputValue(),/Contact fixture tour/);await closeContact()
 await page.setViewportSize({width:320,height:740});await openContact()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 assert.equal(await dialog().evaluate(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),true)
 await page.screenshot({path:'/tmp/greenview-public-contact-mobile.png'})
 await closeContact()
 for(const nextMode of ['error','empty','blank']){
  mode=nextMode;await page.goto(origin+'/contact-us');await openContact()
  if(mode==='error'){
   await dialog().getByRole('alert').waitFor();mode='ready'
   await dialog().getByRole('button',{name:/ลองอีกครั้ง|Retry|Try again/}).click()
   await dialog().locator('a[href="tel:+66954266847"]').waitFor()
  }else{
   await dialog().getByText(/ข้อมูลติดต่อจะอัปเดต|Contact details will/).waitFor()
   assert.equal(await dialog().locator('a[href^="tel:"],a[href*="line.me"],a[href*="instagram.com"],a[href^="mailto:"]').count(),0)
  }
  await closeContact()
 }
 mode='ready';company.phone='+66812345678';await openContact()
 await dialog().locator('a[href="tel:+66812345678"]').waitFor();await closeContact();company.phone='+66954266847'
 popup=true;await page.goto(origin+'/')
 await page.getByRole('dialog',{name:'Fixture announcement'}).waitFor()
 await noMemberLinks();await page.getByRole('dialog',{name:'Fixture announcement'}).getByRole('button',{name:/ติดต่อทีมงาน|Contact our team/,exact:true}).click()
 await dialog().locator('a[href="tel:+66954266847"]').waitFor();await closeContact()
 assert.equal(await page.getByRole('dialog',{name:'Fixture announcement'}).evaluate(node=>node.contains(document.activeElement)),true,JSON.stringify(await page.evaluate(()=>({active:document.activeElement.outerHTML.slice(0,800),dialogs:[...document.querySelectorAll('dialog')].map(n=>n.outerHTML.slice(0,1000))}))))
 await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Fixture announcement'}).waitFor({state:'hidden'})
 assert.ok(companyReads>0);assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[])
 console.log(JSON.stringify({result:'PASS',checks:['shared API contacts','fresh contacts on reopen','optional email','tour/date/group inquiry','clipboard success/denied','Escape/focus restore','modal focus stays inside','TH/EN','320px layout','error/retry/empty/blank','legacy popup Member CTA','Staff Login retained','no Member links'],runtimeErrors:0,businessWrites:0,screenshot:'/tmp/greenview-public-contact-mobile.png'}))
}finally{await browser.close()}
