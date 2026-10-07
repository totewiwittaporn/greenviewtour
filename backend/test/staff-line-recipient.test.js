import test from 'node:test'
import assert from 'node:assert/strict'
import {verifiedStaffLineRecipient} from '../src/modules/identity-access/staff-line.js'
import {staffLineSettings,staffOa} from '../src/platform/line/staff-config.js'
const userId='staff-fixture',lineUserId='U'+'a'.repeat(32)
const config={enabled:true,mode:'live',channelKey:`live:${staffOa.providerId}:${staffOa.channelId}`}
function fixture(){
 const state={profile:{id:userId,status:'ACTIVE',roles:[{roleCode:'GUIDE'}],lineId:'editable-contact-is-not-identity'},auth:{id:userId,emailVerified:true,disabled:false},binding:{userId,channelKey:config.channelKey,status:'LINKED',lineUserId},reads:[]}
 const tx={
  userProfile:{findUnique:async({where,include})=>{state.reads.push('profile');assert.deepEqual(include,{roles:true});return state.profile?.id===where.id?state.profile:null}},
  authUser:{findUnique:async({where})=>{state.reads.push('auth');return state.auth?.id===where.id?state.auth:null}},
  staffLineBinding:{findUnique:async({where})=>{state.reads.push('binding');const key=where.channelKey_userId;assert.ok(key);return state.binding?.userId===key.userId&&state.binding?.channelKey===key.channelKey?state.binding:null}},
 }
 const db={$transaction:async(run,options)=>{assert.deepEqual(options,{readOnly:true});return run(tx)}}
 return {state,db}
}
test('verified staff recipient uses the protected channel binding and rechecks current roles on every resolution',async()=>{
 const {state,db}=fixture()
 assert.equal(await verifiedStaffLineRecipient(db,userId,config),lineUserId)
 assert.deepEqual(state.reads,['profile','auth','binding'])
 state.profile.roles=[];state.reads=[]
 await assert.rejects(()=>verifiedStaffLineRecipient(db,userId,config),{code:'ACCOUNT_UNAVAILABLE',status:403})
 assert.deepEqual(state.reads,['profile'])
 state.profile.roles=[{roleCode:'DRIVER'}]
 assert.equal(await verifiedStaffLineRecipient(db,userId,config),lineUserId)
 assert.equal(state.profile.roles[0].roleCode,'DRIVER')
})
test('unlinked, blocked, suspended and missing staff bindings cannot resolve a delivery recipient',async()=>{
 for(const value of [null,...['UNLINKED','BLOCKED','SUSPENDED'].map(status=>({status,lineUserId})),{status:'LINKED',lineUserId:null}]){
  const {state,db}=fixture();state.binding=value?{...state.binding,...value}:null
  await assert.rejects(()=>verifiedStaffLineRecipient(db,userId,config),{code:'LINE_ACCOUNT_NOT_LINKED',status:403})
 }
})
test('inactive staff, removed staff and unavailable or unverified Auth cannot use an existing binding',async()=>{
 for(const change of [state=>{state.profile=null},state=>{state.profile.status='SUSPENDED'},state=>{state.auth=null},state=>{state.auth.emailVerified=false},state=>{state.auth.disabled=true},state=>{state.auth.bannedUntil=new Date(Date.now()+60000)}]){
  const {state,db}=fixture();change(state)
  await assert.rejects(()=>verifiedStaffLineRecipient(db,userId,config),{code:'ACCOUNT_UNAVAILABLE',status:403})
  assert.equal(state.reads.includes('binding'),false)
 }
})
test('a binding from another provider/channel, test namespace or staff account is never a fallback recipient',async()=>{
 for(const changed of [{channelKey:'live:other-provider:other-channel'},{channelKey:'test:'+staffOa.channelId},{userId:'another-staff'}]){
  const {state,db}=fixture();Object.assign(state.binding,changed)
  await assert.rejects(()=>verifiedStaffLineRecipient(db,userId,config),{code:'LINE_ACCOUNT_NOT_LINKED',status:403})
 }
 const {db}=fixture()
 await assert.rejects(()=>verifiedStaffLineRecipient(db,userId,{...config,channelKey:'live:other-channel'}),{code:'LINE_ACCOUNT_NOT_LINKED',status:403})
})
test('disabled, simulated and ordinary Local configurations fail closed before reading identity or binding data',async()=>{
 const db={$transaction:()=>assert.fail('Disabled delivery must not read any recipient')}
 for(const value of [{...config,enabled:false},{...config,mode:'test'},{...config,mode:'simulation'},{...config,mode:'disabled'},staffLineSettings({APP_ENV:'local',LINE_STAFF_ENABLED:'true'})]){
  await assert.rejects(()=>verifiedStaffLineRecipient(db,userId,value),{code:'LINE_DELIVERY_DISABLED',status:403})
 }
})
