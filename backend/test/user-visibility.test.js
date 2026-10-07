import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync} from 'node:fs'
import {userVisibility,canSeeUser,userVisibilityWhere} from '../src/modules/identity-access/user-visibility.js'
import {listD1Users} from '../src/modules/identity-access/list-users-d1.js'
import {managementScope,canEditProfile} from '../src/modules/identity-access/user-management.js'
import {canConfigureAccess} from '../src/modules/identity-access/user-access.js'
const person=(id,codes,department='GUIDE',read=true)=>({id,status:'ACTIVE',department,roles:codes.map(roleCode=>({roleCode,scope:['MANAGER','ADMIN_MANAGER'].includes(roleCode)?'COMPANY':'SELF',role:{permissions:read?[{permissionCode:'users.read'},{permissionCode:'users.profile.edit'}]:[]}}))})
const owner=person('owner',['ADMIN_MANAGER']),manager=person('manager',['MANAGER']),head=person('head',['HEAD_GUIDE']),guide=person('guide',['GUIDE']),assistant=person('assistant',['ASSISTANT_TOUR_GUIDE'])
test('owner is self-visible and hidden to every other actor, including another owner',()=>{
 assert.equal(canSeeUser(owner,owner),true)
 for(const actor of [manager,head,guide,person('other-owner',['ADMIN_MANAGER'])]){assert.equal(canSeeUser(actor,owner),false);assert.equal(canEditProfile(actor,owner),false);assert.equal(canConfigureAccess(actor,owner),false)}
})
test('highest role prevents lower-grant exposure; heads stay in department; ordinary ranks cross department',()=>{
 assert.equal(canSeeUser(manager,person('peer',['MANAGER'])),true)
 assert.equal(canSeeUser(head,person('other-head',['HEAD_GUIDE'])),true)
 assert.equal(canSeeUser(head,person('driver',['DRIVER'],'DRIVER')),false)
 assert.equal(canSeeUser(head,person('multi',['MANAGER','GUIDE'])),false)
 assert.equal(canSeeUser(guide,person('driver',['DRIVER'],'DRIVER')),true)
 assert.equal(canSeeUser(guide,assistant),true);assert.equal(canSeeUser(assistant,guide),false)
 assert.equal(canSeeUser(guide,person('unknown',['GUIDE','FUTURE_ROLE'])),false)
 assert.equal(canSeeUser(person('unknown',['FUTURE_ROLE']),guide),false)
 assert.equal(canSeeUser(person('unknown',['FUTURE_ROLE']),person('unknown',['FUTURE_ROLE'])),true)
 assert.equal(managementScope(person('plain',['GUIDE'],'GUIDE',false)),null)
 assert.equal(canEditProfile(guide,assistant),false)
 assert.ok(userVisibilityWhere(head).OR)
})
function sqliteFixture(){
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=OFF')
 const baseline=readFileSync(new URL('../prisma-d1/migrations/0001_baseline.sql',import.meta.url),'utf8')
 for(const table of ['UserProfile','UserRole'])db.exec(baseline.match(new RegExp(String.raw`CREATE TABLE "${table}" \([\s\S]*?\n\);`))[0])
 if(!db.prepare('PRAGMA table_info(UserProfile)').all().some(row=>row.name==='nickname'))db.exec('ALTER TABLE UserProfile ADD COLUMN nickname TEXT')
 db.exec('CREATE TABLE D1Identity(id TEXT,email TEXT,email_confirmed_at TEXT,created_at TEXT,last_sign_in_at TEXT)')
 const people=[owner,manager,head,guide,assistant,person('driver',['DRIVER'],'DRIVER'),person('multi',['MANAGER','GUIDE']),person('unknown',['GUIDE','FUTURE_ROLE'])]
 for(const p of people){db.prepare('INSERT INTO UserProfile(id,"displayName",department,"updatedAt") VALUES(?,?,?,?)').run(p.id,p.id,p.department,'2026-10-03');db.prepare('INSERT INTO D1Identity VALUES(?,?,?,?,?)').run(p.id,p.id+'@example.test','2026-10-03','2026-10-03',null);for(const role of p.roles)db.prepare('INSERT INTO UserRole VALUES(?,?,?)').run(p.id,role.roleCode,role.scope)}
 const client={$transaction:fn=>fn(client),$queryRaw:async query=>db.prepare(query.sql).all(...query.values)}
 return {db,client}
}
test('SQL visibility applies before summary, search, pagination and direct record lookup',async()=>{
 const {db,client}=sqliteFixture()
 try{
  const visibility=userVisibility(manager)
  const list=await listD1Users(client,{visibility,pageSize:2,page:99})
  assert.equal(list.total,6);assert.equal(list.summary.total,6);assert.equal(list.page,3);assert.equal(list.users.length,2)
  assert.equal((await listD1Users(client,{visibility,search:'owner'})).total,0)
  await assert.rejects(()=>listD1Users(client,{visibility,recordId:'owner'}),{code:'NOT_FOUND'})
  const own=await listD1Users(client,{visibility:userVisibility(owner),recordId:'owner'});assert.equal(own.users[0].id,'owner')
  const team=await listD1Users(client,{visibility:userVisibility(head)});assert.deepEqual(team.users.map(p=>p.id).sort(),['assistant','guide','head'])
  const ordinary=await listD1Users(client,{visibility:userVisibility(guide)});assert.deepEqual(ordinary.users.map(p=>p.id).sort(),['assistant','driver','guide'])
  await assert.rejects(()=>listD1Users(client,{}),{code:'PERMISSION_DENIED'})
 }finally{db.close()}
})
