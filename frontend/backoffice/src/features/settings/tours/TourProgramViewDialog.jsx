import {useEffect,useState} from 'react'
import {api} from '../../../core/auth/api.js'
import {ModalView,ModalViewColumns,ModalViewFields,ModalViewHero,ModalViewList,ModalViewSection,ModalViewStats} from '../../../core/ui/ModalView.jsx'
import {translateLabel as bilingualLabel,formatDate,formatNumber} from '../../../core/i18n/runtime.js'
import {useLocale} from '../../../core/i18n/locale.jsx'
import {labelFor} from '../../../../../../packages/contracts/catalog.js'

const money=value=>value===null||value===undefined||value===''?'Not set':formatNumber(Number(value),{style:'currency',currency:'THB'})
const text=value=>value||'Not set'
const imageUrl=url=>url?.replace('/api/public/images/','/api/website-images/')

export default function TourProgramViewDialog({tour,onClose}){
 const {t}=useLocale(),[state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0)
 useEffect(()=>{
  const controller=new AbortController();setState({loading:true})
  api(`/api/settings/tours/${tour.id}/editor`,undefined,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])})
   .then(data=>{if(!controller.signal.aborted)setState({data,loading:false})})
   .catch(()=>{if(!controller.signal.aborted)setState({error:true,loading:false})})
  return()=>controller.abort()
 },[tour.id,attempt])
 return <ModalView title={bilingualLabel('View tour program')} onClose={onClose} loading={state.loading} error={state.error?'Unable to load this record. Refresh and retry before editing.':null} onRetry={()=>setAttempt(value=>value+1)}>
  {state.data&&<TourProgramView data={state.data} t={t}/>} 
 </ModalView>
}

function TourProgramView({data,t}){
 const tour=data.tour||{},th=data.content?.th||{},en=data.content?.en||{}
 const hero=(data.media||[]).find(row=>row.status==='ACTIVE'&&row.kind==='HERO'&&row.url)||(data.media||[]).find(row=>row.url)
 const packageRows=(data.components||[]).map(row=>({id:row.id,title:row.resource?.name||'Service',detail:`${t(labelFor(row.selection))} · ${formatNumber(row.quantity)} ${t(labelFor(row.basis))}${row.day?` · Day ${row.day}`:''}`}))
 return <>
  <ModalViewHero image={hero?imageUrl(hero.url):null} alt={hero?.altTh||hero?.altEn||''} eyebrow={bilingualLabel('TOUR PROGRAM')} title={th.name||en.name||tour.name} summary={th.summary||en.summary||tour.description||t('Not set')} badges={[t(labelFor(tour.status)),t(labelFor(tour.publicStatus)),tour.homeBadge?t(labelFor(tour.homeBadge)):null]}/>
  <ModalViewFields items={[
   {label:'Code',value:text(tour.code)},{label:'Job Order code',value:text(tour.printCode)},
   {label:'Tour type',value:t(labelFor(tour.tourType))||t('Not set')},{label:'Journey type',value:t(labelFor(tour.journeyMode))},
   {label:'Organized by',value:tour.operator?.name||t(labelFor(tour.ownership))},{label:'Duration',value:tour.durationDays?`${formatNumber(tour.durationDays)} day(s)`:t('Not set')},
   {label:'Adult price',value:money(tour.adultPrice)},{label:'Child price',value:money(tour.childPrice)},
  ]}/>
  <ModalViewSection title={bilingualLabel('Public content')}><ModalViewColumns><article><strong>TH</strong><h4>{text(th.name)}</h4><p>{text(th.summary)}</p></article><article><strong>EN</strong><h4>{text(en.name)}</h4><p>{text(en.summary)}</p></article></ModalViewColumns></ModalViewSection>
  <ModalViewStats items={[{label:'Highlights',value:(data.highlights||[]).length},{label:'Itinerary steps',value:(data.itinerary||[]).length},{label:'Media',value:(data.media||[]).length},{label:'FAQ',value:(data.faqs||[]).length}]}/>
  <ModalViewSection title={bilingualLabel('Package & availability')}>
   <ModalViewList items={packageRows} empty={t('No program components linked yet. Add services from Program components.')}/>
   <ModalViewFields items={[{label:'Seasons',value:(data.seasons||[]).length},{label:'Promotions',value:(data.promotions||[]).length},{label:'Current service period',value:data.seasons?.[0]?`${formatDate(data.seasons[0].startsOn)} – ${formatDate(data.seasons[0].endsOn)}`:t('Not set')}]}/>
  </ModalViewSection>
 </>
}