import CompanyContactProvider from '../features/company/CompanyContactProvider.jsx'
import {useEffect} from 'react'
import {useLocale} from '../core/useLocale.js'
import {useNavigation} from '../core/useNavigation.js'
import {pageTitle} from '../core/locale.js'
import {SiteHeader, SiteFooter} from '../core/ui/SiteNavigation.jsx'
import NotFound from '../features/content/NotFound.jsx'
import HomePage from '../features/home/HomePage.jsx'
import Catalog from '../features/catalog/Catalog.jsx'
import Popup from '../features/catalog/Popup.jsx'
import ContentPage from '../features/content/ContentPage.jsx'
import InformationPage from '../features/content/InformationPage.jsx'
import {publicInfo, ownsPublicPath} from '../core/publicRoutes.js'

export default function App() {
  const {locale, label} = useLocale()
  const route = useNavigation()
  useEffect(() => {
    const tourDetail=['/tours','/promotions'].includes(route.pathname)&&new URLSearchParams(route.search).has('tour')
    if(!tourDetail&&ownsPublicPath(route.pathname))document.title=pageTitle(locale,route.pathname)
    const info=publicInfo(route.pathname)
    if(!info&&route.pathname!=='/')return
    const meta=document.createElement('meta')
    meta.name='description';meta.content=info?info.description[locale==='en'?'en':'th']:(locale==='en'?'Meet Greenview Tour and plan a Surin Islands trip from Khura Buri, Phang Nga. Explore company programmes, island information and travel advice.':'รู้จักกรีนวิวทัวร์และวางแผนเที่ยวหมู่เกาะสุรินทร์จากคุระบุรี จังหวัดพังงา พร้อมโปรแกรมของบริษัท ข้อมูลเกาะและการเตรียมเดินทาง')
    document.head.appendChild(meta)
    const canonical=document.createElement('link')
    canonical.rel='canonical';canonical.href=new URL(route.pathname,location.origin).href
    document.head.appendChild(canonical)
    return()=>{meta.remove();canonical.remove()}
  },[locale,route.pathname,route.search])
  return <CompanyContactProvider>
    <a className="skip-link" href="#content">{label('ข้ามไปเนื้อหา')}</a>
    <SiteHeader/>
    {route.pathname==='/information' ? <InformationPage/> : publicInfo(route.pathname) ? <ContentPage key={route.pathname} pathname={route.pathname} hash={route.hash}/> : ['/tours', '/promotions'].includes(route.pathname)
      ? <Catalog key={route.pathname + route.search} pathname={route.pathname} search={route.search}/>
      : route.pathname==='/' ? <HomePage/> : <NotFound/>}
    <SiteFooter/>
    <Popup/>
  </CompanyContactProvider>
}
