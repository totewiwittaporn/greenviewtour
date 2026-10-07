import test from 'node:test'
import assert from 'node:assert/strict'
import {createAuthMail,authMailTransaction} from '../src/platform/auth/cloudflare/mail.js'
const config={local:false,origins:{workspace:'https://staff.example.test',customer:'https://member.example.test'}}
const user={email:'staff@example.test'}
const environment=send=>({APP_ENV:'production',AUTH_EMAIL_FROM:'system@example.test',EMAIL:{send}})
test('Local retains mailbox links and never invokes supplied remote binding',async()=>{
 const rows=[]
 const env=environment(()=>assert.fail('remote send'))
 const mail=createAuthMail({localMail:{create:async row=>rows.push(row.data)}},env,{local:true,origins:{workspace:'http://localhost:5174'}},'workspace')
 await mail('verify',user,'a&<>');await mail('reset',user,'secret')
 assert.equal(rows[0].link,'http://localhost:5174/login#verify=a%26%3C%3E')
 assert.equal(rows[1].link,'http://localhost:5174/reset-password#recovery=secret')
})
test('structured transport accepts 30 independent fake sends with escaped fragment links; not a quota test',async()=>{
 const messages=[],env=environment(async message=>{messages.push(message);return {messageId:String(messages.length)}})
 await Promise.all(Array.from({length:30},(_,i)=>createAuthMail({},env,config,'workspace')('verify',{email:`staff${i}@example.test`},'token&"<>')))
 assert.equal(messages.length,30)
 assert.deepEqual(messages[0].from,{email:'system@example.test',name:'Greenview Tour'})
 assert.match(messages[0].html,/#verify=token%26%22%3C%3E/)
 assert.ok(!messages[0].html.includes('token&"<>'))
 const reset=createAuthMail({},env,config,'customer');await reset('reset',user,'reset-token')
 assert.match(messages.at(-1).text,/https:\/\/member.example.test\/login#recovery=reset-token/)
 assert.match(messages.at(-1).text,/15 minutes/)
})
test('invalid production configuration and malformed addresses fail closed',async()=>{
 for(const patch of [{AUTH_EMAIL_FROM:''},{AUTH_EMAIL_FROM:'sender@example.test\r\nBCC:other@example.test'},{EMAIL:null},{APP_ENV:'preview'}]){
  const env={...environment(()=>assert.fail('unexpected send')),...patch}
  await assert.rejects(createAuthMail({},env,config,'workspace')('verify',user,'token'),{code:'PRODUCTION_EMAIL_NOT_CONFIGURED'})
 }
 await assert.rejects(createAuthMail({},environment(()=>assert.fail('send')),{...config,origins:{workspace:'http://staff.example.test'}},'workspace')('verify',user,'token'),{code:'PRODUCTION_EMAIL_NOT_CONFIGURED'})
 await assert.rejects(createAuthMail({},environment(()=>assert.fail('send')),config,'workspace')('verify',{email:'a@example.test,b@example.test'},'token'),{code:'AUTH_EMAIL_INVALID'})
})
test('provider errors and missing message IDs are sanitized without retries',async()=>{
 for(const sendResult of [()=>{throw new Error('secret-token recipient@example.test')},()=>({}),()=>({messageId:' '})]){
  let calls=0
  const mail=createAuthMail({},environment(async()=>{calls++;return sendResult()}),config,'workspace')
  await assert.rejects(mail('verify',user,'secret-token'),error=>error.code==='AUTH_EMAIL_DELIVERY_UNAVAILABLE'&&!String(error).includes('secret-token')&&!error.cause)
  assert.equal(calls,1)
 }
})
test('replayed transactions submit only successful attempt mail, strictly after commit',async()=>{
 let committed=false,calls=0
 const env=environment(async message=>{assert.equal(committed,true);assert.match(message.text,/#verify=attempt2/);calls++;return {messageId:'accepted'}})
 const db={$transaction:async callback=>{await callback({attempt:1});const value=await callback({attempt:2});committed=true;return value}}
 const result=await authMailTransaction(db,env,async(tx,attemptEnv)=>{await createAuthMail({},attemptEnv,config,'workspace')('verify',user,'attempt'+tx.attempt);assert.equal(calls,0);return 'registered'})
 assert.equal(result,'registered');assert.equal(calls,1)
})
test('rolled back transactions do not send, delivery failure never retries committed writes',async()=>{
 let calls=0,commits=0
 const env=environment(async()=>{calls++;throw new Error('private provider detail')})
 const callback=async(tx,attemptEnv)=>createAuthMail({},attemptEnv,config,'workspace')('reset',user,'token')
 await assert.rejects(authMailTransaction({$transaction:async cb=>{await cb({});throw new Error('rollback')}},env,callback),/rollback/)
 assert.equal(calls,0)
 await assert.rejects(authMailTransaction({$transaction:async cb=>{await cb({});commits++}},env,callback),{code:'AUTH_EMAIL_DELIVERY_UNAVAILABLE'})
 assert.equal(commits,1);assert.equal(calls,1)
})
test('production configuration fails before callbacks can swallow the error',async()=>{
 await assert.rejects(authMailTransaction({$transaction:()=>assert.fail('must not start')},{APP_ENV:'production'},()=>assert.fail('must not enter Better Auth')),{code:'PRODUCTION_EMAIL_NOT_CONFIGURED'})
})
test('Local transaction mail stays transactional and never queues a remote send',async()=>{
 const rows=[],env={...environment(()=>assert.fail('remote send')),APP_ENV:'local'}
 const tx={localMail:{create:async row=>rows.push(row.data)}}
 await authMailTransaction({$transaction:callback=>callback(tx)},env,(db,attemptEnv)=>createAuthMail(db,attemptEnv,{local:true,origins:{workspace:'http://localhost:5174'}},'workspace')('verify',user,'local'))
 assert.equal(rows.length,1)
})
test('public recovery does not expose delivery failure for an existing account',async()=>{
 let calls=0
 const env=environment(async()=>{calls++;throw new Error('recipient rejected')})
 const db={$transaction:callback=>callback({})}
 const recovery=exists=>authMailTransaction(db,env,async(tx,attemptEnv)=>{
  if(exists)await createAuthMail(tx,attemptEnv,config,'workspace')('reset',user,'secret')
  return {ok:true}
 },{requiresMail:true,concealDeliveryFailure:true})
 assert.deepEqual(await recovery(true),await recovery(false))
 assert.equal(calls,1)
})
test('non-mail operations can commit even while email configuration is unavailable',async()=>{
 let committed=false
 const db={$transaction:async callback=>{const result=await callback({});committed=true;return result}}
 assert.equal(await authMailTransaction(db,{APP_ENV:'production'},async()=> 'logged out',{requiresMail:false}),'logged out')
 assert.equal(committed,true)
})
