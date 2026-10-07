import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {registerD1Client} from '../src/platform/database/d1-runtime.js'
import {isD1OwnerPage} from '../src/backoffice/dashboard/overview/owner-read.js'
import {dashboardOverview} from '../src/backoffice/dashboard/overview/service.js'
test('owner page reads one fresh primary minimal authorization snapshot; role scope and suspension changes are respected',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec("CREATE TABLE UserProfile(id TEXT,status TEXT);CREATE TABLE UserRole(userId TEXT,roleCode TEXT,scope TEXT);INSERT INTO UserProfile VALUES('owner','ACTIVE');INSERT INTO UserRole VALUES('owner','ADMIN_MANAGER','COMPANY')")
 let calls=0
 const binding={withSession(mode){assert.equal(mode,'first-primary');return this},prepare(query){assert.doesNotMatch(query,/Permission|displayName|email/);return {bind(...args){return {first:async()=>{calls++;return sql.prepare(query).get(...args)}}}}}}
 const db=registerD1Client({$transaction:()=>assert.fail('owner page must not load permission graphs')},binding)
 try{
  const result=await dashboardOverview(db,'owner',new Date('2026-10-03T00:00:00Z'),{surface:'page'})
  assert.equal(calls,1);assert.equal(result.scope,'Company');assert.deepEqual(result.widgets,[]);assert.equal(result.systemOverview.api,'RESPONDING')
  sql.exec("UPDATE UserRole SET scope='SELF'");assert.equal(await isD1OwnerPage(db,'owner'),false)
  sql.exec("UPDATE UserRole SET scope='COMPANY';UPDATE UserProfile SET status='SUSPENDED'");assert.equal(await isD1OwnerPage(db,'owner'),false)
  sql.exec("UPDATE UserProfile SET status='ACTIVE';UPDATE UserRole SET roleCode='MANAGER'");assert.equal(await isD1OwnerPage(db,'owner'),false)
  assert.equal(await isD1OwnerPage(db,'missing'),false);assert.equal(calls,5)
 }finally{sql.close()}
})
