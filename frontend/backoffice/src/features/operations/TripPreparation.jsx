import { useEffect, useState } from 'react'
import { api } from '../../core/auth/api.js'
import { DataTable } from '../../core/ui/DataTable.jsx'
import { Dialog } from '../../core/ui/Dialog.jsx'
import { Pagination } from '../../core/ui/Pagination.jsx'
import { localStamp } from '../../../../../packages/contracts/operations.js'
import { labelFor } from '../../../../../packages/contracts/catalog.js'

export default function TripPreparation({trip,onClose}) {
 const [page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[state,setState]=useState({rows:[],loading:true})
 useEffect(()=>{
  const controller=new AbortController()
  setState(old=>({...old,loading:true,error:null}))
  api(`/api/operations/preparation?${new URLSearchParams({tripId:trip.id,page:String(page)})}`,undefined,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])})
   .then(data=>{if(!controller.signal.aborted){setState({...data,loading:false});if(data.page&&data.page!==page)setPage(data.page)}})
   .catch(error=>{if(!controller.signal.aborted)setState({rows:[],loading:false,error:error.detail||'Unable to load trip preparation. Check your connection and retry.'})})
  return()=>controller.abort()
 },[trip.id,page,attempt])
 const summary=state.bookings
 return <Dialog variant="table" title="Trip preparation" onClose={onClose}>
  <p><strong>{trip.name}</strong> · {trip.code}</p>
  <p>{localStamp(trip.startsAt)} – {localStamp(trip.endsAt)} · Thailand time</p>
  <p role="status">{state.loading?'Loading preparation totals…':state.error?'Preparation totals are unavailable.':`${summary?.confirmed??0} confirmed / completed bookings · ${summary?.passengers??0} passengers`}</p>
  <p>Totals include confirmed and completed bookings. Draft and cancelled bookings are excluded. Equipment and supplies are counted in base units. To issue is the quantity still to prepare. To settle is issued stock awaiting return, consumption or waste recording.</p>
  <DataTable columns={['Item','Usage','Required','Issued','To issue','To settle','Source or slot']} label={`Preparation for ${trip.name}`} busy={state.loading} error={state.error} onRetry={()=>setAttempt(n=>n+1)} isEmpty={!state.rows.length} empty="No selected resources in confirmed or completed bookings for this trip." loadingLabel="Loading preparation items…">
   {state.rows.map((row,index)=><tr key={`${row.resourceId}-${row.usagePoint}-${index}`}><td><strong>{row.name}</strong><span className="cell-sub">{row.code} · {labelFor(row.baseUnit)}</span></td><td>{labelFor(row.usagePoint)}</td><td>{row.quantity.toLocaleString('en-GB')}</td><td>{row.kind==='SERVICE'?'—':row.issuedQty.toLocaleString('en-GB')}</td><td>{row.kind==='SERVICE'?'—':Math.max(0,row.quantity-row.issuedQty).toLocaleString('en-GB')}</td><td>{row.kind==='SERVICE'?'—':row.outstandingQty.toLocaleString('en-GB')}</td><td>{(row.kind==='SERVICE'?row.slotNames:row.sourceNames)?.join(' · ')||'Not assigned'}</td></tr>)}
  </DataTable>
  <Pagination page={state.page||page} pageSize={state.pageSize||25} total={state.loading||state.error?undefined:state.total} busy={state.loading} onPageChange={setPage} label="Trip preparation pagination"/>
 </Dialog>
}
