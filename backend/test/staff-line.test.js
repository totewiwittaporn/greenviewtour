import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac} from 'node:crypto'
import {staffLineSettings,staffOa} from '../src/platform/line/staff-config.js'
import {lineSecret,lineHash,sealTicket,openTicket} from '../src/platform/line/staff-crypto.js'
import {parseStaffWebhook} from '../src/platform/line/staff-webhook.js'
import {createStaffLineClient} from '../src/platform/line/staff-client.js'
const secret='fixture-secret-'.repeat(4),config={enabled:true,secret,botId:'U'+'0'.repeat(32)}
const signature=raw=>createHmac('sha256',secret).update(raw).digest('base64')
test('normal Local remains disconnected even when live provider variables are supplied',()=>{
 const result=staffLineSettings({APP_ENV:'local',LINE_STAFF_ENABLED:'true',LINE_STAFF_ACCESS_TOKEN:'do-not-use',LINE_STAFF_CHANNEL_SECRET:'do-not-use'})
 assert.equal(result.enabled,false);assert.equal(result.reason,'LINE_LOCAL_ONLY');assert.ok(!('accessToken' in result));assert.equal(result.channelId,staffOa.channelId)
 assert.equal(staffLineSettings({APP_ENV:'production',LINE_STAFF_ENABLED:'true'}).enabled,false)
})
test('link secrets are unguessable and encrypted tickets are authenticated to their channel/request',()=>{
 const handle=lineSecret(),value={handle,linkToken:'fixture-link-token'},encrypted=sealTicket(value,secret,'channel:request')
 assert.equal(handle.length,43);assert.notEqual(lineSecret(),handle);assert.equal(lineHash(handle).length,64)
 assert.deepEqual(openTicket(encrypted,secret,'channel:request'),value)
 assert.ok(!encrypted.includes(value.linkToken));assert.throws(()=>openTicket(encrypted,secret,'other:request'))
 assert.throws(()=>openTicket(encrypted,'other-secret','channel:request'))
 const bytes=Buffer.from(encrypted,'base64url');bytes[bytes.length-1]^=1
 assert.throws(()=>openTicket(bytes.toString('base64url'),secret,'channel:request'))
})
test('webhook authentication uses original bytes and the configured bot destination',()=>{
 const raw=Buffer.from(JSON.stringify({destination:config.botId,events:[]}))
 assert.deepEqual(parseStaffWebhook(raw,signature(raw),config),[])
 assert.throws(()=>parseStaffWebhook(Buffer.concat([raw,Buffer.from(' ')]),signature(raw),config),{code:'LINE_SIGNATURE_INVALID'})
 assert.throws(()=>parseStaffWebhook(raw,signature(raw),{...config,botId:'U'+'f'.repeat(32)}),{code:'LINE_EVENT_INVALID'})
})
test('signed malformed JSON, wrong event shape and future timestamps are rejected',()=>{
 for(const value of ['null','[]','{',JSON.stringify({destination:config.botId,events:[{}]}),JSON.stringify({destination:config.botId,events:[{type:'accountLink',timestamp:Date.now()+999999,webhookEventId:'fixture-event-id'}]})]){
  const raw=Buffer.from(value);assert.throws(()=>parseStaffWebhook(raw,signature(raw),config),{code:'LINE_EVENT_INVALID'})
 }
})
test('provider adapter sends only reviewed LINE endpoints and never follows redirects',async()=>{
 const calls=[],uid='U'+'a'.repeat(32),client=createStaffLineClient({enabled:true,accessToken:'fixture-token'},async(url,options)=>{
  calls.push({url,options})
  return Response.json(url.endsWith('/linkToken')?{linkToken:'issued-test-token'}:url.includes('/profile/')?{userId:uid,displayName:'Test LINE'}:{})
 })
 assert.equal(await client.linkToken(uid),'issued-test-token');assert.equal(await client.profile(uid),'Test LINE');await client.reply('fixture-reply','Link staff')
 assert.ok(calls.every(call=>call.url.startsWith('https://api.line.me/v2/bot/')&&call.options.redirect==='manual'))
 assert.deepEqual(JSON.parse(calls[2].options.body),{replyToken:'fixture-reply',messages:[{type:'text',text:'Link staff'}]})
 await assert.rejects(()=>client.linkToken('group-id'),{code:'LINE_IDENTITY_INVALID'})
 const wrong=createStaffLineClient({enabled:true,accessToken:'fixture-token'},async()=>Response.json({userId:'wrong',displayName:'Test'}))
 await assert.rejects(()=>wrong.profile(uid),{code:'LINE_IDENTITY_INVALID'})
 const offline=createStaffLineClient({enabled:false},()=>{throw Error('MUST_NOT_SEND')})
 await assert.rejects(()=>offline.linkToken(uid),{code:'LINE_NOT_CONFIGURED'})
})
