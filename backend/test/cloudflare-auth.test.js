import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync} from 'node:fs'
import {mkdtemp,mkdir,rm} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {hash} from 'bcryptjs'
import {sourceAuthDate,sourceAuthAccess} from '../../scripts/local-auth-source.js'
import {authSettings,verifyCompatiblePassword,assertAuthUser} from '../src/platform/auth/cloudflare/runtime.js'
import {boundedAuthBody} from '../src/platform/auth/cloudflare/request-body.js'
import {SessionStore,sessionCookie} from '../src/platform/auth/sessions.js'
import {parseMailArgs,readLocalMail,validateMailLink} from '../../scripts/local-mail-lib.js'
const migration=name=>readFileSync(new URL('../prisma-d1/migrations/'+name,import.meta.url),'utf8')
test('D1 auth requires persistent sessions, reviewed origins and a strong server secret',()=>{
 assert.throws(()=>new SessionStore(),/PERSISTENT_SESSION_DATABASE_REQUIRED/)
 const env={APP_ENV:'local',AUTH_SECRET:'a'.repeat(48)}
 assert.equal(authSettings(env).origins.customer,'http://localhost:5175')
 for(const change of [{AUTH_SECRET:'short'},{APP_ENV:'preview'},{MEMBER_ORIGIN:'https://remote.example'},{BACKOFFICE_ORIGIN:'http://localhost:5174/path'},{PUBLIC_ORIGIN:'http://user:pass@localhost:5173'}])assert.throws(()=>authSettings({...env,...change}))
 assert.match(sessionCookie('gv_session','abc'),/Path=\/api; HttpOnly; SameSite=Strict/)
 assert.match(sessionCookie('gv_member_session','',{secure:true}),/Max-Age=0; Secure$/)
 assert.throws(()=>sessionCookie('arbitrary','abc'),/SESSION_COOKIE_NAME_INVALID/)
})
test('legacy bcrypt passwords verify without accepting truncated long passwords',async()=>{
 const password='รหัสทดสอบ-local-12345',encoded=await hash(password,4)
 assert.equal(await verifyCompatiblePassword({hash:encoded,password}),true)
 assert.equal(await verifyCompatiblePassword({hash:encoded,password:'wrong'}),false)
 assert.equal(await verifyCompatiblePassword({hash:await hash('a'.repeat(72),4),password:'a'.repeat(73)}),false)
})
test('auth body bounds bytes and rejects malformed UTF-8, scalar JSON and non-JSON',async()=>{
 const request=(body,type='application/json')=>new Request('http://localhost/api/auth/login',{method:'POST',headers:{'content-type':type},body})
 const body=JSON.stringify({email:'ไทย@example.test',password:'test'}),result=await boundedAuthBody(request(body))
 assert.equal(result.input.email,'ไทย@example.test')
 for(const invalid of ['[]','null','"string"','{'])await assert.rejects(()=>boundedAuthBody(request(invalid)),{code:'INVALID_REQUEST'})
 await assert.rejects(()=>boundedAuthBody(request(new Uint8Array([0xff,0xfe]))),{code:'INVALID_REQUEST'})
 await assert.rejects(()=>boundedAuthBody(request(body),10),{code:'REQUEST_TOO_LARGE'})
 await assert.rejects(()=>boundedAuthBody(request('{}','text/plain')),{code:'JSON_REQUIRED'})
})
test('operator mail arguments and links cannot target remote services or arbitrary schemes',()=>{
 assert.deepEqual(parseMailArgs(['--email','local@example.test','--kind','reset']),{'--email':'local@example.test','--kind':'reset'})
 for(const args of [['--remote','true'],['--kind','unknown'],['--email'],['--open',';open'],['--kind','reset','--kind','verify']])assert.throws(()=>parseMailArgs(args))
 assert.equal(validateMailLink('http://localhost:5174/reset-password#recovery=fixture','reset'),'http://localhost:5174/reset-password#recovery=fixture')
 for(const link of ['https://example.com/login#verify=x','file:///tmp/x','http://localhost:8787/login#verify=x','http://localhost:5175/login?redirect=remote#verify=x','http://localhost:5175/login#verify=x&other=y'])assert.throws(()=>validateMailLink(link,'verify'))
})
test('operator mailbox is read-only, redacts tokens by default and parameterizes filters',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'greenview-mail-test-')),state=path.join(directory,'v3/d1/miniflare-D1DatabaseObject')
 await mkdir(state,{recursive:true})
 const db=new DatabaseSync(path.join(state,'fixture.sqlite'))
 try{
  db.exec('CREATE TABLE LocalMail(id TEXT,recipient TEXT,kind TEXT,createdAt TEXT,link TEXT)')
  db.prepare('INSERT INTO LocalMail VALUES(?,?,?,?,?)').run('a'.repeat(36),'qa@example.test','reset','2026-01-01','http://localhost:5175/login#recovery=secret-fixture')
  const rows=await readLocalMail(directory)
  assert.equal(rows.length,1);assert.equal(rows[0].link,undefined)
  assert.deepEqual(await readLocalMail(directory,{'--email':"' OR 1=1 --"}),[])
  assert.match((await readLocalMail(directory,{'--open':'a'.repeat(36)}))[0].link,/#recovery=/)
  assert.equal(db.prepare('SELECT count(*) AS n FROM LocalMail').get().n,1)
 }finally{db.close();await rm(directory,{recursive:true,force:true})}
})
test('auth migration preserves earlier identity data and revokes durable sessions on suspension',()=>{
 const db=new DatabaseSync(':memory:')
 try{
  db.exec('PRAGMA foreign_keys=ON')
  const history=Object.keys(JSON.parse(readFileSync(new URL('../prisma-d1/migration-checksums.json',import.meta.url),'utf8')))
  for(const name of history.filter(name=>name<'0007'))db.exec(migration(name))
  db.prepare('INSERT INTO D1Identity(id,email,created_at) VALUES(?,?,?)').run('existing','old@example.test',null)
  const before=db.prepare('SELECT * FROM D1Identity').all()
  db.exec(migration('0007_local_auth_sessions.sql'))
  assert.deepEqual(db.prepare('SELECT * FROM D1Identity').all(),before)
  const now='2026-09-30T00:00:00.000+00:00',future='2099-01-01T00:00:00.000+00:00'
  db.prepare('INSERT INTO AuthUser(id,name,email,emailVerified,updatedAt) VALUES(?,?,?,?,?)').run('existing','Old identity','old@example.test',1,now)
  assert.equal(db.prepare('SELECT created_at FROM D1Identity WHERE id=?').get('existing').created_at,null)
  db.prepare('INSERT INTO AuthSession(id,token,expiresAt,updatedAt,userId) VALUES(?,?,?,?,?)').run('session','provider-token',future,now,'existing')
  db.prepare('INSERT INTO WebSession(id,userId,authSessionId,purpose,expiresAt) VALUES(?,?,?,?,?)').run('digest','existing','session','workspace',future)
  const revision=db.prepare('SELECT version FROM D1TxnRevision WHERE id=1').get().version
  db.prepare('UPDATE AuthUser SET disabled=1 WHERE id=?').run('existing')
  assert.equal(db.prepare('SELECT count(*) AS n FROM WebSession').get().n,0)
  assert.equal(db.prepare('SELECT count(*) AS n FROM AuthSession').get().n,0)
  assert.ok(db.prepare('SELECT version FROM D1TxnRevision WHERE id=1').get().version>revision)
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  for(const name of ['AuthUser','AuthAccount','AuthSession','AuthVerification','WebSession','LocalMail'])assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='trigger' AND tbl_name=? AND name LIKE 'D1Revision_%'").get(name).n,3)
 }finally{db.close()}
})
test('source infinity bans remain disabled and missing identity dates are not invented',()=>{
 const permanent=sourceAuthAccess({banned_until:'infinity'})
 assert.deepEqual(permanent,{permanentlyBanned:true,disabled:true,bannedUntil:null})
 assert.throws(()=>assertAuthUser({id:'banned',...permanent}),{code:'ACCOUNT_UNAVAILABLE'})
 assert.deepEqual(sourceAuthAccess({banned_until:'-infinity'}),{permanentlyBanned:false,disabled:false,bannedUntil:null})
 assert.equal(sourceAuthAccess({deleted_at:'2026-01-01',banned_until:null}).disabled,true)
 assert.equal(sourceAuthAccess({is_anonymous:true}).disabled,true)
 assert.equal(sourceAuthAccess({banned_until:'2027-01-01T00:00:00Z'}).bannedUntil,'2027-01-01T00:00:00.000+00:00')
 assert.equal(sourceAuthDate(null),null)
 assert.equal(sourceAuthDate('2026-09-25T05:48:39.119455+00:00'),'2026-09-25T05:48:39.119+00:00')
 for(const value of ['infinity','not-a-date',123])assert.throws(()=>sourceAuthDate(value),/SOURCE_AUTH_DATE_INVALID/)
 assert.throws(()=>sourceAuthAccess({banned_until:'not-a-date'}),/SOURCE_AUTH_DATE_INVALID/)
})
test('Member authentication artwork is a bundled Local asset, not legacy Production',()=>{
 const layout=readFileSync(new URL('../../frontend/member/src/core/AuthLayout.jsx',import.meta.url),'utf8')
 assert.match(layout,/src="\/images\/auth\/surin-hero\.webp"/)
 assert.ok(!layout.includes('https://greenviewtour.com'))
 const image=readFileSync(new URL('../../frontend/member/public/images/auth/surin-hero.webp',import.meta.url))
 assert.equal(image.toString('ascii',0,4),'RIFF')
 assert.equal(image.toString('ascii',8,12),'WEBP')
})
test('active health and owner commands cannot reach the retired provider path',()=>{
 const root=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).scripts
 const backend=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).scripts
 assert.equal(root['db:check'],'node scripts/local-health.js')
 assert.equal(root['owner:invite'],'node scripts/retired-source-command.js')
 assert.equal(backend['db:check'],'node ../scripts/local-health.js')
 assert.equal(backend['owner:invite'],'node ../scripts/retired-source-command.js')
 assert.equal(backend['db:identity-check'],'node ../scripts/retired-source-command.js')
})
