import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {loadEnvFile} from 'node:process'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {profileInclude} from '../src/modules/identity-access/policy.js'
import {managementScope} from '../src/modules/identity-access/user-management.js'
import {initialValues} from '../../packages/contracts/catalog.js'
import {saveSettings} from '../src/modules/service-catalog/settings.js'
import {saveOperationCatalog} from '../src/modules/operations/catalog.js'
import {saveBooking,bookingStatus} from '../src/modules/operations/bookings.js'
import {saveRun,dispatchCommand,listJobs} from '../src/modules/operations/dispatch.js'
if(!process.argv.includes('--apply')){console.log('Preview fixture only. Pass --apply to persist DEMO records. See docs/validation/van-demo.md.');process.exit(0)}
loadEnvFile(new URL('../.env',import.meta.url))
assert.equal(process.env.APP_ENV,'preview');assert.equal(process.env.SUPABASE_PROJECT_REF,'qplzgpyidszxbtbyknjc')
const pool=createDatabasePool(),p=createPrisma(pool),prefix='DEMO-VAN',date='2026-09-11'
try {
 const actor=(await p.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude})).find(s=>managementScope(s)?.company)?.id;assert.ok(actor)
 async function ensure(entity,model,suffix,data,settings=false){const code=prefix+suffix;return await p[model].findUnique({where:{code}})||(await (settings?saveSettings:saveOperationCatalog)(p,actor,entity,{...initialValues(entity),...data,id:randomUUID(),version:0,code})).row}
 const hotels=[]
 for(let i=1;i<=10;i++)hotels.push(await ensure('locations','pickupLocation','-H'+String(i).padStart(2,'0'),{name:'DEMO โรงแรมตัวอย่าง '+String(i).padStart(2,'0'),kind:'HOTEL',zone:i<=6?'DEMO โซนเหนือ':'DEMO โซนใต้',pickupNotes:'ข้อมูลทดลอง รับที่ล็อบบี้'},true))
 const provider=await ensure('partners','businessPartner','-PROVIDER',{name:'DEMO ผู้ให้บริการรถรับจ้าง',roles:['TRANSPORT_PROVIDER'],contactName:'DEMO ผู้ประสานงานรถ'},true)
 const vans=[]
 for(let i=1;i<=3;i++)vans.push(i<=2?await p.fleetVehicle.findUniqueOrThrow({where:{code:'DEMO-260909-VAN'+i}}):await ensure('vehicles','fleetVehicle','-OWN3',{name:'DEMO รถตู้ 3',kind:'VAN',capacity:'12',totalCapacity:'13',expectedCrew:'1',ownership:'GREENVIEW',purposes:['PASSENGER_TRANSFER'],registration:'DEMO-03'},true))
 vans.push(await ensure('vehicles','fleetVehicle','-HIRE4',{name:'DEMO รถตู้รับจ้าง 4',kind:'VAN',capacity:'12',totalCapacity:'13',expectedCrew:'1',ownership:'PARTNER',providerId:provider.id,purposes:['PASSENGER_TRANSFER'],registration:'DEMO-HIRE04',notes:'DEMO รอยืนยันชื่อและเบอร์คนขับรับจ้าง'},true))
 const service=await ensure('services','operationResource','-SVC',{name:'DEMO รถรับส่งโรงแรม–ท่าเรือ',category:'TRANSFER',baseUnit:'PERSON',ownership:'GREENVIEW',salePrice:'300'})
 const trip=await ensure('trips','operationTrip','-TRIP',{name:'DEMO จัดรถ 4 คัน / 10 โรงแรม',startsAt:date+' 07:00',endsAt:date+' 18:00',capacity:'60'})
 const runs=[]
 for(let vi=0;vi<4;vi++)for(const direction of ['OUTBOUND','RETURN']){
  const back=direction==='RETURN',code=prefix+'-V'+(vi+1)+(back?'-R':'-O')
  runs.push(await p.dispatchRun.findUnique({where:{code}})||(await saveRun(p,actor,{id:randomUUID(),version:0,code,name:`DEMO รถ ${vi+1} ${back?'ขากลับ':'ขาไป'}${vi===3?' · รับจ้าง รอยืนยันคนขับ':''}`,kind:'VEHICLE',direction,period:back?'PM':'AM',resourceId:service.id,vehicleId:vans[vi].id,startsAt:date+(back?' 17:00':' 07:00'),endsAt:date+(back?' 18:00':' 08:30'),capacity:12,staff:[]})).row)
 }
 const sizes=[4,3,3,4,3,3,5,5,5,5,2,2],vehicleFor=[0,0,0,1,1,1,2,2,3,3,0,1],hotelFor=[0,1,2,3,4,5,6,7,8,9,0,3]
 for(let i=0;i<12;i++){
  const code=prefix+'-B'+String(i+1).padStart(2,'0'),hotel=hotels[hotelFor[i]],children=[0,3,6,8].includes(i)?1:0,adults=sizes[i]-children,direction=i>=10?'OUTBOUND':'BOTH',vi=vehicleFor[i]
  const booking=await p.tourBooking.findUnique({where:{code},include:{lines:true}})||(await saveBooking(p,actor,{id:randomUUID(),version:0,code,name:'DEMO ลูกค้ารถ '+String(i+1).padStart(2,'0'),tripId:trip.id,adults,children,paymentTerms:'COUNTER',hotel:hotel.name,room:String(101+i),pickupPoint:'ล็อบบี้ '+hotel.name,dropoffPoint:hotel.name,assistance:i===6?'DEMO มีสัมภาระ 2 ใบ':'',lines:[{resourceId:service.id,quantity:sizes[i],selected:true,dispatchDirection:direction}]})).row
  if(booking.status==='DRAFT')await bookingStatus(p,actor,{id:randomUUID(),bookingId:booking.id,version:booking.version,action:'CONFIRM'})
  for(const run of runs.filter(r=>r.code.startsWith(prefix+'-V'+(vi+1))&&(direction==='BOTH'||r.direction===direction))){
   if(await p.dispatchAssignment.count({where:{runId:run.id,bookingLineId:booking.lines[0].id}}))continue
   const back=run.direction==='RETURN',minute=String((hotelFor[i]%3)*15).padStart(2,'0')
   const result=await dispatchCommand(p,actor,{id:randomUUID(),runId:run.id,version:run.version,action:'ASSIGN',bookingLineId:booking.lines[0].id,adults,children,pickupAt:date+(back?' 17:00':' 07:'+minute),dropoffPoint:back?hotel.name:'DEMO ท่าเรือตัวอย่าง',notes:[back?'รับที่ DEMO ท่าเรือตัวอย่าง':'',vi===3?'DEMO ผู้ให้บริการรถรับจ้าง · รอยืนยันคนขับ':''].filter(Boolean).join(' · ')});run.version=result.version
  }
  console.log('READY '+code)
 }
 const result=await listJobs(p,actor,new URLSearchParams({kind:'VEHICLE',date}));result.rows=result.rows.filter(r=>r.code.startsWith(prefix+'-'));result.total=result.rows.length
 assert.equal(result.rows.length,8)
 assert.equal(result.rows.filter(r=>r.direction==='OUTBOUND').reduce((n,r)=>n+r.passengers,0),44)
 assert.equal(result.rows.filter(r=>r.direction==='RETURN').reduce((n,r)=>n+r.passengers,0),40)
 await mkdir(new URL('../../screenshots.local/',import.meta.url),{recursive:true})
 await writeFile(new URL('../../screenshots.local/van-demo-data.json',import.meta.url),JSON.stringify(result,null,2))
 console.log(JSON.stringify({result:'PERSISTED',ownedVans:3,hiredVans:1,hotels:hotels.length,runs:8,url:'http://127.0.0.1:5174/operations/driver?date='+date}))
} catch(e){console.error('DEMO FAILED',e.code||e.message,JSON.stringify(e.meta||{}));process.exitCode=1}finally{await p.$disconnect();await pool.end()}
