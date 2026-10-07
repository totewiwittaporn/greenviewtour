import test from 'node:test'
import assert from 'node:assert/strict'
import {createHmac,randomUUID} from 'node:crypto'
import {processStaffWebhook} from '../src/platform/line/staff-webhook.js'
import {createStaffLineClient} from '../src/platform/line/staff-client.js'
import {AccessError} from '../src/modules/identity-access/membership.js'
test('link failures retain only safe stage and status in diagnostics and event outcome',async()=>{
 for(const stage of ['RATE_GATE','LINK_TOKEN','PROFILE','REQUEST_CREATE']){
  const lines=[],records=new Map(),config={enabled:true,accessToken:'PRIVATE_ACCESS_TOKEN',encryptionSecret:'a'.repeat(48),secret:'PRIVATE_WEBHOOK_SECRET',channelKey:'fixture',botId:'U'+'0'.repeat(32),origin:'https://backoffice.greenviewtour.com'}
  const provider=createStaffLineClient(config,async url=>url.endsWith('/linkToken')&&stage==='LINK_TOKEN'||url.includes('/profile/')&&stage==='PROFILE'?Response.json({message:'PRIVATE_PROVIDER_BODY'},{status:403}):Response.json({linkToken:'PRIVATE_LINK_TOKEN',userId:'U'+'a'.repeat(32),displayName:'PRIVATE_NAME'}))
  const db={async $transaction(run){return run(db)},staffLineEvent:{async findUnique({where}){return records.get(where.id)},async upsert({where,create}){records.set(where.id,create)},async update({where,data}){Object.assign(records.get(where.id),data)}},staffLineBinding:{async findUnique(){return null}},staffLineRequest:{async count(){return 0},async findUnique(){return null},async create(){throw Error('PRIVATE_DATABASE_MESSAGE')}}}
  const event={type:'message',mode:'active',timestamp:Date.now(),webhookEventId:randomUUID(),source:{type:'user',userId:'U'+'a'.repeat(32)},replyToken:'PRIVATE_REPLY_TOKEN',message:{id:'private-message',type:'text',text:'LINK STAFF'}}
  const raw=Buffer.from(JSON.stringify({destination:config.botId,events:[event]})),signature=createHmac('sha256',config.secret).update(raw).digest('base64')
  const original=console.error;console.error=value=>lines.push(value)
  try{await assert.rejects(()=>processStaffWebhook(db,config,raw,signature,provider,async()=>{if(stage==='RATE_GATE')throw new AccessError('AUTH_RATE_LIMITED',429)}))}finally{console.error=original}
  assert.equal(lines.length,0)
  assert.equal([...records.values()][0].outcome,['LINK_TOKEN','PROFILE'].includes(stage)?stage+'_HTTP_403':stage+'_'+(stage==='RATE_GATE'?'AUTH_RATE_LIMITED':'UNCLASSIFIED'))
  assert.equal([...records.values()][0].status,'RETRY');assert.ok([...records.values()][0].outcome.startsWith(stage+'_'))
  const recorded=lines.join('')+[...records.values()][0].outcome
  assert.doesNotMatch(recorded,/PRIVATE_|https:|Ua{32}|private-message/)
 }
})
test('provider HTTP failure preserves numeric status without provider body or token',async()=>{
 const client=createStaffLineClient({enabled:true,accessToken:'PRIVATE_TOKEN'},async()=>Response.json({message:'PRIVATE_BODY'},{status:429}))
 await assert.rejects(()=>client.linkToken('U'+'a'.repeat(32)),error=>error.code==='LINE_PROVIDER_UNAVAILABLE'&&error.status===503&&error.providerStatus===429&&!JSON.stringify(error).includes('PRIVATE'))
})
