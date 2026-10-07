import test from 'node:test'
import assert from 'node:assert/strict'
import {registerHooks} from 'node:module'
registerHooks({load(url,context,next){if(url.endsWith('.wasm?module'))return {format:'module',shortCircuit:true,source:'import {readFileSync} from "node:fs"; export default new WebAssembly.Module(readFileSync(new URL('+JSON.stringify(url.split('?')[0])+')))'};return next(url,context)}})
import {DatabaseSync,backup} from 'node:sqlite'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {readFileSync,readdirSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {createD1Prisma} from '../src/platform/database/d1-client.ts'
import {saveBooking,bookingStatus,getBookingPriceReview} from '../src/modules/operations/bookings.js'
import {saveSettings} from '../src/modules/service-catalog/settings.js'
import {localStamp} from '../../packages/contracts/operations.js'
function sqliteBinding(sqlite){
 const result=(sql,args)=>{const stmt=sqlite.prepare(sql),before=sqlite.prepare('SELECT total_changes() AS n').get().n;const results=stmt.columns().length?stmt.all(...args):(stmt.run(...args),[]);return {success:true,results,meta:{changes:sqlite.prepare('SELECT total_changes() AS n').get().n-before}}}
 const prepare=sql=>({sql,args:[],bind(...args){return {...this,args}},async all(){return result(this.sql,this.args)},async run(){return result(this.sql,this.args)},async first(column){const row=result(this.sql,this.args).results[0]||null;return column?row?.[column]:row},async raw(options){const stmt=sqlite.prepare(this.sql),columns=stmt.columns().map(c=>c.name);stmt.setReturnArrays(true);const rows=stmt.all(...this.args);return options?.columnNames?[columns,...rows]:rows}})
 return {prepare,async batch(statements){sqlite.exec('BEGIN');try{const rows=statements.map(s=>result(s.sql,s.args));sqlite.exec('COMMIT');return rows}catch(error){sqlite.exec('ROLLBACK');throw error}}}
}
async function fixture(t,{boat=false,rate=true,undated=false,legacy=false}={}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON')
 const directory=new URL('../prisma-d1/migrations/',import.meta.url)
 for(const file of readdirSync(directory).filter(n=>n.endsWith('.sql')&&(!legacy||n<'0013')).sort())sqlite.exec(readFileSync(new URL(file,directory),'utf8'))
 if(!legacy)sqlite.exec(readFileSync(new URL('../prisma-d1/drafts/agent-price-history.sql',import.meta.url),'utf8'))
 const db=createD1Prisma(sqliteBinding(sqlite));t.after(async()=>{await db.$disconnect();sqlite.close()})
 const ids=Object.fromEntries(['actor','other','agent','agreement','tour','resource','component','rate'].map(key=>[key,randomUUID()]))
 const bookingDay=localStamp(new Date()).slice(0,10),serviceDate=new Date(Date.now()+30*86400000).toISOString().slice(0,10)
 await db.$transaction(async tx=>{
  await tx.role.create({data:{code:'MANAGER',name:'Manager'}})
  await tx.role.create({data:{code:'BOOKING',name:'Booking'}})
  await tx.permission.create({data:{code:'users.read',description:'Fixture'}})
  await tx.rolePermission.create({data:{roleCode:'MANAGER',permissionCode:'users.read'}})
  await tx.userProfile.create({data:{id:ids.actor,displayName:'Fixture manager',roles:{create:{roleCode:'MANAGER',scope:'COMPANY'}}}})
  await tx.userProfile.create({data:{id:ids.other,displayName:'Fixture other booking assistant',roles:{create:{roleCode:'BOOKING',scope:'SELF'}}}})
  await tx.businessPartner.create({data:{id:ids.agent,code:'AGENT',name:'Fixture agent',status:'ACTIVE',roles:['SALES_AGENT'],allowedPaymentTerms:['PREPAID','COUNTER'],defaultPaymentTerms:'COUNTER'}})
  await tx.agentAgreement.create({data:{id:ids.agreement,code:'BOOKING-DAY',name:'Fixture agreement',agentId:ids.agent,startsOn:new Date(bookingDay),endsOn:new Date(bookingDay),status:'ACTIVE'}})
  await tx.operationResource.create({data:{id:ids.resource,code:'SERVICE',name:'Fixture service',kind:'SERVICE',category:boat?'TOUR_BOAT':'MEAL',baseUnit:'PERSON',salePrice:'0',status:'ACTIVE'}})
  await tx.tourProgram.create({data:{id:ids.tour,code:'TOUR',name:'Fixture tour',status:'ACTIVE',ownership:'GREENVIEW',journeyMode:'OUTBOUND_ONLY',durationDays:1,confirmationMode:'REQUEST',supplierPricing:'NOT_SET',adultPrice:'9999',childPrice:'9999',components:{create:{id:ids.component,resourceId:ids.resource,selection:'REQUIRED',basis:'PER_PERSON',quantity:1,usagePoint:boat?'BOAT':'ISLAND',status:'ACTIVE'}}}})
 })
 const rateInput={id:ids.rate,version:0,agentId:ids.agent,tourId:ids.tour,agreementId:ids.agreement,adultPrice:'1000.10',childPrice:'500.20',status:'ACTIVE'}
 if(rate)await saveSettings(db,ids.actor,'rates',rateInput)
 const bookingInput={id:randomUUID(),version:0,tourId:ids.tour,agentId:ids.agent,serviceDate:undated?'':serviceDate,adults:2,children:1,name:'Fixture booking',paymentTerms:'PREPAID',allergyStatus:'NONE',specialRequirements:[],lines:[{componentId:ids.component,resourceId:ids.resource,selected:true,quantity:3,usagePoint:boat?'BOAT':'ISLAND'}]}
 const {row}=await saveBooking(db,ids.actor,bookingInput)
 const changeRate=async(extra={})=>{const current=await db.agentTourPrice.findUnique({where:{id:ids.rate}});return saveSettings(db,ids.actor,'rates',{...rateInput,version:current.version,adultPrice:'1200.10',childPrice:'600.20',...extra})}
 const command=async(choice='KEEP_STORED',id=randomUUID())=>{const {review}=await getBookingPriceReview(db,ids.actor,row.id);return {id,bookingId:row.id,version:review.bookingVersion,action:'CONFIRM',priceConfirmation:{confirmed:true,choice,reviewToken:review.reviewToken,serviceDate:review.serviceDate}}}
 return {db,sqlite,ids,row,bookingInput,changeRate,command,bookingDay}
}
test('integrated booking-date origin, changed service date, explicit new price and immutable history',async t=>{
 const f=await fixture(t)
 assert.equal(f.row.adultPrice.toString(),'1000.1') // Agreement excludes travel day.
 await f.changeRate()
 const newDate=new Date(Date.parse(f.bookingInput.serviceDate)+86400000).toISOString().slice(0,10)
 const saved=await saveBooking(f.db,f.ids.actor,{...f.bookingInput,version:f.row.version,serviceDate:newDate})
 assert.equal(saved.row.adultPrice.toString(),'1000.1')
 const receiptId=randomUUID()
 await f.db.bookingReceipt.create({data:{id:receiptId,bookingId:f.row.id,agentId:f.ids.agent,payer:'Fixture deposit',basis:'NET_ONLY',received:'100',net:'100',margin:'0',receivedOn:new Date(f.bookingDay),reference:'Synthetic deposit',recordedBy:f.ids.actor}})
 const receiptBefore=await f.db.bookingReceipt.findUnique({where:{id:receiptId}})
 const before=await f.db.tourBooking.findUnique({where:{id:f.row.id}})
 const input=await f.command('USE_NEW'),result=await bookingStatus(f.db,f.ids.actor,input)
 assert.equal(result.status,'CONFIRMED')
 const after=await f.db.tourBooking.findUnique({where:{id:f.row.id}})
 assert.equal(after.adultPrice.toString(),'1200.1');assert.equal(after.paymentTerms,before.paymentTerms)
 assert.deepEqual(after.commissionSnapshot,before.commissionSnapshot)
 assert.deepEqual(await f.db.bookingReceipt.findUnique({where:{id:receiptId}}),receiptBefore)
 assert.equal(await f.db.agentPayment.count(),0);assert.equal(await f.db.agentMarginOffset.count(),0);assert.equal(await f.db.financePersonnelRecord.count(),0)
 assert.equal(after.createdAt.toISOString(),before.createdAt.toISOString())
 assert.equal(after.programSnapshot.priceConfirmations[0].serviceDate,newDate)
 assert.equal(after.programSnapshot.priceConfirmations[0].choice,'USE_NEW')
 assert.equal(await f.db.auditEvent.count({where:{action:'settings.rates.revision',targetId:f.ids.rate}}),2)
 const revision=await f.db.auditEvent.findFirst({where:{action:'settings.rates.revision',targetId:f.ids.rate}})
 assert.equal(revision.details.agreementSnapshot.startsOn.slice(0,10),f.bookingDay)
 const audit=await f.db.auditEvent.findFirst({where:{action:'operations.booking.price.confirmed',targetId:f.row.id}})
 assert.equal(audit.actorId,f.ids.actor);assert.equal(audit.details.delta,'500.00')
 await assert.rejects(()=>f.db.auditEvent.update({where:{id:audit.id},data:{details:{}}}),/PRICE_HISTORY_IMMUTABLE/)
 assert.deepEqual(await bookingStatus(f.db,f.ids.actor,input),result)
 assert.equal(await f.db.auditEvent.count({where:{action:'operations.booking.price.confirmed',targetId:f.row.id}}),1)
 assert.equal(await f.db.operationCommand.count({where:{id:input.id}}),1)
})
test('integrated unchanged and no-new-rate still require explicit confirmation; keep preserves fare',async t=>{
 for(const noNew of [false,true]){
  const f=await fixture(t)
  if(noNew)await f.changeRate({status:'INACTIVE'})
  await assert.rejects(()=>bookingStatus(f.db,f.ids.actor,{id:randomUUID(),bookingId:f.row.id,version:1,action:'CONFIRM'}),{code:'PRICE_CONFIRMATION_REQUIRED'})
  const {review}=await getBookingPriceReview(f.db,f.ids.actor,f.row.id)
  assert.equal(review.latestStatus,noNew?'NONE':'AVAILABLE')
  if(!noNew)assert.equal(review.delta,'0.00')
  const result=await bookingStatus(f.db,f.ids.actor,await f.command())
  assert.equal(result.status,'CONFIRMED')
  assert.equal((await f.db.tourBooking.findUnique({where:{id:f.row.id}})).adultPrice.toString(),'1000.1')
 }
})
test('integrated stale offer, unauthorized actor and missing actual date roll back without a decision',async t=>{
 const f=await fixture(t),input=await f.command('USE_NEW')
 await f.changeRate()
 await assert.rejects(()=>bookingStatus(f.db,f.ids.actor,input),{code:'PRICE_REVIEW_STALE'})
 await assert.rejects(()=>getBookingPriceReview(f.db,f.ids.other,f.row.id),{code:'PERMISSION_DENIED'})
 const latest=await f.command()
 await assert.rejects(()=>bookingStatus(f.db,f.ids.actor,{...latest,priceConfirmation:{...latest.priceConfirmation,serviceDate:null}}),{code:'SERVICE_DATE_REQUIRED'})
 assert.equal(await f.db.auditEvent.count({where:{action:'operations.booking.price.confirmed'}}),0)
 assert.equal((await f.db.tourBooking.findUnique({where:{id:f.row.id}})).status,'DRAFT')
})
test('integrated capacity failure keeps draft and stored fare',async t=>{
 const f=await fixture(t,{boat:true});await f.changeRate()
 const input=await f.command('USE_NEW'),result=await bookingStatus(f.db,f.ids.actor,input)
 assert.equal(result.capacityStatus,'WAITING_TEAM')
 const row=await f.db.tourBooking.findUnique({where:{id:f.row.id}})
 assert.equal(row.status,'DRAFT');assert.equal(row.adultPrice.toString(),'1000.1')
 assert.equal(row.programSnapshot.priceConfirmations[0].outcome,'WAITING_TEAM')
 assert.deepEqual(await bookingStatus(f.db,f.ids.actor,input),result)
})
test('integrated simultaneous duplicate commands record one confirmation',async t=>{
 const f=await fixture(t),input=await f.command()
 const results=await Promise.all([bookingStatus(f.db,f.ids.actor,input),bookingStatus(f.db,f.ids.actor,input)])
 assert.deepEqual(results[0],results[1])
 assert.equal(await f.db.auditEvent.count({where:{action:'operations.booking.price.confirmed',targetId:f.row.id}}),1)
})

test('integrated concurrent bookings compete for one boat without overselling',async t=>{
 const f=await fixture(t,{boat:true}),vehicleId=randomUUID(),poolId=randomUUID()
 await f.db.$transaction(async tx=>{
  await tx.fleetVehicle.create({data:{id:vehicleId,code:'FIXTURE-BOAT',name:'Fixture boat',kind:'SPEEDBOAT',ownership:'GREENVIEW',capacity:3,status:'ACTIVE'}})
  await tx.capacityPool.create({data:{id:poolId,code:'FIXTURE-POOL',name:'Fixture pool',kind:'BOAT',serviceDate:new Date(f.bookingInput.serviceDate),direction:'OUTBOUND',startsAt:new Date(f.bookingInput.serviceDate+'T00:00:00Z'),endsAt:new Date(f.bookingInput.serviceDate+'T10:00:00Z'),resourceIds:[f.ids.resource],holdMinutes:30,offers:{create:{id:randomUUID(),vehicleId,capacity:3,status:'READY'}}}})
 })
 const {row:other}=await saveBooking(f.db,f.ids.actor,{...f.bookingInput,id:randomUUID(),name:'Second fixture booking'})
 const first=await f.command(),{review}=await getBookingPriceReview(f.db,f.ids.actor,other.id)
 const second={id:randomUUID(),bookingId:other.id,version:review.bookingVersion,action:'CONFIRM',priceConfirmation:{confirmed:true,choice:'KEEP_STORED',serviceDate:review.serviceDate,reviewToken:review.reviewToken}}
 const outcomes=await Promise.all([bookingStatus(f.db,f.ids.actor,first),bookingStatus(f.db,f.ids.actor,second)])
 assert.equal(outcomes.filter(row=>row.status==='CONFIRMED').length,1)
 assert.equal(outcomes.filter(row=>row.capacityStatus==='WAITING_TEAM').length,1)
 assert.equal(await f.db.tourBooking.count({where:{status:'CONFIRMED'}}),1)
 assert.equal(await f.db.auditEvent.count({where:{action:'operations.booking.price.confirmed'}}),2)
})

async function httpFixture(f){
 const {createHandler}=await import('../src/app/http.js'),{Readable}=await import('node:stream')
 const token='synthetic-local-token-not-a-credential'.repeat(2)
 const handler=createHandler({prisma:f.db,pool:f.db,token,port:5000,lineOnboarding:async()=>false,sessions:{cookie:()=>'',authenticated:async()=>({user:{id:f.ids.actor,email:'fixture@example.test',email_confirmed_at:'2026-10-01'},entry:{purpose:'workspace'}})}})
 return async(url,input)=>{
  let status,data
  const req=Readable.from(input?[JSON.stringify(input)]:[])
  Object.assign(req,{url,method:input?'POST':'GET',headers:{host:'127.0.0.1:5000','x-greenview-local-token':token,origin:'http://localhost:5174','content-type':'application/json'}})
  await handler(req,{writeHead(code){status=code},end(value){data=JSON.parse(value)}})
  return {status,data}
 }
}
test('HTTP review and Confirm API enforce explicit selection, date, replay and source history',async t=>{
 const f=await fixture(t),request=await httpFixture(f)
 const loaded=await request('/api/operations/booking-price-review?bookingId='+f.row.id)
 assert.equal(loaded.status,200)
 const input={id:randomUUID(),bookingId:f.row.id,version:1,action:'CONFIRM'}
 assert.equal((await request('/api/operations/booking-status',input)).data.code,'PRICE_CONFIRMATION_REQUIRED')
 const {review}=loaded.data
 input.priceConfirmation={confirmed:true,choice:'KEEP_STORED',serviceDate:review.serviceDate,reviewToken:review.reviewToken}
 const saved=await request('/api/operations/booking-status',input)
 assert.equal(saved.status,200);assert.equal(saved.data.status,'CONFIRMED')
 assert.deepEqual(await request('/api/operations/booking-status',input),saved)
})
test('rendered Bookings Confirm uses the actual HTTP handler and synthetic D1 transaction',{skip:process.env.GVT_PRICE_UI!=='1'},async t=>{
 const f=await fixture(t);await f.changeRate()
 const request=await httpFixture(f),writes=[]
 const {createServer}=await import('vite'),{chromium}=await import('playwright')
 const root=new URL('../../frontend/backoffice/',import.meta.url).pathname
 const source=`import React from 'react';import{createRoot}from'react-dom/client';import{LocaleProvider}from'/src/core/i18n/locale.jsx';import{NavigationProvider}from'/src/core/navigation/Navigation.jsx';import BookingsPage from'/src/features/operations/BookingsPage.jsx';import'/src/core/ui/styles.css';const actor=${JSON.stringify({id:f.ids.actor,status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY'}],management:{company:true}})};createRoot(document.getElementById('root')).render(<LocaleProvider><NavigationProvider><BookingsPage actor={actor}/></NavigationProvider></LocaleProvider>);`
 const vite=await createServer({root,configFile:root+'vite.config.js',server:{port:5283,strictPort:true},plugins:[{name:'integrated-price-fixture',resolveId(id){if(id==='/__price.jsx')return id},load(id){if(id==='/__price.jsx')return source},configureServer(server){server.middlewares.use(async(req,res,next)=>{if(!req.url.startsWith('/__integrated'))return next();res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml(req.url,'<html><body><div id="root"></div><script type="module" src="/__price.jsx"></script></body></html>'))})}}]})
 await vite.listen();const browser=await chromium.launch({headless:true})
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort())
  await page.addInitScript(()=>localStorage.setItem('greenview.locale','en'))
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),input=req.method()==='POST'?req.postDataJSON():undefined
   if(input)writes.push({path:url.pathname,input})
   const result=await request(url.pathname+url.search,input)
   await route.fulfill({status:result.status,json:result.data})
  })
  await page.goto('http://127.0.0.1:5283/__integrated')
  await page.getByRole('button',{name:'Actions for '+f.row.code,exact:true}).click()
  await page.getByRole('menuitem',{name:'Confirm',exact:true}).click()
  await page.getByRole('button',{name:'Confirm price and booking',exact:true}).waitFor()
  assert.match(await page.getByRole('dialog').innerText(),/500.00 THB/)
  assert.match(await page.getByRole('combobox',{name:'Price to confirm',exact:true}).innerText(),/Keep stored price/)
  await page.getByRole('combobox',{name:'Price to confirm',exact:true}).click()
  await page.getByRole('option',{name:'Use new rate',exact:true}).click()
  await page.getByRole('button',{name:'Confirm price and booking',exact:true}).evaluate(node=>{node.click();node.click()})
  await page.getByRole('dialog').waitFor({state:'hidden'})
  assert.equal(writes.filter(write=>write.path==='/api/operations/booking-status').length,1)
  const stored=await f.db.tourBooking.findUnique({where:{id:f.row.id}})
  assert.equal(stored.status,'CONFIRMED');assert.equal(stored.adultPrice.toString(),'1200.1')
  assert.equal(stored.programSnapshot.priceConfirmations[0].choice,'USE_NEW')
  assert.equal(await f.db.auditEvent.count({where:{action:'operations.booking.price.confirmed'}}),1)
  const undated=await saveBooking(f.db,f.ids.actor,{...f.bookingInput,id:randomUUID(),serviceDate:'',name:'Undated UI fixture'})
  await page.reload()
  await page.getByRole('button',{name:'Actions for '+undated.row.code,exact:true}).click()
  await page.getByRole('menuitem',{name:'Set service date before confirming',exact:true}).click()
  await page.getByRole('checkbox',{name:'Service date not decided',exact:true}).waitFor()
  assert.equal(await page.getByRole('checkbox',{name:'Service date not decided',exact:true}).isChecked(),true)
  await page.getByText('Set a service date before confirming. This draft does not reserve capacity.',{exact:true}).waitFor()
  await page.getByRole('button',{name:'Save draft',exact:true}).click()
  await page.getByRole('dialog').waitFor({state:'hidden'})
  assert.equal((await f.db.tourBooking.findUnique({where:{id:undated.row.id}})).tripId,null)
  assert.deepEqual(errors,[])
 }finally{await browser.close();await vite.close()}
})

test('customer request acceptance requires explicit stored-price confirmation and writes booking history atomically',async t=>{
 const f=await fixture(t),{commandCustomerRequest}=await import('../src/modules/commerce/service.js'),{programBookingPlan}=await import('../src/modules/operations/booking-plan.js')
 const customerId=randomUUID(),requestId=randomUUID()
 const plan=await programBookingPlan(f.db,{tourId:f.ids.tour,serviceDate:f.bookingInput.serviceDate,adults:1,children:0})
 const snapshot={tourVersion:plan.program.version,adultPrice:'1500',childPrice:'900',packageTotal:'1500.00',components:plan.lines.map(line=>({componentId:line.componentId,resourceId:line.resourceId,componentVersion:line.snapshot.componentVersion,quantity:line.quantity,selected:line.selected,usagePoint:line.usagePoint}))}
 await f.db.customerProfile.create({data:{id:customerId,displayName:'Synthetic customer'}})
 await f.db.customerRequest.create({data:{id:requestId,customerId,tourId:f.ids.tour,serviceDate:new Date(f.bookingInput.serviceDate),adults:1,children:0,requestHash:'synthetic',snapshot,details:{name:'Synthetic customer',phone:'0000000000',allergyStatus:'NONE'}}})
 const input={id:randomUUID(),requestId,version:1,action:'ACCEPT',note:'Fixture reviewed'}
 await assert.rejects(()=>commandCustomerRequest(f.db,f.ids.actor,input),{code:'PRICE_CONFIRMATION_REQUIRED'})
 input.priceConfirmation={confirmed:true,choice:'KEEP_STORED',serviceDate:f.bookingInput.serviceDate,total:'1500.00'}
 const result=await commandCustomerRequest(f.db,f.ids.actor,input)
 assert.equal(result.status,'AWAITING_PAYMENT')
 const request=await f.db.customerRequest.findUnique({where:{id:requestId}})
 const booking=await f.db.tourBooking.findUnique({where:{id:request.bookingId}})
 assert.equal(booking.status,'CONFIRMED');assert.equal(booking.adultPrice.toString(),'1500')
 assert.equal(booking.programSnapshot.priceConfirmations[0].choice,'KEEP_STORED')
 assert.equal(await f.db.auditEvent.count({where:{action:'operations.booking.price.confirmed',targetId:booking.id}}),1)
 assert.deepEqual(await commandCustomerRequest(f.db,f.ids.actor,input),result)
})

test('inventory failure rolls back price, immutable decision and command together',async t=>{
 const f=await fixture(t);await f.changeRate()
 const resourceId=randomUUID(),sourceId=randomUUID()
 await f.db.$transaction(async tx=>{
  await tx.operationResource.create({data:{id:resourceId,code:'EQUIPMENT',name:'Fixture equipment',kind:'EQUIPMENT',category:'OTHER',baseUnit:'PIECE',status:'ACTIVE'}})
  await tx.stockLocation.create({data:{id:sourceId,code:'STORE',name:'Empty fixture store',kind:'WAREHOUSE',status:'ACTIVE'}})
  await tx.bookingComponent.create({data:{id:randomUUID(),bookingId:f.row.id,resourceId,sourceId,quantity:1,selected:true,included:true,usagePoint:'BOAT',unitPrice:'0',snapshot:{name:'Fixture equipment'}}})
 })
 const input=await f.command('USE_NEW')
 await assert.rejects(()=>bookingStatus(f.db,f.ids.actor,input),{code:'INSUFFICIENT_STOCK'})
 const booking=await f.db.tourBooking.findUnique({where:{id:f.row.id}})
 assert.equal(booking.status,'DRAFT');assert.equal(booking.version,1);assert.equal(booking.adultPrice.toString(),'1000.1')
 assert.equal(await f.db.auditEvent.count({where:{action:'operations.booking.price.confirmed'}}),0)
 assert.equal(await f.db.operationCommand.count({where:{id:input.id}}),0)
})


test('undated drafts have no trip, reject Confirm, retain booking-date rate when scheduled',async t=>{
 const f=await fixture(t,{undated:true})
 assert.equal(f.row.tripId,null)
 assert.equal(f.row.outboundDate,null)
 assert.equal(await f.db.operationTrip.count(),0)
 await assert.rejects(()=>bookingStatus(f.db,f.ids.actor,{id:randomUUID(),bookingId:f.row.id,version:f.row.version,action:'CONFIRM'}),{code:'SERVICE_DATE_REQUIRED'})
 await f.changeRate()
 const scheduled=await saveBooking(f.db,f.ids.actor,{...f.bookingInput,version:f.row.version,serviceDate:'2027-02-12'})
 assert.ok(scheduled.row.tripId)
 assert.equal(scheduled.row.adultPrice.toString(),'1000.1')
 assert.equal(scheduled.row.createdAt.toISOString(),f.row.createdAt.toISOString())
 assert.equal((await bookingStatus(f.db,f.ids.actor,await f.command())).status,'CONFIRMED')
})
test('dated draft can become undated without retaining an invented trip; cancel remains possible',async t=>{
 const f=await fixture(t)
 const saved=await saveBooking(f.db,f.ids.actor,{...f.bookingInput,version:f.row.version,serviceDate:''})
 assert.equal(saved.row.tripId,null)
 assert.equal(await f.db.operationTrip.count(),0)
 const result=await bookingStatus(f.db,f.ids.actor,{id:randomUUID(),bookingId:f.row.id,version:saved.row.version,action:'CANCEL'})
 assert.equal(result.status,'CANCELLED')
})

test('populated legacy upgrade preserves every row, foreign key and restored backup',async t=>{
 const f=await fixture(t,{legacy:true})
 const dir=mkdtempSync(join(tmpdir(),'gvt-undated-'));t.after(()=>rmSync(dir,{recursive:true,force:true}))
 const filename=join(dir,'before.sqlite');await backup(f.sqlite,filename)
 const tables=f.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(x=>x.name)
 const rows=db=>Object.fromEntries(tables.map(name=>[name,db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]))
 const before=rows(f.sqlite)
 f.sqlite.exec('BEGIN')
 for(const name of ['0013_undated_booking_drafts.sql','0014_immutable_price_history.sql'])f.sqlite.exec(readFileSync(new URL('../prisma-d1/migrations/'+name,import.meta.url),'utf8'))
 assert.deepEqual(f.sqlite.prepare('PRAGMA foreign_key_check').all(),[])
 f.sqlite.exec('COMMIT')
 assert.deepEqual(rows(f.sqlite),before)
 assert.equal(f.sqlite.prepare('PRAGMA table_info(TourBooking)').all().find(x=>x.name==='tripId').notnull,0)
 const restored=new DatabaseSync(filename)
 try{assert.deepEqual(rows(restored),before);assert.equal(restored.prepare('PRAGMA table_info(TourBooking)').all().find(x=>x.name==='tripId').notnull,1)}finally{restored.close()}
})

test('undated scope stays in staff drafts; assignment inputs and invalid dates are rejected',async t=>{
 const f=await fixture(t,{undated:true})
 const {programBookingPlan}=await import('../src/modules/operations/booking-plan.js')
 await assert.rejects(()=>programBookingPlan(f.db,{...f.bookingInput}),{code:'SERVICE_DATE_REQUIRED'})
 await assert.rejects(()=>saveBooking(f.db,f.ids.actor,{...f.bookingInput,version:f.row.version,capacitySelections:[{}]}),{code:'UNDATED_ASSIGNMENT_NOT_ALLOWED'})
 await assert.rejects(()=>saveBooking(f.db,f.ids.actor,{...f.bookingInput,version:f.row.version,serviceDate:'2026-02-30'}))
 assert.equal(await f.db.operationTrip.count(),0)
 assert.equal(await f.db.dispatchAssignment.count(),0)
 assert.equal(await f.db.guideAssignment.count(),0)
})

test('open return remains optional independently of undated draft and capacity preview needs a real date',async t=>{
 const f=await fixture(t,{undated:true})
 const {bookingCapacityPreview}=await import('../src/modules/operations/capacity-service.js')
 const {programBookingPlan}=await import('../src/modules/operations/booking-plan.js')
 await assert.rejects(()=>bookingCapacityPreview(f.db,f.ids.actor,{bookingId:f.row.id}),{code:'SERVICE_DATE_REQUIRED'})
 await f.db.tourProgram.update({where:{id:f.ids.tour},data:{journeyMode:'OPEN_RETURN'}})
 const input={...f.bookingInput,agentId:null,returnStatus:'PENDING'}
 const undated=await programBookingPlan(f.db,input,null,{allowUndated:true})
 assert.equal(undated.trip,null);assert.equal(undated.journey.returnStatus,'PENDING')
 const dated=await programBookingPlan(f.db,{...input,serviceDate:'2027-02-12'})
 assert.ok(dated.trip);assert.equal(dated.journey.outboundDate,'2027-02-12');assert.equal(dated.journey.returnDate,null)
 await f.db.tourProgram.update({where:{id:f.ids.tour},data:{journeyMode:'FIXED',durationDays:3}})
 const fixed=await programBookingPlan(f.db,input,null,{allowUndated:true})
 assert.equal(fixed.trip,null);assert.equal(fixed.journey.returnDate,null)
})
