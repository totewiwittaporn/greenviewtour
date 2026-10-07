const value=value=>typeof value==='string'&&value.trim()?value.trim():null
const pax=row=>(Number(row?.adults)||0)+(Number(row?.children)||0)
const localTime=value=>{
  const date=new Date(value)
  return Number.isFinite(+date)?new Date(+date+7*3600000).toISOString().slice(11,16):'Time unconfirmed'
}
const vehicleLabel=run=>{
  const vehicle=run?.slot?.vehicle||{}
  const identity=[value(vehicle.name)||value(vehicle.code),value(vehicle.registration)].filter(Boolean)
  return identity.join(' · ')||value(run?.name)||'Vehicle run'
}
function manifestRows(run){
  const groups=new Map()
  for(const assignment of run?.assignments||[]){
    const booking=assignment?.bookingLine?.booking||{}
    const id=value(booking.id)||value(booking.code)||value(booking.name)||String(groups.size)
    const count=pax(assignment)
    const pickup=value(booking.pickupPoint)||value(booking.hotel)||'Pickup unconfirmed'
    const dropoff=value(assignment.dropoffPoint)||value(booking.dropoffPoint)||'Drop-off unconfirmed'
    const pickupTime=assignment.pickupAt?localTime(assignment.pickupAt):null
    const prior=groups.get(id)
    if(prior){
      prior.passengers=Math.max(prior.passengers,count)
      if(prior.pickup==='Pickup unconfirmed'&&pickup!=='Pickup unconfirmed')prior.pickup=pickup
      if(prior.dropoff==='Drop-off unconfirmed'&&dropoff!=='Drop-off unconfirmed')prior.dropoff=dropoff
      if(!prior.pickupTime&&pickupTime)prior.pickupTime=pickupTime
      continue
    }
    groups.set(id,{id,name:value(booking.name)||value(booking.code)||'Booking',passengers:count,pickup,dropoff,pickupTime})
  }
  return [...groups.values()].sort((a,b)=>(a.pickupTime||'99:99').localeCompare(b.pickupTime||'99:99')||a.pickup.localeCompare(b.pickup)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id))
}
const vehicleRuns=runs=>(Array.isArray(runs)?runs:[]).filter(run=>run?.kind==='VEHICLE').sort((a,b)=>+new Date(a?.slot?.startsAt||0)-+new Date(b?.slot?.startsAt||0)||String(a?.id||'').localeCompare(String(b?.id||'')))

export function headDriverJobs(runs,serviceDate){
  return vehicleRuns(runs).map(run=>{
    const rows=manifestRows(run),stops=new Map()
    for(const row of rows)stops.set(row.pickup,(stops.get(row.pickup)||0)+row.passengers)
    const stopText=[...stops.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([name,count])=>name+' '+count+' pax').join(' · ')
    return {
      key:'head-driver:'+run.id,
      version:run.version,
      role:'Head Driver',
      kind:'Vehicle run summary',
      text:localTime(run.slot?.startsAt)+' · '+vehicleLabel(run)+' · '+(value(run.direction)||'Direction unconfirmed')+' · Total '+rows.reduce((sum,row)=>sum+row.passengers,0)+' pax\nStops: '+(stopText||'none assigned'),
      href:'/operations/driver?runId='+encodeURIComponent(run.id)+'&date='+encodeURIComponent(serviceDate)
    }
  })
}

export function driverJobs(runs,userId,serviceDate){
  return vehicleRuns(runs)
    .filter(run=>(run.staff||[]).some(staff=>staff?.userId===userId&&staff?.role==='DRIVER'))
    .map(run=>{
      const rows=manifestRows(run)
      const details=rows.map(row=>row.name+' · '+row.passengers+' pax · Pickup '+(row.pickupTime?row.pickupTime+' ':'')+row.pickup+' · Drop-off '+row.dropoff)
      return {
        key:'driver:'+run.id,
        version:run.version,
        role:'Driver',
        kind:'Driver manifest',
        text:[localTime(run.slot?.startsAt)+' · '+vehicleLabel(run)+' · '+(value(run.direction)||'Direction unconfirmed')+' · Total '+rows.reduce((sum,row)=>sum+row.passengers,0)+' pax',...details].join('\n'),
        href:'/operations/driver?runId='+encodeURIComponent(run.id)+'&date='+encodeURIComponent(serviceDate)
      }
    })
}
