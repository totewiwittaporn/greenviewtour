import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {registerD1Client} from '../src/platform/database/d1-runtime.js'
import {SessionStore} from '../src/platform/auth/sessions.js'
test('D1 session uses one fresh primary SQL snapshot; revocation and suspension are never cached',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=OFF')
 sql.exec(readFileSync(new URL('../prisma-d1/migrations/0007_local_auth_sessions.sql',import.meta.url),'utf8').split('-- Durable throttling')[0]);sql.exec('CREATE TABLE UserProfile(id TEXT,status TEXT)')
 const raw='a'.repeat(64),id=createHash('sha256').update(raw).digest('hex'),future=new Date(Date.now()+60000).toISOString()
 sql.prepare('INSERT INTO AuthUser(id,name,email,emailVerified,updatedAt) VALUES(?,?,?,?,?)').run('u','User','u@example.test',1,future)
 sql.prepare('INSERT INTO AuthSession(id,token,expiresAt,updatedAt,userId) VALUES(?,?,?,?,?)').run('s','private-token',future,future,'u')
 sql.prepare('INSERT INTO WebSession(id,userId,authSessionId,purpose,expiresAt) VALUES(?,?,?,?,?)').run(id,'u','s','workspace',future)
 sql.exec("INSERT INTO UserProfile VALUES('u','ACTIVE')")
 let queries=0
 const binding={withSession(mode){assert.equal(mode,'first-primary');return this},prepare(query){return {bind(...args){return {first:async()=>{queries++;return sql.prepare(query).get(...args)||null}}}}}}
 const db=registerD1Client({webSession:{},$transaction:()=>assert.fail('D1 session must use single SQL snapshot')},binding),sessions=new SessionStore(db),request={headers:{cookie:'gv_session='+raw}}
 try{
  const result=await sessions.authenticated(request);assert.equal(result.user.id,'u');assert.equal(queries,1);assert.ok(!JSON.stringify(result).includes('private-token'))
  sql.exec("UPDATE UserProfile SET status='SUSPENDED'");await assert.rejects(()=>sessions.authenticated(request),{code:'ACCOUNT_UNAVAILABLE'});assert.equal(queries,2)
  sql.exec("UPDATE UserProfile SET status='ACTIVE'; DELETE FROM AuthSession");await assert.rejects(()=>sessions.authenticated(request),{code:'SESSION_EXPIRED'});assert.equal(queries,3)
 }finally{sql.close()}
})
