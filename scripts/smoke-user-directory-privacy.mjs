import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true}),base=process.env.GREENVIEW_TEST_ORIGIN||'http://localhost:5174'
try{
 const page=await browser.newPage();let denied=false
 const employee={id:'employee',email:'guide@example.test',displayName:'Visible Guide',department:'GUIDE',roles:[],canEdit:false,canConfigureAccess:false,canResetPassword:false}
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url())
  if(url.pathname==='/api/me')return route.fulfill({json:{user:{id:'head',displayName:'Head Guide',roles:[{code:'HEAD_GUIDE',scope:'DEPARTMENT'}],management:{department:'GUIDE'},operations:{},companyAccess:{}}}})
  if(url.pathname==='/api/users'){
   if(url.searchParams.has('recordId'))return route.fulfill({status:404,json:{code:'NOT_FOUND'}})
   if(denied)return route.fulfill({status:403,json:{code:'FORBIDDEN'}})
   return route.fulfill({json:{users:[employee],summary:{total:1,verified:0,signed_in:0},total:1,page:1,canInvite:false}})
  }
  return route.fulfill({json:{}})
 })
 await page.goto(base+'/settings/users')
 await page.getByText('Visible Guide',{exact:true}).waitFor()
 assert.equal(await page.getByText('owner@example.test',{exact:true}).count(),0)
 await page.getByRole('button',{name:'Actions for guide@example.test',exact:true}).click()
 assert.equal(await page.getByRole('menuitem',{name:'Configure permissions',exact:true}).count(),0)
 assert.equal(await page.getByRole('menuitem',{name:'Edit user',exact:true}).count(),0)
 await page.getByRole('menuitem',{name:'View user',exact:true}).click()
 await page.getByRole('dialog').getByRole('alert').waitFor()
 assert.equal(await page.getByRole('dialog').getByText('guide@example.test',{exact:true}).count(),0)
 await page.keyboard.press('Escape')
 denied=true;await page.getByRole('button',{name:'Refresh',exact:true}).click()
 await page.getByText('Your access to this directory has changed. Contact your Manager.',{exact:true}).waitFor()
 assert.equal(await page.getByText('Visible Guide',{exact:true}).count(),0)
 assert.equal(await page.getByRole('button',{name:'Actions for guide@example.test',exact:true}).count(),0)
 console.log('PASS: directory uses scoped server rows/actions, denied detail never renders cached identity, revoked directory clears rows and summaries')
}finally{await browser.close()}
