// Rendered Backoffice regression with explicit API fixtures; no application data writes.
import assert from 'node:assert/strict'
import {mkdtemp} from 'node:fs/promises'
import path from 'node:path'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {initialValues} from '../packages/contracts/catalog.js'
import {root} from './local-cloudflare-policy.js'
const directory=await mkdtemp(path.join(root,'.local/company-contact-browser-'))
const app=path.join(root,'frontend/backoffice'),server=await createServer({root:app,configFile:path.join(app,'vite.config.js'),server:{host:'127.0.0.1',port:5184,strictPort:true},logLevel:'error'})
let browser
try {
 await server.listen();browser=await chromium.launch({headless:true})
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.addInitScript(()=>{if(!localStorage.getItem('greenview.locale'))localStorage.setItem('greenview.locale','en')})
 const user={id:'fixture-manager',displayName:'Fixture Manager',email:'fixture@example.test',status:'ACTIVE',department:'MANAGEMENT',roles:[{code:'MANAGER',name:'Manager',scope:'COMPANY'}],management:{company:true}}
 let row={...initialValues('company'),id:'11111111-1111-4111-8111-111111111111',version:1,name:'Greenview Tour',phone:'+66954266847',email:null,lineId:'@greenviewtour',instagramUrl:'https://www.instagram.com/greenviewtour/'},saved
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url())
  if(url.pathname==='/api/me')return route.fulfill({json:{user}})
  if(url.pathname==='/api/settings/company'){
   if(route.request().method()==='POST'){saved=route.request().postDataJSON();row={...saved,version:row.version+1};return route.fulfill({json:{row}})}
   return route.fulfill({json:{rows:[row],total:1,page:1,pageSize:25}})
  }
  return route.fulfill({json:{rows:[],total:0}})
 })
 await page.goto('http://127.0.0.1:5184/settings/company')
 await page.getByLabel('LINE official account ID',{exact:true}).fill('@edited_company')
 await page.getByLabel('Instagram profile URL',{exact:true}).fill('https://www.instagram.com/edited_company/')
 await page.getByLabel('Email',{exact:true}).fill('')
 await page.getByRole('button',{name:'Save company details',exact:true}).click()
 await page.getByText('Company details saved.',{exact:true}).waitFor()
 assert.equal(saved.lineId,'@edited_company');assert.equal(saved.instagramUrl,'https://www.instagram.com/edited_company/');assert.equal(saved.email,'')
 assert.equal(await page.getByLabel('LINE official account ID',{exact:true}).inputValue(),'@edited_company')
 await page.getByLabel('LINE official account ID',{exact:true}).scrollIntoViewIfNeeded()
 await page.screenshot({path:path.join(directory,'company-contact-en-desktop.png'),fullPage:true})
 await page.getByLabel('LINE official account ID',{exact:true}).fill('bad/account')
 await page.getByRole('button',{name:'Save company details',exact:true}).click()
 await page.getByText('Enter a LINE official account ID starting with @.',{exact:true}).waitFor()
 assert.equal(await page.getByLabel('LINE official account ID',{exact:true}).getAttribute('aria-invalid'),'true')
 await page.getByLabel('LINE official account ID',{exact:true}).fill('@edited_company')
 await page.evaluate(()=>localStorage.setItem('greenview.locale','th'))
 await page.setViewportSize({width:390,height:844});await page.reload()
 await page.getByLabel(/บัญชี LINE Official/).waitFor()
 assert.equal(await page.getByLabel(/บัญชี LINE Official/).inputValue(),'@edited_company')
 assert.ok(await page.getByLabel(/ลิงก์โปรไฟล์ Instagram/).isVisible())
 assert.ok(await page.getByText('ไม่บังคับ เว้นว่างไว้จนกว่าจะมีอีเมลติดต่อ',{exact:true}).isVisible())
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await page.getByLabel(/ลิงก์โปรไฟล์ Instagram/).scrollIntoViewIfNeeded()
 await page.screenshot({path:path.join(directory,'company-contact-th-mobile.png'),fullPage:true})
 assert.deepEqual(errors,[])
 console.log('COMPANY_CONTACT_BROWSER_PASS',JSON.stringify({directory,checks:['existing Company form loads and saves new channels and blank email','inline validation prevents unsafe LINE ID','saved values reload; Thai mobile labels/hint render; no horizontal overflow'],runtimeErrors:errors,api:'fixtures'}))
} finally {await browser?.close();await server.close()}
