import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url))
const vite=await createServer({root,server:{port:5274,strictPort:true},configFile:`${root}vite.config.js`});await vite.listen()
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];let meCalls=0,company=null,fail=false,profilePatch
 const user={id:'fixture',displayName:'Fixture Manager',roles:[],status:'ACTIVE',management:{company:true},updatedAt:new Date().toISOString(),address:'Original address retained'}
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)})
 await page.route('**/api/me',r=>{meCalls++;return r.fulfill({json:{user}})})
 await page.route('**/api/me/profile',r=>{profilePatch=r.request().postDataJSON();Object.assign(user,profilePatch,{updatedAt:new Date().toISOString()});return r.fulfill({json:{ok:true}})})
 await page.route('**/api/settings/**',r=>{
  if(r.request().method()==='POST'){
   if(fail){fail=false;return r.fulfill({status:503,json:{code:'SERVICE_UNAVAILABLE'}})}
   company={...r.request().postDataJSON(),version:(company?.version||0)+1};return r.fulfill({json:{row:company}})
  }
  const rows=new URL(r.request().url()).pathname.endsWith('/company')&&company?[company]:[]
  return r.fulfill({json:{rows,total:rows.length,page:1,pages:1}})
 })
 await page.goto('http://localhost:5274/settings/company');await page.getByRole('button',{name:'Save company details'}).waitFor()
 const initialMeCalls=meCalls
 assert.equal(await page.getByRole('button',{name:/Add company/}).count(),0);assert.equal(await page.getByRole('table').count(),0)
 await page.evaluate(()=>{window.__shell=document.querySelector('.sidebar');window.__documentToken='same-document'})
 const fields=['Province','District / Amphoe','Subdistrict / Tambon','House number','Moo number','Village name (optional)']
 const select=async(label,name)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name,exact:true}).click()}
 await page.getByRole('button',{name:'Quick address',exact:true}).click()
 await page.getByRole('combobox',{name:'Province',exact:true}).waitFor({timeout:10000}).catch(async error=>{console.error(await page.locator('body').innerText());throw error})
 assert.equal(await page.getByRole('combobox',{name:'District / Amphoe',exact:true}).isDisabled(),true)
 assert.equal(await page.getByLabel('House number',{exact:true}).isDisabled(),true)
 const labels=await page.locator('dialog label').allTextContents();assert.deepEqual(labels.slice(0,6),fields)
 await select('Province','ภูเก็ต · Phuket');await select('District / Amphoe','เมืองภูเก็ต · Mueang Phuket');await select('Subdistrict / Tambon','ราไวย์ · Rawai')
 await page.getByLabel('House number',{exact:true}).fill('12/34');await page.getByLabel('Moo number',{exact:true}).fill('5')
 await select('Province','กระบี่ · Krabi');assert.equal(await page.getByRole('combobox',{name:'District / Amphoe',exact:true}).textContent(),'Select district⌄');assert.equal(await page.getByRole('combobox',{name:'Subdistrict / Tambon',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'Use this address',exact:true}).click();await page.getByText('Select a district in this province.',{exact:true}).waitFor()
 await select('Province','ภูเก็ต · Phuket');await select('District / Amphoe','เมืองภูเก็ต · Mueang Phuket');await select('Subdistrict / Tambon','ราไวย์ · Rawai')
 await page.getByRole('button',{name:'Use this address',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0)
 assert.match(await page.locator('.address-summary').textContent(),/12\/34.*ราไวย์.*เมืองภูเก็ต.*ภูเก็ต/)
 await page.getByRole('button',{name:'Quick address',exact:true}).click();await page.getByLabel('House number',{exact:true}).fill('Discard me');await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await page.getByLabel('House number',{exact:true}).inputValue(),'Discard me');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Discard changes',exact:true}).click();assert.match(await page.locator('.address-summary').textContent(),/12\/34/)
 await page.getByLabel('Tax ID',{exact:true}).fill('0123456789012');await page.getByLabel('Phone',{exact:true}).fill('076123456');await page.getByLabel('Company name',{exact:true}).click();assert.equal(await page.getByLabel('Tax ID',{exact:true}).inputValue(),'0-1234-56789-01-2');assert.equal(await page.getByLabel('Phone',{exact:true}).inputValue(),'076-123-456')
 const name=page.getByLabel('Company name',{exact:true});assert.equal(await name.evaluate(e=>e.matches(':placeholder-shown')),true);await name.fill('Greenview Tour');assert.equal(await name.evaluate(e=>e.matches(':placeholder-shown')),false);await name.fill('');assert.equal(await name.evaluate(e=>e.matches(':placeholder-shown')),true);await name.fill('Greenview Tour')
 await page.getByLabel('Google Maps pin link',{exact:true}).fill('https://evil.example/');await page.getByRole('button',{name:'Save company details'}).click();await page.getByText('Paste an HTTPS Google Maps location link.',{exact:true}).waitFor()
 await page.getByLabel('Google Maps pin link',{exact:true}).fill('https://maps.app.goo.gl/fixture');assert.equal(await page.getByLabel('Latitude (optional)',{exact:true}).count(),0);assert.equal(await page.getByLabel('Longitude (optional)',{exact:true}).count(),0)
 assert.equal(await page.getByRole('link',{name:'Driving directions',exact:true}).count(),0)
 await page.getByLabel('Google Maps pin link',{exact:true}).fill('');assert.equal(await page.getByRole('link',{name:'Open saved pin',exact:true}).count(),0);await page.getByLabel('Google Maps pin link',{exact:true}).fill('https://maps.app.goo.gl/fixture')
 fail=true;await page.getByRole('button',{name:'Save company details'}).click();await page.getByRole('alert').waitFor();assert.equal(await name.inputValue(),'Greenview Tour')
 await page.getByRole('button',{name:'Save company details'}).click();await page.getByText('Company details saved.',{exact:true}).waitFor();await page.getByRole('button',{name:'Save company details'}).waitFor();assert.equal(company.province,'ภูเก็ต')
 await name.fill('Unsaved company')
 await page.getByRole('link',{name:'Business partners',exact:true}).click();await page.getByRole('dialog',{name:'Unsaved changes'}).waitFor();await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await name.inputValue(),'Unsaved company')
 await page.getByRole('link',{name:'Business partners',exact:true}).click();await page.getByRole('button',{name:'Discard and leave',exact:true}).click();await page.getByRole('heading',{name:'Business partners',exact:true}).waitFor()
 await page.getByRole('link',{name:'Company',exact:true}).click();await page.getByRole('button',{name:'Save company details'}).waitFor();assert.equal(await name.inputValue(),'Greenview Tour');assert.equal(meCalls,initialMeCalls)
 await name.fill('Unsaved on back');await page.goBack();await page.getByRole('dialog',{name:'Unsaved changes'}).waitFor();await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.match(page.url(),/settings\/company/);assert.equal(await name.inputValue(),'Unsaved on back')
 await page.goBack();await page.getByRole('button',{name:'Discard and leave',exact:true}).click();await page.getByRole('heading',{name:'Business partners',exact:true}).waitFor();await page.goForward();await page.getByRole('button',{name:'Save company details'}).waitFor()
 assert.equal(meCalls,initialMeCalls);assert.equal(await page.evaluate(()=>window.__shell===document.querySelector('.sidebar')&&window.__documentToken==='same-document'),true)
 await page.getByRole('button',{name:'User menu'}).click();await page.getByRole('menuitem',{name:'Edit profile',exact:true}).click();await page.getByLabel('Province',{exact:true}).fill('กระบี่');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Profile updated.',{exact:true}).waitFor();assert.equal(profilePatch.province,'กระบี่');assert.equal(profilePatch.address,'Original address retained')
 await page.getByRole('link',{name:'Company',exact:true}).click();await page.getByRole('button',{name:'Save company details'}).waitFor()
 await mkdir(new URL('../screenshots.local/',import.meta.url),{recursive:true})
 await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/company-address-desktop.png',import.meta.url)),fullPage:true})
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Save company details'}).scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/company-address-mobile.png',import.meta.url)),fullPage:true})
 await page.getByRole('button',{name:'Quick address',exact:true}).click();await page.getByRole('combobox',{name:'Province',exact:true}).click();await page.getByRole('listbox').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/company-address-dropdown-mobile.png',import.meta.url)),fullPage:false});await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog',{name:'Quick address',exact:true}).count(),1);await page.keyboard.press('Escape')
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks:['single company form','dependent address dropdowns, draft discard, optional details','placeholder lifecycle','safe map links','save failure retention','SPA shell identity and no repeated auth','unsaved link/back/forward guards','structured employee profile','mobile form reachability'],realDatabaseWrites:0}))
}finally{await browser.close();await vite.close()}
