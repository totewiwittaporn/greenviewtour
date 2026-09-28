import {readJsonFields} from '../../platform/database/read-json.js'
const fields=names=>Object.fromEntries(names.split(' ').map(key=>[key,true]))
export const capacityRelations={
 trip:{select:{startsAt:true,endsAt:true}},
 attendance:{select:fields('direction serviceDate noShowAdults noShowChildren')},
 lines:{select:{...fields('id resourceId selected quantity dispatchDirection'),resource:{select:fields('id category serviceMode baseUnit')},dispatchAssignments:{select:{status:true,run:{select:{...fields('id kind direction capacity status'),slot:{select:fields('resourceId vehicleId startsAt endsAt')}}}}}}},
}
export const capacityDemandSelect={...fields('id code version status adults children outboundDate returnDate returnStatus'),...capacityRelations}
// All obligations remain in the set. This changes columns, never the solver's
// group list, seat holds, pinned boats, service legs, or whole-group constraint.
export async function capacityDemandRows(tx,where){
 const rows=await tx.tourBooking.findMany({where,select:capacityDemandSelect})
 const snapshots=await readJsonFields(tx,'TourBooking','programSnapshot',rows.map(row=>row.id),['capacitySelections','customerRequestId','durationDays'])
 for(const row of rows)row.programSnapshot=snapshots.get(row.id)||{}
 return rows
}
