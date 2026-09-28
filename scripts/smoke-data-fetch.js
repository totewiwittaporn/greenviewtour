// Contract-level browser verification: every API is intercepted, no accounts or DB writes.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {chromium} from 'playwright'
import {catalogReadSelect} from '../backend/src/modules/service-catalog/read-models.js'
import {operationReadSelect} from '../backend/src/modules/operations/list-read-models.js'
import {accessDefinitions} from '../packages/contracts/access.js'
const origin=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5274'
const artifacts=process.env.GREENVIEW_READ_ARTIFACT_DIR
if(artifacts)await mkdir(artifacts,{recursive:true})
const id=n=>`52000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const project=(row,select)=>Object.fromEntries(Object.entries(select).filter(([,value])=>value).map(([key,value])=>[key,value===true?row[key]:Array.isArray(row[key])?row[key].map(item=>project(item,value.select)):row[key]?project(row[key],value.select):null]))
const list=rows=>({rows,total:rows.length,page:1,pages:1,pageSize:25,summary:{total:rows.length,active:rows.length,inactive:0,featured:rows.length,draft:1,confirmed:1,completed:0}})
const companyAccess=Object.fromEntries(Object.keys(accessDefinitions).filter(key=>!key.startsWith('operations.')).map(key=>[key,!key.startsWith('payroll.')]))
const user={id:id(900),displayName:'Audit Manager',email:'manager@example.test',status:'ACTIVE',roles:[{code:'MANAGER',scope:'COMPANY'}],management:{company:true},companyAccess,operations:{manager:true,booking:true,islandBooking:true,guide:true,manageGuide:true,driver:true,manageDriver:true,stock:true,prepareStock:true},canReceivePayment:true}
const tour={id:id(10),version:4,code:'AUDIT-TOUR',name:'Audit Island',status:'ACTIVE',journeyMode:'FIXED',durationDays:1,ownership:'GREENVIEW',operatorId:null,adultPrice:'2500.00',childPrice:'1250.00',publicStatus:'PUBLISHED',slug:'audit-island',description:'FULL DETAIL MUST SURVIVE',route:'Exact itinerary',bookingCommissionEligible:false}
const booking={id:id(20),version:7,code:'BK-AUDIT',name:'Audit Booking',status:'DRAFT',adults:2,children:1,createdById:user.id,assigneeId:user.id,agentId:null,outboundDate:'2026-10-20',returnDate:'2026-10-20',returnStatus:'OUR',trip:{id:id(21),name:tour.name,tourId:tour.id,tour},lines:[],adultPrice:'2500.00',childPrice:'1250.00',allergyStatus:'NONE',specialRequirements:[],paymentTerms:'PREPAID',contactPhone:'0812345678',programSnapshot:{name:tour.name,tourId:tour.id,journeyMode:'FIXED',allowedPaymentTerms:['PREPAID','COUNTER']},canEdit:true,priceActions:[]}
const request={id:id(30),version:3,status:'PAID',serviceDate:'2026-10-20',adults:2,children:1,bookingId:booking.id,details:{name:'Audit Request',phone:'0812345678',allergyStatus:'HAS',allergies:'Peanut warning must be loaded',notes:'Exact customer note'},snapshot:{tourName:tour.name,packageTotal:'6250.00',confirmedTotal:'6250.00',bookingCode:booking.code}}
const finance={id:id(40),kind:'REIMBURSEMENT',version:6,title:'Audit Reimbursement',employeeId:id(901),status:'SUBMITTED',createdBy:id(901),payload:{date:'2026-10-20',amount:'100.25',evidence:'EXACT RECEIPT',notes:'Business purpose'},payment:null,clearance:null,actions:['APPROVE','REJECT']}
const job={id:id(50),kind:'JOB',version:2,name:'Audit Cleaning Job',status:'PENDING',dueOn:'2026-10-20',assigneeId:user.id,createdById:id(901),payload:{jobKind:'CLEANING',checklist:['Check all equipment','Retain full safety detail'],zoneId:id(51)},references:{zoneId:'Warehouse',assigneeId:user.displayName},actions:['COMPLETE']}
function run(index,count){return {id:id(100+index),version:2,code:'RUN-'+index,name:'Audit Run '+index,kind:'BOAT',direction:'OUTBOUND',period:'AM',status:'OPEN',capacity:65,passengers:count,updatedAt:'2026-10-19T01:00:00Z',slot:{id:id(110+index),resourceId:id(70),vehicleId:id(120+index),startsAt:'2026-10-20T02:00:00Z',endsAt:'2026-10-20T04:00:00Z',capacity:65,resource:{id:id(70),name:'Boat service',category:'TOUR_BOAT'},vehicle:{id:id(120+index),name:'Audit Boat '+index,capacity:65,registration:'BOAT-'+index,ownership:'GREENVIEW'}},staff:[{userId:id(800),role:'CAPTAIN',name:'Audit Captain'}],cancelledAssignments:[],assignments:Array.from({length:count},(_,n)=>({id:id(index*1000+n),bookingLineId:id(index*1000+n+100),adults:1,children:0,status:'ASSIGNED',notes:'',booking:{...booking,id:id(index*10000+n),code:`GROUP-${index}-${n}`,name:`Group ${index}-${n}`,status:'CONFIRMED',adults:1,children:0,agentName:'Direct',programName:tour.name,programId:tour.id,arrivalAt:'2026-10-20',departureAt:'2026-10-20',allergyStatus:'NONE',printServices:{accommodation:'-',meals:'-',flags:[]}}}))}}
const runs=[run(1,28),run(2,1)]
const summaryRun=run=>Object.fromEntries(Object.entries(run).filter(([key])=>!['assignments','staff','cancelledAssignments'].includes(key)))
const browser=await chromium.launch({headless:true}),results=[]
try{
 for(const [locale,width,height]of [['en',1440,1000],['th',390,844]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<500}),page=await context.newPage(),errors=[],reads=[],writes=[],unexpected=[]
  await context.addInitScript(value=>localStorage.setItem('greenview.locale',value),locale)
  page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message))
  let failDetail=false,holdDetail=null
  await context.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.searchParams,path=url.pathname,detail=p.has('recordId')||p.has('bookingId')||p.has('requestId')
   if(req.method()==='POST'&&path==='/api/operations/capacity-check')return route.fulfill({json:{canConfirm:true,groupSize:3,legs:[],selections:[]}})
   if(req.method()!=='GET'){writes.push({path,body:req.postDataJSON()});return route.fulfill({status:409,json:{code:'SETTINGS_CONFLICT'}})}
   reads.push(path+url.search)
   if(detail&&holdDetail){const gate=holdDetail;gate.started();await gate.promise;if(req.failure())return}
   if(detail&&failDetail){return route.fulfill({status:503,json:{code:'FIXTURE_DETAIL_FAILED'}})}
   if(path==='/api/me')return route.fulfill({json:{user}})
   if(path==='/api/settings/tours')return route.fulfill({json:list([detail?tour:project(tour,catalogReadSelect('tours','list'))])})
   if(path==='/api/operations/bookings')return route.fulfill({json:list([detail?booking:{...project(booking,operationReadSelect('bookings','list')),programSnapshot:{journeyMode:'FIXED'},canEdit:true,priceActions:[]}])})
   if(path==='/api/customers')return route.fulfill({json:list([detail?request:{id:request.id,version:request.version,status:request.status,serviceDate:request.serviceDate,details:{name:request.details.name},snapshot:{tourName:tour.name,packageTotal:'6250.00'}}])})
   if(path==='/api/personnel-finance')return route.fulfill({json:{...list([detail?finance:{...finance,payload:{},amountCents:10025,payment:undefined,clearance:undefined}]),employees:[{id:finance.employeeId,displayName:'Audit Employee'}],runs:[],purchases:[],access:{view:true,edit:true,approve:true,pay:true},actorId:user.id,summary:{draft:0,submitted:1,approved:0}}})
   if(path==='/api/company-work')return route.fulfill({json:{...list([detail?job:{...job,payload:{jobKind:'CLEANING'},references:undefined}]),permissions:{'housekeeping.manage':true,'housekeeping.approve':true},actorId:user.id}})
   if(path==='/api/guide-assignments')return route.fulfill({json:{...list([{id:id(60),version:3,bookingId:booking.id,guideId:id(800),status:'PLANNED',startsAt:'2026-10-20T02:00:00Z',endsAt:'2026-10-20T04:00:00Z',guide:{displayName:'Audit Guide'},booking:detail?{...booking,programName:tour.name,allergies:'Guide allergy instruction'}:{id:booking.id,code:booking.code,name:booking.name,status:'CONFIRMED'},...(detail?{notes:'Full guide briefing retained'}:{})}]),canManage:true}})
   if(path==='/api/operations/daily-summary'){
    const snapshot={id:id(65),kind:'CLOSE',revision:1,serviceDate:p.get('date'),createdAt:'2026-10-19T00:00:00Z'}
    return route.fulfill({json:p.get('snapshotId')?{row:{...snapshot,runs:Array.from({length:28},(_,i)=>({id:id(700+i),name:'Snapshot run '+i,kind:'BOAT',direction:'OUTBOUND',adults:1,children:0,passengers:1}))}}:{snapshots:[{...snapshot,runCount:28}],total:1,page:1,pageSize:25,readiness:{missing:[],schedulerEnabled:false,deliveryEnabled:false}}})
   }
   if(path==='/api/operations/jobs'){
    const chosen=p.get('selectedRunId')||p.get('runId')||runs[0].id
    const rows=runs.filter(row=>!p.get('runId')||row.id===p.get('runId')).map(row=>row.id===chosen?row:summaryRun(row))
    return route.fulfill({json:{...list(rows),canManage:true,summary:{total:2,passengers:29,outbound:2,return:0},...(p.get('document')?{documentRuns:runs}: {})}})
   }
   if(path==='/api/operations/booking-options'){
    const pageNumber=Number(p.get('page')||1),all=Array.from({length:30},(_,n)=>({id:id(200+n),code:'OPT-'+n,name:'Lookup '+n,journeyMode:'FIXED',durationDays:1}))
    return route.fulfill({json:{rows:all.slice((pageNumber-1)*25,pageNumber*25),page:pageNumber,pageSize:25,total:30}})
   }
   if(path==='/api/operations/blueprint')return route.fulfill({json:{program:{id:p.get('tourId'),name:'Lookup',journeyMode:'FIXED'},journey:{outboundDate:'2026-10-20',returnDate:'2026-10-20',returnStatus:'OUR'},adultPrice:'2500.00',childPrice:'1250.00',allowedPaymentTerms:['PREPAID','COUNTER'],defaultPaymentTerms:'PREPAID',lines:[]}})
   if(['/api/operations/capacity-check','/api/operations/customer-capacity'].includes(path))return route.fulfill({json:{canConfirm:true,groupSize:3,legs:[],selections:[]}})
   if(path==='/api/operations/dispatch-options')return route.fulfill({json:list([])})
   if(path==='/api/evidence')return route.fulfill({json:{...list([]),access:{upload:false}}})
   if(path==='/api/users'){
    const employee={id:id(901),displayName:'Audit Employee',email:'employee@example.test',status:'ACTIVE',department:'BOOKING',primaryPhone:'0812345678',emergencyPhone:null,updatedAt:'2026-10-01T00:00:00Z',roles:[{roleCode:'BOOKING',scope:'SELF'}],canEdit:true,canConfigureAccess:false,canResetPassword:false,...(detail?{address:'Full address loaded on demand',lineId:'employee-line'}:{})}
    return route.fulfill({json:{users:[employee],total:1,page:1,pageSize:25,checkedAt:'2026-10-20T00:00:00Z',canInvite:true,canChangeDepartment:true,summary:{total:1,verified:1,signed_in:1}}})
   }
   if(path==='/api/invitations')return route.fulfill({json:{rows:[],invitations:[],total:0,page:1,summary:{total:0,active:0,used:0,expired:0},availableRoles:[]}})
   unexpected.push(path);return route.fulfill({status:404,json:{code:'UNEXPECTED_FIXTURE_API'}})
  })
  const main=page.locator('main'),dialog=()=>page.getByRole('dialog')
  const close=async()=>{await page.keyboard.press('Escape');await dialog().waitFor({state:'detached'})}
  async function action(subject,pattern){await page.getByRole('button',{name:new RegExp('Actions for '+subject)}).click();await page.getByRole('menuitem',{name:pattern}).click()}
  async function visit(path,text){await page.goto(origin+path);try{await main.getByText(text).first().waitFor()}catch(error){console.error(JSON.stringify({path,body:(await main.innerText()).slice(0,1500),errors,unexpected}));if(artifacts)await page.screenshot({path:artifacts+'/failure.png'});throw error}assert.equal(await page.locator('vite-error-overlay').count(),0)}
  await visit('/settings/tours',tour.name)
  assert.ok(reads.some(url=>url.startsWith('/api/settings/tours?')&&url.includes('view=list')))
  assert.equal(reads.filter(url=>url.includes('recordId=')).length,0)
  failDetail=true;await action(tour.name,/View|ดู/);await dialog().getByRole('alert').waitFor()
  assert.equal(await dialog().getByText('FULL DETAIL MUST SURVIVE').count(),0)
  failDetail=false;await dialog().getByRole('button',{name:/Retry|ลองอีกครั้ง/}).click();await dialog().getByText('FULL DETAIL MUST SURVIVE',{exact:true}).waitFor();await close()
  await action(tour.name,/Edit|แก้ไข/);await dialog().locator('textarea').first().waitFor()
  assert.ok((await dialog().locator('textarea').evaluateAll(nodes=>nodes.map(node=>node.value))).includes('FULL DETAIL MUST SURVIVE'));await close()
  await visit('/operations/bookings?tab=requests',request.details.name)
  assert.ok(reads.some(url=>url.startsWith('/api/customers?')&&url.includes('view=list')))
  await action(request.details.name,/Review|ตรวจสอบ/);await dialog().getByText('Peanut warning must be loaded',{exact:true}).waitFor();await close()
  let release,started;const startedPromise=new Promise(resolve=>{started=resolve})
  holdDetail={started,promise:new Promise(resolve=>{release=resolve})}
  await action(request.details.name,/Review|ตรวจสอบ/);await startedPromise;await close();holdDetail=null;release();await page.waitForTimeout(100)
  assert.equal(await dialog().count(),0)
  await visit('/operations/bookings',booking.name)
  const optionReads=()=>reads.filter(url=>url.startsWith('/api/operations/booking-options?')).length
  const beforeOptions=optionReads();await main.locator('.page-heading .button-primary').click();await dialog().locator('.reference-field').first().waitFor();await page.waitForTimeout(350)
  assert.equal(optionReads(),beforeOptions)
  const reference=dialog().locator('.reference-field').first()
  await reference.getByRole('combobox').click();await page.getByRole('option',{name:'OPT-0 · Lookup 0',exact:true}).waitFor();await page.keyboard.press('Escape')
  const secondPage=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/operations/booking-options'&&new URL(response.url()).searchParams.get('page')==='2');await reference.locator('.catalog-paging button').last().click();await secondPage
  await reference.getByRole('combobox').click();await page.getByRole('option',{name:'OPT-29 · Lookup 29',exact:true}).click()
  const firstPage=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/operations/booking-options'&&new URL(response.url()).searchParams.get('page')==='1');await reference.locator('.catalog-paging button').first().click();await firstPage
  assert.match(await reference.getByRole('combobox').innerText(),/Lookup 29/)
  await page.keyboard.press('Escape');await dialog().last().getByRole('button',{name:/Discard changes|ทิ้งการเปลี่ยนแปลง|ยกเลิกการแก้ไข/}).click();await dialog().waitFor({state:'detached'})
  await visit('/company/expenses',finance.title)
  assert.ok(reads.some(url=>url.startsWith('/api/personnel-finance?')&&url.includes('view=list')))
  await action(finance.title,/View|ดู/);await dialog().getByText('EXACT RECEIPT',{exact:true}).waitFor();await close()
  await visit('/company/cleaning-jobs',job.name)
  await action(job.name,/Report completed|รายงาน|เสร็จ/)
  await dialog().getByRole('checkbox',{name:'Retain full safety detail',exact:true}).waitFor();await close()
  await visit('/operations/guide-assignments','Audit Guide')
  await action(booking.code,/View job|ดู/);await dialog().getByText('Full guide briefing retained',{exact:true}).waitFor();await close()
  await action(booking.code,/Edit|แก้ไข/);assert.equal(await dialog().locator('textarea').inputValue(),'Full guide briefing retained');await close()
  await visit('/operations/daily-close','Closing snapshot')
  await action('CLOSE revision 1',/View|ดู/);await dialog().getByText('Snapshot run 0',{exact:true}).waitFor()
  await dialog().locator('.pagination button').last().click();await dialog().getByText('Snapshot run 27',{exact:true}).waitFor();await close()
  await visit('/settings/users','Audit Employee')
  assert.equal(reads.filter(url=>url.startsWith('/api/invitations')).length,0)
  await action('employee@example.test',/View user|ดู/)
  await dialog().getByText('Full address loaded on demand',{exact:true}).waitFor();await close()
  await visit('/operations/guide?date=2026-10-20','Group 1-0')
  const assigned=main.locator('.dispatch-bookings > section').last()
  await assigned.locator('.pagination button').last().click();await main.getByText('Group 1-27').waitFor()
  await main.locator('.dispatch-run-choice').filter({hasText:'Audit Boat 2'}).click()
  await main.getByText('Group 2-0').waitFor()
  assert.equal(await main.getByText('Group 1-27').count(),0)
  assert.ok(reads.some(url=>url.includes('selectedRunId='+runs[1].id)))
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);assert.deepEqual(writes,[])
  assert.equal(await page.locator('vite-error-overlay').count(),0)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  if(artifacts)await page.screenshot({path:`${artifacts}/lean-workspace-${locale}-${width}.png`,fullPage:false})
  results.push({locale,width,checks:['lean list shapes','detail failure and retry','full editable fields','delayed close cancellation','lazy lookup','lookup pagination without pages field','selected label retained across pages','finance amount and full evidence','job checklist detail','guide briefing preserved','28 saved snapshot runs accessible','user detail on demand','inactive invitations not fetched','selected run detail','all 28 assigned groups remain accessible'],runtimeErrors:0,businessWrites:0})
  await context.close()
 }
 console.log(JSON.stringify({result:'PASS',test:'data-fetch-contracts',browser:'Playwright Chromium; Browser plugin not available',results,realAccounts:false,realWrites:0},null,2))
}finally{await browser.close()}
