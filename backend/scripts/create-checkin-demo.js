import {loadEnvFile} from 'node:process'
import {randomUUID} from 'node:crypto'
import {writeFile} from 'node:fs/promises'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {thailandDay} from '../src/modules/operations/check-in.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),db=createPrisma(pool),date=thailandDay(),code='DEMO-CHECKIN-'+date
try{
 const result=await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  const old=await tx.tourBooking.findUnique({where:{code}});if(old)return {bookingId:old.id,code,date,retained:true}
  const source=await tx.tourBooking.findUnique({where:{code:'DEMO-a1c8a60c'},include:{trip:true,lines:true}});if(!source?.programSnapshot?.demo)throw Error('DEMO_SOURCE_REQUIRED')
  const id=randomUUID(),tripId=randomUUID(),vehicleId=randomUUID(),slotId=randomUUID(),runId=randomUUID(),lineId=randomUUID()
  const startsAt=new Date(date+'T08:00:00+07:00'),endsAt=new Date(date+'T18:00:00+07:00')
  await tx.operationTrip.create({data:{id:tripId,code:'T-'+tripId,name:'DEMO · เช็กอินสำหรับคู่มือ',tourId:source.trip.tourId,startsAt,endsAt,capacity:6,status:'OPEN'}})
  await tx.fleetVehicle.create({data:{id:vehicleId,code:'V-'+vehicleId,name:'DEMO · เรือทดสอบเช็กอิน',kind:'SPEEDBOAT',capacity:6,status:'ACTIVE',ownership:'GREENVIEW',notes:'DEMO ONLY — retained manual example, not a real vessel'}})
  await tx.serviceSlot.create({data:{id:slotId,code:'S-'+slotId,name:'DEMO · รอบเช็กอิน',resourceId:source.lines[0].resourceId,vehicleId,startsAt,endsAt,capacity:6,status:'ACTIVE'}})
  await tx.dispatchRun.create({data:{id:runId,code:'R-'+runId,name:'DEMO · เรือเช็กอิน',kind:'BOAT',direction:'OUTBOUND',period:'AM',capacity:6,slotId,requestHash:'0'.repeat(64)}})
  await tx.tourBooking.create({data:{id,tripId,code,name:'DEMO · มา 3 คน ไม่มา 3 คน',status:'CONFIRMED',adults:4,children:2,adultPrice:1000,childPrice:500,outboundDate:new Date(date),returnStatus:'OTHER',paymentTerms:'PREPAID',allergyStatus:'NONE',programSnapshot:{demo:true,name:'DEMO · เช็กอินสำหรับคู่มือ',demoPaymentStatus:'SUCCEEDED',paymentNotice:'SIMULATION ONLY — no real money received'},requestHash:'0'.repeat(64),lines:{create:{id:lineId,resourceId:source.lines[0].resourceId,quantity:6,selected:true,included:true,usagePoint:'BOAT',dispatchDirection:'OUTBOUND',unitPrice:0,snapshot:{...source.lines[0].snapshot,demo:true}}}}})
  await tx.dispatchAssignment.create({data:{id:randomUUID(),runId,bookingLineId:lineId,adults:4,children:2}})
  return {bookingId:id,tripId,vehicleId,slotId,runId,code,date,retained:true,purpose:'Manual example; simulated funds only'}
 })
 await writeFile(new URL('../../docs/validation/checkin-demo-manifest.json',import.meta.url),JSON.stringify(result,null,2)+'\n')
 console.log(JSON.stringify(result))
}catch(e){console.error({error:e.code||'DEMO_FAILED'});process.exitCode=1}finally{await db.$disconnect();await pool.end()}
