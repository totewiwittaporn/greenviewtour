import {readJsonFields} from '../../platform/database/read-json.js'
import {catalogReadSelect,materialOptionSelect,stockResourceSelect} from '../service-catalog/read-models.js'
const fields=names=>Object.fromEntries(names.split(' ').map(key=>[key,true]))
const place={select:fields('id name code')}
const lot={select:{...fields('id resourceId label receivedOn expiresOn'),resource:{select:stockResourceSelect}}}
export function operationReadSelect(entity,view){
 if(!['list','options'].includes(view))return null
 if(entity==='bookings')return view==='list'?{...fields('id version code name status adults children outboundDate returnDate returnStatus agentId assigneeId createdById'),trip:{select:{...fields('id name tourId'),tour:{select:fields('id name journeyMode')}}}}:{...fields('id code name status'),lines:{select:{...fields('id selected resourceId sourceId quantity issuedQty'),resource:{select:fields('name')}}}}
 if(entity==='resources')return materialOptionSelect
 if(entity==='stock')return {...fields('id lotId locationId condition quantity version'),lot,location:place}
 if(entity==='issues')return {...fields('id lotId sourceId destinationId custodian quantity settledQty createdAt'),lot}
 if(entity==='movements')return fields('id kind quantity enteredQuantity enteredUnit factor details createdAt')
 return catalogReadSelect(entity,view)
}
export async function attachBookingListFlags(tx,rows){
 const values=await readJsonFields(tx,'TourBooking','programSnapshot',rows.map(row=>row.id),['name','tourId','dateStatus','journeyMode','capacityReview.status','priceException.status','priceException.requestedById'])
 return rows.map(row=>{const value=values.get(row.id)||{};return {...row,programSnapshot:{name:value.name,tourId:value.tourId,dateStatus:value.dateStatus,journeyMode:value.journeyMode,capacityReview:value['capacityReview.status']?{status:value['capacityReview.status']}:null,priceException:value['priceException.status']?{status:value['priceException.status'],requestedById:value['priceException.requestedById']}:null}}})
}
