// Response-only privacy projection. Never use this projection for authorization,
// mutations, accounting, persisted audits or export source data.
const neutral='System administrator'
const identityNames=new Set(['owner','assignee','name','displayName','nickname','actorName','userName','employeeName','guideName','assigneeName','createdByName','updatedByName','requestedByName','reviewedByName','approvedByName','completedByName','paidByName','primaryName','deputyName','custodian'])
const identityPrivate=new Set(['id','email','phone','primaryPhone','emergencyPhone','lineId','address','mapUrl','latitude','longitude','pictureUrl','avatarUrl'])
const references={actorId:['actor','actorName'],userId:['user','userName','name','displayName'],employeeId:['employee','employeeName'],guideId:['guide','guideName'],assigneeId:['assignee','assigneeName'],createdById:['createdBy','createdByName'],createdBy:['createdByName'],updatedById:['updatedBy','updatedByName'],requestedById:['requestedBy','requestedByName'],reviewedById:['reviewedBy','reviewedByName'],approvedById:['approvedBy','approvedByName'],completedById:['completedBy','completedByName'],paidById:['paidBy','paidByName'],primaryUserId:['primaryName'],deputyUserId:['deputyName'],substituteId:['substitute','substituteName']}
const referenceKey=key=>Object.hasOwn(references,key)||/By(Id)?$/.test(key)||/UserIds?$/.test(key)||['targetId','beneficiaryId','from','to'].includes(key)
export async function redactOwnerIdentity(db,viewerId,data){
 if(!viewerId)return data
 const owners=await db.userProfile.findMany({where:{id:{not:viewerId},roles:{some:{roleCode:'ADMIN_MANAGER'}}},select:{id:true,displayName:true,nickname:true}})
 if(!owners.length)return data
 const ids=new Set(owners.map(owner=>owner.id)),names=new Set(owners.flatMap(owner=>[owner.displayName,owner.nickname]).filter(value=>typeof value==='string'&&value.trim()))
 const accounts=await db.authUser.findMany({where:{id:{in:[...ids]}},select:{email:true}}),emails=new Set(accounts.map(account=>account.email?.toLowerCase()).filter(Boolean))
 function walk(value,key='',forced=false,knownVisible=false){
  if(value===null||value===undefined||value instanceof Date)return value
  if(typeof value==='string'){
   if((referenceKey(key)||key==='id')&&ids.has(value))return null
   if(identityNames.has(key)&&(forced||(key!=='name'&&names.has(value))))return neutral
   if(key==='email'&&(forced||emails.has(value.toLowerCase())))return null
   return forced&&identityPrivate.has(key)?null:value
  }
  if(Array.isArray(value))return value.filter(item=>!item||typeof item!=='object'||!ids.has(item.id)).map(item=>walk(item,key,forced))
  if(typeof value!=='object')return forced&&identityPrivate.has(key)?null:value
  if(ids.has(value.id))return null
  if(forced)return Object.hasOwn(value,'name')?{name:neutral}:{displayName:neutral}
  const ownIdentity=knownVisible||value.id===viewerId||(typeof value.id==='string'&&(Object.hasOwn(value,'displayName')||Object.hasOwn(value,'email'))),hidden=new Set(),visible=new Set()
  const contextualReferences={...references}
  for(const field of Object.keys(value))if(/By(Id)?$/.test(field)){const prefix=field.replace(/Id$/,'');contextualReferences[field]=[...(contextualReferences[field]||[]),prefix,`${prefix}Name`]}
  for(const [field,related] of Object.entries(contextualReferences))if(typeof value[field]==='string'&&ids.has(value[field]))for(const sibling of related)hidden.add(sibling)
  for(const [field,related] of Object.entries(contextualReferences))if(typeof value[field]==='string'&&!ids.has(value[field]))for(const sibling of related)visible.add(sibling)
  return Object.fromEntries(Object.entries(value).map(([field,item])=>{
   const redact=hidden.has(field)
   if(redact)return [field,typeof item==='string'?((identityNames.has(field)||/ByName$/.test(field))?neutral:null):walk(item,field,true)]
   if((ownIdentity&&(['name','displayName','nickname'].includes(field)||identityPrivate.has(field)))||visible.has(field))return [field,item&&typeof item==='object'?walk(item,field,false,true):item]
   return [field,walk(item,field)]
  }))
 }
 return walk(data)
}
