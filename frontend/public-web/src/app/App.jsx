import {useEffect} from 'react'
import {useLocale} from '../core/useLocale.js'
import {pageTitle} from '../core/locale.js'
import HomePage from '../features/home/HomePage.jsx'
import Catalog from '../features/catalog/Catalog.jsx'
import Popup from '../features/catalog/Popup.jsx'
export default function App(){const {locale}=useLocale(); const pathname=location.pathname; useEffect(()=>{document.title=pageTitle(locale,pathname)},[locale,pathname]); return <>{['/tours','/promotions'].includes(location.pathname)?<Catalog/>:<HomePage/>}<Popup/></>}
