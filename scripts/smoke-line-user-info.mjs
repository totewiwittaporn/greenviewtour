import assert from 'node:assert/strict'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true}),base=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5174'
try{
 const page=await browser.newPage();let linked=true,badImage=false,lineReads=0
 const name='LINE nickname with a deliberately long display name สำหรับทดสอบ'
 const user={id:'line-avatar-fixture',displayName:'Stored Employee',nickname:'Stored Nickname',email:'employee@example.test',roles:[{code:'ADMIN_MANAGER',scope:'COMPANY'}],management:{company:true},operations:{booking:true},companyAccess:{}}
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/me')return route.fulfill({json:{user}})
  if(path==='/api/me/line'){lineReads++;return route.fulfill({json:{linkedLineProfile:linked?{displayName:name,pictureUrl:'https://sprofile.line-scdn.net/avatar-test'+(badImage?'bad':'')}:null}})}
  return route.fulfill({json:{widgets:[],rows:[],generatedAt:new Date().toISOString()}})
 })
 await page.route('https://sprofile.line-scdn.net/**',route=>badImage?route.abort():route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#087f8c"/></svg>'}))
 await page.goto(base+'/dashboard')
 await page.locator('.account-menu img').waitFor()
 const initialReads=lineReads
 await page.evaluate(()=>{for(let i=0;i<10;i++)window.dispatchEvent(new Event('focus'))})
 await page.waitForTimeout(100)
 assert.equal(lineReads,initialReads,'focus bursts reuse the bounded per-user cache')
 for(const width of [320,390,760,1280]){
  await page.setViewportSize({width,height:900})
  const trigger=page.getByRole('button',{name:'User menu',exact:true})
  const boxes=await Promise.all(['.menu-toggle','.workspace-notifications','.workspace-help','.account-menu'].map(selector=>page.locator(selector).boundingBox()))
  if(width<=760){
   for(const box of boxes)assert.ok(box&&box.width>=44&&box.height>=44)
   assert.ok(boxes.every(box=>Math.abs(box.y-boxes[0].y)<2))
   assert.ok(boxes.every((box,i)=>i===0||box.x>boxes[i-1].x))
   assert.equal(await page.locator('.topbar .reference-brand').isVisible(),false)
   assert.ok((await page.locator('.reference-search').boundingBox()).y>=boxes[0].y+44)
   assert.equal(await page.locator('.account-name').isVisible(),false)
  }else assert.equal(await page.locator('.account-name').textContent(),name)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  if(width===390)await page.screenshot({path:join(tmpdir(),'greenview-line-user-info-390-closed.png')})
  await trigger.focus();await page.keyboard.press('ArrowDown');await page.getByRole('menu',{name:'User menu',exact:true}).waitFor()
  assert.equal(await page.locator('.dropdown-heading>strong').textContent(),name)
  assert.ok((await page.locator('.user-info-details').textContent()).includes('Stored Employee'))
  assert.ok((await page.locator('.user-info-details').textContent()).includes('LINE'))
  await page.screenshot({path:join(tmpdir(),'greenview-line-user-info-'+width+'.png')})
  await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(el=>el===document.activeElement),true)
 }
 badImage=true;await page.evaluate(()=>window.dispatchEvent(new Event('greenview:line-changed')))
 await page.locator('.account-menu .avatar').filter({hasText:'L'}).waitFor()
 assert.equal(await page.locator('.account-menu img').count(),0)
 linked=false;await page.evaluate(()=>window.dispatchEvent(new Event('greenview:line-changed')))
 await page.getByText('Stored Nickname',{exact:true}).waitFor()
 assert.equal(await page.locator('.account-menu img').count(),0)
 console.log('PASS: linked LINE presentation, employee data preserved, 320/390/760 mobile four-action row + second-row search, desktop, keyboard, image-error and unlink fallback')
}finally{await browser.close()}
