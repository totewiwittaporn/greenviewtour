// Existing application UI with isolated HTTP fixtures. No real accounts or business writes.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {createServer} from 'node:http'
import {createServer as createViteServer} from 'vite'
import {chromium} from 'playwright'
const output='/tmp/greenview-booking-full-20260925/screenshots',servers=[],errors=[],checks=[],unexpected=[],consoleErrors=[]
await mkdir(output,{recursive:true})
const deny=createServer((_req,res)=>{res.writeHead(401,{'Content-Type':'application/json'});res.end('{"code":"LOGIN_REQUIRED"}')})
await new Promise(resolve=>deny.listen(0,'127.0.0.1',resolve));process.env.LOCAL_API_PORT=String(deny.address().port)
const browser=await chromium.launch({headless:true}),id=n=>`60000000-0000-4000-8000-${String(n).padStart(12,'0')}`,date='2026-10-26'
const tour={id:id(1),slug:'surin',name:'QA Surin Day Trip',description:'Fixture data for browser verification',ownership:'GREENVIEW',durationDays:1,adultPrice:'1000',childPrice:'500',promotions:[],components:[],seasons:[{onlineStartsOn:'2026-10-01',onlineEndsOn:'2027-05-01',cutoffDays:0}]}
const customer={id:id(2),displayName:'QA Traveller',email:'qa@example.test',phone:'0000000000',version:1}
const user={id:id(3),displayName:'QA Manager',status:'ACTIVE',roles:[{code:'MANAGER',name:'Manager',scope:'COMPANY'}],management:{company:true,users:true},permissions:[],operations:{booking:true,islandBooking:true,guide:true,manageGuide:true,driver:true,manageDriver:true},companyAccess:{}}
let remaining=1,capacitySaved=null,requestSent=null,proposalSent=null,dateAnswered=null,requests=[]
const availability=(pax,serviceDate=date)=>({groupSize:pax,canConfirm:pax<=remaining,status:pax<=remaining?'AVAILABLE':'WAITING_TEAM',selections:[{resourceId:id(4),poolId:id(5),direction:'OUTBOUND',serviceDate}],legs:[{resourceId:id(4),poolId:id(5),direction:'OUTBOUND',serviceDate,canFit:pax<=remaining,status:pax<=remaining?'FEASIBLE':'INSUFFICIENT_CAPACITY',remainingSeats:remaining,holdMinutes:30,choices:[{id:id(5),startsAt:serviceDate+'T00:00:00Z',endsAt:serviceDate+'T05:00:00Z'}]}]})
const quote=(pax,serviceDate)=>({tourId:tour.id,tourName:tour.name,packageTotal:String(pax*1000),adultPrice:'1000',childPrice:'500',components:[],quoteKey:'QA-QUOTE',terms:{cancellationTerms:'QA cancellation terms'},availability:availability(pax,serviceDate)})
const row={id:id(6),version:1,serviceDate:date,adults:2,children:0,status:'WAITING_TEAM',bookingId:null,details:{name:customer.displayName,phone:customer.phone,allergyStatus:'NONE'},snapshot:quote(2,date)}
const poolRow={id:id(5),version:1,code:'QA-WINDOW',name:'QA morning readiness',kind:'BOAT',serviceDate:date,direction:'OUTBOUND',startsAt:date+'T00:00:00Z',endsAt:date+'T05:00:00Z',resourceIds:[id(4)],status:'ACTIVE',holdMinutes:30,overnightLoadTenths:12,notes:'',offers:[{id:id(7),vehicleId:id(8),capacity:45,status:'READY',usableCapacity:45,vehicle:{id:id(8),name:'QA Boat 45',capacity:45}}],passengers:2,heldPassengers:0,groups:[{id:id(9),code:'QA-BOOKING',pax:2}],plan:{status:'FEASIBLE',boatCount:1,spareSeats:43,assignments:[{boatId:id(8),capacity:45,pax:2,bookingIds:[id(9)]}]}}
const vanRow={...poolRow,id:id(15),code:'QA-VAN-WINDOW',name:'QA vehicle readiness',kind:'VEHICLE',passengers:70,heldPassengers:0,
 offers:Array.from({length:7},(_,i)=>({id:id(40+i),vehicleId:id(50+i),capacity:10,status:'READY',usableCapacity:10,vehicle:{id:id(50+i),name:'QA Van '+(i+1),capacity:10}})),
 groups:[{id:id(30),code:'QA-DAY-GROUP',pax:50},{id:id(31),code:'QA-OVERNIGHT-GROUP',pax:20}],plan:null,
 van:{actualPassengers:70,weightedUnits:74,overnightFactor:1.2,minimumAvailableVehicles:8,availableVehiclesUsed:7,extraVehicles:1,referenceVehicleCapacity:10,additionalUnitsNeeded:5,provisional:true}}
async function fixture(route){
 const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method(),body=method==='POST'?request.postDataJSON():null
 if(path==='/api/me')return route.fulfill({json:{user}})
 if(path==='/api/auth/recovery-status')return route.fulfill({status:403,json:{code:'RECOVERY_REQUIRED'}})
 if(path==='/api/member/profile')return route.fulfill({json:{customer,recovery:false}})
 if(path==='/api/public/tours')return route.fulfill({json:{rows:[tour],page:1,total:1}})
 if(path==='/api/public/quote')return route.fulfill({json:quote(Number(url.searchParams.get('adults'))+Number(url.searchParams.get('children')),url.searchParams.get('serviceDate'))})
 if(path==='/api/public/popups')return route.fulfill({json:{rows:[]}})
 if(path==='/api/public/company')return route.fulfill({json:{company:null}})
 if(path==='/api/member/requests'){
  if(method==='POST'){requestSent=body;requests=[{...row,paymentAllowed:false}];return route.fulfill({json:{id:row.id,status:'WAITING_TEAM',seatHoldUntil:null,confirmed:false}})}
  return route.fulfill({json:{rows:requests,page:1,total:requests.length,payment:null}})
 }
 if(path==='/api/member/date-response'){dateAnswered=body;requests=[{...requests[0],status:'REQUESTED',serviceDate:body.serviceDate,snapshot:{...requests[0].snapshot,dateProposal:null}}];return route.fulfill({json:{id:row.id,status:'REQUESTED',confirmed:false}})}
 if(path==='/api/member/documents')return route.fulfill({json:{rows:[]}})
 if(path==='/api/operations/capacity'){
  if(method==='POST'){capacitySaved=body;Object.assign(poolRow,body,{version:poolRow.version+1,offers:body.offers.map(offer=>({...offer,id:id(7),usableCapacity:offer.status==='READY'?offer.capacity:0,vehicle:{id:offer.vehicleId,name:'QA Boat 45',capacity:45}}))});return route.fulfill({json:{ok:true,id:poolRow.id,version:poolRow.version,requiresTeamReview:true}})}
  const chosen=url.searchParams.get('kind')==='VEHICLE'?vanRow:poolRow
  return route.fulfill({json:{rows:[chosen],date,kind:chosen.kind,canManage:true}})
 }
 if(path==='/api/operations/dispatch-options')return route.fulfill({json:{rows:url.searchParams.get('entity')==='services'?[{id:id(4),code:'QA-SERVICE',name:'QA Boat service'}]:[{id:id(8),name:'QA Boat 45',code:'QA-BOAT',capacity:45}],total:1,page:1,pages:1}})
 if(path==='/api/customers'){
  if(method==='POST'){proposalSent=body;row.status='DATE_PROPOSED';return route.fulfill({json:{id:row.id,status:'DATE_PROPOSED',confirmed:false}})}
  return route.fulfill({json:{rows:[row],page:1,pages:1,total:1}})
 }
 if(path==='/api/operations/customer-capacity')return route.fulfill({json:availability(2)})
 unexpected.push({path,method});return route.fulfill({status:400,json:{code:'FIXTURE_UNEXPECTED_REQUEST'}})
}
async function makePage(origin){const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error'&&!/net::ERR_FAILED|status of 403/.test(message.text()))consoleErrors.push(message.text())});await page.route(/^https:/,route=>route.abort());await page.route('**/api/**',fixture);await page.goto(origin);await page.locator('h1').first().waitFor();await page.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})));await page.waitForFunction(()=>document.documentElement.lang==='en');return page}
async function capture(page,name){await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));assert.equal(await page.locator('vite-error-overlay').count(),0);assert.ok((await page.locator('body').innerText()).length>100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' overflow');await page.screenshot({path:output+'/'+name+'.png',fullPage:true})}
try{
 for(const [app,port] of [['backoffice',5284],['public-web',5283],['member',5285]]){const root=fileURLToPath(new URL('../frontend/'+app+'/',import.meta.url)),vite=await createViteServer({root,configFile:root+'vite.config.js',server:{port,strictPort:true,watch:{ignored:['**/backend/**']}}});await vite.listen();servers.push(vite)}
 const staff=await makePage('http://localhost:5284/operations/capacity?date='+date)
 await staff.getByRole('heading',{name:'QA morning readiness · Outbound'}).waitFor();await capture(staff,'capacity-readiness-1440')
 await staff.getByRole('button',{name:'Edit readiness window QA-WINDOW'}).click();await staff.getByRole('menuitem',{name:'Edit readiness window'}).click()
 await staff.getByRole('dialog').getByRole('combobox',{name:'Status',exact:true}).last().click();await staff.getByRole('option',{name:'Proposed hire · unconfirmed',exact:true}).click()
 await staff.getByRole('button',{name:'Save readiness',exact:true}).click();await staff.getByRole('dialog').waitFor({state:'hidden'});assert.equal(capacitySaved.offers[0].status,'PROPOSED');await staff.getByText(/Readiness has decreased/).waitFor();checks.push('readiness edit preserves review warning')
 await staff.setViewportSize({width:390,height:844});await capture(staff,'capacity-readiness-390');await staff.setViewportSize({width:1440,height:1000});
 await staff.getByRole('combobox',{name:'Type',exact:true}).click();await staff.getByRole('option',{name:'Vehicle',exact:true}).click()
 await staff.getByRole('heading',{name:'QA vehicle readiness · Outbound',exact:true}).waitFor()
 assert.equal(await staff.getByText(/Readiness has decreased/).count(),0)
 assert.equal(await staff.locator('.metric').filter({hasText:'Capacity units including luggage'}).locator('strong').innerText(),'74')
 assert.equal(await staff.locator('.metric').filter({hasText:'Estimated vehicles needed'}).locator('strong').innerText(),'8')
 await staff.getByText('Estimated additional vehicles: 1, assuming 10 seats each. These are not confirmed vehicles.',{exact:true}).waitFor()
 await capture(staff,'capacity-vehicles-1440');await staff.setViewportSize({width:390,height:844});await capture(staff,'capacity-vehicles-390');await staff.setViewportSize({width:1440,height:1000})
 await staff.getByRole('combobox',{name:'Type',exact:true}).click();await staff.getByRole('option',{name:'Boat',exact:true}).click()
 await staff.getByRole('heading',{name:'QA morning readiness · Outbound',exact:true}).waitFor();assert.deepEqual(errors,[]);checks.push('Boat/Vehicle switching preserves response shape; van luggage and extra-vehicle assumptions are explicit')
 await staff.goto('http://localhost:5284/operations/bookings?tab=requests');await staff.getByRole('button',{name:'Actions for '+customer.displayName}).click();await staff.getByRole('menuitem',{name:'Review',exact:true}).click()
 await staff.getByText('Whole group cannot currently be accommodated',{exact:false}).waitFor();await staff.getByRole('button',{name:'Propose another date',exact:true}).click()
 await staff.getByRole('dialog').getByLabel('Service date',{exact:true}).fill('2026-10-27');await staff.getByRole('dialog').getByLabel('Review note',{exact:true}).fill('QA propose next day; customer agreement required')
 await staff.getByRole('dialog').locator('form').getByRole('button',{name:'Propose another date',exact:true}).click();await staff.getByRole('dialog').waitFor({state:'hidden'});assert.equal(proposalSent.action,'PROPOSE_DATE');assert.equal(proposalSent.proposedDate,'2026-10-27');assert.equal(row.serviceDate,date);checks.push('staff proposes date without changing customer date')
 await staff.setViewportSize({width:390,height:844});await capture(staff,'capacity-staff-390');assert.equal(await staff.locator('.topbar .reference-brand img').evaluate(img=>img.complete&&img.naturalWidth>0),true)
 const publicPage=await makePage('http://localhost:5283/tours?tour=surin')
 await publicPage.getByLabel('Service date',{exact:true}).fill(date);await publicPage.getByLabel('Adult',{exact:true}).fill('2')
 await publicPage.getByText('Whole group cannot currently be accommodated',{exact:false}).waitFor();const waitingLink=publicPage.getByRole('link',{name:'Ask the team to review',exact:true});assert.match(await waitingLink.getAttribute('href'),/adults=2/);await capture(publicPage,'capacity-public-1440');await publicPage.setViewportSize({width:390,height:844});await capture(publicPage,'capacity-public-390');checks.push('public remaining seats and whole-group fit are distinct')
 const member=await makePage('http://localhost:5285/tours?tour=surin&date='+date+'&adults=2')
 await member.getByText('Whole group cannot currently be accommodated',{exact:false}).waitFor()
 const requestForm=member.locator('form').filter({has:member.getByRole('button',{name:'Ask the team to review',exact:true})})
 const submit=member.getByRole('button',{name:'Ask the team to review',exact:true});assert.equal(await submit.isDisabled(),true)
 const allergy=member.getByRole('combobox').filter({has:member.locator('option[value="NONE"]')});await allergy.selectOption('NONE')
 for(const box of await requestForm.locator('input[type="checkbox"]').all())await box.check();assert.equal(await submit.isEnabled(),true)
 await capture(member,'capacity-member-1440');await submit.click();await member.getByText('Waiting for team readiness · Booking not confirmed',{exact:true}).last().waitFor()
 assert.equal(requestSent.allowWaitlist,true);assert.equal(requestSent.adults,2);assert.equal(requestSent.children,0);assert.equal(await member.getByText(/Bank account/).count(),0);checks.push('member submission requires explicit unconfirmed wait consent')
 await member.setViewportSize({width:390,height:844});await member.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'th'})));await member.waitForFunction(()=>document.documentElement.lang==='th');await capture(member,'capacity-member-th-390')
 requests=[{...row,status:'DATE_PROPOSED',paymentAllowed:false,seatHoldExpired:true,snapshot:{...quote(2,date),dateProposal:{serviceDate:'2026-10-27',quote:quote(2,'2026-10-27'),quoteKey:'QA-QUOTE',capacitySelections:availability(2,'2026-10-27').selections,availability:availability(2,'2026-10-27'),note:'QA date proposal'}}}]
 await member.goto('http://localhost:5285/');await member.evaluate(()=>window.dispatchEvent(new CustomEvent('greenview:locale',{detail:'en'})));await member.waitForFunction(()=>document.documentElement.lang==='en')
 const accept=member.getByRole('button',{name:'Accept new date and price',exact:true});await accept.waitFor();assert.equal(await accept.isDisabled(),true);assert.equal(await member.locator('input[type="file"]').count(),0)
 const proposalPanel=member.locator('section.quote-panel').filter({has:accept});for(const box of await proposalPanel.locator('input[type="checkbox"]').all())await box.check();await accept.click();await accept.waitFor({state:'hidden'})
 assert.equal(dateAnswered.answer,'ACCEPT');assert.equal(dateAnswered.serviceDate,'2026-10-27');assert.equal(dateAnswered.quoteKey,'QA-QUOTE');checks.push('member alone accepts changed date and price; unpaid request shows no payment form')
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);assert.deepEqual(consoleErrors,[]);console.log(JSON.stringify({result:'PASS',checks,viewports:[1440,390],locales:['en','th'],screenshots:output,realAccounts:false,realWrites:0}))
}catch(error){console.error(JSON.stringify({error:error.message,checks,errors,unexpected}));for(const context of browser.contexts())for(const page of context.pages())console.error('PAGE',page.url(),(await page.locator('body').innerText()).slice(-6500));throw error}
finally{await browser.close();for(const server of servers)await server.close();await new Promise(resolve=>deny.close(resolve))}
