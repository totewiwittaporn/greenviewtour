// Owner-approved starter names only; pricing, suppliers, packaging and stock require real data.
import {loadEnvFile} from 'node:process'
import {randomUUID} from 'node:crypto'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {profileInclude} from '../src/modules/identity-access/policy.js'
import {managementScope} from '../src/modules/identity-access/user-management.js'
import {saveOperationCatalog} from '../src/modules/operations/catalog.js'
import {initialValues} from '../../packages/contracts/catalog.js'
loadEnvFile(new URL('../.env',import.meta.url))
const pool=createDatabasePool(),prisma=createPrisma(pool)
try{
 const profiles=await prisma.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude}),actor=profiles.find(p=>managementScope(p)?.company)?.id
 if(!actor)throw Error('MANAGER_REQUIRED')
 const starters=[
 ['services','GV-TRANSFER-OUT','Khao Lak to Khura Buri Pier','TRANSFER','PERSON',{origin:'Khao Lak',destination:'Khura Buri Pier'}],
 ['services','GV-TRANSFER-RETURN','Khura Buri Pier to Khao Lak','TRANSFER','PERSON',{origin:'Khura Buri Pier',destination:'Khao Lak'}],
 ['services','GV-SURIN-BOAT','Surin Islands boat service','TOUR_BOAT','PERSON',{origin:'Khura Buri Pier',destination:'Surin Islands'}],
 ['services','GV-LONGTAIL','Island longtail boat service','LONGTAIL_BOAT','TRIP',{ownership:'GREENVIEW'}],
 ['services','GV-MEAL','Island meal service','MEAL','PERSON_MEAL',{}],
 ['services','GV-ACCOMMODATION','Island accommodation','ACCOMMODATION','ROOM_NIGHT',{}],
 ['services','GV-PARK-BREAKFAST','Park breakfast','MEAL','PERSON_MEAL',{ownership:'PARK',mealPeriod:'BREAKFAST'}],
 ['services','GV-PARK-LUNCH','Park lunch','MEAL','PERSON_MEAL',{ownership:'PARK',mealPeriod:'LUNCH'}],
 ['services','GV-PARK-DINNER','Park dinner','MEAL','PERSON_MEAL',{ownership:'PARK',mealPeriod:'DINNER'}],
 ['services','GV-PARK-TENT','Park standard tent — details unverified','ACCOMMODATION','ROOM_NIGHT',{ownership:'PARK',accommodationType:'STANDARD_TENT'}],
 ['services','GV-PARK-AC-TENT','Park air-conditioned tent — details unverified','ACCOMMODATION','ROOM_NIGHT',{ownership:'PARK',accommodationType:'AC_TENT'}],
 ['services','GV-PARK-BUNGALOW','Park bungalow — details unverified','ACCOMMODATION','ROOM_NIGHT',{ownership:'PARK',accommodationType:'BUNGALOW'}],
 ['equipment','GV-LIFEJACKET','Lifejacket','LIFEJACKET','PIECE',{}],
 ['equipment','GV-MASK','Snorkel mask','SNORKEL_MASK','PIECE',{}],
 ['equipment','GV-FINS','Fins','FINS','PAIR',{}],
 ['equipment','GV-TOWEL','Towel','TOWEL','PIECE',{}],
 ['consumables','GV-WATER','Bottled water','WATER','BOTTLE',{}],
 ['consumables','GV-SOFT-DRINK','Bottled soft drink','SOFT_DRINK','BOTTLE',{}],
 ['consumables','GV-JUICE','Bottled juice','JUICE','BOTTLE',{}],
 ['consumables','GV-WATERMELON','Watermelon','WATERMELON','FRUIT',{}],
 ['consumables','GV-PINEAPPLE','Pineapple','PINEAPPLE','FRUIT',{}],
 ]
 let created=0,existing=0,refined=0
 for(const[entity,code,name,category,baseUnit,fields]of starters){
  const current=await prisma.operationResource.findUnique({where:{code}})
  if(current){
   const confirmedOwner={'GV-LONGTAIL':'GREENVIEW','GV-MEAL':'PARK','GV-ACCOMMODATION':'PARK'}[code]
   if(confirmedOwner&&current.kind==='SERVICE'&&current.category===category&&current.ownership===null&&current.providerId===null&&current.status==='INACTIVE'){
    await saveOperationCatalog(prisma,actor,entity,{...initialValues(entity,current),id:current.id,version:current.version,ownership:confirmedOwner});refined++
   }
   existing++;continue
  }
  await saveOperationCatalog(prisma,actor,entity,{...initialValues(entity),...fields,id:randomUUID(),version:0,code,name,category,baseUnit,status:'INACTIVE',notes:(category==='ACCOMMODATION'?'Unverified: ask the park which types offer 2, 3 or 4 guests; actual inventory, capacity and prices are not confirmed. ':'')+'Starter item — review the actual variant, pricing unit, supplier and package sizes before activation. No stock has been entered.'});created++
 }
 console.log(JSON.stringify({created,existing,refined,status:'INACTIVE',stockCreated:0,environment:'preview'}))
}catch(e){console.error(e.code||e.message);process.exitCode=1}finally{await prisma.$disconnect();await pool.end()}
