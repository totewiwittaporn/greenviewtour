// Isolated browser fixtures, no real database or credentials.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url))
const vite=await createServer({root,server:{port:5274,strictPort:true},configFile:`${root}vite.config.js`})
await vite.listen()
const browser=await chromium.launch({headless:true,...(process.env.GV_BROWSER_PATH?{executablePath:process.env.GV_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const rows={company:[],partners:[],tours:[],rates:[],locations:[],vehicles:[],channels:[]};let failSave=false,failRead=false
 await page.route('**/api/me',r=>r.fulfill({json:{user:{id:'fixture',displayName:'Fixture Manager',roles:[],management:{company:true}}}}))
 await page.route('**/api/settings/**',route=>{
  const request=route.request(),url=new URL(request.url()),entity=url.pathname.split('/').at(-1)
  if(request.method()==='POST'){
   if(failSave){failSave=false;return route.fulfill({status:503,json:{code:'SERVICE_UNAVAILABLE'}})}
   const data=request.postDataJSON(),row={...data,version:data.version+1}
   if(entity==='rates'){row.agent=rows.partners.find(p=>p.id===row.agentId);row.tour=rows.tours.find(t=>t.id===row.tourId)}
   rows[entity]=[...rows[entity].filter(r=>r.id!==row.id),row]
   return route.fulfill({json:{row}})
  }
  if(failRead){failRead=false;return route.fulfill({status:503,json:{code:'SERVICE_UNAVAILABLE'}})}
  const q=url.searchParams.get('q')?.toLowerCase(),role=url.searchParams.get('role'),status=url.searchParams.get('status')
  const result=rows[entity].filter(r=>(!q||`${r.name} ${r.code} ${r.agent?.name} ${r.tour?.name}`.toLowerCase().includes(q))&&(!role||r.roles?.includes(role))&&(!status||r.status===status))
  const pageSize=25,pages=Math.max(1,Math.ceil(result.length/pageSize)),current=Math.min(pages,Math.max(1,Number(url.searchParams.get('page'))||1))
  const all=rows[entity],summary={total:all.length,active:all.filter(r=>r.status==='ACTIVE').length,inactive:all.filter(r=>r.status==='INACTIVE').length,featured:entity==='partners'?all.filter(r=>r.roles?.includes('SALES_AGENT')).length:0}
  return route.fulfill({json:{rows:result.slice((current-1)*pageSize,current*pageSize),total:result.length,page:current,pages,pageSize,summary}})
 })
 const save=()=>page.getByRole('button',{name:'Save changes',exact:true}).click()
 const open=async(entity,label)=>{await page.goto(`http://localhost:5274/settings/${entity}`);await page.getByRole('button',{name:`+ Add ${label}`,exact:true}).click()}
 await page.goto('http://localhost:5274/settings/company');await page.getByRole('button',{name:'Save company details'}).click();assert.equal(await page.getByLabel('Company name').getAttribute('aria-invalid'),'true')
 await page.getByLabel('Company name').fill('Greenview Fixture');await page.getByRole('button',{name:'Save company details'}).click();await page.getByText('Company details saved.',{exact:true}).waitFor()
 await open('partners','partner');await page.getByLabel('Code',{exact:true}).fill('AGENT-A');await page.getByLabel('Name',{exact:true}).fill('Agent A')
 await page.getByLabel('Sales agent',{exact:true}).check();await page.getByLabel('Tour operator',{exact:true}).check();await page.getByLabel('Transport provider',{exact:true}).check()
 failSave=true;await save();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'Agent A');await save();await page.getByText('Changes saved.',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Actions for Agent A'}).click();await page.getByRole('menuitem',{name:'Edit',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Discard me');await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Keep editing'}).click();await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Discard changes'}).click();assert.equal(rows.partners[0].name,'Agent A')
 await open('tours','tour program');await page.getByLabel('Code',{exact:true}).fill('TOUR-A');await page.getByLabel('Name',{exact:true}).fill('Island tour');await page.getByLabel('Direct adult price (THB)',{exact:true}).fill('1500');await save();await page.getByText('Changes saved.',{exact:true}).waitFor()
 await open('rates','agent price')
 await page.getByRole('combobox',{name:'Sales agent',exact:true}).click();await page.getByRole('option',{name:'AGENT-A · Agent A',exact:true}).click()
 await page.getByRole('combobox',{name:'Tour program',exact:true}).click();await page.getByRole('option',{name:'TOUR-A · Island tour',exact:true}).click()
 await page.getByLabel('Agent adult price (THB)',{exact:true}).fill('900.50');await save();await page.getByText('Changes saved.',{exact:true}).waitFor()
 assert.equal(rows.rates[0].adultPrice,'900.50');assert.equal(rows.tours[0].adultPrice,'1500')
 await page.getByRole('button',{name:'Actions for Agent A'}).click();await page.getByRole('menuitem',{name:'View',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Save changes'}).count(),0);await page.keyboard.press('Escape')
 for(const[entity,singular,code,name]of[['locations','pickup point','H1','Hotel fixture'],['vehicles','vehicle','V1','Van fixture'],['channels','sales channel','WALK_IN','Walk-in']]){
  await open(entity,singular);await page.getByLabel('Code',{exact:true}).fill(code);await page.getByLabel('Name',{exact:true}).fill(name)
  if(entity==='vehicles')await page.getByLabel('Passenger capacity').fill('10')
  await save();await page.getByText('Changes saved.',{exact:true}).waitFor()
 }
 await page.goto('http://localhost:5274/settings/partners');await page.getByRole('searchbox').fill('no match');await page.getByText('No matching records.',{exact:false}).waitFor();await page.getByRole('button',{name:'Clear search',exact:true}).click();await page.getByRole('cell',{name:/^Agent A (AGENT-A|Island tour)$/}).waitFor()
 failRead=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('cell',{name:/^Agent A (AGENT-A|Island tour)$/}).waitFor()
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'})
 await page.getByRole('button',{name:'+ Add partner',exact:true}).click();await page.getByRole('combobox',{name:'Status',exact:true}).press('ArrowDown');await page.getByRole('listbox').waitFor();await page.keyboard.press('End');await page.keyboard.press('Enter');assert.match(await page.getByRole('combobox',{name:'Status',exact:true}).innerText(),/Inactive/)
 await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Discard changes'}).click()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await mkdir(new URL('../screenshots.local/',import.meta.url),{recursive:true})
 await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/tour-settings-mobile.png',import.meta.url)),fullPage:true})
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:5274/settings/rates');await page.getByRole('cell',{name:/^Agent A (AGENT-A|Island tour)$/}).waitFor()
 await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/tour-settings-desktop.png',import.meta.url)),fullPage:true})
 // Real pagination fixture: 60 distinct records, sliced by the mocked API.
 rows.partners=Array.from({length:60},(_,i)=>({...rows.partners[0],id:`partner-${i+1}`,name:`Pagination Partner ${String(i+1).padStart(2,'0')}`,code:`PAGE-${i+1}`,status:i<45?'ACTIVE':'INACTIVE'}))
 await page.goto('http://localhost:5274/settings/partners')
 await page.getByText('Showing 1–25 of 60 records',{exact:false}).waitFor()
 const panel=page.getByRole('tabpanel'),pagination=page.getByRole('navigation',{name:'Business partners pagination',exact:true})
 assert.equal(await panel.count(),1)
 assert.equal(await panel.getByRole('table').count(),1)
 assert.equal(await panel.getByRole('row').count(),26)
 assert.equal(await page.locator('[role="tabpanel"][hidden]').getByRole('table',{includeHidden:true}).count(),0,'Inactive panels must not retain table data')
 assert.equal(await pagination.getByRole('button',{name:'Previous',exact:true}).isDisabled(),true)
 await pagination.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Showing 26–50 of 60 records',{exact:false}).waitFor()
 await page.getByText('Page 2 of 3',{exact:true}).waitFor()
 await pagination.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Showing 51–60 of 60 records',{exact:false}).waitFor()
 assert.equal(await panel.getByRole('row').count(),11)
 assert.equal(await pagination.getByRole('button',{name:'Next',exact:true}).isDisabled(),true)
 await pagination.getByRole('button',{name:'Previous',exact:true}).click();await page.getByText('Page 2 of 3',{exact:true}).waitFor()
 const summary=page.getByRole('region',{name:'Business partners summary — all records, independent of filters',exact:true})
 assert.deepEqual(await summary.locator('.metric strong').allTextContents(),['60','45','15','60'])
 for(const[width,height,columns]of[[1440,1000,4],[768,1024,2],[390,844,2]]){
  await page.setViewportSize({width,height})
  const boxes=await summary.locator('.metric').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y}}))
  assert.equal(boxes.length,4)
  assert.equal(new Set(boxes.map(b=>Math.round(b.x))).size,columns,`Summary columns at ${width}px`)
  assert.equal(new Set(boxes.map(b=>Math.round(b.y))).size,4/columns,`Summary rows at ${width}px`)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 }
 await page.setViewportSize({width:1440,height:1000})
 await page.getByRole('searchbox').fill('Pagination Partner');await page.getByText('Page 1 of 3',{exact:true}).waitFor()
 await pagination.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Page 2 of 3',{exact:true}).waitFor()
 const partnersTab=page.getByRole('tab',{name:'Business partners',exact:true}),ratesTab=page.getByRole('tab',{name:'Agent prices',exact:true})
 await partnersTab.focus();await page.keyboard.press('ArrowRight')
 assert.equal(await ratesTab.evaluate(el=>el===document.activeElement),true)
 assert.equal(await partnersTab.getAttribute('aria-selected'),'true','Arrow navigation must not activate a tab')
 await page.keyboard.press('Enter');await page.getByRole('heading',{level:1,name:'Agent prices',exact:true}).waitFor()
 assert.equal(await page.getByRole('tabpanel').count(),1)
 assert.equal(await page.getByRole('cell',{name:'Pagination Partner 26 PAGE-26',exact:true}).count(),0)
 await partnersTab.click();await page.getByText('Showing 26–50 of 60 records',{exact:false}).waitFor()
 assert.equal(await page.getByRole('searchbox').inputValue(),'Pagination Partner')
 assert.equal(new URL(page.url()).searchParams.get('page'),'2')
 await page.getByRole('searchbox').fill('no such fixture');await page.getByText('Showing 0–0 of 0 records',{exact:false}).waitFor()
 assert.equal(await pagination.getByRole('button',{name:'Previous',exact:true}).isDisabled(),true)
 assert.equal(await pagination.getByRole('button',{name:'Next',exact:true}).isDisabled(),true)
 assert.deepEqual(await summary.locator('.metric strong').allTextContents(),['60','45','15','60'],'Filtered list must not replace summary totals')
 for(const[group,tabs]of[['Company & Tours',['Company','Tour programs']],['Partners & Sales',['Business partners','Agent prices','Sales channels']],['Transport & Pickup',['Hotels & pickup points','Vehicles & boats']]]){
  await page.getByRole('link',{name:group,exact:true}).click()
  assert.deepEqual(await page.getByRole('tab').allTextContents(),tabs)
  for(const tab of tabs){await page.getByRole('tab',{name:tab,exact:true}).click();await page.getByRole('heading',{level:1,name:tab,exact:true}).waitFor();assert.equal(await page.getByRole('tabpanel').count(),1)}
 }
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({result:'PASS',created:Object.keys(rows),checks:['validation','failed save retains values','unsaved discard','view only','independent agent price','search/clear','read retry','keyboard select','mobile overflow','reduced motion','60-row pagination boundaries and empty results','summary totals and 4/2/2 column layouts','manual keyboard tabs','tab query/page restoration','group tab reachability','one accessible active table panel'],realDatabaseWrites:0}))
}finally{await browser.close();await vite.close()}
