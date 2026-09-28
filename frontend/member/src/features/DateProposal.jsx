import {useRef,useState} from 'react'
import {useLocale,formatDate,formatMoney} from '../core/locale.js'
import {Button,Notice} from '../core/ui.jsx'
import {api,errorText} from '../core/api.js'
import {capacityText} from '../../../../packages/contracts/capacity-copy.js'
import CapacityNotice from './CapacityNotice.jsx'
export default function DateProposal({row,onSaved}) {
 const {locale}=useLocale(),c=key=>capacityText(key,locale),proposal=row.snapshot.dateProposal
 const [agreed,setAgreed]=useState(false),[wait,setWait]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),command=useRef(null),lock=useRef(false)
 if(!proposal)return null
 async function answer(value){
  if(lock.current||value==='ACCEPT'&&!agreed)return
  const input={requestId:row.id,version:row.version,answer:value,serviceDate:proposal.serviceDate,quoteKey:proposal.quoteKey,capacitySelections:proposal.capacitySelections||[],allowWaitlist:wait}
  const signature=JSON.stringify(input);if(command.current?.signature!==signature)command.current={id:crypto.randomUUID(),signature}
  lock.current=true;setBusy(true);setNotice('')
  try{await api('/api/member/date-response',{...input,id:command.current.id});onSaved()}catch(e){setNotice(e.message==='CAPACITY_CHANGED'?c(e.message):errorText(e))}finally{lock.current=false;setBusy(false)}
 }
 return <section className="quote-panel"><h3>{c('proposal')}</h3><p>{formatDate(row.serviceDate)} → <strong>{formatDate(proposal.serviceDate)}</strong></p><p>{formatMoney(proposal.quote.packageTotal)}</p><p>{proposal.note}</p><p>{proposal.quote.terms?.cancellationTerms}</p><p>{c('proposalHint')}</p>
 <CapacityNotice availability={proposal.availability} disabled/>
 <label className="check"><input type="checkbox" disabled={busy} checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>{c('agreeDate')}</label>
 <label className="check"><input type="checkbox" disabled={busy} checked={wait} onChange={e=>setWait(e.target.checked)}/>{c('waitConsent')}</label>
 <Notice error>{notice}</Notice><div className="actions"><Button disabled={busy||!agreed} busy={busy} onClick={()=>answer('ACCEPT')}>{c('acceptDate')}</Button><Button className="secondary" disabled={busy} onClick={()=>answer('DECLINE')}>{c('declineDate')}</Button></div></section>
}
