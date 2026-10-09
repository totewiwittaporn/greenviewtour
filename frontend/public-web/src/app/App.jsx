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
    if(!info)return
    const meta=document.createElement('meta')
    meta.name='description';meta.content=info.description[locale==='en'?'en':'th']
    document.head.appendChild(meta)
    return()=>meta.remove()
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
