// Browser-only layout fixtures. No business writes, emails or role changes.
import assert from 'node:assert/strict'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {chromium} from 'playwright'
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5174'
const out=process.env.GREENVIEW_PORTRAIT_SCREENSHOTS||'/tmp/greenview-portrait-job'
await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true})
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const crew=[['CAPTAIN','Captain A'],['ASSISTANT_CAPTAIN','Assistant Captain A'],['GUIDE','Guide A'],['ASSISTANT_TOUR_GUIDE','Assistant Guide A']].map(([role,name],i)=>({userId:id(800+i),role,name}))
function makeRun(n,direction='OUTBOUND',{longNotes=false,sizes,giant=false}={}) {
 const assignments=Array.from({length:n},(_,i)=>({id:id(20+i),adults:sizes?.[i]||3,children:0,actualAdults:null,actualChildren:null,
  booking:{id:id(100+i),code:'GROUP-'+String(i+1).padStart(3,'0'),name:'Group '+String(i+1).padStart(2,'0')+' with a long name for ellipsis verification',status:'CONFIRMED',programId:'tour',programName:'Surin Day Trip',programPrintCode:'DT',agentName:'Fixture agent',agentShortName:'ABCDEFGHIJ',arrivalAt:'2026-09-26',departureAt:'2026-09-26',returnStatus:'OUR',allergyStatus:i===0?'HAS':'NONE',allergies:i===0?(giant?'Peanut allergy. Keep the full instruction. '.repeat(100):'Peanut allergy. Avoid cross-contact.'):null,requestNotes:longNotes?'Needs assistance when boarding. Keep the group together. '.repeat(3):null,printServices:{accommodation:'-',meals:'1:L',flags:[]}},
 }))
 return {id:id(direction==='OUTBOUND'?1:2),code:'LAYOUT-'+direction,name:'Layout validation',version:1,status:'OPEN',kind:'BOAT',direction,capacity:65,slot:{startsAt:direction==='OUTBOUND'?'2026-09-26T02:00:00Z':'2026-09-26T08:00:00Z',vehicle:{id:id(700),name:'Layout fixture · Boat 65',capacity:65}},staff:crew,assignments,passengers:assignments.reduce((n,a)=>n+a.adults+a.children,0)}
}
const results=[],errors=[]
let runs=[makeRun(3),makeRun(2,'RETURN')]
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage()
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
const logo='data:image/png;base64,'+(await readFile(new URL('../backend/assets/greenview-tour-logo.png',import.meta.url))).toString('base64')
await page.route('**/api/**',route=>{
 const request=route.request(),path=new URL(request.url()).pathname
 assert.equal(request.method(),'GET','Read-only document fixture')
 if(path==='/api/me')return route.fulfill({json:{user:{id:id(900),displayName:'Layout tester',status:'ACTIVE',roles:[{code:'CAPTAIN',scope:'SELF'}],operations:{guide:true},management:{company:false},companyAccess:{}}}})
 if(path.endsWith('/document-brand'))return route.fulfill({json:{logo}})
 if(path.endsWith('/jobs'))return route.fulfill({json:{rows:[runs[0]],documentRuns:runs,total:1,page:1,pageSize:25,canManage:false,summary:{total:runs.length}}})
 return route.fulfill({json:{rows:[],items:[],total:0}})
})
async function ready() {
 await page.goto(origin+'/operations/guide?date=2026-09-26&runId='+runs[0].id)
 await page.locator('.job-pages').waitFor();await page.waitForTimeout(150)
 assert.equal(new URL(page.url()).pathname,'/operations/guide')
 assert.ok((await page.title()).includes('Greenview Tour'))
 assert.equal(await page.locator('vite-error-overlay').count(),0)
}
async function inspect(name) {
 const paper=page.locator('.job-pages'), expected=runs.reduce((n,r)=>n+r.assignments.length,0)
 assert.equal(await paper.locator('.compact-booking-row:not([data-continuation])').count(),expected)
 const dimensions=await paper.locator('.job-page').evaluateAll(pages=>pages.map(p=>{const b=p.querySelector('.job-page-body');return {width:p.offsetWidth,height:p.offsetHeight,body:b.clientHeight,scroll:b.scrollHeight,rows:p.querySelectorAll('.compact-booking-row').length}}))
 for(const d of dimensions){assert.ok(d.height>d.width);assert.ok(d.scroll<=d.body+1,`${name}: body overflow`);assert.ok(d.rows<=20,`${name}: more than 20 rows`)}
 assert.equal(await paper.locator('.compact-legend').count(),0)
 assert.equal(await paper.locator('.compact-signoff').count(),1)
 for(let i=0;i<dimensions.length;i++)assert.equal(await paper.locator('.job-page').nth(i).locator('.job-page-footer>span').first().innerText(),`Page ${i+1} / ${dimensions.length}`)
 await page.emulateMedia({media:'print'})
 await page.pdf({path:out+'/'+name+'.pdf',preferCSSPageSize:true,printBackground:true})
 await page.emulateMedia({media:'screen'})
 results.push({name,expectedRows:expected,pages:dimensions.length,dimensions})
 console.log(JSON.stringify(results.at(-1)))
}
try {
 const cases=[
  ['realistic-five-rows',[makeRun(3),makeRun(2,'RETURN')]],
  ['18-one-leg',[makeRun(18)]],['20-one-leg',[makeRun(20)]],
  ['22-one-leg',[makeRun(22,'OUTBOUND',{sizes:[2,3,2,4,2,3,5,2,3,4,2,3,2,4,3,2,5,3,2,4,3,2]})]],
  ['40-two-legs',[makeRun(20),makeRun(20,'RETURN')]],
  ['20-long-notes',[makeRun(20,'OUTBOUND',{longNotes:true})]],
  ['one-long-instruction',[makeRun(1,'OUTBOUND',{giant:true})]],
 ]
 for(const [name,value] of cases){runs=value;await ready();await inspect(name)}
 assert.equal(results.find(r=>r.name==='22-one-leg').pages,2)
 const full='ALLERGY: '+runs[0].assignments[0].booking.allergies
 assert.equal(await page.locator('.job-pages .compact-remarks>span').allTextContents().then(p=>p.join('')),full)
 runs=[makeRun(22,'OUTBOUND',{sizes:[2,3,2,4,2,3,5,2,3,4,2,3,2,4,3,2,5,3,2,4,3,2]})];await ready()
 const originalPages=await page.locator('.job-pages').getAttribute('data-page-count')
 for(const width of [1440,834,390,320]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(150)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  assert.equal(await page.locator('dialog[data-variant="job-document"]>.dialog-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true)
  const paper=await page.locator('.job-pages .job-page').first().boundingBox(),scroll=await page.locator('dialog[data-variant="job-document"]>.dialog-content').boundingBox()
  assert.ok(paper.x>=scroll.x-1&&paper.x+paper.width<=scroll.x+scroll.width+1)
  assert.equal(await page.locator('.job-pages').getAttribute('data-page-count'),originalPages)
  await page.screenshot({path:out+`/modal-${width}-en.png`})
 }
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})))
 await page.waitForFunction(()=>document.documentElement.lang==='th')
 await page.locator('.job-pages').waitFor()
 assert.deepEqual(await page.locator('.job-pages .compact-manifest-table').first().locator('thead tr').last().locator('th').allTextContents(),['No.','Agent / Group','Prg.','A','C','Pax','Accom.','Meal','Remarks'])
 await page.screenshot({path:out+'/modal-320-th.png'})
 await page.getByRole('button',{name:'Codes',exact:true}).click()
 assert.equal(await page.getByRole('dialog').count(),2)
 await page.locator('.job-code-guide').waitFor()
 await page.keyboard.press('Escape')
 assert.equal(await page.getByRole('dialog').count(),1)
 assert.equal(await page.getByRole('button',{name:'Codes',exact:true}).evaluate(el=>el===document.activeElement),true)
 await page.locator('dialog[data-variant="job-document"]>.dialog-content').evaluate(el=>el.scrollTop=el.scrollHeight)
 assert.equal(await page.locator('.job-pages .job-page-footer').last().isVisible(),true)
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})))
 await page.waitForFunction(()=>document.documentElement.lang==='en')
 await page.locator('.job-pages').waitFor()
 await page.evaluate(()=>{window.__printed=0;window.print=()=>{window.__printed++}})
 await page.getByRole('button',{name:'Print A4 portrait',exact:true}).click()
 await page.waitForFunction(()=>window.__printed===1)
 await page.keyboard.press('Escape')
 assert.equal(await page.getByRole('dialog').count(),0)
 assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-core-modal-open')),false)
 assert.deepEqual(errors,[])
 await writeFile(out+'/results.json',JSON.stringify({result:'PASS',results,errors,businessWrites:0,checks:['fit width at four viewports','English headers in Thai mode','no content loss','balanced pagination','Codes nested focus and scroll ownership','print action after layout readiness','Escape restores scroll']},null,2))
 console.log('PORTRAIT_JOB_PASS')
}finally{await browser.close()}
