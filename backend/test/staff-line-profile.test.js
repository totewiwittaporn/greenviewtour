import test from 'node:test'
import assert from 'node:assert/strict'
import {createLinkedLineProfileReader} from '../src/platform/line/staff-profile.js'
import {createStaffLineClient,safeLinePictureUrl} from '../src/platform/line/staff-client.js'
const uid='U'+'a'.repeat(32),config={enabled:true,mode:'live',channelKey:'live:profile',accessToken:'fixture'}
function fixture(){
 const state={binding:{status:'LINKED',lineUserId:uid,version:1,displayName:'Snapshot'},active:true}
 const tx={userProfile:{findUnique:async()=>({status:state.active?'ACTIVE':'SUSPENDED',roles:[{}]})},authUser:{findUnique:async()=>({emailVerified:true})},staffLineBinding:{findUnique:async()=>state.binding?{...state.binding}:null}}
 return {state,db:{$transaction:async fn=>fn(tx)}}
}
test('provider profile keeps string caller compatibility and adds safe presentation details',async()=>{
 const client=createStaffLineClient(config,async()=>Response.json({userId:uid,displayName:' LINE\u0000 Name ',pictureUrl:'https://profile.line-scdn.net/photo'}))
 assert.equal(await client.profile(uid),'LINE Name')
 assert.deepEqual(await client.profileDetails(uid),{displayName:'LINE Name',pictureUrl:'https://profile.line-scdn.net/photo'})
})
test('only official exact HTTPS image hosts pass',()=>{
 for(const value of ['http://profile.line-scdn.net/a','https://profile.line-scdn.net.evil.test/a','https://evil.test/a','data:image/png,abc','https://user:pass@profile.line-scdn.net/a','https://obs.line-apps.com:444/a','https://obs.line-apps.com/a#x'])assert.equal(safeLinePictureUrl(value),null)
 assert.equal(safeLinePictureUrl('https://obs.line-apps.com/a'),'https://obs.line-apps.com/a')
 assert.equal(safeLinePictureUrl('https://sprofile.line-scdn.net/a'),'https://sprofile.line-scdn.net/a')
 assert.equal(safeLinePictureUrl('https://sprofile.line-scdn.net.evil.test/a'),null)
})
test('deduplicates simultaneous requests and caches success without writing employee data',async()=>{
 const {state,db}=fixture(),before=structuredClone(state),read=createLinkedLineProfileReader();let calls=0
 const client={profileDetails:async()=>{calls++;return {displayName:'Current',pictureUrl:'https://profile.line-scdn.net/a'}}}
 const values=await Promise.all([read(db,'staff',config,client),read(db,'staff',config,client)])
 assert.equal(calls,1);assert.equal(values[0].displayName,'Current');assert.deepEqual(state,before)
 await read(db,'staff',config,client);assert.equal(calls,1)
})
test('failure has short cached snapshot fallback then retries provider',async()=>{
 const {db}=fixture();let clock=0,calls=0;const read=createLinkedLineProfileReader({now:()=>clock}),client={profileDetails:async()=>{calls++;throw Error('unavailable')}}
 assert.deepEqual(await read(db,'staff',config,client),{displayName:'Snapshot',pictureUrl:null})
 clock=1000;await read(db,'staff',config,client);assert.equal(calls,1)
 clock=30001;await read(db,'staff',config,client);assert.equal(calls,2)
})
test('unlink during provider fetch and blocked cached binding never expose stale profile',async()=>{
 const {db,state}=fixture(),read=createLinkedLineProfileReader()
 assert.equal(await read(db,'staff',config,{profileDetails:async()=>{state.binding.status='UNLINKED';state.binding.lineUserId=null;state.binding.version++;return {displayName:'Old'}}}),null)
 state.binding={status:'BLOCKED',lineUserId:uid,version:3,displayName:'Old'}
 assert.equal(await read(db,'staff',config,{profileDetails:async()=>assert.fail('blocked fetch')}),null)
})
test('ordinary Local has no profile transport; suspended staff cannot use cached identity',async()=>{
 const {db,state}=fixture(),read=createLinkedLineProfileReader(),client={profileDetails:async()=>({displayName:'Current'})}
 assert.equal(await read(db,'staff',{...config,enabled:false},client),null)
 await read(db,'staff',config,client);state.active=false
 await assert.rejects(()=>read(db,'staff',config,client),{code:'ACCOUNT_UNAVAILABLE'})
})
test('GET staff LINE API returns final unlink status after slow provider fetch',async()=>{
 const {staffLineApi}=await import('../src/platform/line/staff-api.js')
 const {state,db}=fixture()
 const transaction=db.$transaction
 db.$transaction=fn=>transaction(tx=>fn({...tx,staffLineRequest:{findFirst:async()=>null}}))
 const result=await staffLineApi(new Request('https://backoffice.greenviewtour.com/api/me/line'),{db,config:{...config,channelKey:'live:api-race'},sessions:{authenticated:async()=>({user:{id:'race-staff'},entry:{purpose:'workspace',session:{webSessionId:'session'}}})},client:{profileDetails:async()=>{state.binding={...state.binding,status:'UNLINKED',lineUserId:null,displayName:null,version:2};return {displayName:'Old LINE',pictureUrl:'https://profile.line-scdn.net/old'}}}})
 assert.equal(result.status,'UNLINKED');assert.equal(result.version,2);assert.equal(result.displayName,null);assert.equal(result.linkedLineProfile,null)
})
