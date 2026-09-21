import { formatNumber } from '../../core/i18n/runtime.js'
import { translate as t, useLocale } from '../../core/i18n/locale.jsx'
import { useEffect, useState } from 'react'
import { api } from '../../core/auth/api.js'
import { DataTable } from '../../core/ui/DataTable.jsx'
import { Dialog } from '../../core/ui/Dialog.jsx'
import { Pagination } from '../../core/ui/Pagination.jsx'
import { localStamp } from '../../../../../packages/contracts/operations.js'
import { labelFor } from '../../../../../packages/contracts/catalog.js'

export default function TripPreparation({trip,onClose}) {
 useLocale();
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
 return <Dialog variant="table" title={t("Trip preparation")} onClose={onClose}>
  <p><strong>{trip.name}</strong> · {trip.code}</p>
  <p>{localStamp(trip.startsAt)} – {localStamp(trip.endsAt)}{' '}{t("· Thailand time")}</p>
  <p role="status">{state.loading?t('Loading preparation totals…'):state.error?t('Preparation totals are unavailable.'):`${summary?.confirmed??0} confirmed / completed bookings · ${summary?.passengers??0} passengers`}</p>
  <p>{t("Totals include confirmed and completed bookings. Draft and cancelled bookings are excluded. Equipment and supplies are counted in base units. To issue is the quantity still to prepare. To settle is issued stock awaiting return, consumption or waste recording.")}</p>
  <DataTable columns={['Item','Usage','Required','Issued','To issue','To settle','Source or slot']} label={t("Preparation for {value0}", {value0: trip.name})} busy={state.loading} error={state.error} onRetry={()=>setAttempt(n=>n+1)} isEmpty={!state.rows.length} empty="No selected resources in confirmed or completed bookings for this trip." loadingLabel="Loading preparation items…">
   {state.rows.map((row,index)=><tr key={`${row.resourceId}-${row.usagePoint}-${index}`}><td><strong>{row.name}</strong><span className="cell-sub">{row.code} · {t(labelFor(row.baseUnit))}</span></td><td>{t(labelFor(row.usagePoint))}</td><td>{formatNumber(row.quantity, {})}</td><td>{row.kind==='SERVICE'?'—':formatNumber(row.issuedQty, {})}</td><td>{row.kind==='SERVICE'?'—':formatNumber(Math.max(0,row.quantity-row.issuedQty), {})}</td><td>{row.kind==='SERVICE'?'—':formatNumber(row.outstandingQty, {})}</td><td>{(row.kind==='SERVICE'?row.slotNames:row.sourceNames)?.join(' · ')||t("Not assigned")}</td></tr>)}
  </DataTable>
  <Pagination page={state.page||page} pageSize={state.pageSize||25} total={state.loading||state.error?undefined:state.total} busy={state.loading} onPageChange={setPage} label={t("Trip preparation pagination")}/>
 </Dialog>
}
