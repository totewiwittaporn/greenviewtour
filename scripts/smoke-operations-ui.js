// Isolated browser fixtures only. This script never connects to the real API/database.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url)),origin='http://localhost:5276'
const vite=await createServer({root,server:{port:5276,strictPort:true},configFile:`${root}vite.config.js`})
await vite.listen()
const browser=await chromium.launch({headless:true,...(process.env.GV_BROWSER_PATH?{executablePath:process.env.GV_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],writes=[]
 page.on('pageerror',error=>errors.push(error.message))
 const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 const tour={id:id(1),name:'Fixture island tour',code:'TOUR',status:'ACTIVE',adultPrice:'1500',childPrice:'900'}
 const store={id:id(2),name:'Fixture warehouse',code:'STORE',status:'ACTIVE',kind:'WAREHOUSE',version:1}
 const trip={id:id(3),name:'Fixture departure',code:'TRIP',tourId:tour.id,tour,status:'OPEN',capacity:20,startsAt:'2026-10-01T01:00:00Z',endsAt:'2026-10-01T10:00:00Z',version:1}
 const water={id:id(4),name:'Fixture water',code:'WATER',kind:'CONSUMABLE',category:'WATER',baseUnit:'BOTTLE',packSize:12,caseSize:24,status:'ACTIVE',salePrice:'10',version:1}
 const rows={services:[],equipment:[],consumables:[water],stores:[store],components:[],slots:[],trips:[trip],bookings:[],stock:[],issues:[],movements:[]}
 const settings={tours:[tour],partners:[],vehicles:[],company:[],channels:[],rates:[],locations:[]}
 let failConfirmation=true
 const list=(all,url)=>{const q=(url.searchParams.get('q')||'').toLowerCase(),status=url.searchParams.get('status'),result=all.filter(row=>(!q||`${row.name} ${row.code}`.toLowerCase().includes(q))&&(!status||row.status===status)),page=1;return{rows:result,total:result.length,page,pages:1,pageSize:25,summary:{total:all.length,active:all.length,inactive:0,featured:all.length,draft:all.filter(r=>r.status==='DRAFT').length,confirmed:0,completed:0}}}
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),entity=url.pathname.split('/').at(-1)
  if(url.pathname==='/api/me')return route.fulfill({json:{user:{id:id(9),displayName:'Fixture Manager',roles:[],management:{company:true}}}})
  if(url.pathname.startsWith('/api/settings/'))return route.fulfill({json:list(settings[entity]||[],url)})
  if(!url.pathname.startsWith('/api/operations/'))return route.fulfill({status:404,json:{code:'NOT_FOUND'}})
  if(request.method()==='GET'){
   if(entity==='blueprint')return route.fulfill({json:{trip,adultPrice:'1500',childPrice:'900',lines:[{componentId:id(5),resourceId:water.id,resource:water,selection:'INCLUDED',quantity:2,selected:true,included:true,usagePoint:'BOAT',unitPrice:'0',snapshot:{name:water.name,componentId:id(5),selection:'INCLUDED'}}]}})
   if(entity==='preparation')return route.fulfill({json:{trip,bookings:{confirmed:1,passengers:2},rows:[{resourceId:water.id,name:water.name,code:water.code,kind:water.kind,baseUnit:water.baseUnit,usagePoint:'BOAT',quantity:2,issuedQty:0,outstandingQty:0,sourceNames:[store.name],slotNames:[]}],total:1,page:1,pages:1,pageSize:25}})
   return route.fulfill({json:list(entity==='resources'?[...rows.services,...rows.equipment,...rows.consumables]:rows[entity]||[],url)})
  }
  const data=request.postDataJSON();writes.push({entity,data})
  if(entity==='booking-status'){
   if(failConfirmation){failConfirmation=false;return route.fulfill({status:409,json:{code:'INSUFFICIENT_STOCK',message:'Not enough ready stock for this booking.'}})}
   return route.fulfill({json:{ok:true,status:'CONFIRMED',version:data.version+1}})
  }
  if(entity==='stock-command')return route.fulfill({json:{row:{id:data.id}}})
  const row={...data,version:Number(data.version)+1,status:data.status||(entity==='bookings'?'DRAFT':'ACTIVE')}
  if(entity==='bookings'){row.trip=trip;row.lines=data.lines.map(line=>({...line,resource:water,source:store,unitPrice:'0',included:true,snapshot:{componentId:line.componentId,selection:'INCLUDED'}}))}
  rows[entity]=[...rows[entity].filter(item=>item.id!==row.id),row]
  return route.fulfill({json:{row}})
 })
 const choose=async(label,option)=>{const trigger=page.getByRole('combobox',{name:label,exact:true});await trigger.click();await page.getByRole('option',{name:option,exact:true}).click()}
 const open=async(entity,singular)=>{await page.goto(`${origin}/operations/${entity}`);await page.getByRole('button',{name:`+ Add ${singular}`,exact:true}).click()}
 const save=async()=>{await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Changes saved.',{exact:true}).waitFor()}
 await open('services','service');await page.getByLabel('Code',{exact:true}).fill('VAN');await page.getByLabel('Name',{exact:true}).fill('Fixture van transfer');await page.getByLabel('Origin',{exact:true}).fill('Khao Lak');await page.getByLabel('Destination',{exact:true}).fill('Khura Buri Pier');await save();assert.equal(rows.services[0].baseUnit,'PERSON')
 await page.getByRole('button',{name:'Actions for Fixture van transfer',exact:true}).click();assert.equal(await page.getByRole('menuitem').count(),2);assert.equal(await page.getByRole('menuitem').locator('svg').count(),2);await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Actions for Fixture van transfer',exact:true}).evaluate(el=>el===document.activeElement),true)
 await open('consumables','consumable');await page.getByLabel('Code',{exact:true}).fill('JUICE');await page.getByLabel('Name',{exact:true}).fill('Fixture juice');await choose('Category','Juice');await page.getByLabel('Bottles per pack',{exact:true}).fill('6');await page.getByLabel('Bottles per case',{exact:true}).fill('24');await save();assert.equal(rows.consumables.at(-1).packSize,'6')
 await open('slots','service slot');await page.getByLabel('Code',{exact:true}).fill('SLOT');await page.getByLabel('Name',{exact:true}).fill('Fixture morning transfer');await choose('Service','VAN · Fixture van transfer');await page.getByLabel('Start date and time',{exact:true}).fill('2026-10-01 08:00');await page.getByLabel('End date and time',{exact:true}).fill('2026-10-01 09:00');await page.getByLabel('Capacity in service pricing units',{exact:true}).fill('10');await save();assert.equal(rows.slots[0].startsAt,'2026-10-01 08:00')
 await page.goto(`${origin}/operations/bookings`);await page.getByRole('button',{name:'New booking',exact:true}).click();await page.getByLabel('Code',{exact:true}).fill('BOOK');await page.getByLabel('Guest / booking name',{exact:true}).fill('Fixture guest');await choose('Trip','TRIP · Fixture departure');await page.getByLabel('Adults',{exact:true}).fill('2');await page.getByRole('button',{name:'Load program defaults',exact:true}).click();await page.getByLabel('Quantity (BOTTLE)',{exact:true}).waitFor();assert.equal(await page.getByLabel('Quantity (BOTTLE)',{exact:true}).inputValue(),'2');await choose('Source store','STORE · Fixture warehouse');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Actions for BOOK',exact:true}).click();await page.getByRole('menuitem',{name:'Confirm',exact:true}).click();await page.getByRole('button',{name:'Confirm booking',exact:true}).click();await page.getByText('Not enough ready stock for this booking.',{exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),1);assert.equal(rows.bookings[0].name,'Fixture guest');assert.equal(rows.bookings[0].lines[0].sourceId,store.id);await page.getByRole('button',{name:'Keep booking',exact:true}).click()
 await page.goto(`${origin}/operations/stock`);await page.getByRole('button',{name:'Receive stock',exact:true}).click();await choose('Resource','WATER · Fixture water');await choose('Receiving location','STORE · Fixture warehouse');await page.getByLabel('Lot / delivery reference',{exact:true}).fill('FIXTURE-LOT');await page.getByLabel('Quantity',{exact:true}).fill('2');await choose('Unit','Pack · 12 base units');await page.getByRole('button',{name:'Save stock transaction',exact:true}).click();await page.getByText('Stock transaction saved.',{exact:true}).waitFor();const received=writes.find(w=>w.entity==='stock-command').data;assert.equal(received.unit,'PACK');assert.equal(received.quantity,2)
 await page.goto(`${origin}/operations/trips`);await page.getByRole('button',{name:'Actions for Fixture departure',exact:true}).click();await page.getByRole('menuitem',{name:'Preparation',exact:true}).click();await page.getByRole('table',{name:'Preparation for Fixture departure',exact:true}).waitFor();await page.getByText('1 confirmed / completed bookings · 2 passengers',{exact:true}).waitFor();assert.equal(await page.getByRole('dialog').getByRole('row').count(),2);assert.deepEqual(await page.getByRole('dialog').getByRole('columnheader').allTextContents(),['Item','Usage','Required','Issued','To issue','To settle','Source or slot']);assert.deepEqual((await page.getByRole('dialog').getByRole('row').nth(1).getByRole('cell').allTextContents()).slice(2,6),['2','0','2','0']);await page.getByRole('cell',{name:'Fixture warehouse',exact:true}).waitFor()
 await mkdir(new URL('../screenshots.local/',import.meta.url),{recursive:true});await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/operations-desktop.png',import.meta.url)),fullPage:true});await page.keyboard.press('Escape')
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(`${origin}/operations/consumables`);await page.getByRole('button',{name:'Actions for Fixture water',exact:true}).waitFor();assert.equal(await page.getByRole('tabpanel').count(),1);assert.equal(await page.getByRole('tabpanel').getByRole('table').count(),1);assert.equal(await page.getByRole('tab',{name:'Consumables',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/operations-mobile.png',import.meta.url)),fullPage:true})
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',realDatabaseWrites:0,checks:['service creation','bottle pack/case fields','typed service times','booking blueprint and save','confirmation failure preserved','PACK receive payload','action icons and Escape focus','trip preparation totals','390px one active table/tab and no overflow']}))
} finally {await browser.close();await vite.close()}
