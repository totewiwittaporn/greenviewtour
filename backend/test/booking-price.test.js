import test from 'node:test'
import assert from 'node:assert/strict'
import { bookingPriceCommand,requirePriceApproval,priceActions } from '../src/modules/operations/booking-price.js'
const id=n=>`a0000000-0000-4000-8000-${String(n).padStart(12,'0')}`
function fixture(){
 let row={id:id(1),version:1,status:'DRAFT',agentId:id(8),adultPrice:'100',childPrice:'50',adults:2,children:1,programSnapshot:{name:'Tour'},lines:[]}
 const commands=new Map(),events=[]
 const profiles={1:{status:'ACTIVE',displayName:'Sales',roles:[{roleCode:'BOOKING',scope:'COMPANY'}]},2:{status:'ACTIVE',displayName:'Manager',roles:[{roleCode:'MANAGER',scope:'COMPANY',role:{permissions:[{permissionCode:'users.read'}]}}]},3:{status:'ACTIVE',roles:[{roleCode:'DRIVER',scope:'SELF'}]}}
 const tx={$executeRaw:async()=>{},userProfile:{findUnique:async({where})=>profiles[Number(where.id.slice(-1))]},tourBooking:{findUnique:async()=>row,update:async({data})=>{row={...row,...data,version:row.version+1};return row}},operationCommand:{findUnique:async({where})=>commands.get(where.id),create:async({data})=>commands.set(data.id,data)},auditEvent:{create:async({data})=>events.push(data)}}
 const prisma={$transaction:fn=>fn(tx)}
 const command=(action,version,extra={})=>({id:id(100+version),bookingId:id(1),version,action,reason:'Reviewed test',...extra})
 return {prisma,command,profiles,events,get row(){return row}}
}
test('proposal keeps standard prices, independent approval applies prices, confirm gate accepts decimal equivalents',async()=>{
 const f=fixture()
 await bookingPriceCommand(f.prisma,id(1),f.command('REQUEST',1,{adultPrice:'90.00',childPrice:'40.00'}))
 assert.equal(f.row.adultPrice,'100')
 assert.throws(()=>requirePriceApproval(f.row),{code:'PRICE_APPROVAL_REQUIRED'})
 await assert.rejects(bookingPriceCommand(f.prisma,id(1),f.command('APPROVE',2)),{code:'PERMISSION_DENIED'})
 await bookingPriceCommand(f.prisma,id(2),f.command('APPROVE',2))
 assert.equal(f.row.adultPrice,'90.00')
 requirePriceApproval({...f.row,adultPrice:'90',childPrice:'40'})
 assert.throws(()=>requirePriceApproval({...f.row,adultPrice:'89'}),{code:'PRICE_APPROVAL_REQUIRED'})
 assert.equal(f.events.length,2)
})
test('Manager cannot approve their own proposal; stale and unauthorized requests have no writes',async()=>{
 const f=fixture()
 await bookingPriceCommand(f.prisma,id(2),f.command('REQUEST',1,{adultPrice:'90',childPrice:'40'}))
 await assert.rejects(bookingPriceCommand(f.prisma,id(2),f.command('APPROVE',2)),{code:'PRICE_REVIEW_NOT_ALLOWED'})
 await assert.rejects(bookingPriceCommand(f.prisma,id(3),f.command('REQUEST',2,{adultPrice:'1',childPrice:'1'})),{code:'PERMISSION_DENIED'})
 await assert.rejects(bookingPriceCommand(f.prisma,id(1),f.command('WITHDRAW',1,{id:id(999)})),{code:'SETTINGS_CONFLICT'})
 assert.equal(f.row.version,2)
})
test('reject blocks confirmation; withdrawal restores standard and new request removes prior approval',async()=>{
 const f=fixture()
 await bookingPriceCommand(f.prisma,id(1),f.command('REQUEST',1,{adultPrice:'90',childPrice:'40'}))
 await bookingPriceCommand(f.prisma,id(2),f.command('REJECT',2))
 assert.throws(()=>requirePriceApproval(f.row),{code:'PRICE_APPROVAL_REQUIRED'})
 await bookingPriceCommand(f.prisma,id(1),f.command('REQUEST',3,{adultPrice:'95',childPrice:'45'}))
 await bookingPriceCommand(f.prisma,id(2),f.command('APPROVE',4))
 await bookingPriceCommand(f.prisma,id(1),f.command('REQUEST',5,{adultPrice:'80',childPrice:'30'}))
 assert.equal(f.row.adultPrice,'100')
 assert.equal(f.row.programSnapshot.priceException.reviewedById,undefined)
 await bookingPriceCommand(f.prisma,id(1),f.command('WITHDRAW',6))
 assert.equal(f.row.adultPrice,'100')
 assert.equal(f.row.programSnapshot.priceException,null)
 requirePriceApproval(f.row)
})
test('duplicate request is idempotent and replay requires current authorization and same actor',async()=>{
 const f=fixture(),input=f.command('REQUEST',1,{adultPrice:'90',childPrice:'40'})
 const result=await bookingPriceCommand(f.prisma,id(1),input)
 assert.deepEqual(await bookingPriceCommand(f.prisma,id(1),input),result)
 assert.equal(f.events.length,1)
 await assert.rejects(bookingPriceCommand(f.prisma,id(2),input),{code:'COMMAND_CONFLICT'})
 f.profiles[1].status='INACTIVE'
 await assert.rejects(bookingPriceCommand(f.prisma,id(1),input),{code:'PERMISSION_DENIED'})
})
test('reject invalid prices, negative total after credits, and non-draft workflow',async()=>{
 const f=fixture()
 for(const adultPrice of ['','-1','1.001','1e2'])await assert.rejects(bookingPriceCommand(f.prisma,id(1),f.command('REQUEST',1,{adultPrice,childPrice:'0'})))
 f.row.lines.push({selected:false,included:true,quantity:1,snapshot:{removalCredit:'200'}})
 await assert.rejects(bookingPriceCommand(f.prisma,id(1),f.command('REQUEST',1,{adultPrice:'0',childPrice:'0'})),{code:'INVALID_NEGOTIATED_TOTAL'})
 f.row.status='CONFIRMED'
 assert.deepEqual(priceActions(f.row,id(2),{booking:true,manager:true}),[])
 await assert.rejects(bookingPriceCommand(f.prisma,id(2),f.command('REQUEST',1,{adultPrice:'90',childPrice:'40'})),{code:'PRICE_REVIEW_NOT_ALLOWED'})
 assert.equal(f.events.length,0)
})
