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
 ['services','GV-LONGTAIL','Island longtail boat service','LONGTAIL_BOAT','TRIP',{}],
 ['services','GV-MEAL','Island meal service','MEAL','PERSON_MEAL',{}],
 ['services','GV-ACCOMMODATION','Island accommodation','ACCOMMODATION','ROOM_NIGHT',{}],
 ['equipment','GV-MASK','Snorkel mask','SNORKEL_MASK','PIECE',{}],
 ['equipment','GV-FINS','Fins','FINS','PAIR',{}],
 ['equipment','GV-TOWEL','Towel','TOWEL','PIECE',{}],
 ['consumables','GV-WATER','Bottled water','WATER','BOTTLE',{}],
 ['consumables','GV-SOFT-DRINK','Bottled soft drink','SOFT_DRINK','BOTTLE',{}],
 ['consumables','GV-JUICE','Bottled juice','JUICE','BOTTLE',{}],
 ['consumables','GV-WATERMELON','Watermelon','WATERMELON','FRUIT',{}],
 ['consumables','GV-PINEAPPLE','Pineapple','PINEAPPLE','FRUIT',{}],
 ]
 let created=0,existing=0
 for(const[entity,code,name,category,baseUnit,fields]of starters){
  if(await prisma.operationResource.findUnique({where:{code}})){existing++;continue}
  await saveOperationCatalog(prisma,actor,entity,{...initialValues(entity),...fields,id:randomUUID(),version:0,code,name,category,baseUnit,status:'INACTIVE',notes:'Starter item — review the actual variant, pricing unit, supplier and package sizes before activation. No stock has been entered.'});created++
 }
 console.log(JSON.stringify({created,existing,status:'INACTIVE',stockCreated:0,environment:'preview'}))
}catch(e){console.error(e.code||e.message);process.exitCode=1}finally{await prisma.$disconnect();await pool.end()}
