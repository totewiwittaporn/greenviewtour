import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {prepareOwnerBootstrap} from '../src/platform/auth/cloudflare/owner-bootstrap.js'
const options={email:'owner@example.test',displayName:"Owner O'Neil",origin:'https://staff.example.test',accountId:'a'.repeat(32),databaseId:'11111111-1111-4111-8111-111111111111',databaseName:'greenviewtour-production',environment:'production'}
function fixture(){
 const db=new DatabaseSync(':memory:')
 db.exec('PRAGMA foreign_keys=ON')
 const baseline=readFileSync(new URL('../prisma-d1/migrations/0001_baseline.sql',import.meta.url),'utf8')
 for(const table of ['UserProfile','Role','UserRole','Invitation','InvitationRole','AuditEvent']){
  const create=baseline.match(new RegExp(String.raw`CREATE TABLE "${table}" \([\s\S]*?\n\);`))
  assert.ok(create,table);db.exec(create[0])
 }
 const auth=readFileSync(new URL('../prisma-d1/migrations/0007_local_auth_sessions.sql',import.meta.url),'utf8')
 db.exec(auth.match(/CREATE TABLE "AuthUser" \([\s\S]*?\n\);/)[0])
 db.exec("CREATE TABLE D1Identity(id TEXT PRIMARY KEY,email TEXT NOT NULL); CREATE UNIQUE INDEX invitation_email ON Invitation(email); INSERT INTO Role VALUES('ADMIN_MANAGER','Owner')")
 return db
}
const count=(db,table)=>db.prepare('SELECT COUNT(*) AS n FROM '+table).get().n
function existingInvite(db,{email='pending@example.test',role='ADMIN_MANAGER',expiresAt=new Date(Date.now()+3600000).toISOString(),revokedAt=null}={}){
 db.prepare('INSERT INTO Invitation(id,email,tokenHash,displayName,createdAt,expiresAt,revokedAt) VALUES(?,?,?,?,?,?,?)').run('existing',email,'hash','Pending',new Date().toISOString(),expiresAt,revokedAt)
 if(role)db.prepare('INSERT INTO InvitationRole VALUES(?,?,?)').run('existing',role,'COMPANY')
}
test('bootstrap creates one system invitation with role and audit atomically; no account or password',()=>{
 const db=fixture(),result=prepareOwnerBootstrap(options)
 try{
  db.exec(result.sql)
  const invite=db.prepare('SELECT * FROM Invitation').get(),role=db.prepare('SELECT * FROM InvitationRole').get()
  assert.equal(invite.email,options.email);assert.equal(invite.displayName,options.displayName);assert.equal(invite.createdById,null)
  assert.equal(role.roleCode,'ADMIN_MANAGER');assert.equal(role.scope,'COMPANY')
  assert.equal(new Date(invite.expiresAt)-new Date(invite.createdAt),72*3600000)
  assert.equal(invite.tokenHash,createHash('sha256').update(result.onboardingLink.split('invitation=')[1]).digest('hex'))
  assert.equal(count(db,'AuthUser'),0);assert.equal(count(db,'UserProfile'),0);assert.equal(count(db,'AuditEvent'),1)
  assert.equal(count(db,'sqlite_master')>0,true)
  assert.throws(()=>db.exec(result.sql));assert.equal(count(db,'Invitation'),1)
 }finally{db.close()}
})
for(const scenario of ['owner','pending','auth','directory','invitation','missing-role','expired-artifact','audit-failure'])test('refuses '+scenario+' without any partial invitation, role or audit',()=>{
 const db=fixture()
 try{
  if(scenario==='owner')db.exec("INSERT INTO UserProfile(id,displayName,updatedAt,status) VALUES('old','Old','2026-01-01','SUSPENDED'); INSERT INTO UserRole VALUES('old','ADMIN_MANAGER','COMPANY')")
  if(scenario==='pending')existingInvite(db)
  if(scenario==='auth')db.prepare('INSERT INTO AuthUser(id,name,email,emailVerified,updatedAt) VALUES(?,?,?,?,?)').run('old','Old',options.email,1,new Date().toISOString())
  if(scenario==='directory')db.prepare('INSERT INTO D1Identity VALUES(?,?)').run('old',options.email)
  if(scenario==='invitation')existingInvite(db,{email:options.email,role:null})
  if(scenario==='missing-role')db.exec('DELETE FROM Role')
  if(scenario==='audit-failure')db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON AuditEvent BEGIN SELECT RAISE(ABORT,'AUDIT_FAILED'); END")
  const tables=['Invitation','InvitationRole','AuditEvent','AuthUser','UserProfile','UserRole']
  const before=tables.map(table=>count(db,table))
  const result=prepareOwnerBootstrap({...options,...(scenario==='expired-artifact'?{now:new Date('2000-01-01')}: {})})
  assert.throws(()=>db.exec(result.sql))
  assert.deepEqual(tables.map(table=>count(db,table)),before)
  db.exec(result.metadata.cleanupSql)
 }finally{db.close()}
})
test('expired or revoked invitation to a different email does not prevent bootstrap',()=>{
 for(const patch of [{expiresAt:'2000-01-01T00:00:00+00:00'},{revokedAt:new Date().toISOString()}]){
  const db=fixture()
  try{existingInvite(db,patch);db.exec(prepareOwnerBootstrap(options).sql);assert.equal(count(db,'Invitation'),2)}finally{db.close()}
 }
})
test('explicit production target and HTTPS origin required; bad inputs fail before artifacts',()=>{
 for(const patch of [{environment:'local'},{databaseId:'placeholder'},{accountId:''},{databaseName:'unrelated'},{email:'bad'},{displayName:''},{origin:'http://staff.example.test'},{origin:'https://staff.example.test/path'},{origin:'https://user:password@staff.example.test'}])assert.throws(()=>prepareOwnerBootstrap({...options,...patch}))
 const result=prepareOwnerBootstrap(options)
 assert.ok(!result.sql.includes(result.onboardingLink.split('invitation=')[1]))
 assert.equal(result.metadata.databaseId,options.databaseId)
})
