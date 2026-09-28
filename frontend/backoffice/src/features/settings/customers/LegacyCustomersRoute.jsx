import {useEffect} from 'react'
import {useNavigation} from '../../../core/navigation/Navigation.jsx'
import {legacyCustomersHref} from '../../../core/navigation/bookingWorkspace.js'
import {translate as t,useLocale} from '../../../core/i18n/locale.jsx'
export default function LegacyCustomersRoute({user}) {
 useLocale()
 const {location,navigate}=useNavigation()
 const target=legacyCustomersHref(user,location.search)
 useEffect(()=>{navigate(target,{replace:true})},[navigate,target])
 return <p role="status">{t('Opening the customer workspace…')}</p>
}
