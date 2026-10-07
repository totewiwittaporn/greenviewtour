import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {registerD1Client} from '../src/platform/database/d1-runtime.js'
import {createStaffLineOnboarding} from '../src/platform/line/staff-onboarding.js'
import {staffLineApi} from '../src/platform/line/staff-api.js'
import {staffOa} from '../src/platform/line/staff-config.js'
const channel='live:'+staffOa.providerId+':'+staffOa.channelId
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(`CREATE TABLE UserProfile(id TEXT,status TEXT);CREATE TABLE UserRole(userId TEXT,roleCode TEXT);CREATE TABLE AuthUser(id TEXT,emailVerified INTEGER,disabled INTEGER,bannedUntil TEXT);CREATE TABLE StaffLineBinding(id TEXT,userId TEXT,channelKey TEXT,lineUserId TEXT,displayName TEXT,status TEXT,version INTEGER,linkedAt TEXT);CREATE TABLE StaffLineRequest(id TEXT,userId TEXT,channelKey TEXT,status TEXT,expiresAt TEXT,createdAt TEXT);INSERT INTO UserProfile VALUES('staff','ACTIVE');INSERT INTO UserRole VALUES('staff','BOOKING');INSERT INTO AuthUser VALUES('staff',1,0,NULL)`)
 sql.prepare('INSERT INTO StaffLineBinding VALUES(?,?,?,?,?,?,?,?)').run('binding','staff',channel,'U'+'a'.repeat(32),'Snapshot','LINKED',1,new Date().toISOString())
 let queries=0
 const binding={withSession(mode){assert.equal(mode,'first-primary');return this},prepare(query){return {bind(...args){return {first:async()=>{queries++;return sql.prepare(query).get(...args)||null}}}}}}
 return {sql,queries:()=>queries,db:registerD1Client({$transaction:()=>assert.fail('no multiquery planner needed')},binding)}
}
test('onboarding uses one fresh SQL statement and cannot cache an unlink or owner role revocation',async()=>{
 const {sql,db,queries}=fixture(),gate=createStaffLineOnboarding(db,{APP_ENV:'production',LINE_STAFF_REQUIRED:'true',LINE_STAFF_SETUP_USER_ID:'staff'})
 try{
  assert.equal(await gate('staff'),false);assert.equal(queries(),1)
  sql.exec("UPDATE StaffLineBinding SET status='UNLINKED',lineUserId=NULL");assert.equal(await gate('staff'),true);assert.equal(queries(),2)
  sql.exec("UPDATE UserRole SET roleCode='ADMIN_MANAGER'");assert.equal(await gate('staff'),false)
  sql.exec("UPDATE UserRole SET roleCode='BOOKING'");assert.equal(await gate('staff'),true)
 }finally{sql.close()}
})
test('linked LINE API uses four bounded single snapshots and final unlink state wins',async()=>{
 const {sql,db,queries}=fixture(),config={enabled:true,mode:'live',channelKey:channel}
 try{
  const result=await staffLineApi(new Request('https://backoffice.greenviewtour.com/api/me/line'),{db,config,sessions:{authenticated:async()=>({user:{id:'staff'},entry:{purpose:'workspace',session:{webSessionId:'session'}}})},client:{profileDetails:async()=>{sql.exec("UPDATE StaffLineBinding SET status='UNLINKED',lineUserId=NULL,displayName=NULL,version=2");return {displayName:'Old'}}}})
  assert.equal(queries(),4);assert.equal(result.status,'UNLINKED');assert.equal(result.linkedLineProfile,null);assert.equal(result.displayName,null)
 }finally{sql.close()}
})

test('profile-only API uses two fresh binding snapshots and never loads latest request/settings',async()=>{
 const {sql,db,queries}=fixture(),config={enabled:true,mode:'live',channelKey:channel}
 try{
  sql.exec('UPDATE StaffLineBinding SET version=99')
  const result=await staffLineApi(new Request('https://backoffice.greenviewtour.com/api/me/line?view=profile'),{db,config,sessions:{authenticated:async()=>({user:{id:'staff'},entry:{purpose:'workspace',session:{webSessionId:'session'}}})},client:{profileDetails:async()=>({displayName:'Current',pictureUrl:'https://profile.line-scdn.net/a'})}})
  assert.equal(queries(),2);assert.deepEqual(Object.keys(result),['linkedLineProfile']);assert.equal(result.linkedLineProfile.displayName,'Current')
 }finally{sql.close()}
})
