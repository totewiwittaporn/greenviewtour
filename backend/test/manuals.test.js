import test from 'node:test'
import {AccessError} from '../src/modules/identity-access/membership.js'
import assert from 'node:assert/strict'
import {readManuals} from '../src/backoffice/manuals/service.js'
import {roleNames} from '../../packages/contracts/access.js'
const user=(roles,status='ACTIVE')=>({status,roles:roles.map(([roleCode,scope='SELF'])=>({roleCode,scope}))})
test('only company Admin Manager sees all role guides',()=>{assert.equal(readManuals(user([['ADMIN_MANAGER','COMPANY']])).roles.length,Object.keys(roleNames).length);assert.deepEqual(readManuals(user([['ADMIN_MANAGER','SELF']])).roles.map(r=>r.role),['ADMIN_MANAGER']);assert.deepEqual(readManuals(user([['MANAGER','COMPANY']])).roles.map(r=>r.role),['MANAGER'])})
test('multi-role staff see only assigned guides and direct links fail closed',()=>{const profile=user([['GUIDE'],['DRIVER'],['GUIDE','DEPARTMENT']]);assert.deepEqual(readManuals(profile).roles.map(r=>r.role),['GUIDE','DRIVER']);assert.equal(readManuals(profile,'DRIVER').manual.role,'DRIVER');for(const role of ['MANAGER','ADMIN_MANAGER','UNKNOWN'])assert.throws(()=>readManuals(profile,role),e=>e.status===403)})
test('inactive/missing staff denied and index contains no guide bodies',()=>{assert.throws(()=>readManuals(null));assert.throws(()=>readManuals(user([['MANAGER','COMPANY']],'SUSPENDED')));const data=readManuals(user([['MANAGER','COMPANY']]));assert.equal(data.manual,null);assert.equal(JSON.stringify(data).includes('sections'),false)})
test('every existing role has substantive bilingual instructions',()=>{const admin=user([['ADMIN_MANAGER','COMPANY']]);for(const role of Object.keys(roleNames)){const doc=readManuals(admin,role).manual;assert.ok(doc.sections.length>=3);for(const section of doc.sections){assert.ok(section.body.en.length>80);assert.ok(section.body.th.length>40)}}})

test('manual HTTP endpoint enforces session, fresh roles and no-store on direct requests',async()=>{
 const {createHandler}=await import('../src/app/http.js')
 let profile=user([['MANAGER','COMPANY']]),purpose='workspace',signedIn=true
 const handler=createHandler({port:5001,token:'a'.repeat(32),prisma:{userProfile:{findUnique:async()=>profile}},sessions:{cookie:()=>'',authenticated:async()=>{if(!signedIn){throw new AccessError('LOGIN_REQUIRED',401)}return {user:{id:'staff'},entry:{purpose}}}}})
 async function request(role='',method='GET'){
  let status,headers,data
  await handler({method,url:'/api/manuals'+(role?'?role='+role:''),headers:{host:'localhost:5001',origin:'http://localhost:5174','x-greenview-local-token':'a'.repeat(32)}},{writeHead:(s,h)=>{status=s;headers=h},end:body=>{data=JSON.parse(body)}})
  return {status,headers,data}
 }
 let result=await request('MANAGER');assert.equal(result.status,200);assert.equal(result.headers['Cache-Control'],'no-store');assert.equal(result.data.manual.role,'MANAGER')
 result=await request('ADMIN_MANAGER');assert.equal(result.status,403);assert.equal(JSON.stringify(result.data).includes('sections'),false)
 profile=user([['GUIDE']]);assert.equal((await request('MANAGER')).status,403);assert.equal((await request('GUIDE')).status,200)
 assert.equal((await request('GUIDE','POST')).status,405)
 purpose='recovery';assert.equal((await request()).status,401)
 purpose='workspace';signedIn=false;assert.equal((await request()).status,401)
 signedIn=true;profile={...profile,status:'SUSPENDED'};assert.equal((await request()).status,403)
})
