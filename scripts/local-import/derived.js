import {fail,quote,parseExact,exactJSON,ExactNumber} from './values.js'
const arrays=[
  ['BusinessPartner','allowedPaymentTerms','D1BusinessPartnerPaymentTerm','id'],
  ['BusinessPartner','roles','D1BusinessPartnerRole','id'],
  ['FleetVehicle','purposes','D1FleetVehiclePurpose','id'],
  ['TourBooking','specialRequirements','D1TourBookingSpecialRequirement','id'],
  ['WarehouseResponsibility','deputyUserIds','D1WarehouseResponsibilityDeputy','storeId'],
  ['CapacityPool','resourceIds','D1CapacityPoolResource','id'],
]
export async function verifyDerived(source,db){
  const report=[]
  for(const [model,field,lookup,id] of arrays){
    const expected=source.tables.find(table=>table.name===model).rows.flatMap(row=>[...new Set(parseExact(row[field]))].map(value=>({ownerId:row[id],value})))
    const actual=(await db.prepare(`SELECT ownerId,value FROM ${quote(lookup)}`).all()).results
    if(JSON.stringify(expected.map(exactJSON).sort())!==JSON.stringify(actual.map(exactJSON).sort()))fail('SCALAR_ARRAY_LOOKUP_MISMATCH:'+lookup)
    report.push({name:lookup,rows:actual.length,matched:true})
  }
  const projections=[['FinancePersonnelRecord','payload',['dueOn']],['FinancePersonnelRecord','payment',['paidOn']],['CustomerRequest','snapshot',['payment','receivedOn']],['OperationDailySnapshot','runs',null]]
  const expected=[]
  for(const [model,column,path] of projections)for(const row of source.tables.find(table=>table.name===model).rows){
    if(row[column]===null)continue
    const data=parseExact(row[column]),value=path?path.reduce((item,key)=>item?.[key],data):Array.isArray(data)?data.length:null
    if(value===undefined||value===null)continue
    const textValue=value instanceof ExactNumber?value.text:typeof value==='boolean'?(value?'1':'0'):String(value)
    expected.push({source:[model,column,...(path||['length'])].join('.'),ownerId:row.id,textValue})
  }
  const actual=(await db.prepare('SELECT source,ownerId,textValue FROM D1JsonProjection').all()).results
  if(JSON.stringify(expected.map(exactJSON).sort())!==JSON.stringify(actual.map(exactJSON).sort()))fail('JSON_PROJECTION_MISMATCH')
  return [...report,{name:'D1JsonProjection',rows:actual.length,matched:true}]
}
