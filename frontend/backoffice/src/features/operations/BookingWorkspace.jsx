import {useRef} from 'react'
import {useNavigation} from '../../core/navigation/Navigation.jsx'
import {bookingTabs,bookingTab,bookingTabHref,canReadBookingList} from '../../core/navigation/bookingWorkspace.js'
import {Tabs} from '../../core/ui/Tabs.jsx'
import {TabPanel} from '../../core/ui/TabPanel.jsx'
import {translate as t,useLocale} from '../../core/i18n/locale.jsx'
import BookingsPage from './BookingsPage.jsx'
import CustomerRequestsPage from './CustomerRequestsPage.jsx'

export default function BookingWorkspace({actor,islandOnly=false}) {
 useLocale()
 const {location,navigate}=useNavigation(), searches=useRef(new Map())
 const tabs=bookingTabs(actor), params=new URLSearchParams(location.search)
 const active=!canReadBookingList(actor)&&!params.has('tab')&&!params.has('source')?'requests':bookingTab(location.search)
 const allowed=tabs.some(tab=>tab.id===active)
 function select(id) {
  if(id===active)return
  searches.current.set(active,window.location.search)
  navigate(bookingTabHref(id,searches.current.get(id)||''))
 }
 return <>
  <Tabs items={tabs} value={active} onChange={select} label="Booking workspace" idPrefix="booking-source"/>
  {!allowed&&<section className="panel auth-result"><h1>{t('Access restricted')}</h1><p>{t('Your account does not have permission to use this work area.')}</p></section>}
  {tabs.map(tab=><TabPanel key={tab.id} active={active===tab.id} id={`booking-source-panel-${tab.id}`} labelledBy={`booking-source-tab-${tab.id}`}>
   {active===tab.id&&(tab.id==='requests'?<CustomerRequestsPage canOpenBooking={canReadBookingList(actor)}/>:<BookingsPage key={params.get('bookingId')||'list'} actor={actor} islandOnly={islandOnly}/>)}
  </TabPanel>)}
 </>
}
