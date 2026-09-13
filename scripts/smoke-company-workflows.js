// Browser-only interception of compiled assets: no HTTP server, credentials or live API writes.
import assert from 'node:assert/strict'
import {readFile,mkdir} from 'node:fs/promises'
import {resolve,relative,extname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {accessDefinitions} from '../packages/contracts/access.js'
const root=fileURLToPath(new URL('../',import.meta.url)),dist=resolve(root,'frontend/backoffice/dist'),shots=resolve(root,'screenshots.local')
await mkdir(shots,{recursive:true})
const actor='11111111-1111-4111-a111-111111111111',employee='22222222-2222-4222-a222-222222222222',purchaseId='33333333-3333-4333-a333-333333333333'
const permissions=Object.fromEntries(Object.keys(accessDefinitions).map(code=>[code,true]))
const user={id:actor,email:'demo@example.invalid',displayName:'DEMO Manager',status:'ACTIVE',roles:[{code:'ADMIN_MANAGER',name:'Admin Manager',scope:'COMPANY'}],management:{company:true},companyAccess:permissions,operations:{booking:true,guide:true,driver:true,stock:true,manageGuide:true,manageDriver:true},permissions:[]}
const purchase={id:purchaseId,kind:'PURCHASE',version:2,name:'DEMO approved supplies',status:'SUBMITTED',createdById:employee,supplierId:'supplier',storeId:'store',reason:'Restock before trip',quotationUrl:'https://example.invalid/quotation',total:'500.00',receivedTotal:'0.00',lines:[{id:'line',resourceId:'resource',name:'DEMO Safety gloves',baseUnit:'PAIR',quantity:10,unitCost:'50.00',receivedQty:0}],references:{supplierId:'DEMO Equipment Supplier',storeId:'DEMO Main Warehouse'},requesterName:'DEMO Captain',actions:['APPROVE','REJECT']}
const job={id:'44444444-4444-4444-a444-444444444444',kind:'JOB',name:'DEMO Clean pier',status:'PENDING',version:1,dueOn:'2026-09-20',payload:{jobKind:'CLEANING',zoneId:'zone',checklist:['Sweep floor','Check bins']},references:{zoneId:'DEMO Pier zone',assigneeId:'DEMO Cleaner'},actions:[]}
let payrollRows=[],failNextSave=true,lastSaved=null,saveCalls=0
const errors=[],browser=await chromium.launch({channel:'msedge',headless:true,args:['--unsafely-treat-insecure-origin-as-secure=http://greenview.test']}),page=await browser.newPage({viewport:{width:1440,height:1000}})
page.on('pageerror',error=>{errors.push(error.message);console.error('Browser error:',error.message)})
await page.route('**/*',async route=>{
 const url=new URL(route.request().url())
 if(url.origin!=='http://greenview.test')return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30"/>'})
 const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
 if(url.pathname==='/api/me')return json({user})
 if(url.pathname==='/api/personnel-finance/save'){
  saveCalls++;lastSaved=route.request().postDataJSON()
  if(failNextSave){failNextSave=false;return json({code:'RECORD_CONFLICT'},409)}
  const row={...lastSaved,version:1,status:'DRAFT',createdBy:actor,actions:['SUBMIT','CANCEL']};payrollRows=[row];return json({row})
 }
 if(url.pathname==='/api/personnel-finance'){
  if(url.searchParams.get('lookup'))return json({rows:[{id:employee,name:'DEMO Captain'}],total:1,page:1,pages:1})
  const q=url.searchParams.get('q')||'',kind=url.searchParams.get('kind'),rows=kind==='PAYROLL'?payrollRows.filter(r=>r.title.toLowerCase().includes(q.toLowerCase())):[]
  return json({rows,employees:[{id:employee,displayName:'DEMO Captain'}],runs:[],purchases:[],access:{view:true,edit:true,approve:true,pay:true},actorId:actor,summary:{draft:payrollRows.length,submitted:0,approved:0},total:rows.length,page:1,pages:1})
 }
 if(url.pathname==='/api/company-work'){
  if(url.searchParams.get('lookup'))return json({rows:[{id:employee,name:'DEMO Captain'}],total:1,page:1,pages:1})
  const kind=url.searchParams.get('kind'),q=url.searchParams.get('q')||'',rows=(kind==='PURCHASE'?[purchase]:kind==='JOB'?[job]:[]).filter(row=>row.name.toLowerCase().includes(q.toLowerCase()))
  return json({rows,total:rows.length,page:1,pageSize:25,permissions,actorId:actor})
 }
 if(url.pathname.startsWith('/api/'))return json({code:'UNEXPECTED_MOCK_ENDPOINT'},404)
 const path=resolve(dist,url.pathname.startsWith('/assets/')?'.'+decodeURIComponent(url.pathname):'index.html'),inside=relative(dist,path)
 if(inside.startsWith('..')||resolve(dist,inside)!==path)return route.fulfill({status:403,body:'Forbidden'})
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'}
 return route.fulfill({status:200,contentType:types[extname(path)]||'application/octet-stream',body:await readFile(path)})
})
page.setDefaultTimeout(10000)
const visible=async locator=>{await locator.waitFor({state:'visible'});assert.equal(await locator.isVisible(),true)}
const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'Document overflow')
try{
 await page.goto('http://greenview.test/company/payroll');await visible(page.getByRole('heading',{name:'Payroll drafts',exact:true}))
 assert.equal(await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Users',exact:true}).count(),1)
 await visible(page.getByRole('link',{name:'Purchasing',exact:true}));await visible(page.getByRole('link',{name:'Cleaning & count jobs',exact:true}))
 await page.getByRole('button',{name:'Add record',exact:true}).click()
 let dialog=page.getByRole('dialog',{name:'Add payroll drafts',exact:true});await visible(dialog)
 assert.equal(await dialog.locator('form').getAttribute('novalidate'),'')
 await dialog.getByRole('button',{name:'Save draft',exact:true}).click();await visible(dialog.getByText('Enter a record name.',{exact:true}))
 await dialog.getByLabel('Record name',{exact:true}).fill('DEMO Payroll browser')
 await dialog.getByRole('combobox',{name:'Employee',exact:true}).click();await page.getByRole('option',{name:'DEMO Captain',exact:true}).click()
 await dialog.getByLabel('Period starts',{exact:true}).fill('2026-09-01');await dialog.getByLabel('Period ends',{exact:true}).fill('2026-09-30')
 await dialog.getByLabel('Base wage (THB)',{exact:true}).fill('10000');await dialog.getByLabel('Base wage basis / reason',{exact:true}).fill('Agreed monthly base')
 await dialog.getByRole('button',{name:'Add item',exact:true}).click();await dialog.getByLabel('Item description',{exact:true}).fill('Trip addition');await dialog.getByLabel('Reason',{exact:true}).fill('Agreed completed trip');await dialog.getByLabel('Amount (THB)',{exact:true}).fill('500')
 await dialog.getByRole('button',{name:'Close',exact:true}).click();await visible(page.getByRole('dialog',{name:'Discard changes?',exact:true}));await page.getByRole('button',{name:'Keep editing',exact:true}).click()
 await dialog.getByRole('button',{name:'Save draft',exact:true}).click();await visible(dialog.getByText(/This record changed/));assert.equal(await dialog.getByLabel('Base wage (THB)',{exact:true}).inputValue(),'10000');assert.equal(await dialog.getByLabel('Reason',{exact:true}).inputValue(),'Agreed completed trip')
 await dialog.getByRole('button',{name:'Save draft',exact:true}).click();await dialog.waitFor({state:'hidden'});await visible(page.getByRole('cell',{name:'DEMO Payroll browser',exact:true}));assert.equal(saveCalls,2);assert.equal(lastSaved.payload.baseAmount,'10000');assert.equal(lastSaved.payload.items[0].reason,'Agreed completed trip')
 await page.screenshot({path:resolve(shots,'company-payroll-desktop.png'),fullPage:true})
 await page.getByRole('searchbox',{name:'Search records',exact:true}).fill('no-such-record');await visible(page.getByText('No records yet',{exact:true}));await page.getByRole('button',{name:'Clear search',exact:true}).click();await visible(page.getByRole('cell',{name:'DEMO Payroll browser',exact:true}))
 await page.getByRole('button',{name:'Actions for DEMO Payroll browser',exact:true}).click();await page.getByRole('menuitem',{name:'Edit',exact:true}).click();dialog=page.getByRole('dialog',{name:'Edit payroll drafts',exact:true});await visible(dialog);assert.equal(await dialog.getByLabel('Base wage (THB)',{exact:true}).inputValue(),'10000');await dialog.getByRole('button',{name:'Close',exact:true}).click()
 await page.getByRole('link',{name:'Purchasing',exact:true}).click();await visible(page.getByRole('heading',{name:'Purchasing',exact:true}));await page.getByRole('button',{name:'Actions for DEMO approved supplies',exact:true}).click();await page.getByRole('menuitem',{name:'Approve',exact:true}).click()
 dialog=page.getByRole('dialog',{name:'Approve',exact:true});await visible(dialog);await visible(dialog.getByText('DEMO Equipment Supplier',{exact:true}));await visible(dialog.getByText('DEMO Main Warehouse',{exact:true}));await visible(dialog.getByRole('cell',{name:'DEMO Safety gloves',exact:true}));await visible(dialog.getByText(/Order total: 500.00 THB/));await page.screenshot({path:resolve(shots,'company-purchase-review.png'),fullPage:true});await dialog.getByRole('button',{name:'Keep unchanged',exact:true}).click()
 await page.setViewportSize({width:390,height:844});await noOverflow();await page.getByRole('combobox',{name:'Status filter',exact:true}).focus();await page.keyboard.press('Space');await visible(page.getByRole('listbox'));await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await noOverflow();await page.screenshot({path:resolve(shots,'company-work-mobile.png'),fullPage:true})
 await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();await page.getByRole('link',{name:'Cleaning & count jobs',exact:true}).click();await visible(page.getByRole('heading',{name:'Cleaning & count jobs',exact:true}));await page.getByRole('button',{name:'Actions for DEMO Clean pier',exact:true}).click();await page.getByRole('menuitem',{name:'View',exact:true}).click();dialog=page.getByRole('dialog',{name:'DEMO Clean pier',exact:true});await visible(dialog.getByText('DEMO Pier zone',{exact:true}));await visible(dialog.getByText('DEMO Cleaner',{exact:true}));await noOverflow()
 assert.deepEqual(errors,[]);console.log('PASS: static-dist company/payroll browser workflows, validation, conflict retention, references, dirty discard, search, navigation and mobile keyboard/overflow')
}catch(error){await page.screenshot({path:resolve(shots,'company-work-failure.png'),fullPage:true}).catch(()=>{});throw error}
finally{await browser.close()}
