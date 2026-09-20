// Synthetic local/Preview catalog only. Never creates members, payments or operational Bookings.
import {loadEnvFile} from 'node:process'
import {randomUUID} from 'node:crypto'
import {readFile,writeFile,unlink} from 'node:fs/promises'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),db=createPrisma(pool),manifest=new URL('../../docs/validation/commerce-demo-manifest.json',import.meta.url)
try{
 if(process.argv.includes('--create')){
  try{await readFile(manifest);throw Error('FIXTURE_ALREADY_EXISTS')}catch(e){if(e.code!=='ENOENT')throw e}
  const ids={tour:randomUUID(),season:randomUUID(),promotion:randomUUID(),popup:randomUUID(),resource:randomUUID(),component:randomUUID()},slug='demo-browser-'+ids.tour.slice(0,8),code='DEMO-'+ids.tour.slice(0,8)
  await writeFile(manifest,JSON.stringify({...ids,slug,retained:true,purpose:'Owner-retained manual and browser demo; do not delete automatically'}),{flag:'wx',mode:0o600})
  await db.$transaction(async tx=>{
   await tx.operationResource.create({data:{id:ids.resource,code,name:'DEMO boat service',kind:'SERVICE',category:'TOUR_BOAT',baseUnit:'PERSON',status:'ACTIVE',salePrice:'0'}})
   await tx.tourProgram.create({data:{id:ids.tour,code,slug,name:'DEMO · ทัวร์ทดสอบ ห้ามจองจริง',status:'ACTIVE',publicStatus:'PUBLISHED',ownership:'GREENVIEW',confirmationMode:'REQUEST',supplierPricing:'NOT_SET',tourType:'DAY_TRIP',description:'ข้อมูลสำหรับตรวจหน้าจอเท่านั้น ไม่ใช่ข้อเสนอขายจริง ใช้ตรวจการแสดงรายละเอียดทัวร์และโปรโมชั่นจากข้อมูลเดียวกัน',route:'08:00 นัดพบทีมงาน\n16:00 เดินทางกลับ',adultPrice:'1000',childPrice:'500',imageUrls:'https://greenviewtour.com/wp-content/uploads/2025/01/DJI_0351.jpg',meals:'อาหารกลางวัน — ข้อมูลทดสอบ',fees:'รวมค่าธรรมเนียมตามตัวอย่าง',inclusions:'บริการเรือ — ทดสอบ',exclusions:'ไม่มีการรับชำระเงินจริง',cancellationTerms:'ข้อมูลทดสอบเท่านั้น',components:{create:{id:ids.component,resourceId:ids.resource,selection:'REQUIRED',basis:'PER_PERSON',quantity:1,usagePoint:'BOAT',status:'ACTIVE'}}}})
   await tx.tourSeason.create({data:{id:ids.season,code,name:'DEMO season',tourId:ids.tour,status:'ACTIVE',startsOn:new Date('2026-10-01'),endsOn:new Date('2027-05-01'),onlineStartsOn:new Date('2026-11-01'),onlineEndsOn:new Date('2027-04-01'),bookingStartsOn:new Date('2026-09-01'),bookingEndsOn:new Date('2027-04-01'),cutoffDays:1}})
   await tx.tourPromotion.create({data:{id:ids.promotion,code,name:'DEMO ราคาทดสอบ',tourId:ids.tour,status:'ACTIVE',startsOn:new Date('2026-09-01'),endsOn:new Date('2027-04-01'),serviceStartsOn:new Date('2026-11-01'),serviceEndsOn:new Date('2027-04-01'),adultPrice:'800',childPrice:'400',quota:10,quotaUnit:'SEAT',holdHours:24}})
   await tx.websitePopup.create({data:{id:ids.popup,code,name:'DEMO browser notice',title:'DEMO · ตรวจหน้าจอเท่านั้น',imageAlt:'ภาพตัวอย่างสำหรับทดสอบ',imageUrl:'https://greenviewtour.com/wp-content/uploads/2025/01/DJI_0351.jpg',status:'ACTIVE',startsOn:new Date('2026-09-01'),endsOn:new Date('2026-09-30'),frequency:'SESSION',priority:999}})
  });console.log(JSON.stringify({created:true,slug}))
 }else if(process.argv.includes('--cleanup')){
  const ids=JSON.parse(await readFile(manifest,'utf8'))
  if(ids.retained)throw Error('OWNER_RETAINED_DEMO_CLEANUP_DISABLED')
  await db.$transaction(async tx=>{
   if(await tx.customerRequest.count({where:{tourId:ids.tour}}))throw Error('FIXTURE_HAS_REQUESTS_REVIEW_REQUIRED')
   await tx.websitePopup.deleteMany({where:{id:ids.popup}});await tx.tourPromotion.deleteMany({where:{id:ids.promotion}});await tx.tourSeason.deleteMany({where:{id:ids.season}});await tx.programComponent.deleteMany({where:{id:ids.component}});await tx.tourProgram.deleteMany({where:{id:ids.tour}});await tx.operationResource.deleteMany({where:{id:ids.resource}})
  });await unlink(manifest);console.log('Synthetic catalog fixtures removed.')
 }else throw Error('USE_CREATE_OR_CLEANUP')
}catch(e){console.error({error:e.code||e.name});process.exitCode=1}finally{await db.$disconnect();await pool.end()}
