// Persistent, isolated demo. Default execution validates in a rolled-back transaction.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {loadEnvFile} from 'node:process'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {profileInclude} from '../src/modules/identity-access/policy.js'
import {managementScope} from '../src/modules/identity-access/user-management.js'
import {catalog,initialValues,validateCatalog} from '../../packages/contracts/catalog.js'
import {saveSettings} from '../src/modules/service-catalog/settings.js'
import {saveOperationCatalog} from '../src/modules/operations/catalog.js'
import {getBlueprint,saveBooking,bookingStatus} from '../src/modules/operations/bookings.js'
import {saveRun,dispatchCommand} from '../src/modules/operations/dispatch.js'
import {stockCommand,boatPreparation} from '../src/modules/operations/stock.js'
import {prepareDailySummary} from '../src/modules/operations/notifications.js'

const envIndex=process.argv.indexOf('--env-file')
loadEnvFile(envIndex<0?new URL('../.env',import.meta.url):process.argv[envIndex+1])
assert.equal(process.env.SUPABASE_PROJECT_REF,'qplzgpyidszxbtbyknjc','Unexpected database target')
assert.equal(process.env.APP_ENV,'preview','Unexpected environment')
const apply=process.argv.includes('--apply'),prefix='DEMO-FLOW-260913',date='2026-09-20'
const id=key=>{const h=createHash('sha256').update(prefix+':'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`}
const pool=createDatabasePool(),prisma=createPrisma(pool),rollback=Error('DEMO_VALIDATED_ROLLBACK')
let stage='initialize',report
try{
 await prisma.$transaction(async tx=>{
  // Domain services use their normal transactions and locks inside this atomic fixture.
  const p={...tx,$transaction:fn=>fn(tx)}
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(2609132026)`
  const existing=await tx.tourBooking.findUnique({where:{id:id('booking-9')}})
  if(existing){
   assert.equal(existing.name,'DEMO FLOW · 09 จบทริป คืนของแล้ว','Demo identity mismatch')
   const rows=await tx.tourBooking.findMany({where:{id:{in:Array.from({length:10},(_,i)=>id('booking-'+i))}},select:{code:true,name:true,status:true}})
   assert.equal(rows.length,10,'Demo data incomplete; manual review required')
   report={result:'ALREADY_PRESENT',date,bookings:rows,note:'Existing demo data preserved; no stock replay or user edits overwritten.'};return
  }
  const actor=(await p.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude})).find(u=>managementScope(u)?.company)?.id
  assert.ok(actor,'Active company manager required')
  assert.equal(await p.operationDailySnapshot.count({where:{serviceDate:new Date(date+'T00:00:00Z')}}),0,'Choose an unused demo date before creating daily snapshots')
  const created={}
  async function add(entity,key,data){
   stage=entity+':'+key
   const definition=catalog[entity],input={...initialValues(entity),...data,id:id(key),version:0}
   if(definition.fields.some(f=>f.key==='code'))input.code=prefix+'-'+key.toUpperCase()
   if(definition.fields.some(f=>f.key==='name'))input.name='DEMO FLOW · '+data.name
   const {errors}=validateCatalog(entity,input);assert.deepEqual(errors,{},stage)
   assert.equal(await p[definition.model].count({where:{id:input.id}}),0,'Partial/colliding fixture; review before applying')
   const result=await (definition.operation?saveOperationCatalog:saveSettings)(p,actor,entity,input)
   created[entity]=(created[entity]||0)+1;return result.row
  }
  const agents=[]
  for(let i=1;i<=2;i++)agents.push(await add('partners','agent'+i,{name:'Agent '+i,roles:['SALES_AGENT'],paymentTerms:'ข้อมูลสาธิตเท่านั้น ราคานี้ไม่ใช่ข้อตกลงจริง'}))
  const operator=await add('partners','operator',{name:'ผู้จัดทัวร์พันธมิตร',roles:['TOUR_OPERATOR','SERVICE_PROVIDER']})
  const transport=await add('partners','transport',{name:'ผู้ให้บริการรถรับจ้าง',roles:['TRANSPORT_PROVIDER']})
  await add('partners','supplier',{name:'ผู้จำหน่ายอุปกรณ์และเครื่องดื่ม',roles:['SERVICE_PROVIDER']})
  const channels=[]
  for(const [key,name,kind] of [['direct','จองตรง','DIRECT'],['agent','จองผ่าน Agent','AGENT'],['walkin','Walk-in','DIRECT']])channels.push(await add('channels','ch-'+key,{name,kind}))
  const hotels=[]
  for(let i=1;i<=4;i++)hotels.push(await add('locations','hotel'+i,{name:'โรงแรมตัวอย่าง '+i,kind:'HOTEL',zone:i<=2?'โซนเหนือ':'โซนใต้',pickupNotes:'จุดรับสาธิต: ล็อบบี้'}))
  for(const [key,kind,name]of[['pier','PIER','ท่าเรือสาธิต'],['airport','AIRPORT','สนามบินสาธิต'],['point','PICKUP_POINT','จุดนัดพบสาธิต']])await add('locations',key,{name,kind,zone:'DEMO'})
  const boat=await add('vehicles','boat',{name:'เรือสาธิต 24 ที่นั่ง',kind:'SPEEDBOAT',capacity:'24',engineCount:'2',totalCapacity:'27',expectedCrew:'3',ownership:'GREENVIEW',purposes:['PASSENGER_TRANSFER']})
  const van=await add('vehicles','van',{name:'รถตู้สาธิต รอจัดคนขับ',kind:'VAN',capacity:'12',totalCapacity:'13',expectedCrew:'1',ownership:'GREENVIEW',purposes:['PASSENGER_TRANSFER']})
  await add('vehicles','hirevan',{name:'รถตู้รับจ้างสาธิต',kind:'VAN',capacity:'12',totalCapacity:'13',expectedCrew:'1',ownership:'PARTNER',providerId:transport.id,hireCost:'1800',purposes:['PASSENGER_TRANSFER']})
  await add('vehicles','cargo',{name:'รถขนของสาธิต',kind:'PICKUP_TRUCK',capacity:'2',totalCapacity:'3',expectedCrew:'1',ownership:'GREENVIEW',purposes:['PURCHASING','CARGO']})
  await add('vehicles','longtail',{name:'เรือหางยาวสาธิต',kind:'LONGTAIL_BOAT',capacity:'10',totalCapacity:'11',expectedCrew:'1',ownership:'GREENVIEW',purposes:['PASSENGER_TRANSFER']})
  const stores={}
  for(const [key,name,kind]of[['main','คลังหลัก','WAREHOUSE'],['boat','คลังประจำเรือ','BOAT'],['island','คลังบนเกาะ','ISLAND'],['clean','จุดรับคืนและทำความสะอาด','OTHER']])stores[key]=await add('stores','store-'+key,{name,kind,notes:'ข้อมูลสาธิต ไม่ใช่ยอดทรัพย์สินจริง'})
  const resources={}
  for(const [key,name,category,baseUnit,extra]of[
   ['transfer','รถรับส่งโรงแรม–ท่าเรือ','TRANSFER','PERSON',{}],['sea','เรือไปกลับ','TOUR_BOAT','PERSON',{serviceMode:'JOIN'}],['charter','เรือเหมาลำ','TOUR_BOAT','BOAT',{serviceMode:'CHARTER'}],['long','เรือหางยาว','LONGTAIL_BOAT','PERSON',{serviceMode:'JOIN'}],
   ['breakfast','อาหารเช้า','MEAL','PERSON_MEAL',{mealPeriod:'BREAKFAST'}],['lunch','อาหารกลางวัน','MEAL','PERSON_MEAL',{mealPeriod:'LUNCH'}],['dinner','อาหารเย็น','MEAL','PERSON_MEAL',{mealPeriod:'DINNER'}],
   ['tent','เต็นท์ 2 คน','ACCOMMODATION','ROOM_NIGHT',{accommodationType:'STANDARD_TENT',occupancy:'2',verificationStatus:'VERIFIED'}],['bungalow','บังกะโล 4 คน','ACCOMMODATION','ROOM_NIGHT',{accommodationType:'BUNGALOW',occupancy:'4',verificationStatus:'VERIFIED'}],['park','ค่าบริการอุทยานสาธิต','PARK_FEE','PERSON',{}]
  ])resources[key]=await add('services','svc-'+key,{name,category,baseUnit,ownership:'GREENVIEW',salePrice:'200',costPrice:'100',notes:'อัตราสาธิต ไม่ใช่ราคาจริง',...extra})
  for(const [key,name,category,baseUnit,size]of[['mask','หน้ากากดำน้ำ','SNORKEL_MASK','PIECE','ผู้ใหญ่'],['fins','ตีนกบ','FINS','PAIR','M'],['towel','ผ้าเช็ดตัว','TOWEL','PIECE','มาตรฐาน'],['adultvest','เสื้อชูชีพผู้ใหญ่','LIFEJACKET','PIECE','ผู้ใหญ่'],['childvest','เสื้อชูชีพเด็ก','LIFEJACKET','PIECE','เด็ก'],['tools','ชุดเครื่องมือส่วนกลาง','OTHER','PIECE','1 ชุด'],['spare','อะไหล่เรือสาธิต','OTHER','PIECE','ตัวอย่าง']])resources[key]=await add('equipment','eq-'+key,{name,category,baseUnit,size,salePrice:'50',costPrice:'300',notes:'ข้อมูลสาธิต ไม่ใช่ทะเบียนทรัพย์สินจริง'})
  for(const [key,name,category,baseUnit]of[['water','น้ำดื่ม','WATER','BOTTLE'],['soft','น้ำอัดลม','SOFT_DRINK','BOTTLE'],['juice','น้ำผลไม้','JUICE','BOTTLE'],['melon','แตงโม','WATERMELON','FRUIT'],['pineapple','สับปะรด','PINEAPPLE','FRUIT'],['cleaner','น้ำยาทำความสะอาด','OTHER','BOTTLE']])resources[key]=await add('consumables','use-'+key,{name,category,baseUnit,salePrice:'20',costPrice:'10',...(baseUnit==='BOTTLE'?{packSize:'12',caseSize:'24',size:'ขนาดสาธิต'}:{})})
  for(const r of Object.values(resources).filter(r=>r.kind!=='SERVICE')){
   stage='receive:'+r.code
   await stockCommand(p,actor,{id:id('receive-'+r.id),action:'RECEIVE',resourceId:r.id,locationId:stores.main.id,quantity:r.baseUnit==='BOTTLE'?10:100,unit:r.baseUnit==='BOTTLE'?'CASE':'BASE',lotLabel:prefix+'-OPENING',receivedOn:'2026-09-13',unitCost:r.costPrice?.toString()||'0',note:'ยอดยกมาสาธิตเท่านั้น'})
  }
  console.log('DEMO validation: master data and opening stock ready')
  async function balance(resource,location=stores.main,condition='READY'){return p.stockBalance.findFirstOrThrow({where:{lot:{resourceId:resource.id},locationId:location.id,condition,quantity:{gt:0}}})}
  let b=await balance(resources.water)
  await stockCommand(p,actor,{id:id('transfer-water'),action:'TRANSFER',balanceId:b.id,version:b.version,quantity:2,unit:'PACK',destinationId:stores.island.id,note:'โอนน้ำ 2 แพ็ก = 24 ขวดไปคลังเกาะ'})
  b=await balance(resources.spare)
  await stockCommand(p,actor,{id:id('damaged-spare'),action:'CONDITION',balanceId:b.id,version:b.version,quantity:2,condition:'DAMAGED',note:'ตัวอย่างแยกอะไหล่ชำรุด ห้ามนำไปใช้งาน'})
  const tours=[]
  for(const [i,name,journeyMode,durationDays]of[[0,'วันเดียวครบชุด','FIXED','1'],[1,'ค้างคืน 2 วัน','FIXED','2'],[2,'เปิดวันกลับ','OPEN_RETURN',''],[3,'ขาไปอย่างเดียว','OUTBOUND_ONLY',''],[4,'ขากลับอย่างเดียว','RETURN_ONLY',''],[5,'ทัวร์พันธมิตร','FIXED','1']]){
   const tour=await add('tours','tour'+i,{name,journeyMode,durationDays,ownership:i===5?'PARTNER':'GREENVIEW',...(i===5?{operatorId:operator.id,supplierPricing:'NET',supplierAdultNet:'1700',supplierChildNet:'1000'}:{}),adultPrice:'2500',childPrice:'1500',route:'เส้นทางสาธิต ท่าเรือ–เกาะ–ท่าเรือ',confirmationMode:'INSTANT',childPolicy:'นโยบายสาธิต ให้ตรวจอายุเด็กก่อนขาย'})
   tours.push(tour)
   const keys=['sea','lunch','mask','water','adultvest','childvest','towel',...(i===1?['tent','dinner','breakfast']:[])]
   for(const key of keys)await add('components','cmp'+i+'-'+key,{tourId:tour.id,resourceId:resources[key].id,selection:key==='towel'?'OPTIONAL':key==='lunch'?'INCLUDED':'REQUIRED',basis:key==='tent'?'PER_ROOM_NIGHT':key==='adultvest'?'PER_ADULT':key==='childvest'?'PER_CHILD':'PER_PERSON',quantity:key==='water'?'2':'1',usagePoint:key==='tent'?'ISLAND':'BOAT',day:'1',...(key==='lunch'?{removalCredit:'100'}:{})})
  }
  // Transfers are optional: the completed example is boat-only; road jobs await a driver.
  await add('components','cmp-transfer',{tourId:tours[0].id,resourceId:resources.transfer.id,selection:'OPTIONAL',basis:'PER_PERSON',quantity:'1',usagePoint:'TRANSFER',day:'1'})
  for(let i=0;i<agents.length;i++){
   const agreement=await add('agreements','agreement'+i,{name:'ตัวอย่างข้อตกลง Agent '+(i+1)+' (ยังไม่เซ็น)',agentId:agents[i].id,startsOn:'2026-01-01',endsOn:'2026-12-31'})
   for(let j=0;j<tours.length;j++)await add('rates','rate'+i+'-'+j,{agentId:agents[i].id,tourId:tours[j].id,agreementId:agreement.id,adultPrice:i?'2200':'2100',childPrice:i?'1300':'1200'})
  }
  console.log('DEMO validation: programs, components and agent prices ready')
  const bookings=[]
  const scenarios=[['ร่าง รอข้อมูลแพ้อาหาร',0],['ยืนยันแล้ว รอจัดรถและเรือ',0],['จัดรถแล้ว รอคนขับ',0],['เตรียมของแล้ว รอคืน',0],['ค้างคืน รอจัดงาน',1],['เปิดวันกลับ รอนัดวัน',2],['ขาไปอย่างเดียว',3],['ขากลับอย่างเดียว',4],['ทัวร์พันธมิตร ยกเลิก',5],['จบทริป คืนของแล้ว',0]]
  for(let i=0;i<scenarios.length;i++){
   stage='booking:'+i
   const [name,tourIndex]=scenarios[i],query={tourId:tours[tourIndex].id,serviceDate:date,adults:'2',children:'1',...(i%2?{agentId:agents[i%agents.length].id}:{})}
   if(tourIndex===2)query.returnStatus='PENDING'
   const plan=await getBlueprint(p,actor,new URLSearchParams(query))
   const row=(await saveBooking(p,actor,{...query,id:id('booking-'+i),version:0,name:'DEMO FLOW · '+String(i).padStart(2,'0')+' '+name,adults:2,children:1,hotelId:hotels[i%4].id,channelId:channels[i%2].id,room:'DEMO-'+(101+i),pickupPoint:'ล็อบบี้โรงแรมสาธิต',dropoffPoint:'โรงแรมสาธิต',paymentTerms:i%2?'AGENT_CREDIT':'COUNTER',allergyStatus:i===0?'UNKNOWN':i===3?'HAS':'NONE',allergies:i===3?'ตัวอย่าง: แพ้ถั่ว':'' ,specialRequirements:[],requestNotes:'ข้อมูลทดลองทั้งรายการ ราคาและสถานะไม่ใช่ธุรกรรมจริง',lines:plan.lines.map(l=>({componentId:l.componentId,resourceId:l.resourceId,quantity:l.quantity,selected:l.quantity>0&&(l.resource.id!==resources.transfer.id||[1,2].includes(i))}))})).row
   bookings.push(row)
   if(i>0)await bookingStatus(p,actor,{id:id('confirm-'+i),bookingId:row.id,version:row.version,action:'CONFIRM'})
   if(i===8){const current=await p.tourBooking.findUniqueOrThrow({where:{id:row.id}});await bookingStatus(p,actor,{id:id('cancel-'+i),bookingId:row.id,version:current.version,action:'CANCEL'})}
  }
  const crew=[]
  console.log('DEMO validation: 10 booking scenarios ready')
  for(const [name,role]of[['DEMO กัปตัน ก','CAPTAIN'],['DEMO ผู้ช่วยเรือ ก','ASSISTANT_CAPTAIN'],['DEMO ไกด์ ก','GUIDE']]){
   const u=await p.userProfile.findFirst({where:{displayName:name,status:'ACTIVE'},include:{roles:true}})
   assert.ok(u?.roles.some(r=>r.roleCode===role),'Existing matching DEMO crew required: '+role);crew.push({userId:u.id,role})
  }
  const runs=[]
  async function run(key,resource,vehicle,direction,staff){
   stage='run:'+key
   const road=resource.id===resources.transfer.id,back=direction==='RETURN'
   const row=(await saveRun(p,actor,{id:id(key),version:0,code:prefix+'-'+key.toUpperCase(),name:'DEMO FLOW · '+(road?'รถ รอจัดคนขับ':'เรือ')+' '+direction,kind:road?'VEHICLE':'BOAT',direction,period:back?'PM':'AM',resourceId:resource.id,vehicleId:vehicle.id,startsAt:date+(road?(back?' 17:00':' 07:00'):(back?' 15:00':' 09:00')),endsAt:date+(road?(back?' 18:00':' 08:30'):(back?' 16:30':' 10:30')),capacity:road?12:24,staff})).row
   runs.push(row);return row
  }
  const seaOut=await run('sea-out',resources.sea,boat,'OUTBOUND',crew),seaBack=await run('sea-back',resources.sea,boat,'RETURN',crew)
  const roadOut=await run('road-out',resources.transfer,van,'OUTBOUND',[]),roadBack=await run('road-back',resources.transfer,van,'RETURN',[])
  for(const i of [2,3,9])for(const r of [seaOut,seaBack,...(i===2?[roadOut,roadBack]:[])]){
   stage='assign:'+i+':'+r.code
   const line=bookings[i].lines.find(l=>l.resourceId===(r.kind==='BOAT'?resources.sea.id:resources.transfer.id))
   const current=await p.dispatchRun.findUniqueOrThrow({where:{id:r.id}})
   await dispatchCommand(p,actor,{id:id('assign-'+i+'-'+r.id),runId:r.id,version:current.version,action:'ASSIGN',bookingLineId:line.id,adults:2,children:1,...(r.kind==='VEHICLE'?{pickupAt:date+(r.direction==='OUTBOUND'?' 07:15':' 17:15'),dropoffPoint:'DEMO จุดส่งสาธิต'}:{})})
   if(i===9){
    const assignment=await p.dispatchAssignment.findFirstOrThrow({where:{runId:r.id,bookingLineId:line.id}}),latest=await p.dispatchRun.findUniqueOrThrow({where:{id:r.id}})
    await dispatchCommand(p,actor,{id:id('actual-'+r.id),runId:r.id,version:latest.version,action:'ACTUAL',assignmentId:assignment.id,actualAdults:2,actualChildren:1})
   }
  }
  for(const i of [3,9])for(const line of bookings[i].lines.filter(l=>l.selected&&l.resource.kind!=='SERVICE')){
   stage='issue:'+i+':'+line.resourceId
   const source=await balance(line.resource)
   const movement=(await stockCommand(p,actor,{id:id('issue-'+i+'-'+line.resourceId),action:'ISSUE',balanceId:source.id,version:source.version,quantity:line.quantity,destinationId:stores.boat.id,custodian:'DEMO ทีมเรือ',bookingLineId:line.id,runId:seaOut.id,note:'เตรียมของให้ Booking สาธิต'})).row
   if(i===9)await stockCommand(p,actor,{id:id('settle-'+line.resourceId),action:'SETTLE',issueId:movement.details.issueId,quantity:line.quantity,disposition:line.resource.kind==='EQUIPMENT'?'RETURN_CLEANING':'CONSUMED',...(line.resource.kind==='EQUIPMENT'?{locationId:stores.clean.id}:{}),note:'จบทริปสาธิต: ใช้เครื่องดื่มแล้ว / คืนอุปกรณ์รอล้าง'})
  }
  console.log('DEMO validation: dispatch, issues and returns ready')
  b=await balance(resources.mask,stores.clean,'CLEANING')
  await stockCommand(p,actor,{id:id('washed-mask'),action:'CONDITION',balanceId:b.id,version:b.version,quantity:1,condition:'READY',note:'ตัวอย่างล้างหน้ากากแล้ว 1 ชิ้น เหลือรอล้าง 2 ชิ้น'})
  stage='complete-booking'
  const completed=await p.tourBooking.findUniqueOrThrow({where:{id:bookings[9].id}})
  await bookingStatus(p,actor,{id:id('complete'),bookingId:completed.id,version:completed.version,action:'COMPLETE'})
  for(const kind of ['CLOSE','SUMMARY'])await prepareDailySummary(p,actor,{kind,serviceDate:date},undefined,{})
  stage='verify'
  const preparation=await boatPreparation(p,actor,new URLSearchParams({runId:seaOut.id}))
  assert.ok(preparation.rows.some(r=>r.outstandingQty>0),'Outstanding equipment example required')
  assert.ok(preparation.rows.some(r=>r.remainingQty>0),'Unprepared example required')
  assert.equal((await p.tourBooking.findUniqueOrThrow({where:{id:completed.id}})).status,'COMPLETED')
  assert.equal(await p.tourBooking.count({where:{id:{in:bookings.map(b=>b.id)}}}),10)
  for(const resource of Object.values(resources).filter(r=>r.kind!=='SERVICE')){
   const balances=await p.stockBalance.findMany({where:{lot:{resourceId:resource.id}}})
   const issues=await p.stockIssue.findMany({where:{lot:{resourceId:resource.id}}})
   const remaining=balances.reduce((n,b)=>n+b.quantity,0)+issues.reduce((n,i)=>n+i.quantity-i.settledQty,0)
   const consumed=resource.id===resources.water.id?6:0
   assert.equal(remaining+consumed,resource.baseUnit==='BOTTLE'?240:100,'Stock conservation: '+resource.code)
  }
  assert.equal(await p.operationNotificationOutbox.count({where:{serviceDate:new Date(date+'T00:00:00Z')}}),0,'No outbound notifications allowed')
  report={result:apply?'PERSISTED':'VALIDATED_ROLLBACK',prefix,date,created,bookings:10,runs:runs.length,scenarios:bookings.map(b=>({code:b.code,name:b.name})),urls:{booking:'http://localhost:5174/operations/bookings',guide:'http://localhost:5174/operations/guide?date='+date,driver:'http://localhost:5174/operations/driver?date='+date}}
  if(!apply)throw rollback
 },{timeout:600000,maxWait:20000}).catch(error=>{if(error!==rollback)throw error})
 console.log(JSON.stringify(report,null,2))
}catch(error){console.error(JSON.stringify({stage,code:error.code||error.name,message:error.name==='AssertionError'?error.message:undefined,fields:error.fields||error.meta?.fields}));process.exitCode=1}
finally{await prisma.$disconnect();await pool.end()}
