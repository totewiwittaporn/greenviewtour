import test from 'node:test'
import assert from 'node:assert/strict'
import {createHandler} from '../src/app/http.js'

const token='a'.repeat(32)
const manager={status:'ACTIVE',roles:[{roleCode:'MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}]}
const denied={status:'ACTIVE',roles:[]}

function prismaFor(profileRef){
  const emptyModel={
    count:async()=>0,
    groupBy:async()=>[],
    findMany:async()=>[],
    findFirst:async()=>null,
    findUnique:async()=>null,
  }
  const prisma={
    userProfile:{findUnique:async()=>profileRef.current},
    tourSeason:emptyModel,
    tourPromotion:emptyModel,
    websitePopup:emptyModel,
    $executeRaw:async()=>{},
  }
  prisma.$transaction=async fn=>fn(prisma)
  return prisma
}

async function request(handler,path,method='GET',payload){
  let status,data
  const req={
    method,
    url:path,
    headers:{
      host:'localhost:5001',
      'x-greenview-local-token':token,
      ...(method==='POST'?{origin:'http://localhost:5174','content-type':'application/json'}:{}),
    },
    async *[Symbol.asyncIterator](){if(payload!==undefined)yield JSON.stringify(payload)},
  }
  await handler(req,{writeHead:code=>{status=code},end:body=>{data=JSON.parse(body)}})
  return {status,data}
}

test('tour season, promotion and website popup settings are routed to the shared catalog service',async()=>{
  const profileRef={current:manager}
  const handler=createHandler({
    port:5001,
    token,
    prisma:prismaFor(profileRef),
    sessions:{authenticated:async()=>({user:{id:'11111111-1111-4111-8111-111111111111'},entry:{purpose:'workspace'}})},
  })

  for(const entity of ['seasons','promotions','popups']){
    const read=await request(handler,`/api/settings/${entity}?view=list`)
    assert.equal(read.status,200,entity)
    assert.deepEqual(read.data.rows,[])

    const write=await request(handler,`/api/settings/${entity}`,'POST',{})
    assert.equal(write.status,400,entity)
    assert.equal(write.data.code,'INVALID_SETTINGS')
  }

  profileRef.current=denied
  for(const entity of ['seasons','promotions','popups']){
    const response=await request(handler,`/api/settings/${entity}`)
    assert.equal(response.status,403,entity)
    assert.equal(response.data.code,'PERMISSION_DENIED')
  }
})
