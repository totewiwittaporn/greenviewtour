// Lean commerce responses with isolated fixtures only: never use a real account or send a mutation.
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const member=process.env.GREENVIEW_COMMERCE_SURFACE==='member'
const origin=member?process.env.GREENVIEW_MEMBER_ORIGIN:process.env.GREENVIEW_PUBLIC_ORIGIN
if(!origin)throw new Error('Isolated commerce origin required')
const browser=await chromium.launch({headless:true}),results=[]
try{
 for(const [locale,width]of [['en',1440],['th',390]]){
  const context=await browser.newContext({viewport:{width,height:950}}),page=await context.newPage(),reads=[],writes=[],errors=[]
  await context.addInitScript(value=>localStorage.setItem('greenview.locale',value),locale)
  page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message))
  const tour={id:'fixture-tour',name:'Lean Island Tour',slug:'lean-tour',description:'List description',highlights:'Island highlights',imageUrls:'',durationDays:1,adultPrice:'1500',childPrice:'750',ownership:'GREENVIEW'}
  const full={...tour,route:'Full itinerary is retained',cancellationTerms:'Full cancellation terms are retained',promotions:[],seasons:[],components:[]}
  const customer={id:'fixture-member',displayName:'Fixture Traveller',email:'traveller@example.test',phone:'0812345678',version:1}
  await context.route('**/api/**',async route=>{
   const req=route.request(),url=new URL(req.url()),p=url.searchParams,path=url.pathname
   if(req.method()!=='GET'){writes.push(path);return route.fulfill({status:409,json:{code:'FIXTURE_WRITES_BLOCKED'}})}
   reads.push(path+url.search)
   if(path==='/api/member/profile')return route.fulfill({json:{customer}})
   if(path==='/api/public/company')return route.fulfill({json:{company:null}})
   if(path==='/api/public/popups')return route.fulfill({json:{rows:[]}})
   if(path==='/api/public/tours'){
    assert.ok(p.get('slug')||['cards','highlights'].includes(p.get('view')),'List must declare a lean view')
    const pageNumber=Number(p.get('page')||1),pageSize=p.get('view')==='highlights'?2:12
    const all=Array.from({length:31},(_,i)=>({...tour,id:'tour-'+i,name:'Lean Island Tour '+i,slug:'lean-tour-'+i}))
    return route.fulfill({json:{rows:p.get('slug')?[full]:all.slice((pageNumber-1)*pageSize,pageNumber*pageSize),page:pageNumber,pageSize,total:p.get('slug')?1:31}})
   }
   if(path==='/api/member/requests'){
    assert.equal(p.get('view'),'list')
    return route.fulfill({json:{rows:[{id:'request-one',version:1,tourId:tour.id,serviceDate:'2026-11-01',adults:2,children:0,status:'PAID',snapshot:{tourName:tour.name,packageTotal:'3000.00'},paymentAllowed:false},{id:'request-two',version:2,tourId:tour.id,serviceDate:'2026-11-01',adults:2,children:0,status:'DATE_PROPOSED',snapshot:{tourName:'Changed-date request',packageTotal:'3000.00',dateProposal:{serviceDate:'2026-11-02',quoteKey:'exact-quote',capacitySelections:[],quote:{packageTotal:'3100.00',terms:{cancellationTerms:'Customer must accept these exact changed-date terms'}},note:'Date proposal retained',availability:{canConfirm:true,groupSize:2,legs:[]}}},paymentAllowed:false}],page:1,pageSize:12,total:2,payment:null}})
   }
   if(path==='/api/member/documents'){
    const pageNumber=Number(p.get('page')||1),all=Array.from({length:61},(_,i)=>({id:'file-'+i,filename:'Evidence-'+i+'.pdf',size:100,mimeType:'application/pdf'}))
    return route.fulfill({json:{rows:all.slice((pageNumber-1)*25,pageNumber*25),page:pageNumber,pageSize:25,total:61}})
   }
   if(path==='/api/public/quote')return route.fulfill({json:{tourId:tour.id,packageTotal:String(Number(p.get('adults'))*1500),adultPrice:'1500',childPrice:'750',components:[],quoteKey:'quote-'+p.get('adults'),terms:{cancellationTerms:full.cancellationTerms,fees:'Included fees'},availability:{canConfirm:true,groupSize:Number(p.get('adults')),legs:[],selections:[]}}})
   return route.fulfill({status:404,json:{code:'UNEXPECTED_FIXTURE_REQUEST'}})
  })
  if(member){
   await page.goto(origin+'/');await page.getByRole('heading',{name:tour.name,exact:true}).waitFor()
   assert.equal(reads.filter(url=>url.startsWith('/api/member/documents')).length,0)
   await page.getByText('Customer must accept these exact changed-date terms',{exact:true}).waitFor()
   assert.equal(await page.locator('input[type=file]').count(),0)
   const article=page.locator('article.panel').first()
   await article.getByRole('button',{name:/View documents|ดูเอกสาร/}).click();await article.getByRole('link',{name:'Evidence-24.pdf',exact:true}).waitFor()
   await article.getByRole('button',{name:/Next|ถัดไป/,exact:true}).click();await article.getByRole('link',{name:'Evidence-49.pdf',exact:true}).waitFor()
   await article.getByRole('button',{name:/Next|ถัดไป/,exact:true}).click();await article.getByRole('link',{name:'Evidence-60.pdf',exact:true}).waitFor()
   assert.equal(await article.getByRole('link',{name:/Evidence-/}).count(),11)
   assert.ok(await article.getByRole('button',{name:/Next|ถัดไป/,exact:true}).isDisabled())
   assert.equal(reads.filter(url=>/^\/api\/member\/documents\//.test(url)).length,0)
  }else{
   await page.goto(origin+'/');await page.locator('.published-highlight-group .tour-card').first().waitFor()
   assert.equal(await page.locator('.published-highlight-group .tour-card').count(),2)
   assert.ok(reads.some(url=>url.includes('view=highlights')&&url.includes('pageSize=2')))
  }
  await page.goto(origin+'/tours');await page.getByRole('heading',{name:'Lean Island Tour 0',exact:true}).waitFor()
  assert.ok(reads.some(url=>url.startsWith('/api/public/tours?')&&url.includes('view=cards')))
  await page.locator('main').getByRole('button',{name:/Next|ถัดไป/,exact:true}).click();await page.getByRole('heading',{name:'Lean Island Tour 12',exact:true}).waitFor()
  await page.locator('main').getByRole('button',{name:/Next|ถัดไป/,exact:true}).click();await page.getByRole('heading',{name:'Lean Island Tour 30',exact:true}).waitFor()
  assert.ok(await page.locator('main').getByRole('button',{name:/Next|ถัดไป/,exact:true}).isDisabled())
  await page.goto(origin+'/tours?tour=lean-tour');await page.getByText('Full itinerary is retained',{exact:true}).waitFor()
  await page.getByText('Full cancellation terms are retained',{exact:true}).first().waitFor()
  if(member){
   const quoteBefore=reads.filter(url=>url.startsWith('/api/public/quote?')).length
   await page.locator('input[type=date]').first().fill('2026-11-01')
   const adults=page.locator('input[type=number]').first()
   await adults.fill('1');await adults.fill('10');await adults.fill('12')
   await page.waitForResponse(response=>new URL(response.url()).pathname==='/api/public/quote'&&new URL(response.url()).searchParams.get('adults')==='12')
   await page.getByText(/18,000/).first().waitFor()
   const quotes=reads.filter(url=>url.startsWith('/api/public/quote?')).slice(quoteBefore)
   assert.equal(quotes.length,1);assert.equal(new URLSearchParams(quotes[0].split('?')[1]).get('adults'),'12')
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[])
  assert.equal(await page.locator('vite-error-overlay').count(),0)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  results.push({surface:member?'member':'public',locale,width,checks:['lean cards','all 31 catalogue records through pagination','full details and terms',...(member?['61 document metadata records through pagination','no eager document bytes','changed-date consent terms','no payment form for unpayable requests','debounced final quote only']:['only two home highlights'])],runtimeErrors:0,businessWrites:0})
  await context.close()
 }
 console.log(JSON.stringify({result:'PASS',test:'commerce-data-fetch',results,liveAccounts:false,realWrites:0},null,2))
}finally{await browser.close()}
