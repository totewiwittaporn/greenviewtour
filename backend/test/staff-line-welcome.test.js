import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac,randomUUID} from 'node:crypto'
import {processStaffWebhook} from '../src/platform/line/staff-webhook.js'
import {lineHash,lineSecret} from '../src/platform/line/staff-crypto.js'
const config={enabled:true,secret:'fixture-signing-secret',channelKey:'test:welcome',channelId:'fixture',mode:'test',botId:'U'+'0'.repeat(32),origin:'https://backoffice.greenviewtour.com'}
function fixture({expired=false,suspended=false}={}){
 const nonce=lineSecret(),uid='U'+'a'.repeat(32)
 const state={ticket:{id:'request',channelKey:config.channelKey,status:'PENDING',nonceHash:lineHash(nonce),lineUserId:uid,userId:'staff',webSessionId:'session',displayName:'Staff',expiresAt:new Date(Date.now()+(expired?-60000:60000))},binding:null,events:new Map(),audits:[],transaction:false}
 const db={
  async $transaction(run){assert.equal(state.transaction,false);state.transaction=true;try{return await run(db)}finally{state.transaction=false}},
  staffLineEvent:{async findUnique({where}){return state.events.get(where.id)},async upsert({where,create,update}){state.events.set(where.id,{...(state.events.get(where.id)||create),...update,updatedAt:new Date()})},async update({where,data}){Object.assign(state.events.get(where.id),data)},async deleteMany(){}},
  staffLineRequest:{async findUnique({where}){return where.nonceHash===state.ticket.nonceHash?state.ticket:null},async update({data}){Object.assign(state.ticket,data)},async updateMany(){},async deleteMany(){}},
  userProfile:{async findUnique(){return {status:suspended?'SUSPENDED':'ACTIVE',roles:[{roleCode:'BOOKING'}]}}},
  authUser:{async findUnique(){return {id:'staff',emailVerified:true}}},
  webSession:{async findUnique(){return {userId:'staff',purpose:'workspace',expiresAt:new Date(Date.now()+60000),authSession:{expiresAt:new Date(Date.now()+60000)}}}},
  staffLineBinding:{async findUnique(){return state.binding},async upsert({create}){state.binding=create}},
  auditEvent:{async create({data}){state.audits.push(data)}},
 }
 const event={type:'accountLink',mode:'active',timestamp:Date.now(),webhookEventId:randomUUID(),source:{type:'user',userId:uid},link:{result:'ok',nonce},replyToken:'fixture-reply-token'}
 async function send(value=event,client={reply:async()=>{}}){const raw=Buffer.from(JSON.stringify({destination:config.botId,events:[value]}));return processStaffWebhook(db,config,raw,createHmac('sha256',config.secret).update(raw).digest('base64'),client)}
 return {state,event,send}
}
test('verified account link welcomes only after commit and never repeats on redelivery',async()=>{
 const f=fixture(),replies=[]
 const client={async reply(token,text){assert.equal(f.state.transaction,false);assert.equal(f.state.binding.status,'LINKED');assert.equal([...f.state.events.values()][0].status,'DONE');replies.push({token,text})}}
 await f.send(f.event,client)
 await f.send({...f.event,replyToken:'redelivered-token',deliveryContext:{isRedelivery:true}},client)
 assert.equal(replies.length,1);assert.equal(replies[0].token,'fixture-reply-token')
 assert.match(replies[0].text,/เชื่อมบัญชี Greenview Staff สำเร็จแล้ว/)
 assert.ok(replies[0].text.endsWith('https://backoffice.greenviewtour.com/login'))
 assert.ok(!replies[0].text.includes(f.event.link.nonce));assert.equal(f.state.audits.length,1)
})
test('reply provider failure preserves linked account and DONE event without retry on redelivery',async()=>{
 const f=fixture();let attempts=0
 const client={async reply(){attempts++;throw Error('provider timeout')}}
 assert.deepEqual(await f.send(f.event,client),{ok:true})
 assert.equal(f.state.binding.status,'LINKED');assert.equal(f.state.ticket.status,'LINKED')
 assert.equal([...f.state.events.values()][0].status,'DONE')
 await f.send(f.event,client);assert.equal(attempts,1)
})
test('failed, expired, suspended, wrong-user and missing-token events send no welcome',async()=>{
 for(const scenario of ['failed','expired','suspended','wrong-user','missing-token']){
  const f=fixture({expired:scenario==='expired',suspended:scenario==='suspended'})
  if(scenario==='failed')f.event.link.result='failed'
  if(scenario==='wrong-user')f.event.source.userId='U'+'b'.repeat(32)
  if(scenario==='missing-token')delete f.event.replyToken
  await f.send(f.event,{async reply(){assert.fail('must not reply to '+scenario)}})
  assert.equal(f.state.ticket.status==='LINKED',scenario==='missing-token')
 }
})
test('invalid webhook signature never mutates binding or replies',async()=>{
 const f=fixture(),raw=Buffer.from(JSON.stringify({destination:config.botId,events:[f.event]}))
 await assert.rejects(()=>processStaffWebhook({},config,raw,'invalid',{async reply(){assert.fail('must not reply')}}),{code:'LINE_SIGNATURE_INVALID'})
 assert.equal(f.state.binding,null)
})
