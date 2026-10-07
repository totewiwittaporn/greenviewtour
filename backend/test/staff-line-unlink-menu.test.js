import test from 'node:test'
import assert from 'node:assert/strict'
import {staffLineApi} from '../src/platform/line/staff-api.js'
const uid='U'+'a'.repeat(32),config={enabled:true,mode:'live',channelKey:'live:test',richMenuLinked:'richmenu-'+'a'.repeat(32),richMenuUnlinked:'richmenu-'+'b'.repeat(32)}
function fixture({failProvider=false,version=2}={}){
 let binding={id:'binding',userId:'staff',lineUserId:uid,status:'LINKED',version},committed=false
 const calls=[]
 const tx={staffLineBinding:{findUnique:async()=>binding,update:async({data})=>{binding={...binding,...data,version:binding.version+1}}},userProfile:{findUnique:async()=>({status:'ACTIVE',roles:[{}]})},authUser:{findUnique:async()=>({emailVerified:true})},webSession:{findUnique:async()=>({userId:'staff',purpose:'workspace',expiresAt:new Date(Date.now()+60000),authSession:{expiresAt:new Date(Date.now()+60000)}})},staffLineRequest:{updateMany:async()=>({count:0})},auditEvent:{create:async()=>{}}}
 const db={...tx,$transaction:async fn=>{const result=await fn(tx);committed=true;return result}}
 return {args:{db,config,database:{prepare:()=>({bind:()=>({first:async()=>({hits:1})})})},sessions:{authenticated:async()=>({user:{id:'staff'},entry:{purpose:'workspace',session:{webSessionId:'session'}}})},client:{setUserRichMenu:async(id,menu)=>{assert.equal(committed,true);assert.equal(binding.status,'UNLINKED');calls.push({id,menu});if(failProvider)throw Error('provider failure')}}},binding:()=>binding,calls}
}
const request=version=>new Request('https://backoffice.greenviewtour.com/api/me/line',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'unlink',confirmed:true,version})})
test('actual staff API unlink commits before menu update and never exposes raw LINE ID',async()=>{
 const f=fixture(),result=await staffLineApi(request(2),f.args)
 assert.deepEqual(result,{ok:true});assert.equal(f.binding().lineUserId,null)
 assert.deepEqual(f.calls,[{id:uid,menu:config.richMenuUnlinked}]);assert.ok(!JSON.stringify(result).includes(uid))
})
test('provider failure returns committed unlink with pending warning, never rollback or failure ambiguity',async()=>{
 const f=fixture({failProvider:true}),result=await staffLineApi(request(2),f.args)
 assert.deepEqual(result,{ok:true,warning:'LINE_RICH_MENU_SYNC_PENDING'});assert.equal(f.binding().lineUserId,null)
})
test('stale confirmed version rejects unlink and never touches provider menu',async()=>{
 const f=fixture({version:3})
 await assert.rejects(()=>staffLineApi(request(2),f.args),{code:'LINE_LINK_CHANGED'})
 assert.equal(f.binding().lineUserId,uid);assert.equal(f.calls.length,0)
})
