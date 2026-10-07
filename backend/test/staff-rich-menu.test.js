import test from 'node:test'
import assert from 'node:assert/strict'
import {createStaffLineClient} from '../src/platform/line/staff-client.js'
import {syncStaffRichMenu} from '../src/platform/line/staff-rich-menu.js'
const user='U'+'a'.repeat(32),linked='richmenu-'+'a'.repeat(32),unlinked='richmenu-'+'b'.repeat(32)
const config={enabled:true,mode:'live',accessToken:'test',channelKey:'live:test',richMenuLinked:linked,richMenuUnlinked:unlinked}
function fixture(){
 const state={binding:{status:'LINKED',userId:'staff'},active:true}
 const tx={staffLineBinding:{findUnique:async()=>state.binding},userProfile:{findUnique:async()=>({status:state.active?'ACTIVE':'SUSPENDED',roles:[{}]})},authUser:{findUnique:async()=>({emailVerified:true})}}
 return {state,db:{$transaction:async fn=>fn(tx)}}
}
test('client uses validated per-user endpoints and DELETE override removal',async()=>{
 const calls=[];const client=createStaffLineClient(config,async(url,options)=>{calls.push({url,options});return Response.json({})})
 await client.setUserRichMenu(user,linked);await client.deleteUserRichMenu(user)
 assert.equal(calls[0].url,'https://api.line.me/v2/bot/user/'+user+'/richmenu/'+linked);assert.equal(calls[0].options.method,'POST')
 assert.equal(calls[1].options.method,'DELETE');assert.equal(calls[1].options.body,undefined)
 await assert.rejects(()=>client.setUserRichMenu(user,'../bad'),{code:'LINE_RICH_MENU_INVALID'})
 await assert.rejects(()=>client.deleteUserRichMenu('../bad'),{code:'LINE_IDENTITY_INVALID'});assert.equal(calls.length,2)
})
test('menu selection uses current active verified staff binding, not an event claim',async()=>{
 const {state,db}=fixture(),calls=[],client={setUserRichMenu:async(id,menu)=>calls.push(menu)}
 assert.equal((await syncStaffRichMenu(db,config,user,client)).status,'synced');assert.equal(calls.at(-1),linked)
 state.active=false;await syncStaffRichMenu(db,config,user,client);assert.equal(calls.at(-1),unlinked)
 state.active=true;state.binding.status='BLOCKED';await syncStaffRichMenu(db,config,user,client);assert.equal(calls.at(-1),unlinked)
 state.binding=null;await syncStaffRichMenu(db,config,user,client);assert.equal(calls.at(-1),unlinked)
})
test('provider failure preserves committed binding and an idempotent retry recovers',async()=>{
 const {state,db}=fixture(),before=structuredClone(state)
 assert.equal((await syncStaffRichMenu(db,config,user,{setUserRichMenu:async()=>{throw Error('failure')}})).status,'retry')
 assert.deepEqual(state,before)
 assert.equal((await syncStaffRichMenu(db,config,user,{setUserRichMenu:async()=>{}})).status,'synced')
})
test('concurrent unlink during provider call re-reads and corrects desired menu',async()=>{
 const {state,db}=fixture(),calls=[]
 const result=await syncStaffRichMenu(db,config,user,{setUserRichMenu:async(id,menu)=>{calls.push(menu);state.binding=null}})
 assert.equal(result.status,'synced');assert.deepEqual(calls,[linked,unlinked])
})
test('Local/disabled/incomplete menu configuration never performs provider I/O',async()=>{
 const {db}=fixture(),client={setUserRichMenu:async()=>assert.fail('unexpected I/O')}
 for(const patch of [{enabled:false},{mode:'simulation'},{richMenuLinked:null},{richMenuUnlinked:'bad'}])assert.equal((await syncStaffRichMenu(db,{...config,...patch},user,client)).status,'skipped')
})
