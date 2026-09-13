// Isolated UI fixtures. No real backend or database writes.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../frontend/backoffice/',import.meta.url)),origin='http://localhost:5277'
const vite=await createServer({root,server:{port:5277,strictPort:true},configFile:`${root}vite.config.js`})
await vite.listen()
const browser=await chromium.launch({headless:true,...(process.env.GV_BROWSER_PATH?{executablePath:process.env.GV_BROWSER_PATH}:process.platform==='win32'?{channel:'msedge'}:{})})
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[]
 let me=0,documents=0
 page.on('pageerror',error=>errors.push(error.message))
 page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents++})
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/me'){me++;return route.fulfill({json:{user:{id:'10000000-0000-4000-8000-000000000001',displayName:'Navigation fixture',roles:[],management:{company:true}}}})}
  return route.fulfill({json:{rows:[],total:0,page:1,pages:1,pageSize:25,summary:{total:0,active:0,inactive:0,featured:0,draft:0,confirmed:0,completed:0}}})
 })
 await page.goto(`${origin}/settings/services`)
 await page.getByRole('button',{name:'+ Add service',exact:true}).waitFor()
 await page.evaluate(()=>{window.__navigationSentinel={shell:document.querySelector('.workspace'),sidebar:document.querySelector('.sidebar'),account:document.querySelector('.account-menu')}})
 const meBaseline=me,documentBaseline=documents
 const intact=async()=>{assert.equal(documents,documentBaseline);assert.equal(me,meBaseline);assert.equal(await page.evaluate(()=>window.__navigationSentinel.shell===document.querySelector('.workspace')&&window.__navigationSentinel.sidebar===document.querySelector('.sidebar')&&window.__navigationSentinel.account===document.querySelector('.account-menu')),true)}
 const nav=page.getByRole('navigation',{name:'Main navigation'})
 await nav.getByRole('link',{name:'Inventory',exact:true}).click()
 await page.getByRole('button',{name:'Receive stock',exact:true}).waitFor();await intact()
 await nav.getByRole('link',{name:'Booking',exact:true}).click()
 await page.getByRole('button',{name:'New booking',exact:true}).waitFor();await intact()
 await page.goBack();await page.getByRole('button',{name:'Receive stock',exact:true}).waitFor();await intact()
 await page.goForward();await page.getByRole('button',{name:'New booking',exact:true}).waitFor();await intact()
 await nav.getByRole('link',{name:'Tour services',exact:true}).click()
 await page.getByRole('button',{name:'+ Add service',exact:true}).click()
 await page.getByLabel('Code',{exact:true}).fill('UNSAVED')
 // History is available while the modal makes the background inert.
 await page.goBack();await page.getByRole('dialog',{name:'Unsaved changes',exact:true}).waitFor()
 await page.getByRole('button',{name:'Keep editing',exact:true}).click()
 assert.equal(await page.getByLabel('Code',{exact:true}).inputValue(),'UNSAVED');assert.equal(new URL(page.url()).pathname,'/settings/services');await intact()
 await page.goBack();await page.getByRole('button',{name:'Discard and leave',exact:true}).click()
 await page.getByRole('button',{name:'New booking',exact:true}).waitFor();await intact()
 // Inspect native bypass semantics without actually opening a tab or unloading.
 const bypass=await page.evaluate(()=>{
  const test=(href,extra={})=>{const a=document.createElement('a');a.href=href;document.body.append(a);let intercepted;const observer=e=>{intercepted=e.defaultPrevented;e.preventDefault()};document.addEventListener('click',observer);a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,...extra}));document.removeEventListener('click',observer);a.remove();return intercepted}
  return {modified:test('/operations/stock',{ctrlKey:true}),external:test('https://example.com/'),hash:test('#main'),unowned:test('/api/me')}
 })
 assert.deepEqual(bypass,{modified:false,external:false,hash:false,unowned:false})
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Toggle navigation',exact:true}).click()
 await nav.getByRole('link',{name:'Equipment & Supplies',exact:true}).click();await page.getByRole('button',{name:'+ Add equipment item',exact:true}).waitFor();await intact()
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.goto(`${origin}/operations/services?q=legacy`);await page.getByRole('button',{name:'+ Add service',exact:true}).waitFor()
 assert.equal(new URL(page.url()).pathname,'/settings/services');assert.equal(new URL(page.url()).searchParams.get('q'),'legacy')
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({result:'PASS',checks:['sidebar content-only navigation','Shell and profile DOM identity','no extra api/me','back and forward','dirty history keep/discard','native modified/external/hash/unowned clicks','390px navigation','legacy master canonical route']}))
} finally {await browser.close();await vite.close()}
