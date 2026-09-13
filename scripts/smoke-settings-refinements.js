import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url))
const vite=await createServer({root,server:{port:5274,strictPort:true},configFile:`${root}vite.config.js`});await vite.listen()
const browser=await chromium.launch({headless:true,ignoreDefaultArgs:['--hide-scrollbars'],...(process.platform==='win32'?{channel:'msedge'}:{})})
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
 const picker=page.getByRole('dialog',{name:'Quick address',exact:true})
 const fields=['Province','District / Amphoe','Subdistrict / Tambon','Postal code','House number','Moo number','Village name (optional)']
 const select=async(label,name)=>{const scope=await picker.count()?picker:page;await scope.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('combobox',{name:`Search ${label}`,exact:true}).fill(name.split(' · ')[0]);await page.getByRole('option',{name,exact:true}).click()}
 await page.getByRole('button',{name:'Quick address',exact:true}).click()
 await picker.getByRole('combobox',{name:'Province',exact:true}).waitFor({timeout:10000}).catch(async error=>{console.error(await picker.ariaSnapshot());throw error})
 // Keep classic scrollbars visible: opening a popup must not move its dialog or trigger.
 const geometry=()=>picker.evaluate(dialog=>{
  const rect=dialog.getBoundingClientRect(),trigger=dialog.querySelector('.core-select-trigger').getBoundingClientRect()
  return {x:rect.x,y:rect.y,width:rect.width,height:rect.height,triggerX:trigger.x,triggerY:trigger.y,scroll:dialog.querySelector('.dialog-content').scrollTop,pageY:window.scrollY}
 })
 const beforePopup=await geometry()
 assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).overflowY),'hidden')
 for(let cycle=0;cycle<3;cycle++){
  await picker.getByRole('combobox',{name:'Province',exact:true}).click()
  await page.getByRole('combobox',{name:'Search Province',exact:true}).waitFor()
  const afterPopup=await geometry()
  for(const key of Object.keys(beforePopup))assert.ok(Math.abs(afterPopup[key]-beforePopup[key])<=1,`${key} moved on popup open`)
  await page.keyboard.press('Escape')
  assert.equal(await picker.count(),1,'Escape should close the popup first')
 }
 await page.mouse.move(20,20);await page.mouse.wheel(0,600);await page.waitForTimeout(100)
 assert.equal((await geometry()).pageY,beforePopup.pageY,'Background must stay locked')
 assert.equal(await picker.getByRole('combobox',{name:'District / Amphoe',exact:true}).isDisabled(),true)
 assert.equal(await picker.getByLabel('House number',{exact:true}).isDisabled(),true)
 await picker.getByRole('combobox',{name:'Province',exact:true}).click();const search=page.getByRole('combobox',{name:'Search Province',exact:true});await search.fill('พังงา');await page.getByRole('option',{name:'Phang-Nga · พังงา',exact:true}).waitFor();await search.fill('zzzz-no-match');await page.getByText('No matches / ไม่พบข้อมูล',{exact:true}).waitFor();await page.getByRole('button',{name:'Clear search Province',exact:true}).click();assert.equal(await search.inputValue(),'');await search.fill('Phang Nga');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.match(await picker.getByRole('combobox',{name:'Province',exact:true}).textContent(),/Phang-Nga.*พังงา/);assert.equal(await picker.count(),1)
 const labels=await picker.locator('label,.field-label').allTextContents();assert.deepEqual(labels.slice(0,7),fields)
 await select('Province','Phuket · ภูเก็ต');await select('District / Amphoe','Mueang Phuket · เมืองภูเก็ต');await select('Subdistrict / Tambon','Rawai · ราไวย์')
 await picker.getByLabel('House number',{exact:true}).fill('12/34');await picker.getByLabel('Moo number',{exact:true}).fill('5')
 await select('Province','Krabi · กระบี่');assert.equal(await picker.getByRole('combobox',{name:'District / Amphoe',exact:true}).textContent(),'Not selected / ยังไม่ระบุ⌄');assert.equal(await picker.getByRole('combobox',{name:'Subdistrict / Tambon',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'Save address',exact:true}).click();await page.getByText('Select a district in this province.',{exact:true}).waitFor()
 await select('Province','Phuket · ภูเก็ต');await select('District / Amphoe','Mueang Phuket · เมืองภูเก็ต');await select('Subdistrict / Tambon','Rawai · ราไวย์')
 await page.getByRole('button',{name:'Save address',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0)
 assert.equal(await page.getByLabel('House number',{exact:true}).inputValue(),'12/34');assert.equal(await page.getByLabel('Postal code',{exact:true}).inputValue(),'83130')
 await page.getByRole('button',{name:'Quick address',exact:true}).click();await picker.getByLabel('House number',{exact:true}).fill('Discard me');await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await picker.getByLabel('House number',{exact:true}).inputValue(),'Discard me');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Discard changes',exact:true}).click();assert.equal(await page.getByLabel('House number',{exact:true}).inputValue(),'12/34')
 await page.getByLabel('Tax ID',{exact:true}).fill('0123456789012');await page.getByLabel('Phone',{exact:true}).fill('076123456');await page.getByLabel('Company name',{exact:true}).click();assert.equal(await page.getByLabel('Tax ID',{exact:true}).inputValue(),'0-1234-56789-01-2');assert.equal(await page.getByLabel('Phone',{exact:true}).inputValue(),'+66-76-123-456')
 await select('Subdistrict / Tambon','Karon · กะรน');await page.getByLabel('Postal code',{exact:true}).evaluate(e=>e.value==='83100'||Promise.reject(new Error('Postal code did not follow manual address')));await select('Subdistrict / Tambon','Rawai · ราไวย์');await page.getByLabel('House number',{exact:true}).fill('99/1');assert.equal(await page.getByLabel('Postal code',{exact:true}).inputValue(),'83130')
 const name=page.getByLabel('Company name',{exact:true});assert.equal(await name.evaluate(e=>e.matches(':placeholder-shown')),true);await name.fill('Greenview Tour');assert.equal(await name.evaluate(e=>e.matches(':placeholder-shown')),false);await name.fill('');assert.equal(await name.evaluate(e=>e.matches(':placeholder-shown')),true);await name.fill('Greenview Tour')
 await page.getByLabel('Google Maps pin link',{exact:true}).fill('https://evil.example/');await page.getByRole('button',{name:'Save company details'}).click();await page.getByText('Paste an HTTPS Google Maps location link.',{exact:true}).waitFor()
 await page.getByLabel('Google Maps pin link',{exact:true}).fill('https://maps.app.goo.gl/fixture');assert.equal(await page.getByLabel('Latitude (optional)',{exact:true}).count(),0);assert.equal(await page.getByLabel('Longitude (optional)',{exact:true}).count(),0)
 assert.equal(await page.getByRole('link',{name:'Driving directions',exact:true}).count(),0)
 await page.getByLabel('Google Maps pin link',{exact:true}).fill('');assert.equal(await page.getByRole('link',{name:'Open saved pin',exact:true}).count(),0);await page.getByLabel('Google Maps pin link',{exact:true}).fill('https://maps.app.goo.gl/fixture')
 fail=true;await page.getByRole('button',{name:'Save company details'}).click();await page.getByRole('alert').waitFor();assert.equal(await name.inputValue(),'Greenview Tour')
 await page.getByRole('button',{name:'Save company details'}).click();await page.getByText('Company details saved.',{exact:true}).waitFor();await page.getByRole('button',{name:'Save company details'}).waitFor();assert.equal(company.province,'Phuket')
 // Switching tabs must respect the same dirty-form guard as sidebar navigation.
 await name.fill('Unsaved tab draft')
 await page.getByRole('tab',{name:'Company',exact:true}).focus();await page.keyboard.press('ArrowRight')
 assert.equal(await page.getByRole('tab',{name:'Tour programs',exact:true}).evaluate(el=>el===document.activeElement),true)
 assert.equal(await page.getByRole('tab',{name:'Company',exact:true}).getAttribute('aria-selected'),'true')
 assert.equal(await page.getByRole('dialog',{name:'Unsaved changes'}).count(),0)
 await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'Unsaved changes'}).waitFor()
 await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await name.inputValue(),'Unsaved tab draft')
 await page.getByRole('tab',{name:'Tour programs',exact:true}).click();await page.getByRole('button',{name:'Discard and leave',exact:true}).click()
 await page.getByRole('heading',{level:1,name:'Tour programs',exact:true}).waitFor()
 assert.equal(await page.getByRole('tabpanel').count(),1)
 assert.equal(await page.getByRole('button',{name:'Save company details'}).count(),0)
 await page.getByRole('tab',{name:'Company',exact:true}).click();await page.getByRole('button',{name:'Save company details'}).waitFor()
 assert.equal(await name.inputValue(),'Greenview Tour')
 await name.fill('Unsaved company')
 await page.getByRole('link',{name:'Partners & Sales',exact:true}).click();await page.getByRole('dialog',{name:'Unsaved changes'}).waitFor();await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await name.inputValue(),'Unsaved company')
 await page.getByRole('link',{name:'Partners & Sales',exact:true}).click();await page.getByRole('button',{name:'Discard and leave',exact:true}).click();await page.getByRole('heading',{level:1,name:'Business partners',exact:true}).waitFor()
 await page.getByRole('link',{name:'Company & Tours',exact:true}).click();await page.getByRole('button',{name:'Save company details'}).waitFor();assert.equal(await name.inputValue(),'Greenview Tour');assert.equal(meCalls,initialMeCalls)
 await name.fill('Unsaved on back');await page.goBack();await page.getByRole('dialog',{name:'Unsaved changes'}).waitFor();await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.match(page.url(),/settings\/company/);assert.equal(await name.inputValue(),'Unsaved on back')
 await page.goBack();await page.getByRole('button',{name:'Discard and leave',exact:true}).click();await page.getByRole('heading',{level:1,name:'Business partners',exact:true}).waitFor();await page.goForward();await page.getByRole('button',{name:'Save company details'}).waitFor()
 assert.equal(meCalls,initialMeCalls);assert.equal(await page.evaluate(()=>window.__shell===document.querySelector('.sidebar')&&window.__documentToken==='same-document'),true)
 await page.getByRole('button',{name:'User menu'}).click();await page.getByRole('menuitem',{name:'Edit profile',exact:true}).click();await select('Province','Krabi · กระบี่');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Profile updated.',{exact:true}).waitFor();assert.equal(profilePatch.province,'Krabi');assert.equal(profilePatch.address,'Original address retained')
 await page.getByRole('link',{name:'Company & Tours',exact:true}).click();await page.getByRole('button',{name:'Save company details'}).waitFor()
 await mkdir(new URL('../screenshots.local/',import.meta.url),{recursive:true})
 await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/company-address-desktop.png',import.meta.url)),fullPage:true})
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Save company details'}).scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/company-address-mobile.png',import.meta.url)),fullPage:true})
 await page.getByRole('button',{name:'Quick address',exact:true}).click();await picker.getByRole('combobox',{name:'Province',exact:true}).click();await page.getByRole('listbox').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/company-address-dropdown-mobile.png',import.meta.url)),fullPage:false});await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog',{name:'Quick address',exact:true}).count(),1);await page.keyboard.press('Escape')
 // Exercise the real Core component with nested dialogs, including StrictMode cleanup.
 await page.evaluate(async()=>{
  const {default:React}=await import('/node_modules/.vite/deps/react.js')
  const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js')
  const {Dialog}=await import('/src/core/ui/Dialog.jsx')
  const e=React.createElement
  function StackFixture(){
   const [parent,setParent]=React.useState(false),[child,setChild]=React.useState(false)
   return e(React.Fragment,null,e('button',{onClick:()=>setParent(true)},'Open stack fixture'),parent&&e(Dialog,{title:'Stack parent',onClose:()=>setParent(false)},e('button',{onClick:()=>setChild(true)},'Open stack child'),e('div',{style:{height:1400}},'Parent content'),e('button',null,'Parent bottom'),child&&e(Dialog,{title:'Stack child',onClose:()=>setChild(false)},e('div',{style:{height:1400}},'Child content'),e('button',null,'Child bottom'))))
  }
  const mount=document.createElement('div');document.body.append(mount)
  createRoot(mount).render(e(React.StrictMode,null,e(StackFixture)))
 })
 await page.getByRole('button',{name:'Open stack fixture',exact:true}).click()
 const parent=page.locator('.core-dialog').filter({hasText:'Stack parent'})
 await parent.getByRole('button',{name:'Open stack child',exact:true}).click()
 const child=page.getByRole('dialog',{name:'Stack child',exact:true})
 await child.waitFor()
 assert.equal(await parent.locator('.dialog-content').evaluate(el=>getComputedStyle(el).overflowY),'hidden')
 assert.equal(await child.locator('.dialog-content').evaluate(el=>getComputedStyle(el).overflowY),'auto')
 const parentScroll=await parent.locator('.dialog-content').evaluate(el=>el.scrollTop)
 const childBody=await child.locator('.dialog-content').boundingBox()
 await page.mouse.move(childBody.x+30,childBody.y+60);await page.mouse.wheel(0,400);await page.waitForTimeout(100)
 assert.ok(await child.locator('.dialog-content').evaluate(el=>el.scrollTop>0),'Child must scroll')
 assert.equal(await parent.locator('.dialog-content').evaluate(el=>el.scrollTop),parentScroll)
 await child.getByRole('button',{name:'Close dialog',exact:true}).click()
 assert.equal(await parent.locator('.dialog-content').evaluate(el=>getComputedStyle(el).overflowY),'auto')
 assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).overflowY),'hidden')
 assert.equal(await parent.getByRole('button',{name:'Open stack child',exact:true}).evaluate(el=>el===document.activeElement),true)
 await page.keyboard.press('Escape')
 assert.equal(await page.locator('html').getAttribute('data-core-modal-open'),null)
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',checks:['single company form','bilingual search, clear/no matches, keyboard selection, dependent dropdowns, draft discard','placeholder lifecycle','safe map links','save failure retention','SPA shell identity and no repeated auth','unsaved link/back/forward guards','structured employee profile','mobile form reachability'],realDatabaseWrites:0}))
}finally{await browser.close();await vite.close()}
