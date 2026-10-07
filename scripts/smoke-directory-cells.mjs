import assert from 'node:assert/strict'
import {mkdtemp} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const root=fileURLToPath(new URL('../frontend/backoffice',import.meta.url)),output=await mkdtemp(tmpdir()+'/greenview-directory-cells-')
const vite=await createServer({root,configFile:root+'/vite.config.js',server:{host:'127.0.0.1',port:5376,strictPort:true},logLevel:'error'})
let browser
try{
 await vite.listen();browser=await chromium.launch({headless:true})
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.addInitScript(()=>localStorage.setItem('greenview.locale','en'))
 const user={id:'fixture-owner',displayName:'ToTee',email:'owner@example.test',status:'ACTIVE',department:'MANAGEMENT',roles:[{code:'ADMIN_MANAGER',scope:'COMPANY'}],management:{company:true}}
 const rows=[{...user,roles:[{roleCode:'ADMIN_MANAGER'}]},{...user,id:'long',displayName:'An exceptionally long employee display name that exceeds the available column width',email:'an-exceptionally-long-email-address@example.test'}]
 const invitations=['Pending','Joined'].map((status,i)=>({id:String(i),email:'employee'+i+'@example.test',displayName:'Employee '+i,department:'MANAGEMENT',roles:['MANAGER'],status,onboardingState:i?'ACTIVE':'INVITED',expiresAt:'2026-10-06T12:00:00Z'}))
 await page.route('**/*',route=>{
  const url=new URL(route.request().url())
  if(!['localhost','127.0.0.1'].includes(url.hostname))return route.abort()
  if(!url.pathname.startsWith('/api/'))return route.continue()
  assert.equal(route.request().method(),'GET','UI checks must not write business data')
  if(url.pathname==='/api/me')return route.fulfill({json:{user}})
  if(url.pathname==='/api/me/line')return route.fulfill({json:{status:'UNLINKED',linkedLineProfile:null}})
  if(url.pathname==='/api/users')return route.fulfill({json:{users:rows,total:2,page:1,pageSize:25,summary:{total:2,verified:2,signed_in:0},canInvite:true,checkedAt:new Date().toISOString()}})
  if(url.pathname==='/api/invitations')return route.fulfill({json:{invitations,total:2,page:1,pageSize:25,summary:{total:2,awaiting:1,joined:1,inactive:0},roles:[],departments:[]}})
  throw new Error('Unexpected request '+url.pathname)
 })
 for(const width of [1440,834,390]){
  await page.setViewportSize({width,height:900});await page.goto('http://localhost:5376/settings/users')
  await page.locator('.user-identity-cell strong').first().waitFor()
  const geometry=await page.locator('.user-identity-cell').evaluateAll(cells=>cells.map(cell=>{
   const name=cell.querySelector('strong'),email=cell.querySelector('small'),wrap=cell.querySelector('.table-cell-copy'),box=wrap.getBoundingClientRect()
   return {avatar:cell.querySelectorAll('.avatar').length,text:name.textContent,nameOverflows:name.scrollWidth>name.clientWidth,emailBottom:email.getBoundingClientRect().bottom,wrapperBottom:box.bottom,clamp:getComputedStyle(wrap).webkitLineClamp,ellipsis:getComputedStyle(name).textOverflow,title:name.title}
  }))
  assert.equal(geometry[0].avatar,0);assert.equal(geometry[0].text,'ToTee');assert.equal(geometry[0].nameOverflows,false)
  assert.equal(geometry[1].nameOverflows,true);assert.equal(geometry[1].ellipsis,'ellipsis');assert.equal(geometry[1].title,rows[1].displayName)
  for(const g of geometry){assert.equal(g.clamp,'none');assert.ok(g.emailBottom<=g.wrapperBottom+1)}
  await page.screenshot({path:output+'/users-'+width+'.png',fullPage:true})
  await page.getByRole('tab',{name:'Invitations',exact:true}).click()
  const table=page.getByRole('table',{name:'Employee invitations',exact:true});await table.getByText('Pending',{exact:true}).waitFor()
  for(const badge of await table.locator('.badge').all()){
   assert.equal(await badge.locator('..').locator('small').count(),0)
   assert.ok(await badge.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.bottom<=b.bottom+1&&a.top>=b.top-1}))
  }
  assert.equal(await table.getByText('Awaiting email verification',{exact:true}).count(),0)
  await table.getByText('Pending',{exact:true}).scrollIntoViewIfNeeded()
  await page.screenshot({path:output+'/invitations-'+width+'.png',fullPage:true})
 }
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({status:'PASS',widths:[1440,834,390],checks:['no initial avatar','short name fully visible','long names truncate only on actual overflow with full title','email line not vertically clipped','Pending and Joined badges have no secondary text and are not clipped'],realWrites:0,screenshots:output}))
}finally{await browser?.close();await vite.close()}
