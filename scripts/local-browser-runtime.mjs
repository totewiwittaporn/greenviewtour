import assert from 'node:assert/strict'
import {readFile,writeFile,mkdtemp,cp,readdir,mkdir} from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import {spawn} from 'node:child_process'
import {DatabaseSync} from 'node:sqlite'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import os from 'node:os'
import {createServer as netServer} from 'node:net'
import {root} from './local-cloudflare-policy.js'
import {fileInventory} from './local-backup-files.js'
export async function setup({lineTest=false}={}){
 if(process.argv.length!==2)throw new Error('LOCAL_BROWSER_ARGUMENTS_FORBIDDEN')
 const out=path.join(os.homedir(),'GreenviewBackups');await mkdir(out,{recursive:true,mode:0o700})
 const load=file=>import(pathToFileURL(path.join(root,file)))
 const {localEnvironment,configPath,statePath,validateLocalConfig}=await load('scripts/local-cloudflare-policy.js')
 const {localPreflight,acquireStateLock}=await load('scripts/local-cloudflare-safety.js')
 const {readLocalMail,validateMailLink}=await load('scripts/local-mail-lib.js')
 await localPreflight()
 for(const port of [8787,5173,5174,5175])await new Promise((resolve,reject)=>{const server=netServer();server.once('error',()=>reject(new Error('LOCAL_PORT_IN_USE:'+port)));server.listen(port,'127.0.0.1',()=>server.close(resolve))})
 const unlock=await acquireStateLock('real-browser-auth-api-acceptance');let released=false
 const release=async()=>{if(!released){await unlock();released=true}}
 try{
 await fileInventory(statePath)
 const directory=await mkdtemp(path.join(out,'browser-real-')),state=path.join(directory,'state')
 await cp(statePath,state,{recursive:true,force:false,errorOnExist:true})
 const env=localEnvironment(),token=randomBytes(32).toString('hex'),config=validateLocalConfig(JSON.parse(await readFile(configPath,'utf8')))
 config.main=path.join(root,lineTest?'backend/src/cloudflare/staff-line-check.ts':'backend/src/cloudflare/member-regression-check.ts');config.$schema=path.join(root,'node_modules/wrangler/config-schema.json')
 config.d1_databases[0].migrations_dir=path.join(root,'backend/prisma-d1/migrations')
 const audit=lineTest?randomBytes(32).toString('hex'):null
 Object.assign(config.vars,{AUTH_SECRET:randomBytes(48).toString('hex'),LOCAL_API_TOKEN:token,...(audit?{VERIFY_TOKEN:audit}:{})})
 const file=path.join(directory,'worker.private.jsonc');await writeFile(file,JSON.stringify(config),{mode:0o600})
 const qa={root,out,directory,state,audit,checks:[],pages:[],errors:[],console:[],responses:[],externalBlocked:new Set(),vites:[],release}
 qa.query=async(sql,args=[])=>{
  const dbdir=path.join(state,'v3/d1/miniflare-D1DatabaseObject')
  for(const name of await readdir(dbdir)){if(!name.endsWith('.sqlite'))continue;const db=new DatabaseSync(path.join(dbdir,name),{readOnly:true});try{if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='TourBooking'").get())return db.prepare(sql).all(...args)}finally{db.close()}}
  throw new Error('LOCAL_DB_NOT_FOUND')
 }
 qa.startWorker=async()=>{
  const fd=openSync(path.join(directory,'worker.log'),'a',0o600)
  qa.worker=spawn(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--local','--ip','127.0.0.1','--port','8787','--persist-to',state,'--config',file,'--env-file',path.join(root,'backend/cloudflare.env'),'--log-level','error'],{cwd:root,env,stdio:['ignore',fd,fd],detached:true});closeSync(fd)
  qa.exited=new Promise(resolve=>{qa.worker.once('exit',resolve);qa.worker.once('error',resolve)})
  for(const end=Date.now()+30000;Date.now()<end;){try{if((await fetch('http://127.0.0.1:8787/health/live',{signal:AbortSignal.timeout(1000)})).ok)return}catch{ /* optional local readiness/cleanup */ };if(qa.worker.exitCode!==null)throw new Error('LOCAL_WORKER_EXITED');await new Promise(r=>setTimeout(r,200))}
  throw new Error('LOCAL_WORKER_TIMEOUT')
 }
qa.stopWorker=async()=>{
  const child=qa.worker;
  if(!child)return;
  if(process.platform==='win32'){
    await new Promise(resolve=>{
      const windowsRoot=process.env.SystemRoot||path.join(process.env.SystemDrive||'C:','Windows');
      const killer=spawn(path.join(windowsRoot,'System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});
      killer.once('exit',resolve);killer.once('error',resolve);
    })
    await qa.exited;
  }else{
    try{process.kill(-child.pid,'SIGTERM')}catch{ /* already stopped */ };
    const timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL')}catch{ /* already stopped */ }},5000);timer.unref();
    await qa.exited;clearTimeout(timer);
  }
  qa.worker=null;
}
 qa.mail=async(email,kind)=>{
  const rows=await readLocalMail(state,{'--email':email,'--kind':kind});assert.ok(rows.length,'Expected Local mail')
  const [mail]=await readLocalMail(state,{'--open':rows[0].id});return validateMailLink(mail.link,kind)
 }
 qa.mark=async(name)=>{qa.checks.push(name);await qa.save();console.log('BROWSER_PASS',name)}
 qa.save=()=>writeFile(path.join(directory,'result.json'),JSON.stringify({status:qa.status||'IN_PROGRESS',environment:'local-isolated-copy',browser:'Playwright Chromium; Browser plugin not available',checks:qa.checks,pages:qa.pages,runtimeErrors:qa.errors,console:qa.console,responses:qa.responses,externalRequestsBlocked:[...qa.externalBlocked],activeDataChanged:false},null,2),{mode:0o600})
 qa.close=async()=>{await qa.browser?.close();for(const vite of qa.vites)await vite.close();await qa.stopWorker();await release();await qa.save()}
 try{
  await qa.startWorker()
  for(const key of Object.keys(process.env))delete process.env[key]
  Object.assign(process.env,env,{LOCAL_API_PORT:'8787',LOCAL_API_TOKEN:token,VITE_STAFF_LOGIN_URL:'http://localhost:5174/login'})
  const {createServer}=await load('node_modules/vite/dist/node/index.js')
  for(const [app,port] of [['public-web',5173],['backoffice',5174],['member',5175]]){
   const appRoot=path.join(root,'frontend',app),vite=await createServer({root:appRoot,mode:app==='member'?'member-regression':'development',configFile:path.join(appRoot,'vite.config.js'),server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'})
   await vite.listen();qa.vites.push(vite)
  }
  const {chromium}=await load('node_modules/playwright/index.mjs')
  qa.browser=await chromium.launch({headless:true})
  qa.context=await qa.browser.newContext({viewport:{width:1440,height:1000}})
  await qa.context.addInitScript(()=>{try{localStorage.setItem('greenview.locale','en')}catch{ /* optional local readiness/cleanup */ }})
  await qa.context.route('**/*',route=>{
   const u=new URL(route.request().url())
   if(['localhost','127.0.0.1','[::1]'].includes(u.hostname))return route.continue()
   qa.externalBlocked.add(u.origin);return route.abort('blockedbyclient')
  })
  qa.page=async()=>{const page=await qa.context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>qa.errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))qa.console.push({type:m.type(),text:m.text().replace(/#[^\s]+/g,'#REDACTED')})});page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))qa.responses.push({path:u.pathname,status:r.status(),port:u.port})});return page}
  qa.capture=async(page,name)=>{
   await page.waitForFunction(()=>![...document.querySelectorAll('[role="status"]')].some(el=>el.getClientRects().length&&/^(Loading|Checking|กำลังโหลด|กำลังตรวจสอบ)/i.test(el.textContent.trim())))
   const url=new URL(page.url());assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.equal(url.hash,'')
   const title=await page.title();assert.match(title,/Greenview/i)
   const text=await page.locator('body').innerText();assert.ok(text.length>100,'nonblank page')
   assert.equal(await page.locator('vite-error-overlay').count(),0)
   const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight}))
   assert.ok(layout.scrollWidth<=layout.width+1,`${name}: horizontal overflow ${layout.scrollWidth}/${layout.width}`)
   await page.screenshot({path:path.join(directory,name+'.png'),fullPage:false})
   qa.pages.push({name,url:url.origin+url.pathname,title,...layout,meaningfulContent:true,frameworkOverlay:false});await qa.save()
  }
  qa.staff=(await qa.query("SELECT a.email FROM AuthUser a JOIN UserProfile p ON p.id=a.id JOIN UserRole r ON r.userId=p.id WHERE a.emailVerified=1 AND a.disabled=0 AND p.status='ACTIVE' AND r.roleCode='ADMIN_MANAGER' AND r.scope='COMPANY' ORDER BY a.email LIMIT 1"))[0]
  qa.customer=(await qa.query("SELECT a.email FROM AuthUser a JOIN CustomerProfile c ON c.authUserId=a.id WHERE a.emailVerified=1 AND a.disabled=0 AND c.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM UserProfile p WHERE p.id=a.id) ORDER BY a.email LIMIT 1"))[0]
  assert.ok(qa.staff&&qa.customer,'imported staff/customer identities exist')
  qa.password='Local-QA-'+randomBytes(12).toString('hex')
  await qa.save();console.log('REAL_BROWSER_LOCAL_READY',directory);return qa
 }catch(error){qa.status='FAILED_SETUP';await qa.close();throw error}
 }catch(error){await release();throw error}
}
