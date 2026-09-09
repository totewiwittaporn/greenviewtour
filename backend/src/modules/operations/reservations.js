import { dispatchCategories } from './dispatch.js'
import { peakUsage, localStamp } from '../../../../packages/contracts/operations.js'
import { fail } from './common.js'
export async function ensureStockReservations(tx,resourceId,sourceId){
 const resource=await tx.operationResource.findUnique({where:{id:resourceId}})
 const holds=(await tx.bookingComponent.findMany({where:{resourceId,sourceId,selected:true,booking:{status:'CONFIRMED'}},include:{booking:{include:{trip:true}}}})).filter(l=>l.quantity>l.issuedQty)
 if(!holds.length)return
 const balances=await tx.stockBalance.findMany({where:{locationId:sourceId,condition:'READY',quantity:{gt:0},lot:{resourceId}},include:{lot:true}})
 const valid=(balance,date)=>!balance.lot.expiresOn||balance.lot.expiresOn.toISOString().slice(0,10)>=localStamp(date).slice(0,10)
 if(resource.kind==='CONSUMABLE'){
  // Latest deadlines first: allocate only stock still usable by that trip's end.
  const available=balances.map(b=>({...b})).sort((a,b)=>(a.lot.expiresOn?+a.lot.expiresOn:Infinity)-(b.lot.expiresOn?+b.lot.expiresOn:Infinity))
  for(const line of holds.sort((a,b)=>+b.booking.trip.endsAt-+a.booking.trip.endsAt)){
   let remaining=line.quantity-line.issuedQty
   for(const b of available){if(!valid(b,line.booking.trip.endsAt))continue;const n=Math.min(remaining,b.quantity);remaining-=n;b.quantity-=n;if(!remaining)break}
   if(remaining)fail('INSUFFICIENT_STOCK')
  }
 }else{
  // Future plans may reuse issued equipment after its booked return. Actual issue still requires physical READY stock.
  const outstanding=await tx.stockIssue.findMany({where:{sourceId,lot:{resourceId},bookingLine:{booking:{status:'CONFIRMED'}}},include:{lot:true,bookingLine:{include:{booking:{include:{trip:true}}}}}})
  for(const line of holds){
   const trip=line.booking.trip,overlap=holds.filter(l=>l.booking.trip.startsAt<trip.endsAt&&l.booking.trip.endsAt>trip.startsAt)
   const end=new Date(Math.max(...overlap.map(l=>+l.booking.trip.endsAt)))
   const start=new Date(Math.min(...overlap.map(l=>+l.booking.trip.startsAt)))
   const projected=outstanding.filter(i=>i.bookingLine.booking.trip.endsAt<=start&&valid(i,end)).reduce((n,i)=>n+i.quantity-i.settledQty,0)
   const ready=balances.filter(b=>valid(b,end)).reduce((n,b)=>n+b.quantity,0)+projected
   if(peakUsage(overlap.map(l=>({start:l.booking.trip.startsAt,end:l.booking.trip.endsAt,quantity:l.quantity-l.issuedQty})))>ready)fail('INSUFFICIENT_STOCK')
  }
 }
}
export async function ensureBookingAvailability(tx,booking){
 const trip=await tx.operationTrip.findUnique({where:{id:booking.tripId},include:{tour:true,bookings:{where:{status:'CONFIRMED'}}}})
 if(trip.status!=='OPEN'||trip.tour&&trip.tour.status!=='ACTIVE')fail('TRIP_UNAVAILABLE')
 if(trip.bookings.reduce((n,b)=>n+b.adults+b.children,0)>trip.capacity)fail('TRIP_CAPACITY_EXCEEDED')
 const touched=new Set()
 for(const line of booking.lines.filter(l=>l.selected)){
  const resource=await tx.operationResource.findUnique({where:{id:line.resourceId}})
  if(resource.status!=='ACTIVE')fail('RELATED_RECORD_UNAVAILABLE')
  if(resource.kind==='SERVICE'){
   if(!line.slotId&&dispatchCategories.includes(resource.category))continue
   if(!line.slotId)fail('SERVICE_SLOT_REQUIRED')
   const slot=await tx.serviceSlot.findUnique({where:{id:line.slotId}})
   if(!slot||slot.status!=='ACTIVE'||slot.resourceId!==line.resourceId||slot.startsAt<trip.startsAt||slot.endsAt>trip.endsAt)fail('SERVICE_SLOT_UNAVAILABLE')
   if(slot.vehicleId){const vehicle=await tx.fleetVehicle.findUnique({where:{id:slot.vehicleId}});if(!vehicle||vehicle.status!=='ACTIVE'||resource.baseUnit==='PERSON'&&slot.capacity>vehicle.capacity)fail('SERVICE_SLOT_UNAVAILABLE')}
   const totals=await tx.bookingComponent.aggregate({where:{slotId:slot.id,selected:true,booking:{status:'CONFIRMED'}},_sum:{quantity:true}})
   if((totals._sum.quantity||0)>slot.capacity)fail('SERVICE_CAPACITY_EXCEEDED')
  }else{
   if(!line.sourceId)fail('STOCK_LOCATION_REQUIRED')
   const location=await tx.stockLocation.findUnique({where:{id:line.sourceId}});if(location?.status!=='ACTIVE')fail('RELATED_RECORD_UNAVAILABLE')
   touched.add(`${line.resourceId}:${line.sourceId}`)
  }
 }
 for(const pair of touched){const[r,s]=pair.split(':');await ensureStockReservations(tx,r,s)}
}
