import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {loadEnvFile} from 'node:process'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {profileInclude} from '../src/modules/identity-access/policy.js'
import {saveUserAccess} from '../src/modules/identity-access/user-access.js'
import {saveCompanyWork,commandCompanyWork,listCompanyWork} from '../src/modules/company-work/service.js'
import {seedPersonnelFinanceDemo} from '../src/modules/personnel-finance/demo.js'
import {commandPersonnelFinance,listPersonnelFinance} from '../src/modules/personnel-finance/service.js'
import {stockCommand} from '../src/modules/operations/stock.js'
const arg=process.argv.indexOf('--env-file');loadEnvFile(arg<0?new URL('../.env',import.meta.url):process.argv[arg+1])
assert.equal(process.env.SUPABASE_PROJECT_REF,'qplzgpyidszxbtbyknjc');assert.equal(process.env.APP_ENV,'preview')
const apply=process.argv.includes('--apply'),pool=createDatabasePool(),prisma=createPrisma(pool),rollback=Error('VERIFIED_ROLLBACK')
const id=key=>{const h=createHash('sha256').update('DEMO-COMPANY-260913:'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`}
let stage='start',report
try{
 await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const p={...tx,$transaction:fn=>fn(tx)}
  const already=await p.companyWorkCommand.findUnique({where:{id:id('complete-marker')}})
  if(already){report={result:'ALREADY_PRESENT',note:'Preserved all current demo data and user edits.'};return}
  const users=await p.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude})
  const admin=users.find(u=>u.roles.some(r=>r.roleCode==='ADMIN_MANAGER'&&r.scope==='COMPANY'))
  const manager=users.find(u=>u.roles.some(r=>r.roleCode==='MANAGER'&&r.scope==='COMPANY'))
  const worker=users.find(u=>u.displayName==='DEMO กัปตัน ก')
  assert.ok(admin&&manager&&worker,'Existing managers and DEMO crew required')
  const demoPrefix='DEMO-FLOW-260913-',byCode=(model,suffix)=>p[model].findUniqueOrThrow({where:{code:demoPrefix+suffix}})
  const main=await byCode('stockLocation','STORE-MAIN'),clean=await byCode('stockLocation','STORE-CLEAN'),tools=await byCode('operationResource','EQ-TOOLS'),water=await byCode('operationResource','USE-WATER'),supplier=await byCode('businessPartner','SUPPLIER'),boat=await byCode('fleetVehicle','BOAT')
  const current=await p.userProfile.findUniqueOrThrow({where:{id:worker.id},include:profileInclude})
  // A special duty on the existing fictitious worker demonstrates role versus duty.
  if(!current.permissionOverrides.some(o=>o.permissionCode==='housekeeping.view'))await saveUserAccess(p,admin.id,worker.id,{version:current.accessVersion,roles:current.roles.map(r=>r.roleCode),overrides:[...current.permissionOverrides.map(({permissionCode,effect,startsAt,expiresAt})=>({permissionCode,effect,startsAt:startsAt?.toISOString()||null,expiresAt:expiresAt?.toISOString()||null})),{permissionCode:'housekeeping.view',effect:'ALLOW'}],reason:'DEMO only: allow existing DEMO worker to try assigned cleaning; no actual employee duties changed.'})
  async function save(kind,key,name,payload,actor=admin.id){stage='save:'+key;const result=await saveCompanyWork(p,actor,{id:id(key),kind,version:0,name:'DEMO FLOW · '+name,payload});return result.row}
  async function command(kind,recordId,action,data={},actor=admin.id,key=randomUUID()){
   stage='command:'+action
   const row=kind==='PURCHASE'?await p.purchaseOrder.findUniqueOrThrow({where:{id:recordId}}):await p.companyWorkRecord.findUniqueOrThrow({where:{id:recordId}})
   return commandCompanyWork(p,actor,{id:id(key),kind,recordId,version:row.version,action,data})
  }
  await save('RESPONSIBILITY','custodian','ผู้ดูแลคลังสาธิต',{storeId:main.id,primaryUserId:worker.id,deputyUserId:'',reason:'DEMO primary custodian only; existing real warehouses untouched'})
  const zone=await save('ZONE','zone','โซนห้องอุปกรณ์',{description:'DEMO โซนห้องเก็บอุปกรณ์และทางเดิน',checklist:['เช็ดชั้นเก็บอุปกรณ์','ทำความสะอาดพื้น','แยกของชำรุด']})
  const schedules=[]
  for(const [key,frequency,startsOn,endsOn,customDates]of[['weekly','WEEKLY','2026-09-13','2026-10-04',[]],['monthly','MONTHLY','2026-09-30','2026-12-31',[]],['custom','CUSTOM','2026-09-14','2026-09-25',['2026-09-14','2026-09-18','2026-09-25']]]){
   const schedule=await save('SCHEDULE',key,'ทำความสะอาด '+frequency,{jobKind:'CLEANING',zoneId:zone.id,storeId:'',assigneeId:worker.id,frequency,startsOn,endsOn,customDates,checklist:zone.payload.checklist})
   await command('SCHEDULE',schedule.id,'GENERATE',{through:endsOn});const count=await p.companyWorkRecord.count({where:{parentId:schedule.id}})
   const replay=await command('SCHEDULE',schedule.id,'GENERATE',{through:endsOn});assert.equal(replay.generated,0);assert.equal(await p.companyWorkRecord.count({where:{parentId:schedule.id}}),count);schedules.push(schedule)
  }
  const firstJob=await p.companyWorkRecord.findFirstOrThrow({where:{parentId:schedules[0].id},orderBy:{dueOn:'asc'}})
  await command('JOB',firstJob.id,'COMPLETE',{checked:firstJob.payload.checklist,evidence:'',note:'DEMO งานครบ รอหัวหน้าตรวจ'},worker.id)
  await command('JOB',firstJob.id,'ACCEPT',{reason:'DEMO ตรวจครบทุกจุดแล้ว'},manager.id)
  const secondJob=await p.companyWorkRecord.findFirstOrThrow({where:{parentId:schedules[1].id},orderBy:{dueOn:'asc'}})
  await command('JOB',secondJob.id,'COMPLETE',{checked:secondJob.payload.checklist,evidence:'',note:'DEMO เสร็จแล้ว รอตรวจรับ'},worker.id)
  console.log('PASS cleaning: weekly/monthly/custom generation, replay, completion and acceptance')
  const request=await save('STOCK_REQUEST','stock-request','เบิกเครื่องมือซ่อมเรือ',{storeId:main.id,destinationId:clean.id,resourceId:tools.id,quantity:3,dueOn:'2026-09-25',vehicleId:boat.id,reason:'DEMO เตรียมชุดเครื่องมือซ่อมเรือ'},worker.id)
  await command('STOCK_REQUEST',request.id,'SUBMIT',{},worker.id)
  await command('STOCK_REQUEST',request.id,'APPROVE',{reason:'DEMO อนุมัติ 3 ชุด'},manager.id)
  let balance=await p.stockBalance.findFirstOrThrow({where:{lot:{resourceId:tools.id},locationId:main.id,condition:'READY'}})
  await command('STOCK_REQUEST',request.id,'ISSUE',{balanceId:balance.id,quantity:3})
  const issued=await p.companyWorkRecord.findUniqueOrThrow({where:{id:request.id}}),issueId=issued.payload.issues[0].id
  await command('STOCK_REQUEST',request.id,'SETTLE',{issueId,quantity:2,disposition:'RETURN_READY',locationId:main.id,note:'DEMO คืนพร้อมใช้ 2 ชุด'})
  const currentIssue=await p.stockIssue.findUniqueOrThrow({where:{id:issueId}});assert.equal(currentIssue.quantity-currentIssue.settledQty,1)
  const countSchedule=await save('SCHEDULE','count-schedule','ตรวจนับคลังรายเดือน',{jobKind:'COUNT',zoneId:'',storeId:main.id,assigneeId:worker.id,frequency:'MONTHLY',startsOn:'2026-09-13',endsOn:'2026-11-13',customDates:[],checklist:['ตรวจจำนวนจริง','แยกของชำรุด','บันทึกผลตรวจนับ']})
  await command('SCHEDULE',countSchedule.id,'GENERATE',{through:'2026-11-13'})
  const countJob=await p.companyWorkRecord.findFirstOrThrow({where:{parentId:countSchedule.id},orderBy:{dueOn:'asc'}})
  balance=await p.stockBalance.findUniqueOrThrow({where:{id:balance.id}})
  const observed=await save('COUNT','count','ผลตรวจนับเครื่องมือ',{balanceId:balance.id,countedQuantity:balance.quantity-1,jobId:countJob.id,reason:'DEMO พบจำนวนจริงน้อยกว่า 1 ชุด เพื่อทดสอบปรับยอดหลังอนุมัติ'},worker.id)
  await command('COUNT',observed.id,'SUBMIT',{},worker.id)
  assert.equal((await p.stockBalance.findUniqueOrThrow({where:{id:balance.id}})).quantity,balance.quantity,'Submitting count must not change stock')
  await command('COUNT',observed.id,'APPROVE',{reason:'DEMO ตรวจหลักฐานก่อนอนุมัติส่วนต่าง'},manager.id)
  assert.equal((await p.stockBalance.findUniqueOrThrow({where:{id:balance.id}})).quantity,balance.quantity-1)
  await command('JOB',countJob.id,'COMPLETE',{checked:countJob.payload.checklist,evidence:'',note:'DEMO ตรวจนับและอนุมัติแล้ว'},worker.id)
  await command('JOB',countJob.id,'ACCEPT',{reason:'DEMO ตรวจรับงานนับสต๊อก'},manager.id)
  await assert.rejects(stockCommand(p,admin.id,{id:randomUUID(),action:'COUNT',balanceId:balance.id,version:balance.version,countedQuantity:100,note:'Bypass attempt'}),{code:'COUNT_APPROVAL_REQUIRED'})
  const maintenance=await save('MAINTENANCE','maintenance','ตรวจเครื่องยนต์เรือ',{vehicleId:boat.id,resourceId:tools.id,assigneeId:worker.id,dueOn:'2026-09-25',reason:'DEMO ตรวจบำรุงก่อนรอบเดินทาง'},worker.id)
  await command('MAINTENANCE',maintenance.id,'SUBMIT',{},worker.id);await command('MAINTENANCE',maintenance.id,'APPROVE',{reason:'DEMO อนุมัติงานตรวจเรือ'},manager.id)
  console.log('PASS inventory: custody, partial returns, approved counts, maintenance')
  const purchase=await save('PURCHASE','purchase','ซื้อน้ำดื่มเติมคลัง',{supplierId:supplier.id,storeId:main.id,requestId:'',quotationUrl:'',reason:'DEMO สั่งซื้อน้ำดื่มเติมคลัง',lines:[{resourceId:water.id,quantity:24,unitCost:'10'}]})
  await command('PURCHASE',purchase.id,'SUBMIT')
  await assert.rejects(command('PURCHASE',purchase.id,'APPROVE',{reason:'Self approval attempt'}),{code:'INDEPENDENT_APPROVER_REQUIRED'})
  await command('PURCHASE',purchase.id,'APPROVE',{reason:'DEMO ตรวจราคาและจำนวน'},manager.id)
  const receipt={id:id('receive-purchase'),kind:'PURCHASE',recordId:purchase.id,version:3,action:'RECEIVE',data:{lineId:purchase.lines[0].id,quantity:12,receivedOn:'2026-09-13',expiresOn:'2027-01-01',lotLabel:'DEMO-COMPANY-RECEIPT',note:'DEMO รับครึ่งแรก 12 ขวด'}}
  const received=await commandCompanyWork(p,admin.id,receipt),receivedAgain=await commandCompanyWork(p,admin.id,receipt)
  assert.equal(received.row.receivedTotal.toString(),'120');assert.equal(receivedAgain.row.version,received.row.version)
  assert.equal(await p.stockLot.count({where:{label:'DEMO-COMPANY-RECEIPT'}}),1,'Receipt replay creates no extra lot')
  const run=await p.dispatchStaff.findFirst({where:{userId:worker.id,run:{code:{startsWith:demoPrefix}}},select:{runId:true}})
  const finance=await seedPersonnelFinanceDemo(p,admin.id,{employeeId:worker.id,runId:run?.runId,sourcePurchaseId:purchase.id})
  await assert.rejects(listPersonnelFinance(p,manager.id,new URLSearchParams({kind:'PAYROLL'})),{code:'PERMISSION_DENIED'})
  // Exercise actual monetary state transitions only in rollback validation. Persisted samples remain drafts.
  if(!apply){
   const reimbursement=finance.find(r=>r.kind==='REIMBURSEMENT'),row=await p.financePersonnelRecord.findUniqueOrThrow({where:{id:reimbursement.id}})
   await commandPersonnelFinance(p,admin.id,{id:randomUUID(),recordId:row.id,version:row.version,action:'SUBMIT',note:'QA submit'})
   await commandPersonnelFinance(p,manager.id,{id:randomUUID(),recordId:row.id,version:row.version+1,action:'APPROVE',note:'QA independent review'})
   await commandPersonnelFinance(p,admin.id,{id:randomUUID(),recordId:row.id,version:row.version+2,action:'PAY',note:'QA rollback only',paidOn:'2026-09-13',reference:'QA-ROLLBACK-NOT-A-PAYMENT'})
  }
  const view=await listCompanyWork(p,admin.id,new URLSearchParams({kind:'PURCHASE'}));assert.ok(view.rows.some(r=>r.id===purchase.id&&r.references.supplierId))
  const jobs=await listCompanyWork(p,worker.id,new URLSearchParams({kind:'JOB'}));assert.ok(jobs.rows.every(j=>j.assigneeId===worker.id))
  const marker={result:apply?'PERSISTED':'VALIDATED_ROLLBACK',jobs:await p.companyWorkRecord.count({where:{kind:'JOB',parentId:{in:[...schedules.map(s=>s.id),countSchedule.id]}}}),financeDrafts:finance.length,purchaseStatus:'PART_RECEIVED',outstandingTools:1}
  await p.companyWorkCommand.create({data:{id:id('complete-marker'),requestHash:hashMarker(),actorId:admin.id,result:marker}})
  report=marker;console.log('PASS purchasing → receipt → supplier request; payroll privacy; API projections')
  if(!apply)throw rollback
 },{timeout:600000,maxWait:20000}).catch(e=>{if(e!==rollback)throw e})
 console.log(JSON.stringify(report,null,2))
}catch(e){console.error(JSON.stringify({stage,code:e.code||e.name,message:e.name==='AssertionError'?e.message:undefined}));process.exitCode=1}
finally{await prisma.$disconnect();await pool.end()}
function hashMarker(){return createHash('sha256').update('DEMO-COMPANY-260913-v1').digest('hex')}
