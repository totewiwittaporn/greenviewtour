import test from 'node:test'
import assert from 'node:assert/strict'
import {redactOwnerIdentity} from '../src/modules/identity-access/owner-privacy.js'
const ownerId='00000000-0000-4000-8000-000000000001',viewer='00000000-0000-4000-8000-000000000002'
function fixture(){const calls=[];return {calls,db:{userProfile:{findMany:async args=>{calls.push(args);return args.where.id.not===ownerId?[]:[{id:ownerId,displayName:'Owner Name',nickname:'Private Nick'}]}},authUser:{findMany:async()=>[{email:'private@example.test'}]}}}}
test('owner response projection masks typed identities and nested historical attribution without changing business data',async()=>{
 const {db}=fixture(),at=new Date(),input={rows:[{id:'booking-id',name:'Surin trip',createdById:ownerId,createdByName:'Historical Owner Name',priceRequest:{requestedById:ownerId,requestedByName:'Old Name',reviewedById:viewer,reviewedByName:'Viewer'},staff:[{userId:ownerId,role:'GUIDE',user:{displayName:'Historical Crew Name'}}],amount:'1250.00',createdAt:at}],employees:[{id:ownerId,displayName:'Owner Name',nickname:'Private Nick',email:'private@example.test',roles:[{roleCode:'ADMIN_MANAGER'}]}],actorId:viewer,total:1}
 const original=structuredClone(input),result=await redactOwnerIdentity(db,viewer,input)
 assert.deepEqual(input,original);assert.equal(result.rows[0].amount,'1250.00');assert.equal(result.rows[0].createdAt,at);assert.equal(result.rows[0].id,'booking-id');assert.equal(result.rows[0].name,'Surin trip');assert.equal(result.total,1);assert.equal(result.actorId,viewer);assert.deepEqual(result.employees,[])
 assert.equal(result.rows[0].createdById,null);assert.equal(result.rows[0].createdByName,'System administrator');assert.equal(result.rows[0].priceRequest.requestedByName,'System administrator');assert.equal(result.rows[0].priceRequest.reviewedByName,'Viewer');assert.equal(result.rows[0].staff[0].user.displayName,'System administrator')
 assert.doesNotMatch(JSON.stringify(result),/Owner Name|Private Nick|private@example|Historical|Old Name|00000000-0000-4000-8000-000000000001/)
})
test('viewer own identity is excluded from hidden owners even if viewer is owner',async()=>{
 const {db,calls}=fixture(),input={user:{id:ownerId,displayName:'Owner Name'}}
 assert.equal(await redactOwnerIdentity(db,ownerId,input),input);assert.equal(calls[0].where.id.not,ownerId)
})
test('matching ordinary text and authentication tokens are not rewritten',async()=>{
 const {db}=fixture(),input={title:'Owner Name',note:'Owner Name authored this note',token:ownerId,amount:'123.45',name:'Owner Name',email:'different@example.test'}
 assert.deepEqual(await redactOwnerIdentity(db,viewer,input),input)
})

test('visible viewer attribution retains its own name even when an owner uses the same name',async()=>{
 const {db}=fixture(),input={actorId:viewer,actorName:'Owner Name',actor:{displayName:'Owner Name'},user:{id:viewer,displayName:'Owner Name'}}
 assert.deepEqual(await redactOwnerIdentity(db,viewer,input),input)
})

test('own profile and visible relation still recurse into hidden-owner history',async()=>{
 const {db}=fixture(),history={actorId:ownerId,actorName:'Old owner',actor:{displayName:'Old owner',phone:'private'}}
 const input={user:{id:viewer,displayName:'Owner Name',history:[history]},actorId:viewer,actor:{displayName:'Owner Name',history:[history]}}
 const result=await redactOwnerIdentity(db,viewer,input)
 assert.equal(result.user.displayName,'Owner Name');assert.equal(result.actor.displayName,'Owner Name')
 assert.equal(result.user.history[0].actorId,null);assert.equal(result.actor.history[0].actorName,'System administrator');assert.doesNotMatch(JSON.stringify(result),/Old owner|private/)
})

test('own identity never exempts hidden creator attribution on that same record',async()=>{
 const {db}=fixture(),input={id:viewer,name:'Owner Name',createdById:ownerId,createdByName:'Historical owner',actorId:ownerId,actorName:'Historical owner'}
 const result=await redactOwnerIdentity(db,viewer,input)
 assert.equal(result.id,viewer);assert.equal(result.name,'Owner Name');assert.equal(result.createdById,null);assert.equal(result.createdByName,'System administrator');assert.equal(result.actorName,'System administrator')
})

test('another identified staff member keeps a colliding display name',async()=>{
 const {db}=fixture(),input={users:[{id:'ordinary-user',displayName:'Owner Name',email:'ordinary@example.test'}]}
 assert.deepEqual(await redactOwnerIdentity(db,viewer,input),input)
})


test('actual By aliases hide owner IDs and historical sibling names while preserving other staff',async()=>{
 const {db}=fixture(),input={approvedBy:ownerId,approvedByName:'Historic',issuedById:ownerId,issuedByName:'Historic',financeReviewedBy:ownerId,financeReviewedByName:'Historic',uploadedBy:ownerId,updatedBy:viewer,updatedByName:'Owner Name',createdAt:'2026-10-03',owner:'Owner Name',assignee:'Owner Name',crew:[{userId:ownerId,name:'Historic',role:'GUIDE'}]}
 const result=await redactOwnerIdentity(db,viewer,input)
 assert.equal(result.approvedBy,null);assert.equal(result.issuedById,null);assert.equal(result.financeReviewedBy,null);assert.equal(result.uploadedBy,null);assert.equal(result.financeReviewedByName,'System administrator');assert.equal(result.issuedByName,'System administrator');assert.equal(result.updatedBy,viewer);assert.equal(result.updatedByName,'Owner Name');assert.equal(result.createdAt,input.createdAt);assert.equal(result.owner,'System administrator');assert.equal(result.assignee,'System administrator');assert.equal(result.crew[0].name,'System administrator');assert.doesNotMatch(JSON.stringify(result),/Historic/)
})
