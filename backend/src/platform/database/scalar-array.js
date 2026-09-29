const lookupConfig={
  'BusinessPartner.allowedPaymentTerms':{delegate:'d1BusinessPartnerPaymentTerm',field:'allowedPaymentTerms',ownerField:'id'},
  'BusinessPartner.roles':{delegate:'d1BusinessPartnerRole',field:'roles',ownerField:'id'},
  'FleetVehicle.purposes':{delegate:'d1FleetVehiclePurpose',field:'purposes',ownerField:'id'},
  'TourBooking.specialRequirements':{delegate:'d1TourBookingSpecialRequirement',field:'specialRequirements',ownerField:'id'},
  'WarehouseResponsibility.deputyUserIds':{delegate:'d1WarehouseResponsibilityDeputy',field:'deputyUserIds',ownerField:'storeId'},
  'CapacityPool.resourceIds':{delegate:'d1CapacityPoolResource',field:'resourceIds',ownerField:'id'},
}

export function isD1ArrayLookup(db,key){
  const config=lookupConfig[key]
  return Boolean(config&&db?.[config.delegate]?.findMany)
}

export async function scalarArrayWhere(db,key,values,{mode='has'}={}){
  const config=lookupConfig[key]
  if(!config||!['has','hasSome'].includes(mode))throw new Error('INVALID_SCALAR_ARRAY_LOOKUP')
  const list=(Array.isArray(values)?values:[values]).filter(value=>typeof value==='string'&&value)
  if(!isD1ArrayLookup(db,key)){
    return {[config.field]:mode==='hasSome'?{hasSome:list}:{has:list[0]}}
  }
  if(!list.length)return {[config.ownerField]:{in:[]}}
  const rows=await db[config.delegate].findMany({
    where:{value:mode==='hasSome'?{in:list}:list[0]},
    select:{ownerId:true},
  })
  return {[config.ownerField]:{in:[...new Set(rows.map(row=>row.ownerId))]}}
}

export const scalarArrayLookups=Object.freeze({...lookupConfig})
