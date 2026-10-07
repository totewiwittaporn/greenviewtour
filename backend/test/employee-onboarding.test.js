import test from 'node:test'
import {registerHooks} from 'node:module'
registerHooks({load(url,context,next){if(url.endsWith('.wasm?module'))return {format:'module',shortCircuit:true,source:'import {readFileSync} from "node:fs"; export default new WebAssembly.Module(readFileSync(new URL('+JSON.stringify(url.split('?')[0])+')))'};return next(url,context)}})
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync,readdirSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {createD1Prisma} from '../src/platform/database/d1-client.ts'
import {createInvitation,changeInvitation,validateInvitation} from '../src/modules/identity-access/invitations.js'
import {sendEmployeeInvitation,exchangeEmployeeInvite,readEmployeeOnboarding,saveEmployeeInformation,saveEmployeePassword} from '../src/modules/identity-access/employee-onboarding.js'
import {resolveMembership} from '../src/modules/identity-access/membership.js'
import {createStaffLogin,staffLoginSettings} from '../src/platform/line/staff-login.js'
import {createD1AuthProvider} from '../src/platform/auth/cloudflare/provider.js'
import {SessionStore} from '../src/platform/auth/sessions.js'
import {validateEmployeeInformation} from '../../packages/contracts/employee-onboarding.js'
// Actual SQLite constraints/transactions through the production Prisma D1 planner;
// this shim models the D1 interface, not Cloudflare network/runtime behavior.
function sqliteBinding(sqlite){
 const result=(sql,args)=>{
  const stmt=sqlite.prepare(sql),before=sqlite.prepare('SELECT total_changes() AS n').get().n
  const results=stmt.columns().length?stmt.all(...args): (stmt.run(...args),[])
  return {success:true,results,meta:{changes:sqlite.prepare('SELECT total_changes() AS n').get().n-before}}
 }
 const prepare=sql=>({sql,args:[],bind(...args){return {...this,args}},async all(){return result(this.sql,this.args)},async run(){return result(this.sql,this.args)},async first(column){const row=result(this.sql,this.args).results[0]||null;return column?row?.[column]:row},async raw(options){const stmt=sqlite.prepare(this.sql),columns=stmt.columns().map(c=>c.name);stmt.setReturnArrays(true);const rows=stmt.all(...this.args);return options?.columnNames?[columns,...rows]:rows}})
 return {prepare,async batch(statements){sqlite.exec('BEGIN');try{const rows=statements.map(s=>result(s.sql,s.args));sqlite.exec('COMMIT');return rows}catch(error){sqlite.exec('ROLLBACK');throw error}}}
}
const environment={APP_ENV:'local',AUTH_SECRET:'q'.repeat(64)}
const info={firstName:'Legal',lastName:'Employee',province:'Phuket',district:'Mueang Phuket',subdistrict:'Rawai',postalCode:'83130',houseNumber:'12',moo:'',villageName:'',mapUrl:'',latitude:'',longitude:'',primaryPhone:'081-234-5678'}
const password='private-fixture-password-123'
const lineConfig={available:true,reason:null,channelId:'1234567890',channelSecret:'b'.repeat(32),callbackUrl:'http://localhost:5174/onboarding/line-callback',channelKey:'test:employee-onboarding',addFriendUrl:'https://line.me/R/ti/p/%40335bydey'}
async function fixture(t){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON')
 const directory=new URL('../prisma-d1/migrations/',import.meta.url)
 for(const file of readdirSync(directory).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL(file,directory),'utf8'))
 const db=createD1Prisma(sqliteBinding(sqlite));t.after(async()=>{await db.$disconnect();sqlite.close()})
 const actor=randomUUID()
 await db.$transaction(async tx=>{
  for(const code of ['MANAGER','GUIDE'])await tx.role.create({data:{code,name:code}})
  await tx.permission.create({data:{code:'users.invite',description:'Invite'}})
  await tx.rolePermission.create({data:{roleCode:'MANAGER',permissionCode:'users.invite'}})
  await tx.authUser.create({data:{id:actor,email:'manager@example.test',name:'Manager',emailVerified:true}})
  await tx.userProfile.create({data:{id:actor,displayName:'Manager',roles:{create:{roleCode:'MANAGER',scope:'COMPANY'}}}})
 })
 const email=randomUUID()+'@example.test',invite=await createInvitation(db,actor,{email,roleCode:'GUIDE',department:'GUIDE'})
 const mail=await sendEmployeeInvitation(db,environment,invite)
 assert.equal(mail.delivery,'LOCAL_MAIL');assert.equal(mail.invitationCode,undefined)
 const exchange=await exchangeEmployeeInvite(db,invite.invitationCode),user=exchange.session.user
 const sessions=new SessionStore(db),cookie=await sessions.create(exchange.session,'onboarding'),req={headers:{cookie:'gv_session='+cookie}}
 const auth=await sessions.authenticated(req)
 return {db,sqlite,actor,email,invite,user,sessions,req,auth,provider:createD1AuthProvider(db,environment)}
}
function transportFor({friend=true,identity={},beforeFriend}={}){
 const calls=[]
 const transport=async(url,options)=>{
  assert.equal(options.redirect,'manual','Workers-compatible transport must reject redirects without following them')
  calls.push(url);const body=new URLSearchParams(options.body)
  if(url.endsWith('/token'))return Response.json({access_token:'fake-access',id_token:'fake-id'})
  if(url.endsWith('/verify'))return Response.json({iss:'https://access.line.me',aud:lineConfig.channelId,nonce:body.get('nonce'),exp:Date.now()/1000+600,sub:'U'+'1'.repeat(32),name:'LINE nickname',...identity})
  if(url.endsWith('/status')){await beforeFriend?.();return Response.json({friendFlag:friend})}
  if(url.endsWith('/revoke'))return Response.json({})
  assert.fail('Unexpected external URL')
 }
 return {transport,calls}
}
async function ready(f){await saveEmployeeInformation(f.db,f.user,info);await saveEmployeePassword(f.db,f.user,{password,confirmPassword:password})}
async function start(f,transport){const login=createStaffLogin(f.db,lineConfig,transport);const begun=await login.start(f.user,f.auth.entry.session.webSessionId);const url=new URL(begun.redirectUrl);return {login,url,input:{state:url.searchParams.get('state'),code:'fixture-code'}}}
test('employee flow persists each step and atomically activates only after verified LINE friendship',async t=>{
 const f=await fixture(t)
 assert.equal((await readEmployeeOnboarding(f.db,f.user)).state,'EMAIL_VERIFIED')
 await assert.rejects(()=>exchangeEmployeeInvite(f.db,f.invite.invitationCode),{code:'INVITATION_INVALID'})
 await assert.rejects(()=>resolveMembership(f.db,f.user),{code:'ONBOARDING_REQUIRED'})
 await assert.rejects(()=>saveEmployeePassword(f.db,f.user,{password,confirmPassword:password}),{code:'ONBOARDING_STEP_CONFLICT'})
 await assert.rejects(()=>saveEmployeeInformation(f.db,f.user,{...info,roleCode:'MANAGER'}),{code:'INVALID_EMPLOYEE_INFORMATION'})
 const saved=await saveEmployeeInformation(f.db,f.user,info)
 assert.equal(saved.state,'PROFILE_COMPLETED');assert.equal(saved.profile.primaryPhone,'+66812345678')
 await assert.rejects(()=>saveEmployeePassword(f.db,f.user,{password,confirmPassword:'different'}),{code:'PASSWORD_MISMATCH'})
 await saveEmployeePassword(f.db,f.user,{password,confirmPassword:password})
 assert.equal((await f.db.userProfile.findUnique({where:{id:f.user.id}})),null)
 const resumed=await f.provider.login(f.email,password)
 assert.equal((await readEmployeeOnboarding(f.db,resumed.user)).state,'PASSWORD_SET')
 assert.equal((await new SessionStore(f.db).authenticated(f.req)).entry.purpose,'onboarding')
 const {transport,calls}=transportFor(),flow=await start(f,transport)
 assert.equal(flow.url.searchParams.get('scope'),'openid profile');assert.equal(flow.url.searchParams.get('code_challenge_method'),'S256');assert.equal(flow.url.searchParams.get('bot_prompt'),'aggressive')
 assert.equal((await flow.login.finish(f.user,f.auth.entry.session.webSessionId,flow.input)).state,'ACTIVE')
 const profile=await resolveMembership(f.db,f.user)
 assert.equal(profile.province,'Phuket');assert.equal(profile.district,'Mueang Phuket');assert.equal(profile.subdistrict,'Rawai');assert.equal(profile.postalCode,'83130');assert.equal(profile.houseNumber,'12');
 assert.equal(profile.firstName,'Legal');assert.equal(profile.lastName,'Employee');assert.equal(profile.displayName,'Legal Employee')
 assert.deepEqual(profile.roles.map(r=>r.roleCode),['GUIDE'])
 assert.equal((await f.sessions.authenticated(f.req)).entry.purpose,'workspace')
 assert.equal((await f.db.staffLineBinding.findFirst()).displayName,'LINE nickname')
 assert.equal((await f.db.employeeOnboarding.findFirst()).completedAt instanceof Date,true)
 assert.ok(calls.at(-1).endsWith('/revoke'))
 await assert.rejects(()=>flow.login.finish(f.user,f.auth.entry.session.webSessionId,flow.input))
 const audits=JSON.stringify(await f.db.auditEvent.findMany())
 for(const secret of [password,f.invite.invitationCode,'fake-access','fake-id',flow.input.state])assert.equal(audits.includes(secret),false)
})
test('LINE state is session-bound, one-use, and missing friendship never activates',async t=>{
 const f=await fixture(t);await ready(f)
 const {transport}=transportFor({friend:false}),flow=await start(f,transport)
 await assert.rejects(()=>flow.login.finish(f.user,'wrong-session',flow.input),{code:'LINE_LOGIN_INVALID'})
 await assert.rejects(()=>flow.login.finish(f.user,f.auth.entry.session.webSessionId,flow.input),{code:'LINE_FRIEND_REQUIRED'})
 assert.equal(await f.db.userProfile.findUnique({where:{id:f.user.id}}),null)
 assert.equal((await readEmployeeOnboarding(f.db,f.user)).state,'PASSWORD_SET')
 await assert.rejects(()=>flow.login.finish(f.user,f.auth.entry.session.webSessionId,flow.input),{code:'LINE_LOGIN_EXPIRED'})
})
test('revocation during LINE provider calls prevents activation and stale session resume',async t=>{
 const f=await fixture(t);await ready(f)
 const {transport}=transportFor({beforeFriend:()=>changeInvitation(f.db,f.actor,f.invite.invitation.id,'revoke')})
 const flow=await start(f,transport)
 await assert.rejects(()=>flow.login.finish(f.user,f.auth.entry.session.webSessionId,flow.input),{code:'INVITATION_INVALID'})
 assert.equal(await f.db.userProfile.findUnique({where:{id:f.user.id}}),null)
 await assert.rejects(()=>readEmployeeOnboarding(f.db,f.user),{code:'INVITATION_INVALID'})
})
test('OIDC nonce/audience mismatch is rejected before friendship lookup',async t=>{
 const f=await fixture(t);await ready(f)
 for(const identity of [{aud:'wrong'},{nonce:'wrong'},{iss:'https://attacker.invalid'},{exp:1}]){
  const {transport,calls}=transportFor({identity}),flow=await start(f,transport)
  await assert.rejects(()=>flow.login.finish(f.user,f.auth.entry.session.webSessionId,flow.input),{code:'LINE_LOGIN_INVALID'})
  assert.equal(calls.some(url=>url.endsWith('/status')),false)
 }
})
test('expired/renewed email grants and removed inviter authority fail closed',async t=>{
 const f=await fixture(t)
 const renewal=await changeInvitation(f.db,f.actor,f.invite.invitation.id,'renew')
 await sendEmployeeInvitation(f.db,environment,renewal)
 const result=await exchangeEmployeeInvite(f.db,renewal.invitationCode)
 assert.equal(result.session.user.id,f.user.id)
 await f.db.userProfile.update({where:{id:f.actor},data:{status:'SUSPENDED'}})
 await assert.rejects(()=>saveEmployeeInformation(f.db,f.user,info),{code:'INVITATION_UNAVAILABLE'})
})
test('new staff fields are strict and local LINE config cannot inherit live credentials',()=>{
 for(const input of [{...info,firstName:''},{...info,houseNumber:''},{...info,primaryPhone:'abc'},{...info,lastName:'a'.repeat(50)}])assert.ok(Object.keys(validateEmployeeInformation(input).errors).length)
 assert.equal(staffLoginSettings({...environment,LINE_STAFF_LOGIN_ENABLED:'true'}).available,false)
 assert.throws(()=>validateInvitation({email:'a@example.test',roleCode:'GUIDE',department:'GUIDE',firstName:'Injected'},{}),{code:'INVALID_INVITATION_FIELDS'})
})

test('LINE redirects fail closed before credentials can reach another origin',async t=>{
 const f=await fixture(t);await ready(f);let calls=0
 const flow=await start(f,async(_url,options)=>{calls++;assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://example.invalid/collect'}})})
 await assert.rejects(()=>flow.login.finish(f.user,f.auth.entry.session.webSessionId,flow.input),{code:'LINE_LOGIN_UNAVAILABLE'})
 assert.equal(calls,1);assert.equal(await f.db.userProfile.findUnique({where:{id:f.user.id}}),null)
})

test('structured address hierarchy is validated and server computes the postal code',async t=>{
 const f=await fixture(t)
 await assert.rejects(()=>saveEmployeeInformation(f.db,f.user,{...info,district:'Wrong district'}),{code:'INVALID_EMPLOYEE_INFORMATION'})
 await assert.rejects(()=>saveEmployeeInformation(f.db,f.user,{...info,mapUrl:'javascript:alert(1)'}),{code:'INVALID_EMPLOYEE_INFORMATION'})
 const result=await saveEmployeeInformation(f.db,f.user,{...info,postalCode:'00000'})
 assert.equal(result.profile.postalCode,'83130')
 assert.equal((await readEmployeeOnboarding(f.db,f.user)).profile.houseNumber,'12')
})
test('legacy in-progress address resumes information without losing saved password',async t=>{
 const f=await fixture(t);await ready(f)
 const credential=await f.db.authAccount.findFirst({where:{userId:f.user.id}})
 f.sqlite.exec('UPDATE "EmployeeOnboarding" SET "addressDetails"=NULL')
 const resumed=await readEmployeeOnboarding(f.db,f.user)
 assert.equal(resumed.state,'EMAIL_VERIFIED');assert.ok(resumed.previousAddress)
 await saveEmployeeInformation(f.db,f.user,info)
 assert.equal((await readEmployeeOnboarding(f.db,f.user)).state,'PASSWORD_SET')
 assert.equal((await f.db.authAccount.findFirst({where:{userId:f.user.id}})).password,credential.password)
})
