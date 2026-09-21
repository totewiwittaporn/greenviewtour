import {useEffect} from 'react'
import {useLocale} from '../core/useLocale.js'
import {useNavigation} from '../core/useNavigation.js'
import {pageTitle} from '../core/locale.js'
import {SiteHeader, SiteFooter} from '../core/ui/SiteNavigation.jsx'
import HomePage from '../features/home/HomePage.jsx'
import Catalog from '../features/catalog/Catalog.jsx'
import Popup from '../features/catalog/Popup.jsx'

export default function App() {
  const {locale, label} = useLocale()
  const route = useNavigation()
  useEffect(() => { document.title = pageTitle(locale, route.pathname) }, [locale, route.pathname])
  return <>
    <a className="skip-link" href="#content">{label('ข้ามไปเนื้อหา')}</a>
    <SiteHeader/>
    {['/tours', '/promotions'].includes(route.pathname)
      ? <Catalog key={route.pathname + route.search} pathname={route.pathname} search={route.search}/>
      : <HomePage/>}
    <SiteFooter/>
    <Popup/>
  </>
}
