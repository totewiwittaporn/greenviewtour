// Isolated operational fixtures; no real API or database writes.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url)),origin='http://localhost:5286'
const vite=await createServer({root,server:{port:5286,strictPort:true},configFile:`${root}vite.config.js`});await vite.listen()
const browser=await chromium.launch({headless:true,...(process.env.GV_BROWSER_PATH?{executablePath:process.env.GV_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],writes=[]
 page.on('pageerror',error=>errors.push(error.message))
 const id=n=>`21000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 const list=rows=>({rows,total:rows.length,page:1,pages:1,pageSize:25})
 const booking={id:id(1),code:'BK-TEST',name:'Example group',adults:10,children:4,hotel:'Example hotel',programName:'Day trip',status:'CONFIRMED'}
 const resource={id:id(2),name:'Van service',category:'TRANSFER'}
 let run={id:id(3),version:1,code:'RUN-TEST',name:'Van return',kind:'VEHICLE',direction:'RETURN',period:'PM',capacity:12,status:'OPEN',passengers:0,assignments:[],staff:[],slot:{resourceId:resource.id,vehicleId:id(4),resource,vehicle:{id:id(4),name:'Van 01',capacity:12},startsAt:'2026-11-10T09:00:00Z',endsAt:'2026-11-10T12:00:00Z'}}
 let failAssign=true,failPending=false,issued=false
 const line={bookingLineId:id(5),bookingId:booking.id,bookingCode:booking.code,bookingName:booking.name,resourceId:id(6),name:'Water',code:'WATER',kind:'CONSUMABLE',baseUnit:'BOTTLE',usagePoint:'BOAT',quantity:14,issuedQty:0,remainingQty:14,outstandingQty:0,readyBalances:[{id:id(7),version:1,quantity:40,locationId:id(8),locationName:'Store',lotId:id(9),lotLabel:'WATER-LOT'}],issues:[]}
 await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url()),entity=url.pathname.split('/').at(-1)
  if(entity==='me')return route.fulfill({json:{user:{id:id(90),displayName:'Fixture manager',management:{company:true},roles:[]}}})
  if(req.method()==='GET'){
   if(entity==='jobs')return route.fulfill({json:{...list([run]),canManage:true,summary:{total:1,passengers:run.passengers,outbound:0,return:1}}})
   if(entity==='dispatch-options')return failPending?route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Temporarily unavailable'}}):route.fulfill({json:list([{id:id(10),code:booking.code,name:booking.name,booking,resource,remainingAdults:10,remainingChildren:4,remainingPassengers:14}])})
   if(entity==='boat-preparation')return route.fulfill({json:{run:{...run,passengers:14},rows:[{...line,...(issued?{issuedQty:14,remainingQty:0,outstandingQty:14,issues:[{id:id(11),quantity:14,settledQty:0}]}:{})}],bookings:{count:1,passengers:14},destinations:[{id:id(12),name:'Boat 01'}]}})
   return route.fulfill({json:{...list([]),summary:{}}})
  }
  const data=req.postDataJSON();writes.push({entity,data})
  if(entity==='dispatch-command'){
   if(failAssign){failAssign=false;run={...run,version:2};return route.fulfill({status:409,json:{code:'RUN_VERSION_CONFLICT',message:'Run changed. Review capacity.'}})}
   assert.equal(data.adults+data.children,12);assert.equal(data.pickupAt,'');assert.equal(data.version,2)
   run={...run,version:3,passengers:12,assignments:[{id:id(30),bookingLineId:data.bookingLineId,booking,adults:10,children:2,actualAdults:null,actualChildren:null}]};return route.fulfill({json:{ok:true}})
  }
  if(entity==='stock-command'){assert.equal(data.runId,run.id);assert.equal(data.bookingLineId,line.bookingLineId);assert.equal(data.quantity,14);issued=true;return route.fulfill({json:{ok:true}})}
  return route.fulfill({status:404,json:{code:'NOT_FOUND'}})
 })
 await page.goto(`${origin}/operations/driver?date=2026-11-10`)
 await page.getByRole('button',{name:`Actions for booking ${booking.code}`,exact:true}).click();await page.getByRole('menuitem',{name:'Assign booking',exact:true}).click()
 assert.equal(await page.getByLabel('Adults to assign',{exact:true}).inputValue(),'10');assert.equal(await page.getByLabel('Children to assign',{exact:true}).inputValue(),'4')
 assert.equal(await page.getByRole('button',{name:'Assign booking',exact:true}).isDisabled(),true);assert.equal(await page.getByLabel('Pickup date and time',{exact:true}).count(),0)
 await page.getByLabel('Children to assign',{exact:true}).fill('2');await page.getByRole('button',{name:'Assign booking',exact:true}).click();await page.getByRole('button',{name:'Reload run version',exact:true}).click();await page.getByRole('region',{name:'Current run revision',exact:true}).waitFor();await page.getByRole('button',{name:'Assign booking',exact:true}).click();await page.getByText('Changes saved.',{exact:true}).waitFor()
 assert.equal(writes.length,2)
 assert.equal(await page.locator('.dispatch-runs .table-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth),true)
 assert.ok(await page.locator('.dispatch-workspace').evaluate(el=>el.getBoundingClientRect().height)<900)
 assert.equal(await page.getByLabel('Search bookings to assign',{exact:true}).getAttribute('placeholder'),'Search…')
 const date=page.getByLabel('Service date',{exact:true});assert.equal(await date.getAttribute('type'),'date');assert.equal(await date.evaluate(el=>Math.round(el.getBoundingClientRect().height)),38)
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 failPending=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('region',{name:'Available bookings',exact:true}).getByRole('alert').waitFor();failPending=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('button',{name:`Actions for booking ${booking.code}`,exact:true}).waitFor()
 run={...run,kind:'BOAT',direction:'OUTBOUND',slot:{...run.slot,vehicle:{...run.slot.vehicle,name:'Boat 01'}},assignments:[]}
 await page.goto(`${origin}/operations/stock?date=2026-11-10&runId=${run.id}`);await page.getByRole('button',{name:`Actions for ${booking.code} Water`,exact:true}).click();await page.getByRole('menuitem',{name:'Prepare / issue',exact:true}).click();await page.getByLabel('Responsible person',{exact:true}).fill('Fixture assistant');await page.getByRole('combobox',{name:'Destination',exact:true}).click();await page.getByRole('option',{name:'Boat 01',exact:true}).click();await page.getByRole('button',{name:'Save stock transaction',exact:true}).click();await page.getByText('Stock transaction saved.',{exact:true}).waitFor();assert.equal(writes.at(-1).entity,'stock-command')
 await page.getByRole('tab',{name:'Loans & returns · ยืมของใช้',exact:true}).click();await page.getByText('Select a boat run to see its booking requirements.',{exact:true}).waitFor()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.setViewportSize({width:1440,height:1000});await page.goto(`${origin}/operations/driver?date=2026-11-10`);await page.getByRole('button',{name:`Actions for booking ${booking.code}`,exact:true}).waitFor();await mkdir(new URL('../screenshots.local/',import.meta.url),{recursive:true});await page.screenshot({path:fileURLToPath(new URL('../screenshots.local/allocation-board.png',import.meta.url)),fullPage:true})
 assert.deepEqual(errors,[]);console.log(JSON.stringify({result:'PASS',realDatabaseWrites:0,checks:['prefilled booking remaining counts','12 capacity blocks 14 selection','return vehicle has no pickup time','stale version recovery preserves entries','native date control38px','pending error retry','boat-derived stock issue carries run and booking line','stock supplies/loans tabs','390px no root overflow']}))
}finally{await browser.close();await vite.close()}
