import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac,randomUUID} from 'node:crypto'
import {processStaffWebhook} from '../src/platform/line/staff-webhook.js'
import {staffLineAccountSummary} from '../src/modules/identity-access/staff-line-summary.js'
const config={enabled:true,secret:'fixture-secret',channelKey:'own-channel',botId:'U'+'0'.repeat(32),origin:'https://backoffice.greenviewtour.com'},lineUserId='U'+'a'.repeat(32)
function fixture(){
 const settings={...config}
 const state={binding:{channelKey:config.channelKey,lineUserId,userId:'own-user',status:'LINKED',displayName:'Stale LINE name'},profile:{displayName:'Current staff',nickname:'Current nickname',status:'ACTIVE',roles:[{roleCode:'BOOKING'}]},auth:{emailVerified:true},events:new Map(),audits:[],menuCalls:[],menuFailure:false,reads:0,replies:[],transaction:false}
 const db={async $transaction(run){state.transaction=true;try{return await run(db)}finally{state.transaction=false}},
 staffLineBinding:{async findUnique({where}){assert.deepEqual(where,{channelKey_lineUserId:{channelKey:config.channelKey,lineUserId}});return state.binding},async update({data}){Object.assign(state.binding,data)}},
 auditEvent:{async create({data}){state.audits.push(data)}},
 userProfile:{async findUnique({where}){assert.equal(where.id,'own-user');state.reads++;return state.profile}},authUser:{async findUnique({where}){assert.equal(where.id,'own-user');return state.auth}},
 staffLineEvent:{async findUnique({where}){return state.events.get(where.id)},async upsert({where,create}){state.events.set(where.id,create)},async update({where,data}){Object.assign(state.events.get(where.id),data)},async deleteMany(){}},
 staffLineRequest:{async updateMany(){},async deleteMany(){},async count(){assert.fail('must not issue new ticket for linked account')}},
 }
 async function send(data='staff-link:status',source={type:'user',userId:lineUserId},id=randomUUID(),patch={}){
 const event={type:'postback',mode:'active',timestamp:Date.now(),webhookEventId:id,source,replyToken:'fixture-reply',postback:{data},...patch},raw=Buffer.from(JSON.stringify({destination:config.botId,events:[event]}))
 await processStaffWebhook(db,settings,raw,createHmac('sha256',config.secret).update(raw).digest('base64'),{async reply(token,text){assert.equal(state.transaction,false);state.replies.push(text)},async linkToken(){assert.fail('must not issue new token')},async setUserRichMenu(id,menu){state.menuCalls.push(menu);if(state.menuFailure)throw Error('mock provider unavailable')}})
 }
 return {db,state,send,settings}
}
test('status privately replies with fresh account name and canonical roles on every click',async()=>{
 const f=fixture();await f.send();assert.match(f.state.replies[0],/Current staff \(Current nickname\)/);assert.match(f.state.replies[0],/Booking Assistant/)
 f.state.profile.roles=[{roleCode:'HEAD_BOOKING'},{roleCode:'DRIVER'}];f.state.profile.displayName='Updated staff'
 await f.send();assert.match(f.state.replies[1],/Updated staff/);assert.match(f.state.replies[1],/Booking Manager, Driver/);assert.doesNotMatch(f.state.replies[1],/Booking Assistant|Stale LINE|own-user/)
 assert.equal(f.state.reads,2);assert.ok(f.state.replies.every(text=>text.endsWith(config.origin+'/login')))
})
test('already linked start command shows status instead of creating conflicting link tickets',async()=>{
 const f=fixture();await f.send('staff-link:start');assert.equal(f.state.replies.length,1);assert.match(f.state.replies[0],/เชื่อมบัญชีพนักงานแล้ว/)
})
test('unlinked, blocked, suspended, disabled and unverified accounts reveal no stale identity',async()=>{
 for(const kind of ['unlinked','blocked','suspended','disabled','unverified']){
 const f=fixture();if(kind==='unlinked')f.state.binding=null;if(kind==='blocked')f.state.binding.status='BLOCKED';if(kind==='suspended')f.state.profile.status='SUSPENDED';if(kind==='disabled')f.state.auth.disabled=true;if(kind==='unverified')f.state.auth.emailVerified=false
 await f.send();assert.equal(f.state.replies.length,1);assert.doesNotMatch(f.state.replies[0],/Current staff|Current nickname|Stale LINE|Booking Assistant/)
 }
})
test('group and room status events cannot disclose any account identity',async()=>{
 const f=fixture();await f.send('staff-link:status',{type:'group',groupId:'C'+'b'.repeat(32),userId:lineUserId});await f.send('staff-link:status',{type:'room',roomId:'R'+'b'.repeat(32),userId:lineUserId});assert.equal(f.state.reads,0);assert.equal(f.state.replies.length,0)
})
test('status projection looks up only exact channel and LINE account and never accepts staff ID',async()=>{
 const seen=[];const db={staffLineBinding:{async findUnique(query){seen.push(query);return null}}}
 assert.deepEqual(await staffLineAccountSummary(db,{channelKey:'other-channel'},'U'+'b'.repeat(32)),{status:'UNLINKED',hasBinding:false})
 assert.deepEqual(seen,[{where:{channelKey_lineUserId:{channelKey:'other-channel',lineUserId:'U'+'b'.repeat(32)}}}])
 assert.deepEqual(await staffLineAccountSummary(db,config,'staff-user-id'),{status:'UNLINKED',hasBinding:false});assert.equal(seen.length,1)
})

test('menu failure returns retry after committed status and redelivery synchronizes without duplicate reply',async()=>{
 const f=fixture();Object.assign(f.settings,{mode:'live',richMenuLinked:'richmenu-'+'a'.repeat(32),richMenuUnlinked:'richmenu-'+'b'.repeat(32)})
 const id=randomUUID(),timestamp=Date.now();f.state.menuFailure=true
 await assert.rejects(()=>f.send('staff-link:status',undefined,id,{timestamp}),{code:'LINE_MENU_SYNC_RETRY'})
 assert.equal(f.state.replies.length,1);assert.equal([...f.state.events.values()][0].status,'DONE');assert.equal(f.state.binding.status,'LINKED')
 f.state.menuFailure=false;await f.send('staff-link:status',undefined,id,{timestamp})
 assert.equal(f.state.replies.length,1);assert.equal(f.state.menuCalls.length,2);assert.equal(f.state.menuCalls[1],f.settings.richMenuLinked)
})
test('signed follow restores only an existing blocked active identity and respects event ordering',async()=>{
 for(const scenario of ['active','stale','suspended','unlinked']){
  const f=fixture(),now=Date.now();f.state.binding.status=scenario==='unlinked'?'UNLINKED':'BLOCKED';f.state.binding.sourceEventAt=new Date(now+(scenario==='stale'?60000:-60000))
  if(scenario==='suspended')f.state.profile.status='SUSPENDED'
  await f.send('unused',undefined,randomUUID(),{type:'follow',timestamp:now})
  assert.equal(f.state.binding.status,scenario==='active'?'LINKED':scenario==='unlinked'?'UNLINKED':'BLOCKED')
  assert.equal(f.state.audits.length,scenario==='active'?1:0);assert.equal(f.state.replies.length,0)
 }
})
