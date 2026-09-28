const fields=names=>Object.fromEntries(names.split(' ').map(key=>[key,true]))
const runFields=fields('id version code name kind direction period capacity status updatedAt')
const slotSelect={...fields('id resourceId vehicleId startsAt endsAt capacity'),resource:{select:fields('id name category')},vehicle:{select:fields('id name capacity registration ownership')}}
export const runSelectorSelect={...runFields,slot:{select:slotSelect},assignments:{where:{status:{not:'CANCELLED'},bookingLine:{booking:{status:{in:['CONFIRMED','COMPLETED']}}}},select:{adults:true,children:true}}}
