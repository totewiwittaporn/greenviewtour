// Read-only browser fixtures for all three operational document types.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url))
const out=fileURLToPath(new URL('../screenshots.local/',import.meta.url))
const vite=await createServer({root,server:{port:5278,strictPort:true},configFile:`${root}vite.config.js`});await vite.listen()
const browser=await chromium.launch({headless:true,...(process.env.GV_BROWSER_PATH?{executablePath:process.env.GV_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})})
try {
 await mkdir(out,{recursive:true})
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 const trip={name:'Surin Island · Sample',startsAt:'2026-05-01T01:00:00Z',endsAt:'2026-05-02T10:00:00Z'}
 const guest={id:id(1),code:'SAMPLE-001',version:3,name:'Sample guests · กลุ่มตัวอย่าง',status:'CONFIRMED',adults:2,children:1,trip,agentName:'Sample agent',agentPhone:'081-000-0000',hotel:'Sample hotel',room:'101',pickupPoint:'Hotel lobby',dropoffPoint:'Pier',allergies:'Peanut allergy',assistance:'Wheelchair assistance',programName:'2 days / 1 night',arrivalAt:trip.startsAt,departureAt:trip.endsAt,paymentTerms:'AGENT_CREDIT'}
 let run={id:id(2),code:'SAMPLE-BOAT',name:'Surin Island · Sample',kind:'BOAT',version:4,direction:'OUTBOUND',period:'AM',capacity:40,slot:{startsAt:trip.startsAt,endsAt:'2026-05-01T04:00:00Z',vehicle:{name:'Sample boat 5'}},staff:[{name:'Sample guide',role:'GUIDE'},{name:'Sample captain',role:'CAPTAIN'}],assignments:Array.from({length:3},(_,i)=>({id:id(i+10),booking:{...guest,code:`SAMPLE-${i+1}`,name:`Sample group ${i+1} · กลุ่มตัวอย่าง`},adults:2,children:1,actualAdults:i===0?0:null,actualChildren:i===0?0:null,changeReason:i===0?'Guest did not travel':'',pickupAt:'2026-05-01T01:20:00Z'})),passengers:9}
 const booking={...guest,lines:[{id:id(80),selected:true,dispatchDirection:'BOTH',quantity:3,resource:{name:'Sample boat service',category:'TOUR_BOAT',baseUnit:'PERSON'},dispatchAssignments:[{id:id(81),run,adults:2,children:1}]}]}
 let failed=false,documentRuns
 const list=rows=>({rows,total:rows.length,page:1,pageSize:25,pages:1})
 await page.route('**/api/**',async route=>{
  const req=route.request(),entity=new URL(req.url()).pathname.split('/').at(-1)
  assert.equal(req.method(),'GET','Documents must never mutate data')
  if(entity==='document-brand')return route.fulfill({json:{logo:'data:image/png;base64,'+(await readFile(new URL('../backend/assets/greenview-tour-logo.png',import.meta.url))).toString('base64')}})
  if(entity==='me')return route.fulfill({json:{user:{id:id(99),displayName:'Sample manager',roles:[],management:{company:true},operations:{guide:true,driver:true,booking:true}}}})
  if(entity==='jobs')return failed?route.fulfill({status:500,json:{code:'LOAD_FAILED'}}):route.fulfill({json:{...list([run]),...(documentRuns?{documentRuns}:{}),canManage:false,summary:{total:1,passengers:run.passengers,outbound:1,return:0}}})
  if(entity==='booking-document'){const rows=Array.from({length:10},(_,i)=>({id:id(i+300),code:'BK'+i,version:1,name:'Group '+i,agentName:'Sample agent',programId:'tour',programName:'Day trip',adults:2,children:1,paymentTerms:'COUNTER',collectAmount:'250.00',transfers:['OUTBOUND','RETURN']}));const {dailyBookingSummary}=await import('../packages/contracts/booking-document.js');return failed?route.fulfill({status:500,json:{code:'LOAD_FAILED'}}):route.fulfill({json:{date:'2026-05-01',generatedAt:new Date().toISOString(),rows,summary:dailyBookingSummary(rows)}})}
  if(entity==='bookings')return route.fulfill({json:{...list([booking]),summary:{total:1,confirmed:1}}})
  return route.fulfill({json:list([])})
 })
 async function capture(name){
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.document-masthead img')].map(img=>img.decode()))})
  await page.setViewportSize({width:390,height:844})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.screenshot({path:`${out}/${name}-mobile.png`})
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({media:'print'})
  await page.pdf({path:`${out}/${name}.pdf`,preferCSSPageSize:true,printBackground:true})
  assert.equal(await page.locator('.job-actions').last().evaluate(el=>getComputedStyle(el).display),'none')
  await page.emulateMedia({media:'screen'})
 }
 await page.goto(`http://localhost:5278/operations/guide?date=2026-05-01&runId=${run.id}`)
 await page.getByRole('heading',{name:'BOAT JOB ORDER / ใบงานเรือ',exact:true}).waitFor()
 await capture('boat-job-sample')
 assert.equal(await page.locator('.boat-daily-table').getByText('0/0',{exact:true}).count(),1)
 assert.equal(await page.locator('.boat-daily-table tbody tr td:last-child').getByText('—',{exact:true}).count(),2)
 run={...run,direction:'RETURN',code:'SAMPLE-RETURN',assignments:[run.assignments[0]],passengers:3}
 await page.goto(`http://localhost:5278/operations/guide?date=2026-05-01&runId=${run.id}`);await page.getByRole('heading',{name:'BOAT JOB ORDER / ใบงานเรือ',exact:true}).waitFor();await capture('boat-return-sample')
 const baseRun={...run,kind:'BOAT',slot:{...run.slot,vehicle:{id:id(55),name:'Sample boat 5'}}}
 documentRuns=[{...baseRun,id:id(56),direction:'OUTBOUND',assignments:Array.from({length:15},(_,i)=>({...baseRun.assignments[0],id:id(300+i),booking:{...guest,code:`OUT-${i+1}`,name:`Sample group ${i+1}`},actualAdults:null,actualChildren:null,changeReason:''}))},{...baseRun,id:id(57),direction:'RETURN',assignments:Array.from({length:5},(_,i)=>({...baseRun.assignments[0],id:id(400+i),booking:{...guest,code:`BACK-${i+1}`,name:`Returning group ${i+1}`},actualAdults:null,actualChildren:null,changeReason:''}))}]
 await page.goto(`http://localhost:5278/operations/guide?date=2026-05-01&runId=${run.id}`)
 await page.getByRole('heading',{name:'BOAT JOB ORDER / ใบงานเรือ',exact:true}).waitFor()
 assert.equal(await page.locator('.boat-daily-table tbody tr:not(.job-section-row):not(.job-total-row)').count(),20)
 await capture('boat-daily-20-groups')
 documentRuns=undefined
 run={...run,kind:'VEHICLE',code:'SAMPLE-VAN',slot:{...run.slot,vehicle:{name:'Sample van 1'}},staff:[{name:'Sample driver',role:'DRIVER'}]}
 await page.goto(`http://localhost:5278/operations/driver?date=2026-05-01&runId=${run.id}`)
 await page.getByRole('heading',{name:'TRANSFER JOB ORDER / ใบงานรถ',exact:true}).waitFor();await capture('vehicle-job-sample')
 assert.equal(await page.locator('.job-sheet').getByText('Peanut allergy',{exact:true}).count(),0)
 assert.ok((await page.locator('.transfer-daily-sheet').textContent()).includes('Wheelchair assistance'))
 await page.goto('http://localhost:5278/operations/bookings')
 await page.getByRole('button',{name:'Daily job order',exact:true}).click()
 await page.getByRole('heading',{name:'DAILY BOOKING JOB ORDER / ใบงานบุ๊กกิ้งประจำวัน',exact:true}).waitFor();assert.equal(await page.locator('.booking-daily-table tbody tr').count(),11);await capture('booking-job-sample')
 await page.keyboard.press('Escape')
 run={...run,assignments:Array.from({length:35},(_,i)=>({...run.assignments[0],id:id(200+i),booking:{...guest,name:`Long group ${i+1}`,code:`LONG-${i+1}`},notes:'Pickup assistance. '.repeat(8)}))}
 await page.goto(`http://localhost:5278/operations/driver?date=2026-05-01&runId=${run.id}`);await page.getByRole('heading',{name:'TRANSFER JOB ORDER / ใบงานรถ',exact:true}).waitFor();await capture('job-multipage')
 await page.keyboard.press('Escape');failed=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Print A4 landscape',exact:true}).count(),0)
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({result:'PASS',realDatabaseWrites:0,checks:['all three document types','independent outbound and return','zero vs unrecorded actual counts','daily booking contains all ten rows','driver assistance without dietary data','390px layout','print control removal','multipage output','failed refresh blocks print']}))
} finally { await browser.close();await vite.close() }
