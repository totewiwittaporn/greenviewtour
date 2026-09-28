import test from 'node:test'
import assert from 'node:assert/strict'
import { listUsers } from '../src/modules/identity-access/list-users.js'
test('directory uses a read-only transaction, parameterized search and releases the connection', async () => {
  const calls = []; let released = false
  const client = { async query(sql, params) {
    calls.push({ sql, params })
    if (sql.includes('AS verified')) return { rows: [{ total: 1, verified: 1, signed_in: 0 }] }
    if (sql.includes('count(*)::int AS total FROM')) return { rows: [{ total: 1 }] }
    if (sql.startsWith('SELECT u.id')) return { rows: [{ id: 'example', email: 'qa@example.invalid' }] }
    return { rows: [] }
  }, release() { released = true } }
  const result = await listUsers({ connect: async () => client }, { search: "' OR TRUE --", page: 99, pageSize: 25 })
  assert.equal(result.page, 1)
  assert.equal(calls[0].sql, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  assert.equal(calls[2].params[1], "' OR TRUE --")
  assert.equal(calls[3].params[3], 0)
  assert.equal(calls.at(-1).sql, 'COMMIT')
  assert.equal(released, true)
})

test('Mac API port keeps host, token and origin boundaries', async () => {
  const { createHandler } = await import('../src/app/http.js')
  const handler = createHandler({ port: 5001, token: 'a'.repeat(32) })
  async function request(host, url='/health/live', headers={}) {
    let status, data
    await handler({ method:'GET', url, headers:{host,...headers} }, {
      writeHead(code){status=code}, end(body){data=JSON.parse(body)},
    })
    return {status,data}
  }
  assert.equal((await request('127.0.0.1:5001')).status,200)
  assert.equal((await request('localhost:5001')).status,200)
  for (const host of ['127.0.0.1:5000','external.example:5001']) assert.equal((await request(host)).status,403)
  assert.equal((await request('127.0.0.1:5001','/api/me')).status,401)
  assert.equal((await request('127.0.0.1:5001','/api/me',{origin:'https://external.example'})).status,403)
  assert.throws(()=>createHandler({port:9000,token:'a'.repeat(32)}),/INVALID_LOCAL_API_PORT/)
})

test('evidence downloads allow saving but retain sandbox, attachment disposition and fresh authorization',async()=>{
 const {createHandler}=await import('../src/app/http.js')
 const id='b0000000-0000-4000-8000-000000000001',content=Buffer.from('test file')
 let active=true,status,headers,body,mimeType='image/png'
 const prisma={userProfile:{findUnique:async()=>({status:active?'ACTIVE':'INACTIVE',roles:[{roleCode:'ACCOUNT',scope:'COMPANY'}]})},agentPayment:{findUnique:async()=>({id})},evidenceAttachment:{findUnique:async()=>({id,targetKind:'AGENT_PAYMENT',targetId:id,filename:'เอกสาร.png',mimeType,size:content.length,content})}}
 const handler=createHandler({port:5001,token:'a'.repeat(32),prisma,sessions:{authenticated:async()=>({user:{id},entry:{purpose:'workspace'}})}})
 const request=(query='')=>handler({method:'GET',url:`/api/evidence/${id}${query}`,headers:{host:'localhost:5001','x-greenview-local-token':'a'.repeat(32)}},{writeHead:(s,h)=>{status=s;headers=h},end:b=>{body=b}})
 await request();assert.equal(status,200);assert.deepEqual(body,content)
 assert.equal(headers['Content-Security-Policy'],"default-src 'none'; sandbox allow-downloads")
 assert.equal(headers['X-Content-Type-Options'],'nosniff');assert.equal(headers['Cache-Control'],'no-store')
 assert.ok(headers['Content-Disposition'].startsWith("attachment; filename*=UTF-8''"))
 await request('?view=inline');assert.ok(headers['Content-Disposition'].startsWith('attachment;'))
 mimeType='application/pdf';await request('?view=inline');assert.equal(status,200);assert.ok(headers['Content-Disposition'].startsWith('inline;'));assert.equal(headers['Cache-Control'],'no-store');assert.equal(headers['Content-Security-Policy'],"script-src 'none'; base-uri 'none'")
 active=false;await request('?view=inline');assert.equal(status,403);assert.equal(JSON.parse(body).code,'PERMISSION_DENIED')
})

test('member/public origins cannot invoke staff endpoints or borrow staff sessions',async()=>{
 const {createHandler}=await import('../src/app/http.js')
 let staffCalls=0
 const handler=createHandler({port:5001,token:'a'.repeat(32),sessions:{authenticated:async()=>{staffCalls++;throw Error('staff access')}}})
 async function get(url,origin,cookie='gv_session=STAFF'){
  let status,data,headers
  await handler({method:'GET',url,headers:{host:'localhost:5001',origin,cookie,'x-greenview-local-token':'a'.repeat(32)}},{writeHead:(s,h)=>{status=s;headers=h},end:b=>{data=JSON.parse(b)}})
  return {status,data,headers}
 }
 assert.equal((await get('/api/me','http://localhost:5175')).status,403)
 assert.equal((await get('/api/customers','http://localhost:5173')).status,403)
 const expired=await get('/api/member/profile','http://localhost:5175')
 assert.equal(expired.status,401)
 assert.ok(expired.headers['Set-Cookie'].startsWith('gv_member_session='))
 assert.equal(staffCalls,0)
})

test('member password recovery uses an isolated session and clears both local identities after a successful reset',async()=>{
 const {createHandler}=await import('../src/app/http.js')
 const {SessionStore}=await import('../src/platform/auth/sessions.js')
 const user={id:'b0000000-0000-4000-8000-000000000001',email_confirmed_at:'yes'},customer={id:'b0000000-0000-4000-8000-000000000002',status:'ACTIVE'}
 const token='x.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,session_id:'b0000000-0000-4000-8000-000000000003'})).toString('base64url')+'.x'
 const sessions=new SessionStore(),staffId=sessions.create({user}),events=[]
 let changed=0
 const handler=createHandler({port:5001,token:'a'.repeat(32),sessions,pool:{query:async()=>({rowCount:1})},provider:{user:async()=>user,password:async()=>{changed++;return {providerRevoked:true}}},prisma:{customerProfile:{upsert:async()=>customer,findUnique:async()=>customer},auditEvent:{create:async({data})=>{events.push(data.action);return {id:'audit'}},update:async({data})=>events.push(data.action)}}})
 let cookie=''
 async function post(path,data){let status,result,headers;const request={method:'POST',url:path,headers:{host:'localhost:5001',origin:'http://localhost:5175','content-type':'application/json','x-greenview-local-token':'a'.repeat(32),cookie},async *[Symbol.asyncIterator](){yield JSON.stringify(data)}};await handler(request,{writeHead:(s,h)=>{status=s;headers=h},end:b=>{result=JSON.parse(b)}});if(headers['Set-Cookie'])cookie=headers['Set-Cookie'].split(';')[0];return {status,result,headers}}
 assert.equal((await post('/api/member/reset-password',{password:'test-only-long-password'})).status,401)
 assert.equal(changed,0)
 assert.equal((await post('/api/member/recovery-session',{access_token:token,refresh_token:'test-refresh'})).status,200)
 assert.ok(cookie.startsWith('gv_member_session='));assert.ok(sessions.entries.has(staffId))
 assert.equal((await post('/api/member/reset-password',{password:'test-only-long-password'})).status,200)
 assert.equal(changed,1);assert.equal(sessions.entries.has(staffId),false);assert.equal(cookie,'gv_member_session=')
 assert.deepEqual(events,['member.password.change.requested','member.password.changed'])
})
