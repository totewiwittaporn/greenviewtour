import thaiAreas from '../../../../packages/contracts/data/thai-areas.js'
import { englishAddress, postalCodeFor, validateThaiAddress } from '../../../../packages/contracts/thai-address.js'
import { catalog, validateCatalog } from '../../../../packages/contracts/catalog.js'
import { AccessError } from '../identity-access/membership.js'
import { profileInclude } from '../identity-access/policy.js'
import { managementScope } from '../identity-access/user-management.js'
export function canManageCatalog(profile) { return managementScope(profile)?.company === true }
async function authorize(tx, actorId) {
 const actor=await tx.userProfile.findUnique({where:{id:actorId},include:profileInclude})
 if(!canManageCatalog(actor))throw new AccessError('PERMISSION_DENIED')
}
const referenceSelect={id:true,name:true,code:true}
// Summary cards describe the full company-authorized dataset, independently of list filters.
const summaryWhere={agreements:{signedOn:{not:null}},partners:{roles:{has:'SALES_AGENT'}},tours:{ownership:'GREENVIEW'},rates:{childPrice:{not:null}},locations:{kind:'HOTEL'},vehicles:{ownership:'GREENVIEW'},channels:{kind:'DIRECT'}}
const includes={agreements:{agent:{select:referenceSelect}},tours:{operator:{select:referenceSelect}},rates:{agent:{select:referenceSelect},tour:{select:referenceSelect},agreement:{select:{...referenceSelect,startsOn:true,endsOn:true}}},vehicles:{provider:{select:referenceSelect}}}
export async function listSettings(prisma,actorId,entity,params){
 if(!Object.hasOwn(catalog,entity))throw new AccessError('NOT_FOUND',404)
 await authorize(prisma,actorId)
 const model=catalog[entity].model
 if(entity==='company'){const rows=await prisma[model].findMany({take:1});return{rows,total:rows.length,page:1,pages:1}}
 const q=(params.get('q')||'').trim(),requested=Number(params.get('page')||1),role=params.get('role'),status=params.get('status')
 if(q.length>100||!Number.isSafeInteger(requested)||requested<1||requested>100000||(status&&!['ACTIVE','INACTIVE'].includes(status))||(role&&!['TOUR_OPERATOR','SALES_AGENT','TRANSPORT_PROVIDER','SERVICE_PROVIDER'].includes(role)))throw new AccessError('INVALID_FILTER',400)
 const where={...(status?{status}:{}),...(entity==='partners'&&role?{roles:{has:role}}:{})}
 if(q)where.OR=entity==='rates'?[{agent:{name:{contains:q,mode:'insensitive'}}},{tour:{name:{contains:q,mode:'insensitive'}}}]:['name','code'].map(key=>({[key]:{contains:q,mode:'insensitive'}}))
 return prisma.$transaction(async tx=>{
  const total=await tx[model].count({where}),pages=Math.max(1,Math.ceil(total/25)),page=Math.min(requested,pages)
  const rows=await tx[model].findMany({where,include:includes[entity],orderBy:entity==='rates'?[{createdAt:'desc'},{id:'asc'}]:[{name:'asc'},{id:'asc'}],skip:(page-1)*25,take:25})
  const [all,active,inactive,featured]=await Promise.all([
   tx[model].count(),tx[model].count({where:{status:'ACTIVE'}}),
   tx[model].count({where:{status:'INACTIVE'}}),tx[model].count({where:summaryWhere[entity]}),
  ])
  return{rows,total,page,pages,pageSize:25,summary:{total:all,active,inactive,featured}}
 },{isolationLevel:'RepeatableRead'})
}
export async function saveSettings(prisma,actorId,entity,input){
 if(!Object.hasOwn(catalog,entity))throw new AccessError('NOT_FOUND',404)
 const definition=catalog[entity]
 try{return await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`
  await authorize(tx,actorId)
  if(Object.keys(input).some(key=>!['id','version',...definition.fields.map(f=>f.key)].includes(key)))throw new AccessError('INVALID_SETTINGS',400)
  if(typeof input.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)||!Number.isSafeInteger(input.version)||input.version<0)throw new AccessError('INVALID_SETTINGS',400)
  const{data,errors}=validateCatalog(entity,input)
  if(['company','partners','locations'].includes(entity)){Object.assign(data,englishAddress(data,thaiAreas));data.postalCode=postalCodeFor(data,thaiAreas)||null}
  if(Object.keys(errors).length)throw new AccessError('INVALID_SETTINGS',400)
  const existing=await tx[definition.model].findUnique({where:{id:input.id}})
  if(entity==='company'&&['province','district','subdistrict','houseNumber','moo','villageName'].some(key=>(data[key]||'')!==(existing?.[key]||''))&&Object.keys(validateThaiAddress(data,thaiAreas)).length)throw new AccessError('INVALID_SETTINGS',400)
  if(existing&&input.version===0){
   const same=definition.fields.every(f=>f.type==='money' && existing[f.key]!==null && data[f.key]!==null ? Number(existing[f.key])===Number(data[f.key]) : String(existing[f.key]??'')===String(data[f.key]??''))
   if(same)return{row:existing}
   throw new AccessError('SETTINGS_CONFLICT',409)
  }
  if((!existing&&input.version!==0)||(existing&&existing.version!==input.version))throw new AccessError('SETTINGS_CONFLICT',409)
  for(const f of definition.fields.filter(f=>f.type==='reference')){
   if(!data[f.key])continue
   const related=await tx[catalog[f.entity].model].findUnique({where:{id:data[f.key]}})
   if(!related||related.status!=='ACTIVE'||(f.role&&!related.roles.includes(f.role)))throw new AccessError('RELATED_RECORD_UNAVAILABLE',409)
  }
  if(entity==='rates'){
   const agreement=data.agreementId?await tx.agentAgreement.findUnique({where:{id:data.agreementId}}):null
   if(agreement&&agreement.agentId!==data.agentId)throw new AccessError('AGREEMENT_AGENT_MISMATCH',400)
   if(data.status==='ACTIVE'){
    const peers=await tx.agentTourPrice.findMany({where:{agentId:data.agentId,tourId:data.tourId,status:'ACTIVE',id:{not:input.id}},include:{agreement:true}})
    if(peers.some(p=>!agreement||!p.agreement||(p.agreement.status==='ACTIVE'&&agreement.startsOn<=p.agreement.endsOn&&agreement.endsOn>=p.agreement.startsOn)))throw new AccessError('AGENT_RATE_PERIOD_OVERLAP',409)
   }
  }
  if(entity==='agreements'&&existing){
   const used=await tx.agentTourPrice.count({where:{agreementId:existing.id}})
   if(used&&['agentId','startsOn','endsOn'].some(key=>String(data[key])!==String(existing[key])))throw new AccessError('AGREEMENT_IN_USE',409)
   if(data.status!==existing.status&&await tx.agentTourPrice.count({where:{agreementId:existing.id,status:'ACTIVE'}}))throw new AccessError('AGREEMENT_IN_USE',409)
  }
  if(entity==='company'&&!existing&&await tx.companySettings.count())throw new AccessError('SETTINGS_CONFLICT',409)
  if(entity==='partners'&&existing)for(const[role,table,key]of[['SALES_AGENT','agentAgreement','agentId'],['TOUR_OPERATOR','tourProgram','operatorId'],['SALES_AGENT','agentTourPrice','agentId'],['TRANSPORT_PROVIDER','fleetVehicle','providerId'],['SERVICE_PROVIDER','operationResource','providerId']]){
   if((data.status==='INACTIVE'||!data.roles.includes(role))&&await tx[table].count({where:{[key]:existing.id,status:'ACTIVE'}}))throw new AccessError('PARTNER_IN_USE',409)
  }
  if(entity==='vehicles'&&existing&&(data.status==='INACTIVE'||['capacity','kind','totalCapacity','expectedCrew','engineCount','ownership','providerId'].some(key=>String(data[key]??'')!==String(existing[key]??'')))&&await tx.serviceSlot.count({where:{vehicleId:existing.id,status:'ACTIVE'}}))throw new AccessError('SCHEDULE_IN_USE',409)
  if(entity==='partners'&&existing&&data.status==='INACTIVE'&&await tx.operationResource.count({where:{providerId:existing.id,status:'ACTIVE'}}))throw new AccessError('PARTNER_IN_USE',409)
  if(entity==='tours'&&existing&&data.status==='INACTIVE'&&await tx.agentTourPrice.count({where:{tourId:existing.id,status:'ACTIVE'}}))throw new AccessError('TOUR_IN_USE',409)
  const row=existing?await tx[definition.model].update({where:{id:input.id},data:{...data,version:{increment:1}}}):await tx[definition.model].create({data:{...data,id:input.id}})
  await tx.auditEvent.create({data:{actorId,targetId:row.id,action:`settings.${entity}.${existing?'updated':'created'}`,details:{fields:Object.keys(data),version:row.version}}})
  return{row}
 })}catch(error){if(error.code==='P2002')throw new AccessError('SETTINGS_DUPLICATE',409);throw error}
}
